import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vfozkewdnelkgsluntex.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const targetAccounts = [
  {
    email: 'kindnessforbeauty@gmail.com',
    password: 'SkbPortal2026!',
    name: 'Md. Abu Huraira',
    designation: 'Executive Director'
  },
  {
    email: 'daloyar.pro@gmail.com',
    password: 'SkbPortal2026!',
    name: 'Daloyar Hassan',
    designation: 'Super Admin'
  }
];

async function syncPasswords() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('Error fetching users:', error);
    return;
  }

  for (const account of targetAccounts) {
    const existing = users.find(u => u.email?.toLowerCase() === account.email.toLowerCase());
    if (existing) {
      console.log(`Updating password & metadata for ${account.email}...`);
      const { data, error: updateErr } = await supabase.auth.admin.updateUserById(existing.id, {
        password: account.password,
        email_confirm: true,
        user_metadata: {
          full_name: account.name,
          designation: account.designation,
          email_verified: true
        }
      });
      if (updateErr) {
        console.error(`Failed to update ${account.email}:`, updateErr.message);
      } else {
        console.log(`SUCCESS: ${account.email} password synchronized`);
      }
    }
  }
}

syncPasswords();
