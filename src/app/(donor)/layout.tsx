'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

/*
 * The donor's own area. It shows one organisation's projects and nothing else; which organisation is decided on
 * the server from the signed-in account. The Executive Director and the Board can preview one donor with ?org=.
 */

function DonorLayoutInner({ children }: { children: React.ReactNode }) {
  const org = useSearchParams().get('org');
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <header className="bg-slate-900 text-white border-b border-slate-800 px-4 sm:px-6 lg:px-8 py-3 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <Link href={org ? `/donor-dashboard?org=${org}` : '/donor-dashboard'} className="min-w-0">
            <p className="text-sm font-bold truncate">Small Kindness Bangladesh</p>
            <p className="text-[11px] text-slate-400">Donor portal</p>
          </Link>
          {org ? (
            <Link href="/admin/donors" className="text-xs font-semibold text-slate-300 hover:text-white">Back to Donors</Link>
          ) : (
            <button
              type="button"
              onClick={async () => {
                await createClient().auth.signOut();
                window.location.href = '/login';
              }}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              Sign out
            </button>
          )}
        </div>
      </header>
      {org && (
        <p role="status" className="bg-amber-50 border-b border-amber-200 text-amber-900 text-xs text-center px-4 py-2">
          Preview: this is what this donor sees. You are not signed in as the donor.
        </p>
      )}
      <main className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 min-w-0">{children}</main>
      <footer className="border-t border-slate-200 py-4 px-4 text-center text-xs text-slate-500 bg-white">
        &copy; {new Date().getFullYear()} Small Kindness Bangladesh
      </footer>
    </div>
  );
}

export default function DonorLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs text-slate-400">Loading…</div>}>
      <DonorLayoutInner>{children}</DonorLayoutInner>
    </Suspense>
  );
}
