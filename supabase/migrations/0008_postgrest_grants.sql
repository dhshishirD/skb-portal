-- Migration 0008: Explicit PostgREST & Data API Grants (Supabase Oct 30 Compatibility)
-- Compliant with Supabase security policy update for public schema tables.

-- 1. Grant schema usage
grant usage on schema public to anon, authenticated, service_role;

-- 2. Grant table-level permissions to standard API roles
-- Note: Row Level Security (RLS) policies still govern row-by-row access control.
grant all on all tables in schema public to postgres, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;

-- 3. Grant sequence permissions for auto-increment and serial keys
grant all on all sequences in schema public to postgres, service_role, authenticated, anon;

-- 4. Configure DEFAULT PRIVILEGES so that any new table created in the future
-- automatically receives explicit grants without throwing "permission denied" errors.
alter default privileges in schema public grant all on tables to postgres, service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant select on tables to anon;

alter default privileges in schema public grant all on sequences to postgres, service_role, authenticated, anon;
alter default privileges in schema public grant all on routines to postgres, service_role, authenticated, anon;
