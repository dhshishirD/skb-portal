-- rls_form_texts.sql - proves the 0036 rules for the donor form texts.
-- One transaction, rolled back; any failed assert raises an error. LOCAL / STAGING Supabase only.
-- All values below are synthetic test data.
begin;

insert into auth.users (id) values
  ('e5000000-0000-0000-0000-000000000001'), -- executive
  ('e5000000-0000-0000-0000-000000000002'), -- project officer (assigned)
  ('e5000000-0000-0000-0000-000000000003'), -- field officer (assigned)
  ('e5000000-0000-0000-0000-000000000004'), -- board
  ('e5000000-0000-0000-0000-000000000005'), -- donor
  ('e5000000-0000-0000-0000-000000000006'), -- project officer (never assigned)
  ('e5000000-0000-0000-0000-000000000008'), -- M&E officer (assigned)
  ('e5000000-0000-0000-0000-000000000009'); -- legal officer
insert into public.user_roles (user_id, role) values
  ('e5000000-0000-0000-0000-000000000001','executive'),
  ('e5000000-0000-0000-0000-000000000002','project_officer'),
  ('e5000000-0000-0000-0000-000000000003','field_officer'),
  ('e5000000-0000-0000-0000-000000000004','board'),
  ('e5000000-0000-0000-0000-000000000005','donor'),
  ('e5000000-0000-0000-0000-000000000006','project_officer'),
  ('e5000000-0000-0000-0000-000000000008','me_officer'),
  ('e5000000-0000-0000-0000-000000000009','legal_officer');
insert into public.projects (id, code, title) values
  ('e6000000-0000-0000-0000-00000000000b','FT-MAIN','Main test project'),
  ('e6000000-0000-0000-0000-00000000000c','FT-SHUT','Project to close');
insert into public.user_project_access (user_id, project_id) values
  ('e5000000-0000-0000-0000-000000000002','e6000000-0000-0000-0000-00000000000b'),
  ('e5000000-0000-0000-0000-000000000003','e6000000-0000-0000-0000-00000000000b'),
  ('e5000000-0000-0000-0000-000000000008','e6000000-0000-0000-0000-00000000000b'),
  ('e5000000-0000-0000-0000-000000000002','e6000000-0000-0000-0000-00000000000c');

create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid)::text, true);
  execute 'set local role authenticated';
end $$;

do $$
declare
  ed text := 'e5000000-0000-0000-0000-000000000001';
  po text := 'e5000000-0000-0000-0000-000000000002';
  fo text := 'e5000000-0000-0000-0000-000000000003';
  bd text := 'e5000000-0000-0000-0000-000000000004';
  dn text := 'e5000000-0000-0000-0000-000000000005';
  px text := 'e5000000-0000-0000-0000-000000000006';
  me text := 'e5000000-0000-0000-0000-000000000008';
  lg text := 'e5000000-0000-0000-0000-000000000009';
  pid uuid := 'e6000000-0000-0000-0000-00000000000b';
  sid uuid := 'e6000000-0000-0000-0000-00000000000c';
  denied boolean;
begin
  -- 1. A project officer on the project saves the texts; the editor is the signed-in user
  perform pg_temp.as_user(po);
  insert into public.project_form_texts (project_id, rationale, experience, updated_by)
    values (pid, 'Families need food.', 'Ten years of food aid.', ed::uuid);
  assert (select updated_by from public.project_form_texts where project_id = pid) = po::uuid, 'updated_by is the signed-in user';
  update public.project_form_texts set sustainability = 'Local committees continue it.' where project_id = pid;
  assert (select sustainability from public.project_form_texts where project_id = pid) = 'Local committees continue it.', 'the officer can edit';

  -- 2. Only one row per project, and long texts are refused
  denied := false;
  begin insert into public.project_form_texts (project_id) values (pid);
  exception when unique_violation then denied := true; end;
  assert denied, 'one row per project';
  denied := false;
  begin update public.project_form_texts set experience = repeat('x', 4001) where project_id = pid;
  exception when check_violation then denied := true; end;
  assert denied, 'a text over 4000 letters is refused';

  -- 3. Who can read: M&E on the project, the board and the legal officer (oversight); not the others
  perform pg_temp.as_user(me);
  assert (select count(*) from public.project_form_texts where project_id = pid) = 1, 'M&E officer on the project reads';
  perform pg_temp.as_user(bd);
  assert (select count(*) from public.project_form_texts where project_id = pid) = 1, 'the board reads';
  perform pg_temp.as_user(lg);
  assert (select count(*) from public.project_form_texts where project_id = pid) = 1, 'the legal officer reads';
  perform pg_temp.as_user(dn);
  assert (select count(*) from public.project_form_texts where project_id = pid) = 0, 'the donor sees nothing';
  perform pg_temp.as_user(fo);
  assert (select count(*) from public.project_form_texts where project_id = pid) = 0, 'the field officer sees nothing';
  perform pg_temp.as_user(px);
  assert (select count(*) from public.project_form_texts where project_id = pid) = 0, 'an officer not on the project sees nothing';

  -- 4. Who can write: not M&E, board, legal, donor, field officer, or an officer not on the project
  perform pg_temp.as_user(me);
  update public.project_form_texts set rationale = 'Hacked' where project_id = pid;
  assert (select rationale from public.project_form_texts where project_id = pid) is distinct from 'Hacked', 'M&E cannot edit';
  perform pg_temp.as_user(lg);
  update public.project_form_texts set rationale = 'Hacked' where project_id = pid;
  perform pg_temp.as_user(px);
  denied := false;
  begin insert into public.project_form_texts (project_id) values (sid);
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'an officer not on the project cannot write';
  perform pg_temp.as_user(dn);
  denied := false;
  begin insert into public.project_form_texts (project_id) values (sid);
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'the donor cannot write';
  perform pg_temp.as_user(po);
  assert (select rationale from public.project_form_texts where project_id = pid) = 'Families need food.', 'nobody else changed the text';

  -- 5. Delete: M&E may not, the officer may
  perform pg_temp.as_user(me);
  delete from public.project_form_texts where project_id = pid;
  assert (select count(*) from public.project_form_texts where project_id = pid) = 1, 'M&E cannot delete';

  -- 6. Audit log
  reset role;
  perform set_config('request.jwt.claims', '', true);
  assert (select count(*) from public.audit_log where table_name = 'project_form_texts') >= 2, 'changes are in the audit log';

  -- 7. A closed project is frozen
  insert into public.project_form_texts (project_id, rationale) values (sid, 'Frozen');
  update public.projects set stage = 'closed' where id = sid;
  perform pg_temp.as_user(po);
  denied := false;
  begin update public.project_form_texts set rationale = 'Changed' where project_id = sid;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a closed project text cannot be edited';
  denied := false;
  begin delete from public.project_form_texts where project_id = sid;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a closed project text cannot be deleted';
end $$;

rollback;
