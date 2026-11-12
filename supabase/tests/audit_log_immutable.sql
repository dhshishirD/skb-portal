-- audit_log_immutable.sql - proves 0030: the audit log refuses UPDATE, DELETE and TRUNCATE, while new
-- entries can still be written. One transaction, rolled back. LOCAL / STAGING Supabase only.
begin;

do $$
declare
  rid bigint;
  blocked boolean;
begin
  -- a new entry can still be written (this is what log_audit does)
  insert into public.audit_log (table_name, record_id, action, new_data)
    values ('test_table', 'x1', 'INSERT', '{"a":1}'::jsonb) returning id into rid;
  assert rid is not null, 'inserting an audit entry still works';

  blocked := false;
  begin update public.audit_log set action = 'DELETE' where id = rid;
  exception when insufficient_privilege then blocked := true; end;
  assert blocked, 'an audit entry cannot be updated';

  blocked := false;
  begin delete from public.audit_log where id = rid;
  exception when insufficient_privilege then blocked := true; end;
  assert blocked, 'an audit entry cannot be deleted';

  blocked := false;
  begin delete from public.audit_log;
  exception when insufficient_privilege then blocked := true; end;
  assert blocked, 'the audit log cannot be emptied with delete';

  blocked := false;
  begin truncate table public.audit_log;
  exception when insufficient_privilege then blocked := true; end;
  assert blocked, 'the audit log cannot be truncated';

  assert (select count(*) from public.audit_log where id = rid) = 1, 'the entry is still there';

  -- ordinary changes elsewhere still write to the log
  insert into public.organizations (id, name, type) values ('f0000000-0000-0000-0000-0000000000b1', 'Audit test org', 'internal');
  assert exists (select 1 from public.audit_log where table_name = 'organizations' and record_id = 'f0000000-0000-0000-0000-0000000000b1' and action = 'INSERT'),
    'normal changes are still logged';
end $$;

rollback;
