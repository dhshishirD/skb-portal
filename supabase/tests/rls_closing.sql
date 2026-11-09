-- rls_closing.sql - proves the 0023 rules for the closing checklist and the Form-7 text.
-- One transaction, rolled back; any failed assert raises an error. LOCAL / STAGING Supabase only.
-- All values below are synthetic test data.
begin;

insert into public.organizations (id, name, type) values
  ('c0000000-0000-0000-0000-0000000000a1','SKB (test)','internal'),
  ('c0000000-0000-0000-0000-0000000000d1','Donor (test)','donor');
insert into auth.users (id) values
  ('c1000000-0000-0000-0000-000000000001'), -- executive
  ('c1000000-0000-0000-0000-000000000002'), -- project officer (assigned)
  ('c1000000-0000-0000-0000-000000000003'), -- field officer (assigned)
  ('c1000000-0000-0000-0000-000000000004'), -- board
  ('c1000000-0000-0000-0000-000000000005'), -- donor
  ('c1000000-0000-0000-0000-000000000007'), -- project officer (never assigned)
  ('c1000000-0000-0000-0000-000000000008'), -- programme manager (assigned)
  ('c1000000-0000-0000-0000-000000000009'); -- legal officer
update public.profiles set org_id = 'c0000000-0000-0000-0000-0000000000a1' where id::text like 'c1000000-%' and id::text not like '%05';
update public.profiles set org_id = 'c0000000-0000-0000-0000-0000000000d1' where id = 'c1000000-0000-0000-0000-000000000005';
insert into public.user_roles (user_id, role) values
  ('c1000000-0000-0000-0000-000000000001','executive'),
  ('c1000000-0000-0000-0000-000000000002','project_officer'),
  ('c1000000-0000-0000-0000-000000000003','field_officer'),
  ('c1000000-0000-0000-0000-000000000004','board'),
  ('c1000000-0000-0000-0000-000000000005','donor'),
  ('c1000000-0000-0000-0000-000000000007','project_officer'),
  ('c1000000-0000-0000-0000-000000000008','programme_manager'),
  ('c1000000-0000-0000-0000-000000000009','legal_officer');
insert into public.grants (id, code, title, donor_org_id, total_amount) values
  ('c2000000-0000-0000-0000-00000000000a','CG','Closing grant','c0000000-0000-0000-0000-0000000000d1',1000);
insert into public.projects (id, code, title, grant_id) values
  ('c3000000-0000-0000-0000-00000000000a','CL-DONOR','Donor-funded project','c2000000-0000-0000-0000-00000000000a'),
  ('c3000000-0000-0000-0000-00000000000b','CL-MAIN','Main test project',null),
  ('c3000000-0000-0000-0000-00000000000c','CL-OTHER','Other project',null),
  ('c3000000-0000-0000-0000-00000000000d','CL-SHUT','Project to close',null);
insert into public.user_project_access (user_id, project_id) values
  ('c1000000-0000-0000-0000-000000000002','c3000000-0000-0000-0000-00000000000b'),
  ('c1000000-0000-0000-0000-000000000003','c3000000-0000-0000-0000-00000000000b'),
  ('c1000000-0000-0000-0000-000000000008','c3000000-0000-0000-0000-00000000000b'),
  ('c1000000-0000-0000-0000-000000000002','c3000000-0000-0000-0000-00000000000d');
insert into public.documents (id, project_id, title, category) values
  ('c4000000-0000-0000-0000-00000000000b','c3000000-0000-0000-0000-00000000000b','Signed Form-7 scan','form7'),
  ('c4000000-0000-0000-0000-00000000000c','c3000000-0000-0000-0000-00000000000c','Other project file','other');

create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid)::text, true);
  execute 'set local role authenticated';
end $$;

do $$
declare
  ed text := 'c1000000-0000-0000-0000-000000000001';
  po text := 'c1000000-0000-0000-0000-000000000002';
  fo text := 'c1000000-0000-0000-0000-000000000003';
  bd text := 'c1000000-0000-0000-0000-000000000004';
  dn text := 'c1000000-0000-0000-0000-000000000005';
  px text := 'c1000000-0000-0000-0000-000000000007';
  pm text := 'c1000000-0000-0000-0000-000000000008';
  lg text := 'c1000000-0000-0000-0000-000000000009';
  pid uuid := 'c3000000-0000-0000-0000-00000000000b';
  oid uuid := 'c3000000-0000-0000-0000-00000000000c';
  sid uuid := 'c3000000-0000-0000-0000-00000000000d';
  gd uuid := 'c4000000-0000-0000-0000-00000000000b';
  xd uuid := 'c4000000-0000-0000-0000-00000000000c';
  k text; n int; denied boolean;
begin
  -- 0. the fixed checklist is in place
  assert (select count(*) from public.closing_checklist_items) = 11, 'the checklist has 11 items';

  -- 1. A project officer starts the report: sign-off fields are forced empty, author recorded
  perform pg_temp.as_user(po);
  insert into public.project_closing_reports (project_id, project_summary, signed_off_by, signed_off_at)
    values (pid, 'Food packages for 100 families.', po::uuid, now());
  assert (select signed_off_at from public.project_closing_reports where project_id = pid) is null, 'a new report is not signed off';
  assert (select signed_off_by from public.project_closing_reports where project_id = pid) is null, 'signed_off_by is empty on insert';
  assert (select updated_by from public.project_closing_reports where project_id = pid) = po::uuid, 'updated_by is the signed-in user';
  update public.project_closing_reports set challenges = 'Road flooding.', updated_by = px::uuid where project_id = pid;
  assert (select updated_by from public.project_closing_reports where project_id = pid) = po::uuid, 'updated_by cannot be set by hand';
  denied := false;
  begin update public.project_closing_reports set local_manpower = repeat('x', 2001) where project_id = pid;
  exception when check_violation then denied := true; end;
  assert denied, 'text over the limit is refused';
  denied := false;
  begin update public.project_closing_reports set families_count = -1 where project_id = pid;
  exception when check_violation then denied := true; end;
  assert denied, 'a negative number of families is refused';
  update public.project_closing_reports set families_count = 67 where project_id = pid;
  denied := false;
  begin insert into public.project_closing_reports (project_id) values (pid);
  exception when unique_violation then denied := true; end;
  assert denied, 'one report per project';

  -- 2. Ticks: checker forced, note kept, same item twice refused, document must be from this project
  insert into public.project_closing_checks (project_id, item_key, note, checked_by, document_id)
    values (pid, 'form7_signed', 'Scan uploaded', px::uuid, gd);
  assert (select checked_by from public.project_closing_checks where project_id = pid and item_key = 'form7_signed') = po::uuid, 'checked_by is the signed-in user';
  denied := false;
  begin insert into public.project_closing_checks (project_id, item_key) values (pid, 'form7_signed');
  exception when unique_violation then denied := true; end;
  assert denied, 'an item cannot be ticked twice';
  denied := false;
  begin insert into public.project_closing_checks (project_id, item_key, document_id) values (pid, 'photos_filed', xd);
  exception when check_violation then denied := true; end;
  assert denied, 'a document from another project cannot be linked';
  denied := false;
  begin update public.project_closing_checks set note = 'edit' where project_id = pid and item_key = 'form7_signed';
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a tick cannot be edited in place (no update grant)';

  -- 3. Who writes
  perform pg_temp.as_user(fo);
  denied := false;
  begin insert into public.project_closing_checks (project_id, item_key) values (pid, 'photos_filed');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a field officer cannot tick items';
  assert (select count(*) from public.project_closing_checks where project_id = pid) = 1, 'the field officer on the project reads the ticks';
  perform pg_temp.as_user(px);
  assert (select count(*) from public.project_closing_reports where project_id = pid) = 0, 'an unassigned officer sees no report';
  denied := false;
  begin insert into public.project_closing_checks (project_id, item_key) values (pid, 'photos_filed');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'an unassigned officer cannot tick items';
  perform pg_temp.as_user(dn);
  assert (select count(*) from public.project_closing_reports) = 0, 'the donor sees no report';
  assert (select count(*) from public.project_closing_checks) = 0, 'the donor sees no ticks';
  assert (select count(*) from public.closing_checklist_items) = 0, 'the donor sees no checklist';
  perform pg_temp.as_user(bd);
  assert (select count(*) from public.project_closing_reports) >= 1, 'the board reads reports';
  perform pg_temp.as_user(lg);
  assert (select count(*) from public.project_closing_checks) >= 1, 'the legal officer reads ticks';
  denied := false;
  begin insert into public.project_closing_checks (project_id, item_key) values (pid, 'photos_filed');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'the legal officer cannot tick items';

  -- 4. Sign-off: only the Executive Director, and only when every item is ticked
  perform pg_temp.as_user(po);
  denied := false;
  begin update public.project_closing_reports set signed_off_at = now() where project_id = pid;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a project officer cannot sign off';
  perform pg_temp.as_user(pm);
  denied := false;
  begin update public.project_closing_reports set signed_off_at = now() where project_id = pid;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a programme manager cannot sign off';
  perform pg_temp.as_user(ed);
  denied := false;
  begin update public.project_closing_reports set signed_off_at = now() where project_id = pid;
  exception when check_violation then denied := true; end;
  assert denied, 'sign-off needs every item ticked';

  perform pg_temp.as_user(po);
  for k in select key from public.closing_checklist_items where key <> 'form7_signed' loop
    insert into public.project_closing_checks (project_id, item_key) values (pid, k);
  end loop;
  assert (select count(*) from public.project_closing_checks where project_id = pid) = 11, 'all 11 items are ticked';

  perform pg_temp.as_user(ed);
  update public.project_closing_reports set signed_off_at = now(), signed_off_by = po::uuid where project_id = pid;
  assert (select signed_off_by from public.project_closing_reports where project_id = pid) = ed::uuid, 'signed_off_by is the Executive Director';
  assert (select signed_off_at from public.project_closing_reports where project_id = pid) is not null, 'the report is signed off';

  -- 5. After sign-off the text and the ticks are frozen
  perform pg_temp.as_user(po);
  denied := false;
  begin update public.project_closing_reports set challenges = 'Changed after sign-off' where project_id = pid;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'the text is frozen after sign-off';
  denied := false;
  begin delete from public.project_closing_checks where project_id = pid and item_key = 'photos_filed';
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a tick cannot be removed after sign-off';
  denied := false;
  begin update public.project_closing_reports set signed_off_at = null where project_id = pid;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a project officer cannot reopen';

  -- 6. The Executive Director reopens; editing works again
  perform pg_temp.as_user(ed);
  update public.project_closing_reports set signed_off_at = null where project_id = pid;
  assert (select signed_off_at from public.project_closing_reports where project_id = pid) is null, 'reopened';
  assert (select signed_off_by from public.project_closing_reports where project_id = pid) is null, 'signed_off_by cleared on reopen';
  perform pg_temp.as_user(po);
  update public.project_closing_reports set challenges = 'Road flooding, delayed by one day.' where project_id = pid;
  delete from public.project_closing_checks where project_id = pid and item_key = 'photos_filed';
  assert (select count(*) from public.project_closing_checks where project_id = pid) = 10, 'a tick can be removed while open';
  denied := false;
  begin delete from public.project_closing_reports where project_id = pid;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a report cannot be deleted';

  -- 7. Audit log
  reset role;
  perform set_config('request.jwt.claims', '', true);
  assert (select count(*) from public.audit_log where table_name = 'project_closing_reports') >= 4, 'report changes are in the audit log';
  assert (select count(*) from public.audit_log where table_name = 'project_closing_checks') >= 11, 'tick changes are in the audit log';

  -- 8. A closed project is frozen
  insert into public.project_closing_reports (project_id, project_summary) values (sid, 'Before closing');
  update public.projects set stage = 'closed' where id = sid;
  perform pg_temp.as_user(po);
  denied := false;
  begin update public.project_closing_reports set project_summary = 'After closing' where project_id = sid;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'the report of a closed project is frozen';
  denied := false;
  begin insert into public.project_closing_checks (project_id, item_key) values (sid, 'photos_filed');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'the checklist of a closed project is frozen';
end $$;

rollback;
