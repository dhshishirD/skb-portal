import { NextResponse } from 'next/server';
import { generateDonorNarrative, ProjectNarrativeContext } from '@/server/services/aiNarrativeService';
import { requireActiveRole } from '@/lib/auth/guards';
import { MAX_AI_CONTEXT_BYTES, RateLimiter } from '@/lib/apiAccess';
import { hasPermission } from '@/lib/permissions';

// Each call spends the Gemini quota: donor-report writers only, and a limited number per hour.
const limiter = new RateLimiter(30, 60 * 60 * 1000);

export async function POST(req: Request) {
  const guard = await requireActiveRole((roles) => hasPermission(roles, 'donor_report.write'));
  if (!guard.ok) return guard.response;

  if (!limiter.allow(guard.user.id)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  try {
    const raw = await req.text();
    if (raw.length > MAX_AI_CONTEXT_BYTES) {
      return NextResponse.json({ error: 'Request is too large' }, { status: 413 });
    }
    const context = JSON.parse(raw) as ProjectNarrativeContext;

    if (!context || !context.projectCode || !context.projectTitle) {
      return NextResponse.json({ error: 'Missing required project context fields' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const result = await generateDonorNarrative(context, apiKey);

    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'AI narrative generation failed' }, { status: 500 });
  }
}
