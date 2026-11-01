# Security hardening: deployment checklist (Week 1, Nov 2026)

This branch makes the whole portal private by default. Read this before merging.

## 1. Vercel environment variables (required)

The app no longer contains any fallback Supabase URL or key. Set these in
**Vercel → Project → Settings → Environment Variables** (Production and Preview):

| Variable | Where to find it | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | e.g. `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API Keys → publishable key | safe for the browser |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API Keys → **new** secret key | server only, never share |
| `KOBO_WEBHOOK_SECRET` / `ODK_WEBHOOK_SECRET` | choose a long random string | only if Kobo/ODK webhooks are used |
| `NEXT_PUBLIC_SITE_URL` | your domain | e.g. `https://www.skbportal.online` |

If the Supabase variables are missing, private pages return **503** (fail closed) instead
of opening up.

## 2. Supabase Auth settings

- Authentication → URL Configuration: Site URL = `https://www.skbportal.online`; add
  `https://www.skbportal.online/auth/callback` (and the Vercel preview domain) to Redirect URLs.
- Enable **Leaked password protection** and a minimum password length of 10 or more.
- Each staff member signs in with **their own** password or Google. The shared password and
  the 1-click roster sign-in are removed.

## 3. What changed

- `src/middleware.ts`: every route is private except `/`, `/login`, `/reset-password`,
  `/set-password`, `/mfa`, `/auth/*`, `/api/health` and `/api/webhooks/*`. Private pages
  redirect to `/login?next=…`; private APIs return 401.
- The `/api/storage/upload` and `/api/community/*` routes require a signed-in user. Uploads
  are checked (25 MB, allowed types), never overwrite, and return a 1-hour signed link.
- Kobo/ODK webhooks reject requests without a valid HMAC signature.
- Removed: hard-coded Supabase URL/keys (including the base64 service-role key), the
  shared password, the local password bypass, `scripts/reset-passwords.mjs` and
  `scripts/test-login.mjs`.
- Logout now really ends the session (`/auth/signout`).
- OAuth `next` redirect is validated (open-redirect fix).
- Tighter Content-Security-Policy in production, plus Permissions-Policy and robots.txt.
- Migrations 0006–0008 fixed (0006 failed on a clean DB; 0007 let anyone read and write
  posts and DMs; 0008 granted anon read on every table). New 0009 makes the document
  bucket private.
- Personal and donor documents were removed from the repo: `docs/archives`,
  `docs/proposals` and the work statements. **They still exist in git history** and need
  a history purge (git filter-repo / BFG) by the repo owner.

## 4. Production database (separate, approval required)

Production (`SKB-Portal`) was built by hand and does not match these migrations
(no migration history, 30 tables without policies, public storage buckets). Staging
(`SKB-Portal-Staging`) has the full, fixed migration set applied and passes the
anon-access checks. Moving production over to it is a planned step, done with a backup
first. This code change does **not** depend on that step.

## 5. Known follow-ups (week 2+)

- Admin/executive UI decisions still use hard-coded email checks in browser code
  (`userApprovalService`, dashboard, projects, documents). Replace them with `user_roles`
  from the database. Server-side admin actions already check roles.
- Community data is still stored in `notifications` through the service role; move it to
  the new `community_*` tables with RLS.
- Documents keep the signed URL in browser storage, and it expires after 1 hour. Store
  `storagePath` and sign it on demand.
