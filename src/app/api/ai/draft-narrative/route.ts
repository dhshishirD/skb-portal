import { NextResponse } from 'next/server';
import { generateDonorNarrative, ProjectNarrativeContext } from '@/server/services/aiNarrativeService';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const context: ProjectNarrativeContext = await req.json();

    if (!context || !context.projectCode || !context.projectTitle) {
      return NextResponse.json({ error: 'Missing required project context fields' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const result = await generateDonorNarrative(context, apiKey);

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'AI narrative generation failed' }, { status: 500 });
  }
}
