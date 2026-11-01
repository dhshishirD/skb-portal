-- Migration 0008: Explicit PostgREST & Data API Grants (Supabase Oct 30 Compatibility)
--
-- Security fix (Nov 2026): the original version granted SELECT on every table (and
-- EXECUTE on every function, as a default privilege) to `anon`, undoing the
-- deliberate "no anonymous access" revokes in 0001-0007. Anonymous visitors now get
-- nothing in the public schema. Row Level Security still governs signed-in users.

grant usage on schema public to anon, authenticated, service_role;

-- Signed-in users: table privileges (RLS policies decide which rows).
grant all on all tables in schema public to postgres, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all sequences in schema public to postgres, service_role;
grant usage, select on all sequences in schema public to authenticated;

-- Anonymous: explicitly nothing.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

-- Re-apply column-level restrictions that the blanket grant above would widen.
revoke update on public.profiles from authenticated;
grant update (full_name, phone, language) on public.profiles to authenticated;
revoke update on public.direct_messages from authenticated;
grant update (read_at) on public.direct_messages to authenticated;
revoke insert, update, delete on public.audit_log from authenticated;
revoke insert, update, delete on public.user_roles from authenticated;
revoke insert, update, delete on public.external_webhooks, public.notification_logs from authenticated;

-- Future tables: same defaults (no anon).
alter default privileges in schema public grant all on tables to postgres, service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant all on sequences to postgres, service_role;
alter default privileges in schema public grant usage, select on sequences to authenticated;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;

-- Functions: never executable by anon by default.
revoke execute on function public.set_updated_at() from public, anon;
alter default privileges in schema public revoke execute on functions from public, anon;
alter default privileges in schema public grant execute on functions to authenticated, service_role;
