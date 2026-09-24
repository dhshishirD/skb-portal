-- rls_foundation.sql - proves the Phase 1 access rules. Run against LOCAL Supabase only:
--   psql "$(supabase status -o env | grep DB_URL | cut -d= -f2- | tr -d '"')" -f supabase/tests/rls_foundation.sql
-- Everything runs in one transaction and is rolled back. Any failed check raises an error.
begin;

-- ---------- fixtures (as superuser, RLS bypassed) ----------
insert into public.organizations (id, name, type) values
  ('00000000-0000-0000-0000-0000000000a1','Internal Org','internal'),
  ('00000000-0000-0000-0000-0000000000d1','Donor One','donor'),
  ('00000000-0000-0000-0000-0000000000d2','Donor Two','donor');

insert into auth.users (id) values
  ('10000000-0000-0000-0000-000000000001'), -- admin
  ('10000000-0000-0000-0000-000000000002'), -- executive
  ('10000000-0000-0000-0000-000000000003'), -- programme manager
  ('10000000-0000-0000-0000-000000000004'), -- field officer 1 (P1)
  ('10000000-0000-0000-0000-000000000005'), -- field officer 2 (P2)
  ('10000000-0000-0000-0000-000000000006'), -- finance
  ('10000000-0000-0000-0000-000000000007'), -- donor 1 user
  ('10000000-0000-0000-0000-000000000008'), -- donor 2 user
  ('10000000-0000-0000-0000-000000000009'), -- auditor, access expired
  ('10000000-0000-0000-0000-00000000000a'), -- auditor, access valid
  ('10000000-0000-0000-0000-00000000000b'); -- deactivated field officer

update public.profiles set org_id = '00000000-0000-0000-0000-0000000000a1'
  where id in (select id from auth.users where id::text like '10000000-0000-0000-0000-0000000000%'
               and id not in ('10000000-0000-0000-0000-000000000007','10000000-0000-0000-0000-000000000008'));
update public.profiles set org_id = '00000000-0000-0000-0000-0000000000d1' where id = '10000000-0000-0000-0000-000000000007';
update public.profiles set org_id = '00000000-0000-0000-0000-0000000000d2' where id = '10000000-0000-0000-0000-000000000008';
update public.profiles set is_active = false where id = '10000000-0000-0000-0000-00000000000b';

insert into public.user_roles (user_id, role) values
  ('10000000-0000-0000-0000-000000000001','super_admin'),
  ('10000000-0000-0000-0000-000000000002','executive'),
  ('10000000-0000-0000-0000-000000000003','programme_manager'),
  ('10000000-0000-0000-0000-000000000004','field_officer'),
  ('10000000-0000-0000-0000-000000000005','field_officer'),
  ('10000000-0000-0000-0000-000000000006','finance'),
  ('10000000-0000-0000-0000-000000000007','donor'),
  ('10000000-0000-0000-0000-000000000008','donor'),
  ('10000000-0000-0000-0000-000000000009','auditor'),
  ('10000000-0000-0000-0000-00000000000a','auditor'),
  ('10000000-0000-0000-0000-00000000000b','field_officer');

insert into public.grants (id, code, title, donor_org_id, total_amount) values
  ('20000000-0000-0000-0000-000000000001','G1','Grant 1','00000000-0000-0000-0000-0000000000d1',1000),
  ('20000000-0000-0000-0000-000000000002','G2','Grant 2','00000000-0000-0000-0000-0000000000d2',2000);
insert into public.projects (id, code, title, grant_id) values
  ('30000000-0000-0000-0000-000000000001','P1','Project 1','20000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000002','P2','Project 2','20000000-0000-0000-0000-000000000002');

insert into public.user_project_access (user_id, project_id, expires_at) values
  ('10000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000001',null),
  ('10000000-0000-0000-0000-000000000004','30000000-0000-0000-0000-000000000001',null),
  ('10000000-0000-0000-0000-000000000005','30000000-0000-0000-0000-000000000002',null),
  ('10000000-0000-0000-0000-000000000006','30000000-0000-0000-0000-000000000001',null),
  ('10000000-0000-0000-0000-000000000009','30000000-0000-0000-0000-000000000001', now() - interval '1 day'),
  ('10000000-0000-0000-0000-00000000000a','30000000-0000-0000-0000-000000000001', now() + interval '30 days'),
  ('10000000-0000-0000-0000-00000000000b','30000000-0000-0000-0000-000000000001',null);

-- ---------- checks ----------
do $$
declare n int; codes text;
begin
  -- 1. field officer sees only own project
  perform set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000004"}',true);
  execute 'set local role authenticated';
  select count(*), string_agg(code,',') into n, codes from public.projects;
  assert n = 1 and codes = 'P1', format('field officer 1 should see only P1, got %s (%s)', n, codes);
  execute 'reset role';

  -- 2. donors see only their own grants and projects
  perform set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000007"}',true);
  execute 'set local role authenticated';
  select string_agg(code,',') into codes from public.grants;
  assert codes = 'G1', 'donor 1 should see only G1, got ' || coalesce(codes,'none');
  select string_agg(code,',') into codes from public.projects;
  assert codes = 'P1', 'donor 1 should see only P1, got ' || coalesce(codes,'none');
  execute 'reset role';
  perform set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000008"}',true);
  execute 'set local role authenticated';
  select string_agg(code,',') into codes from public.grants;
  assert codes = 'G2', 'donor 2 should see only G2, got ' || coalesce(codes,'none');
  execute 'reset role';

  -- 3. auditor: expired access sees nothing, valid access sees P1
  perform set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000009"}',true);
  execute 'set local role authenticated';
  select count(*) into n from public.projects;
  assert n = 0, 'expired auditor must see 0 projects, got ' || n;
  execute 'reset role';
  perform set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-00000000000a"}',true);
  execute 'set local role authenticated';
  select count(*) into n from public.projects;
  assert n = 1, 'valid auditor must see 1 project, got ' || n;
  execute 'reset role';

  -- 4. deactivated user sees nothing
  perform set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-00000000000b"}',true);
  execute 'set local role authenticated';
  select count(*) into n from public.projects;
  assert n = 0, 'deactivated user must see 0 projects, got ' || n;
  execute 'reset role';

  -- 5. executive sees everything
  perform set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000002"}',true);
  execute 'set local role authenticated';
  select count(*) into n from public.projects;
  assert n = 2, 'executive must see 2 projects, got ' || n;
  execute 'reset role';

  -- 6. finance sees the grant tied to their project only
  perform set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000006"}',true);
  execute 'set local role authenticated';
  select string_agg(code,',') into codes from public.grants;
  assert codes = 'G1', 'finance should see only G1, got ' || coalesce(codes,'none');
  execute 'reset role';
end $$;

do $$
declare denied boolean; n int;
begin
  -- 7. anonymous: no access at all
  execute 'set local role anon';
  denied := false;
  begin perform count(*) from public.projects; exception when insufficient_privilege then denied := true; end;
  assert denied, 'anon must not read projects';
  execute 'reset role';

  -- 8. field officer cannot grant themselves roles or project access
  perform set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000004"}',true);
  execute 'set local role authenticated';
  denied := false;
  begin insert into public.user_roles (user_id, role) values ('10000000-0000-0000-0000-000000000004','executive');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'field officer must not insert own role';
  denied := false;
  begin insert into public.user_project_access (user_id, project_id)
        values ('10000000-0000-0000-0000-000000000004','30000000-0000-0000-0000-000000000002');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'field officer must not grant own project access';

  -- 9. cannot change own org or active flag; may change own name
  denied := false;
  begin update public.profiles set org_id = '00000000-0000-0000-0000-0000000000d1'
        where id = '10000000-0000-0000-0000-000000000004';
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'user must not change own org_id';
  denied := false;
  begin update public.profiles set is_active = true where id = '10000000-0000-0000-0000-000000000004';
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'user must not change own is_active';
  update public.profiles set full_name = 'Renamed' where id = '10000000-0000-0000-0000-000000000004';
  get diagnostics n = row_count;
  assert n = 1, 'user should update own full_name';

  -- 10. field officer cannot create projects or update someone else's project
  denied := false;
  begin insert into public.projects (code, title) values ('PX','Nope');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'field officer must not create projects';
  update public.projects set title = 'Hacked' where id = '30000000-0000-0000-0000-000000000002';
  get diagnostics n = row_count;
  assert n = 0, 'field officer must not update P2';
  execute 'reset role';

  -- 11. programme manager can create a project and read it back
  perform set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000003"}',true);
  execute 'set local role authenticated';
  insert into public.projects (code, title) values ('PM-NEW','Created by PM');
  select count(*) into n from public.projects where code = 'PM-NEW';
  assert n = 1, 'programme manager must see the project they created';
  execute 'reset role';
end $$;

do $$
declare denied boolean; n int;
begin
  -- 12. audit log: admin can read, field officer cannot, nobody can edit or delete
  perform set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000001"}',true);
  execute 'set local role authenticated';
  select count(*) into n from public.audit_log;
  assert n > 0, 'admin should see audit entries';
  denied := false;
  begin update public.audit_log set action = 'INSERT'; exception when insufficient_privilege then denied := true; end;
  assert denied, 'audit_log must not be updatable';
  denied := false;
  begin delete from public.audit_log; exception when insufficient_privilege then denied := true; end;
  assert denied, 'audit_log must not be deletable';
  execute 'reset role';
  perform set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000004"}',true);
  execute 'set local role authenticated';
  select count(*) into n from public.audit_log;
  assert n = 0, 'field officer must not read audit log';
  execute 'reset role';
end $$;

select 'ALL RLS FOUNDATION CHECKS PASSED' as result;
rollback;
