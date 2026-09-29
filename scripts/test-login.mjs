import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vfozkewdnelkgsluntex.supabase.co';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, anonKey);

async function testExecutiveLogin() {
  console.log('Testing login for Executive Director (kindnessforbeauty@gmail.com)...');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'kindnessforbeauty@gmail.com',
    password: 'SkbPortal2026!'
  });

  if (error) {
    console.error('❌ Login Failed:', error.message);
  } else {
    console.log('✅ Login SUCCESSFUL!');
    console.log('User Email:', data.user?.email);
    console.log('User Name:', data.user?.user_metadata?.full_name);
  }
}

testExecutiveLogin();
