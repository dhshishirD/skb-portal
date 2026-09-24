# DECISIONS.md - Decision Log & Memory

This file logs key architecture, design, and hosting decisions for the NGO Works Portal.

## Current Phase: Phase 1 (Foundation)

| Date | Decision | Rationale |
|---|---|---|
| 2026-09-24 | **Hosting**: Vercel + Cloudflare in front | Native Next.js App Router support on Vercel with Cloudflare for regional Bangladesh DDoS, WAF, and Turnstile bot protection. |
| 2026-09-24 | **Email Provider**: Local Mock for dev | Mock email delivery locally; transition to Resend/Postmark in staging/production. |
| 2026-09-24 | **Location Data**: Bangladesh Admin Hierarchy | Seeding standard Bangladesh Division > District > Upazila > Union > Village structure. |
| 2026-09-24 | **Package Manager**: `pnpm` (v12) | Enforced strict package isolation and build script verification. |
| 2026-09-24 | **Auth & MFA**: Invite-only + TOTP MFA | Disabled public sign-up; enforced TOTP MFA for Super Admin, Executive, Finance, and PM roles via `@supabase/ssr` middleware. |
| 2026-09-24 | **Admin & Audit Log**: Service-Role + `app.actor_id` | Enforced `user.manage` permission checks, service-role admin mutations, and append-only audit log viewer with table filters. |
| 2026-09-24 | **Seed Data & Demo**: Fake Data Only | Seeded 1 internal org, 2 donors, 2 partners, Bangladesh location hierarchy, 3 grants, 4 projects, and 1 user account for each of the 11 roles. |
| 2026-09-24 | **Phase 2 - Project Core**: Kanban & Logframe | Implemented 0002_project_core.sql migration, Kanban stage gate checklists, logframe tree, tasks board, and version-controlled document library. |
| 2026-09-24 | **Phase 3 - Field & Finance**: Offline PWA & Approvals | Implemented 0003_field_finance.sql migration, offline PWA field forms, receipt OCR suggestions, multi-step approvals, and grant burn rate calculations. |
| 2026-09-24 | **Phase 4 - Donor Portal & M&E**: RLS & Generator | Implemented 0004_donor_me.sql migration, strict per-donor published report RLS, M&E district map dashboard, and automated donor report generator. |
| 2026-09-24 | **Phase 5 - Beneficiaries & Procurement**: Encryption & Dedup | Implemented 0005_beneficiaries_procurement.sql migration, encrypted beneficiary fields, consent tracking, duplicate detection, min 3-quote procurement rules, and vendor blacklisting. |
| 2026-09-24 | **Phase 6 - Hardening & Launch Prep**: Security & Operations | Implemented security headers, strict CSP, health check endpoint, operational runbook, database seeding, and role testing matrix. |
| 2026-09-24 | **Phase 7 - Growth & Integration**: Webhooks, SMS & AI | Implemented 0006_integrations_ai.sql migration, KoboToolbox & ODK Central webhook ingestion, SMS/WhatsApp notification service, and AI Narrative Assistant for donor reports. |
