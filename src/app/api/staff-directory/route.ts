import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Active staff (id, name, designation) for the Community page. Read with the signed-in person's own
 * session, so Row Level Security decides who may see it (staff members of the internal organisation).
 * No e-mail or phone is returned.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await (supabase.from('profiles') as any)
    .select('id, full_name, designation, display_order')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .order('full_name', { ascending: true })
    .limit(500);
  if (error) return NextResponse.json({ error: 'Could not load staff' }, { status: 500 });

  const staff = ((data ?? []) as Array<{ id: string; full_name: string; designation: string | null }>)
    .filter((p) => p.full_name && p.full_name.trim() !== '')
    .map((p) => ({ id: p.id, fullName: p.full_name, designation: p.designation }));
  return NextResponse.json({ staff });
}
