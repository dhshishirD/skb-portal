-- 0030: the audit log cannot be changed or deleted, even by a direct database session.
--
-- Until now only app roles were blocked (no UPDATE/DELETE grant). A trusted server key or a direct
-- database session could still edit or empty the log. These triggers refuse every UPDATE, DELETE and
-- TRUNCATE on public.audit_log, so history stays as the triggers wrote it. INSERT (the log_audit trigger)
-- is untouched.
--
-- If a log entry ever has to be corrected (for example to blank personal data), that needs a deliberate,
-- reviewed migration that drops and re-creates these triggers; it leaves its own trace in the migrations.

create or replace function public.audit_log_block_changes()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'the audit log cannot be changed or deleted' using errcode = '42501';
end $$;
revoke execute on function public.audit_log_block_changes() from public, anon, authenticated;

drop trigger if exists audit_log_no_row_change on public.audit_log;
create trigger audit_log_no_row_change
  before update or delete on public.audit_log
  for each row execute function public.audit_log_block_changes();

drop trigger if exists audit_log_no_truncate on public.audit_log;
create trigger audit_log_no_truncate
  before truncate on public.audit_log
  for each statement execute function public.audit_log_block_changes();
