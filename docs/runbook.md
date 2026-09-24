# NGO Works Portal - Operations & Runbook Guide

---

## 1. Environments & Infrastructure

| Environment | Hosting | Database | Domain | Access |
|---|---|---|---|---|
| **Local Dev** | Localhost:3000 | Supabase CLI (127.0.0.1:54321) | `localhost:3000` | Developer Machine |
| **Staging** | Vercel (Preview) | Supabase Staging Project | `staging.ngo-portal.org` | Team & Tester Invites |
| **Production** | Vercel + Cloudflare WAF | Supabase Production Project | `portal.ngo-portal.org` | Authorized NGO Staff & Donors |

---

## 2. Security & Hardening Checklist

- [x] **HTTP Security Headers**: Strict HSTS, X-Frame-Options (`DENY`), X-Content-Type-Options (`nosniff`), Referrer Policy, Content-Security-Policy (CSP) configured in [next.config.mjs](file:///g:/SKB%20Portal/next.config.mjs).
- [x] **Row Level Security (RLS)**: Enforced across all tables via migrations (`0001` through `0005`).
- [x] **Audit Triggers**: Append-only audit logging with `app.actor_id` context.
- [x] **MFA TOTP**: Enforced for `super_admin`, `executive`, `finance`, and `programme_manager` roles.
- [x] **Beneficiary Privacy**: Column-level encryption for National ID and phone numbers.
- [x] **Health Check Endpoint**: Available at `/api/health`.

---

## 3. Disaster Recovery & Backup Restore Drill

### Backup Policy
* **Daily Backups**: Automated daily Postgres snapshots.
* **Point-In-Time Recovery (PITR)**: Enabled in production (7-day rolling window).
* **Target RPO**: $< 24$ hours (under 5 minutes with PITR).
* **Target RTO**: $< 4$ hours.

### Quarterly Restore Drill Protocol
1. Export latest backup dump from Supabase Production dashboard:
   ```bash
   supabase db dump --project-ref <PROD_REF> -f prod_backup.sql
   ```
2. Spin up a temporary scratch Supabase instance:
   ```bash
   supabase db reset --linked
   ```
3. Restore database schema and seed data into scratch project:
   ```bash
   psql -h 127.0.0.1 -U postgres -d postgres -f prod_backup.sql
   ```
4. Verify RLS test suite passes against scratch database:
   ```bash
   psql -h 127.0.0.1 -U postgres -d postgres -f supabase/tests/rls_foundation.sql
   ```
5. Document restore completion time and sign off in `DECISIONS.md`.

---

## 4. Cloudflare Edge WAF & DDoS Setup

1. **DNS & SSL**: Proxy DNS through Cloudflare with "Full (Strict)" SSL/TLS mode.
2. **Turnstile Bot Protection**: Enable Cloudflare Turnstile on `/login` and password reset forms.
3. **Rate Limiting**: Limit `/api/*` and `/login` requests to max 10 requests per minute per IP.
4. **HSTS Header**: Enable Cloudflare HSTS with 1-year max-age and preloading enabled.
