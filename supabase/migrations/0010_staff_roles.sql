-- Migration 0010: roles for SKB's real hierarchy
--
--   board          Chairman / governing board: reads everything operational, approves nothing.
--   legal_officer  Law Officer: reads projects, documents, beneficiary consent records and the
--                  audit log for compliance; no money or project approvals.
--   it_officer     IT Officer: staff directory, audit log, user support; no project data unless
--                  explicitly assigned. (Super Admin is a separate, stronger role.)
--
-- New enum values must be committed before policies can use them, so the policies that
-- reference these roles live in 0011.

alter type public.app_role add value if not exists 'board';
alter type public.app_role add value if not exists 'legal_officer';
alter type public.app_role add value if not exists 'it_officer';
