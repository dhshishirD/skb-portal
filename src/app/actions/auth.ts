'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { requiresMFA } from '@/lib/mfa-rules';
import { AppRole } from '@/lib/database.types';

export async function signInAction(formData: FormData): Promise<void> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    redirect('/login?error=Email+and+password+are+required');
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  if (data.user) {
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', data.user.id);

    const roles: AppRole[] = (rolesData as Array<{ role: AppRole }> | null)?.map((r) => r.role) || [];

    if (requiresMFA(roles)) {
      redirect('/mfa');
    }
  }

  redirect('/dashboard');
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function setPasswordAction(formData: FormData): Promise<void> {
  const password = formData.get('password') as string;
  if (!password || password.length < 8) {
    redirect('/set-password?error=Password+must+be+at+least+8+characters');
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(`/set-password?error=${encodeURIComponent(error.message)}`);
  }

  redirect('/dashboard');
}

export async function resetPasswordAction(formData: FormData): Promise<void> {
  const email = formData.get('email') as string;
  if (!email) {
    redirect('/reset-password?error=Email+address+is+required');
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/callback?next=/set-password`,
  });

  if (error) {
    redirect(`/reset-password?error=${encodeURIComponent(error.message)}`);
  }

  redirect('/reset-password?success=Password+reset+email+sent');
}
