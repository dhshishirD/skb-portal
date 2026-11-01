import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

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

  // Private pages must not be cached by shared caches or the browser back/forward cache.
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}

export const config = {
  matcher: [
    // Everything except Next.js internals and static files.
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|csv|xlsx)$).*)',
  ],
};
