import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { canOpenPath, deskRuleFor, homeForRoles, NO_ACCESS_PATH } from '@/lib/desks';
import type { AppRole } from '@/lib/database.types';

/**
 * Server-side access control for the whole portal.
 *
 * Everything is PRIVATE unless listed in PUBLIC_PATHS / PUBLIC_PREFIXES. This runs on the
 * server before any page or API route renders, so client-side code can no longer be
 * bypassed to view staff, field or donor workspaces.
 *
 * Row Level Security in Supabase remains the authoritative data gate; this layer stops
 * unauthenticated visitors from loading private screens and APIs at all.
 */

const PUBLIC_PATHS = new Set<string>([
  '/', // public landing page (no private data)
  '/login',
  '/reset-password',
  '/set-password',
  '/mfa',
  '/api/health',
]);

const PUBLIC_PREFIXES = [
  '/auth/', // OAuth callback
  '/api/webhooks/', // Kobo/ODK: protected by HMAC signatures instead of sessions
];

export function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const pathname = request.nextUrl.pathname;

  // Misconfiguration must never open the portal: fail closed on private routes.
  if (!supabaseUrl || !supabaseAnonKey) {
    if (isPublicPath(pathname)) return NextResponse.next();
    return new NextResponse('Service temporarily unavailable (configuration error).', { status: 503 });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getUser() validates the session with Supabase Auth (refreshes it if needed).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isPublicPath(pathname)) {
    return response;
  }

  if (!user) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based desks (pages only; APIs and RLS do their own checks). Each person is sent to
  // their own desk and kept out of desks their role does not cover.
  if (!pathname.startsWith('/api/') && (pathname === '/home' || deskRuleFor(pathname))) {
    const access = await loadAccess(supabase, user.id);
    const redirectTo = (target: string) => {
      const res = NextResponse.redirect(new URL(target, request.url));
      response.cookies.getAll().forEach((c) => res.cookies.set(c));
      return res;
    };

    if (!access.ok) return redirectTo(`${NO_ACCESS_PATH}?reason=error`);
    if (!access.active) return redirectTo(`${NO_ACCESS_PATH}?reason=inactive`);

    const home = homeForRoles(access.roles);
    if (pathname === '/home') return redirectTo(home);
    if (!canOpenPath(pathname, access.roles)) {
      return redirectTo(home === NO_ACCESS_PATH ? `${NO_ACCESS_PATH}?reason=no-role` : home);
    }
  }

  // Private pages must not be cached by shared caches or the browser back/forward cache.
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}

type AccessResult = { ok: true; active: boolean; roles: AppRole[] } | { ok: false };

/** The signed-in user's roles and active flag, read through RLS (users can read their own). */
async function loadAccess(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
): Promise<AccessResult> {
  try {
    const [rolesRes, profileRes] = await Promise.all([
      supabase.from('user_roles').select('role').eq('user_id', userId),
      supabase.from('profiles').select('is_active').eq('id', userId).maybeSingle(),
    ]);
    if (rolesRes.error || profileRes.error) return { ok: false };
    const roles = ((rolesRes.data ?? []) as Array<{ role: AppRole }>).map((r) => r.role);
    const active = (profileRes.data as { is_active?: boolean } | null)?.is_active !== false;
    return { ok: true, active: active && profileRes.data !== null, roles };
  } catch {
    return { ok: false }; // fail closed
  }
}

export const config = {
  matcher: [
    // Everything except Next.js internals and static files.
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|csv|xlsx)$).*)',
  ],
};
