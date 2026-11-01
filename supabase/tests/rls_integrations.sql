-- rls_integrations.sql - proves the 0006 rules for webhooks, notification logs and AI narratives.
-- Plain SQL like the other suites (no pgTAP): one transaction, rolled back; any failed
-- assert raises an error. Run against LOCAL Supabase only.
begin;

-- ---------- fixtures (as superuser, RLS bypassed) ----------
insert into auth.users (id) values
  ('60000000-0000-0000-0000-000000000001'), -- super admin
  ('60000000-0000-0000-0000-000000000002'), -- finance
  ('60000000-0000-0000-0000-000000000003'); -- field officer

insert into public.user_roles (user_id, role) values
  ('60000000-0000-0000-0000-000000000001','super_admin'),
  ('60000000-0000-0000-0000-000000000002','finance'),
  ('60000000-0000-0000-0000-000000000003','field_officer');

insert into public.external_webhooks (source, event_type, payload)
  values ('kobotoolbox', 'submission', '{"x":1}'::jsonb);
insert into public.notification_logs (channel, recipient, message, status)
  values ('sms', '+8801000000000', 'test', 'sent');

-- ---------- checks ----------
do $$
declare n int; denied boolean;
begin
  -- 1. anonymous visitors have no table access at all (0006 + 0008 revokes)
  execute 'set local role anon';
  foreach n in array array[1,2,3] loop
    denied := false;
    begin
      execute format('select count(*) from public.%I',
        (array['external_webhooks','notification_logs','ai_report_narratives'])[n]);
    exception when insufficient_privilege then denied := true;
    end;
    assert denied, format('anon must be denied on table #%s', n);
  end loop;
  denied := false;
  begin
    insert into public.external_webhooks (source, event_type, payload) values ('x','y','{}'::jsonb);
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'anon must not insert webhooks';
  execute 'reset role';

  -- 2. super admin reads webhooks and notification logs
  perform set_config('request.jwt.claims','{"sub":"60000000-0000-0000-0000-000000000001"}',true);
  execute 'set local role authenticated';
  select count(*) into n from public.external_webhooks;
  assert n = 1, format('super admin should see 1 webhook, got %s', n);
  select count(*) into n from public.notification_logs;
  assert n = 1, format('super admin should see 1 notification log, got %s', n);
  execute 'reset role';

  -- 3. finance reads notification logs but not webhooks
  perform set_config('request.jwt.claims','{"sub":"60000000-0000-0000-0000-000000000002"}',true);
  execute 'set local role authenticated';
  select count(*) into n from public.notification_logs;
  assert n = 1, format('finance should see notification logs, got %s', n);
  select count(*) into n from public.external_webhooks;
  assert n = 0, format('finance must not see webhooks, got %s', n);
  execute 'reset role';

  -- 4. field officer sees neither
  perform set_config('request.jwt.claims','{"sub":"60000000-0000-0000-0000-000000000003"}',true);
  execute 'set local role authenticated';
  select count(*) into n from public.external_webhooks;
  assert n = 0, format('field officer must not see webhooks, got %s', n);
  select count(*) into n from public.notification_logs;
  assert n = 0, format('field officer must not see notification logs, got %s', n);

  -- 5. signed-in users cannot write webhook / log rows (server-only tables, 0008)
  denied := false;
  begin
    insert into public.external_webhooks (source, event_type, payload) values ('x','y','{}'::jsonb);
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'authenticated users must not insert webhooks';
  execute 'reset role';
end $$;

select 'ALL INTEGRATIONS RLS CHECKS PASSED' as result;
rollback;
