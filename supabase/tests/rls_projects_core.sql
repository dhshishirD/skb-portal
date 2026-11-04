-- rls_projects_core.sql - proves the 0012 rules for creating, editing and archiving projects.
-- One transaction, rolled back; any failed assert raises an error. LOCAL Supabase only.
begin;

-- ---------- fixtures (superuser, RLS bypassed) ----------
insert into public.organizations (id, name, type) values
  ('80000000-0000-0000-0000-0000000000a1','SKB (test)','internal');

insert into auth.users (id) values
  ('81000000-0000-0000-0000-000000000001'), -- executive (ED)
  ('81000000-0000-0000-0000-000000000002'), -- project officer A (creates projects)
  ('81000000-0000-0000-0000-000000000003'), -- project officer B (never assigned)
  ('81000000-0000-0000-0000-000000000004'), -- board (read-only)
  ('81000000-0000-0000-0000-000000000005'); -- field officer only

update public.profiles set org_id = '80000000-0000-0000-0000-0000000000a1'
  where id::text like '81000000-0000-0000-0000-00000000000%';

insert into public.user_roles (user_id, role) values
  ('81000000-0000-0000-0000-000000000001','executive'),
  ('81000000-0000-0000-0000-000000000002','project_officer'),
  ('81000000-0000-0000-0000-000000000003','project_officer'),
  ('81000000-0000-0000-0000-000000000004','board'),
  ('81000000-0000-0000-0000-000000000005','field_officer');

-- ---------- checks ----------
do $$
declare n int; denied boolean; new_id uuid;
begin
  -- 1. Officer A creates a project (INSERT ... RETURNING must work) with the new fields
  perform set_config('request.jwt.claims','{"sub":"81000000-0000-0000-0000-000000000002"}',true);
  execute 'set local role authenticated';
  insert into public.projects (code, title, location, donor_name, budget_amount, budget_currency,
                               beneficiary_target, ngoab_ref, created_by)
  values ('T-A1','Officer A project','Cox''s Bazar','IHH',150000.50,'EUR',200,'NGOAB/TEST/1',
          '81000000-0000-0000-0000-000000000002')
  returning id into new_id;
  assert new_id is not null, 'officer must be able to create a project and read it back';

  -- 1b. ... and can edit it
  update public.projects set title = 'Officer A project (edited)' where id = new_id;
  get diagnostics n = row_count;
  assert n = 1, 'officer must edit their own project';
  select count(*) into n from public.projects where code = 'T-A1';
  assert n = 1, 'creator must see their own project';

  -- 1c. ... but cannot fake created_by on insert
  denied := false;
  begin
    insert into public.projects (code, title, created_by)
    values ('T-FAKE','Faked creator','81000000-0000-0000-0000-000000000001');
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'officer must not set created_by to someone else';

  -- 1d. ... cannot reassign created_by
  denied := false;
  begin
    update public.projects set created_by = '81000000-0000-0000-0000-000000000001' where id = new_id;
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'created_by must not change';

  -- 1e. ... cannot archive
  denied := false;
  begin
    update public.projects set deleted_at = now() where id = new_id;
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'officer must not archive a project';

  -- 1f. input checks
  denied := false;
  begin
    insert into public.projects (code, title, created_by)
    values ('bad code!','Valid title','81000000-0000-0000-0000-000000000002');
  exception when check_violation then denied := true;
  end;
  assert denied, 'bad project code must be rejected';
  denied := false;
  begin
    insert into public.projects (code, title, created_by)
    values ('T-SHORT','ab','81000000-0000-0000-0000-000000000002');
  exception when check_violation then denied := true;
  end;
  assert denied, 'too-short title must be rejected';
  denied := false;
  begin
    insert into public.projects (code, title, budget_currency, created_by)
    values ('T-CUR','Valid title','euro','81000000-0000-0000-0000-000000000002');
  exception when check_violation or string_data_right_truncation then denied := true;
  end;
  assert denied, 'bad currency must be rejected';
  execute 'reset role';

  -- 2. Officer B (unassigned) sees nothing and cannot edit Officer A's project
  perform set_config('request.jwt.claims','{"sub":"81000000-0000-0000-0000-000000000003"}',true);
  execute 'set local role authenticated';
  select count(*) into n from public.projects where code like 'T-%';
  assert n = 0, format('unassigned officer must see no projects, got %s', n);
  update public.projects set title = 'hijacked' where code = 'T-A1';
  get diagnostics n = row_count;
  assert n = 0, 'unassigned officer must not edit another project';
  execute 'reset role';

  -- 2b. Once assigned, Officer B sees and edits it, but still cannot archive
  insert into public.user_project_access (user_id, project_id)
  values ('81000000-0000-0000-0000-000000000003', new_id);
  perform set_config('request.jwt.claims','{"sub":"81000000-0000-0000-0000-000000000003"}',true);
  execute 'set local role authenticated';
  select count(*) into n from public.projects where code = 'T-A1';
  assert n = 1, 'assigned officer must see the project';
  update public.projects set location = 'Ukhiya' where code = 'T-A1';
  get diagnostics n = row_count;
  assert n = 1, 'assigned officer must edit the project';
  denied := false;
  begin
    update public.projects set deleted_at = now() where code = 'T-A1';
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'assigned officer must not archive';
  execute 'reset role';

  -- 3. Board reads everything, writes nothing
  perform set_config('request.jwt.claims','{"sub":"81000000-0000-0000-0000-000000000004"}',true);
  execute 'set local role authenticated';
  select count(*) into n from public.projects where code = 'T-A1';
  assert n = 1, 'board must read all projects';
  denied := false;
  begin
    insert into public.projects (code, title, created_by)
    values ('T-BOARD','Board project','81000000-0000-0000-0000-000000000004');
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'board must not create projects';
  update public.projects set title = 'board edit' where code = 'T-A1';
  get diagnostics n = row_count;
  assert n = 0, 'board must not edit projects';
  execute 'reset role';

  -- 4. A field officer alone cannot create projects
  perform set_config('request.jwt.claims','{"sub":"81000000-0000-0000-0000-000000000005"}',true);
  execute 'set local role authenticated';
  denied := false;
  begin
    insert into public.projects (code, title, created_by)
    values ('T-FIELD','Field project','81000000-0000-0000-0000-000000000005');
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'field officer alone must not create projects';
  execute 'reset role';

  -- 5. The Executive Director can create, see everything, and archive
  perform set_config('request.jwt.claims','{"sub":"81000000-0000-0000-0000-000000000001"}',true);
  execute 'set local role authenticated';
  insert into public.projects (code, title, created_by)
  values ('T-ED','ED project','81000000-0000-0000-0000-000000000001');
  select count(*) into n from public.projects where code in ('T-A1','T-ED');
  assert n = 2, format('ED should see both projects, got %s', n);
  update public.projects set deleted_at = now() where code = 'T-A1';
  get diagnostics n = row_count;
  assert n = 1, 'ED must be able to archive a project';
  select count(*) into n from public.projects where code = 'T-A1';
  assert n = 0, 'an archived project disappears from the list';
  execute 'reset role';

  -- 6. TRUNCATE is denied to signed-in users
  perform set_config('request.jwt.claims','{"sub":"81000000-0000-0000-0000-000000000001"}',true);
  execute 'set local role authenticated';
  denied := false;
  begin
    execute 'truncate table public.projects cascade';
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'authenticated must not be able to TRUNCATE';
  execute 'reset role';
end $$;

-- Private bucket exists and is not public
do $$
declare is_public boolean;
begin
  select public into is_public from storage.buckets where id = 'beneficiary-vault';
  assert is_public is not null, 'beneficiary-vault bucket must exist';
  assert is_public = false, 'beneficiary-vault bucket must be private';
end $$;

-- Anonymous visitors still read nothing
do $$
declare n int; denied boolean := false;
begin
  execute 'set local role anon';
  begin
    select count(*) into n from public.projects;
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'anon must have no access to projects';
  execute 'reset role';
end $$;

select 'ALL PROJECTS CORE RLS CHECKS PASSED' as result;
rollback;
