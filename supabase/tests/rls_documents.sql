-- rls_documents.sql - proves the 0022 rules for project documents and their versions.
-- One transaction, rolled back; any failed assert raises an error. LOCAL / STAGING Supabase only.
-- All values below are synthetic test data.
begin;

insert into public.organizations (id, name, type) values
  ('b0000000-0000-0000-0000-0000000000a1','SKB (test)','internal'),
  ('b0000000-0000-0000-0000-0000000000d1','Donor (test)','donor');
insert into auth.users (id) values
  ('b1000000-0000-0000-0000-000000000001'), -- executive
  ('b1000000-0000-0000-0000-000000000002'), -- project officer (assigned)
  ('b1000000-0000-0000-0000-000000000003'), -- field officer (assigned)
  ('b1000000-0000-0000-0000-000000000004'), -- board
  ('b1000000-0000-0000-0000-000000000005'), -- donor
  ('b1000000-0000-0000-0000-000000000006'), -- finance (assigned)
  ('b1000000-0000-0000-0000-000000000007'), -- project officer (never assigned)
  ('b1000000-0000-0000-0000-000000000008'), -- programme manager (assigned)
  ('b1000000-0000-0000-0000-000000000009'); -- legal officer
update public.profiles set org_id = 'b0000000-0000-0000-0000-0000000000a1' where id::text like 'b1000000-%' and id::text not like '%05';
update public.profiles set org_id = 'b0000000-0000-0000-0000-0000000000d1' where id = 'b1000000-0000-0000-0000-000000000005';
insert into public.user_roles (user_id, role) values
  ('b1000000-0000-0000-0000-000000000001','executive'),
  ('b1000000-0000-0000-0000-000000000002','project_officer'),
  ('b1000000-0000-0000-0000-000000000003','field_officer'),
  ('b1000000-0000-0000-0000-000000000004','board'),
  ('b1000000-0000-0000-0000-000000000005','donor'),
  ('b1000000-0000-0000-0000-000000000006','finance'),
  ('b1000000-0000-0000-0000-000000000007','project_officer'),
  ('b1000000-0000-0000-0000-000000000008','programme_manager'),
  ('b1000000-0000-0000-0000-000000000009','legal_officer');
insert into public.grants (id, code, title, donor_org_id, total_amount) values
  ('b2000000-0000-0000-0000-00000000000a','DG','Document grant','b0000000-0000-0000-0000-0000000000d1',1000);
insert into public.projects (id, code, title, grant_id) values
  ('b3000000-0000-0000-0000-00000000000a','DOC-DONOR','Donor-funded project','b2000000-0000-0000-0000-00000000000a'),
  ('b3000000-0000-0000-0000-00000000000b','DOC-MAIN','Main test project',null),
  ('b3000000-0000-0000-0000-00000000000c','DOC-OTHER','Other project',null);
insert into public.user_project_access (user_id, project_id) values
  ('b1000000-0000-0000-0000-000000000002','b3000000-0000-0000-0000-00000000000b'),
  ('b1000000-0000-0000-0000-000000000003','b3000000-0000-0000-0000-00000000000b'),
  ('b1000000-0000-0000-0000-000000000006','b3000000-0000-0000-0000-00000000000b'),
  ('b1000000-0000-0000-0000-000000000008','b3000000-0000-0000-0000-00000000000b');

-- on the donor-funded project (inserted as the database owner): one released and one internal document
insert into public.documents (id, project_id, title, category) values
  ('b4000000-0000-0000-0000-00000000000a','b3000000-0000-0000-0000-00000000000a','Released report','form7'),
  ('b4000000-0000-0000-0000-00000000000b','b3000000-0000-0000-0000-00000000000a','Internal memo','other');
insert into public.document_versions (id, document_id, storage_path, mime, size, original_name) values
  ('b5000000-0000-0000-0000-00000000000a','b4000000-0000-0000-0000-00000000000a','b3000000-0000-0000-0000-00000000000a/r.pdf','application/pdf',100,'r.pdf'),
  ('b5000000-0000-0000-0000-00000000000b','b4000000-0000-0000-0000-00000000000b','b3000000-0000-0000-0000-00000000000a/m.pdf','application/pdf',100,'m.pdf');
update public.documents set current_version_id = 'b5000000-0000-0000-0000-00000000000a', released_to_donor = true where id = 'b4000000-0000-0000-0000-00000000000a';
update public.documents set current_version_id = 'b5000000-0000-0000-0000-00000000000b' where id = 'b4000000-0000-0000-0000-00000000000b';

create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid)::text, true);
  execute 'set local role authenticated';
end $$;

do $$
declare
  ed text := 'b1000000-0000-0000-0000-000000000001';
  po text := 'b1000000-0000-0000-0000-000000000002';
  fo text := 'b1000000-0000-0000-0000-000000000003';
  bd text := 'b1000000-0000-0000-0000-000000000004';
  dn text := 'b1000000-0000-0000-0000-000000000005';
  fin text := 'b1000000-0000-0000-0000-000000000006';
  px text := 'b1000000-0000-0000-0000-000000000007';
  pm text := 'b1000000-0000-0000-0000-000000000008';
  lg text := 'b1000000-0000-0000-0000-000000000009';
  pid uuid := 'b3000000-0000-0000-0000-00000000000b';
  oid uuid := 'b3000000-0000-0000-0000-00000000000c';
  d1 uuid; d2 uuid; v1 uuid; v2 uuid; vx uuid; n int; denied boolean;
begin
  -- 1. A project officer adds a document: the database sets the author and keeps it unreleased
  perform pg_temp.as_user(po);
  insert into public.documents (project_id, title, category, created_by, released_to_donor, released_by)
    values (pid, 'Grant agreement', 'agreement', px::uuid, true, px::uuid) returning id into d1;
  assert (select created_by from public.documents where id = d1) = po::uuid, 'created_by is the signed-in user';
  assert (select released_to_donor from public.documents where id = d1) = false, 'a new document is not released';
  assert (select released_by from public.documents where id = d1) is null, 'released_by is empty on insert';
  assert (select current_version_id from public.documents where id = d1) is null, 'no current version on insert';
  insert into public.documents (project_id, title, category) values (pid, 'Second document', 'other') returning id into d2;

  denied := false;
  begin insert into public.documents (project_id, title, category) values (pid, 'x', 'other');
  exception when check_violation then denied := true; end;
  assert denied, 'a one-letter title is refused';

  -- 2. Versions: numbered by the database, uploader forced, path must belong to the project
  insert into public.document_versions (document_id, storage_path, mime, size, original_name, version_no, uploaded_by)
    values (d1, pid::text || '/a.pdf', 'application/pdf', 1000, 'a.pdf', 99, px::uuid) returning id into v1;
  assert (select version_no from public.document_versions where id = v1) = 1, 'the database numbers the first version';
  assert (select uploaded_by from public.document_versions where id = v1) = po::uuid, 'uploaded_by is the signed-in user';
  insert into public.document_versions (document_id, storage_path, mime, size) values (d1, pid::text || '/b.pdf', 'application/pdf', 2000) returning id into v2;
  assert (select version_no from public.document_versions where id = v2) = 2, 'the second version is number 2';
  insert into public.document_versions (document_id, storage_path, mime, size) values (d2, pid::text || '/c.pdf', 'application/pdf', 10) returning id into vx;

  denied := false;
  begin insert into public.document_versions (document_id, storage_path, mime, size) values (d1, oid::text || '/stolen.pdf', 'application/pdf', 10);
  exception when check_violation then denied := true; end;
  assert denied, 'a file path from another project is refused';
  denied := false;
  begin insert into public.document_versions (document_id, storage_path, mime, size) values (d1, pid::text || '/e.pdf', 'application/pdf', 0);
  exception when check_violation then denied := true; end;
  assert denied, 'an empty file is refused';
  denied := false;
  begin update public.document_versions set size = 5 where id = v1;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a version cannot be edited';
  denied := false;
  begin delete from public.document_versions where id = v1;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a version cannot be deleted';

  -- 3. Current version must belong to the document
  denied := false;
  begin update public.documents set current_version_id = vx where id = d1;
  exception when check_violation then denied := true; end;
  assert denied, 'the current version must be a version of the same document';
  update public.documents set current_version_id = v2 where id = d1;
  assert (select current_version_id from public.documents where id = d1) = v2, 'the newest version can be made current';

  -- 4. Release to the donor: only the Executive Director or Programme Manager, and only with a file
  denied := false;
  begin update public.documents set released_to_donor = true where id = d1;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a project officer cannot release to the donor';
  perform pg_temp.as_user(pm);
  denied := false;
  begin update public.documents set released_to_donor = true where id = d2;
  exception when check_violation then denied := true; end;
  assert denied, 'a document with no file cannot be released';
  update public.documents set released_to_donor = true where id = d1;
  assert (select released_by from public.documents where id = d1) = pm::uuid, 'released_by is the person who released';
  assert (select released_at from public.documents where id = d1) is not null, 'released_at is set';
  update public.documents set title = 'Grant agreement v2', released_by = po::uuid where id = d1;
  assert (select released_by from public.documents where id = d1) = pm::uuid, 'released_by cannot be rewritten by an edit';

  -- 5. Who reads and who writes
  perform pg_temp.as_user(fo);
  assert (select count(*) from public.documents where project_id = pid) = 2, 'the field officer on the project reads';
  assert (select count(*) from public.document_versions where document_id = d1) = 2, 'the field officer reads versions';
  denied := false;
  begin insert into public.documents (project_id, title, category) values (pid, 'Field upload', 'other');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a field officer cannot add documents';
  perform pg_temp.as_user(fin);
  assert (select count(*) from public.documents where project_id = pid) = 2, 'finance on the project reads';
  denied := false;
  begin insert into public.documents (project_id, title, category) values (pid, 'Finance upload', 'other');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'finance cannot add documents';
  perform pg_temp.as_user(px);
  assert (select count(*) from public.documents where project_id = pid) = 0, 'an unassigned officer sees nothing';
  denied := false;
  begin insert into public.documents (project_id, title, category) values (pid, 'Sneaky', 'other');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'an unassigned officer cannot add documents';
  perform pg_temp.as_user(bd);
  assert (select count(*) from public.documents) >= 3, 'the board reads documents';
  assert (select count(*) from public.document_versions) >= 4, 'the board reads versions';
  perform pg_temp.as_user(lg);
  assert (select count(*) from public.documents) >= 3, 'the legal officer reads documents';
  perform pg_temp.as_user(ed);
  assert (select count(*) from public.documents where project_id = pid) = 2, 'the executive director reads';

  -- 6. The donor sees only what was released, on its own project
  perform pg_temp.as_user(dn);
  assert (select count(*) from public.documents) = 1, 'the donor sees exactly one document (the released one)';
  assert (select title from public.documents) = 'Released report', 'the donor sees the released document';
  assert (select count(*) from public.document_versions) = 1, 'the donor sees only the released version';
  denied := false;
  begin insert into public.documents (project_id, title, category) values ('b3000000-0000-0000-0000-00000000000a', 'Donor upload', 'other');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a donor cannot add documents';
  update public.documents set released_to_donor = false where id = 'b4000000-0000-0000-0000-00000000000a';
  get diagnostics n = row_count;
  assert n = 0, 'a donor cannot withdraw a release (or change anything)';

  -- 7. Removing: hidden, withdrawn from the donor, frozen, never deleted for good
  perform pg_temp.as_user(po);
  update public.documents set deleted_at = now() where id = d1;
  assert (select released_to_donor from public.documents where id = d1) = false, 'removing a document withdraws it from the donor';
  denied := false;
  begin update public.documents set title = 'Edit after remove' where id = d1;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a removed document cannot be edited';
  denied := false;
  begin insert into public.document_versions (document_id, storage_path, mime, size) values (d1, pid::text || '/f.pdf', 'application/pdf', 10);
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a removed document cannot get new versions';
  denied := false;
  begin delete from public.documents where id = d2;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a document cannot be deleted for good';

  -- 8. Audit
  reset role;
  assert (select count(*) from public.audit_log where table_name = 'documents' and record_id = d1::text) >= 3, 'document changes are in the audit log';
  assert (select count(*) from public.audit_log where table_name = 'document_versions' and record_id = v1::text) >= 1, 'version inserts are in the audit log';

  -- 9. A closed project is frozen
  perform set_config('request.jwt.claims', '', true);
  update public.projects set stage = 'closed' where id = pid;
  perform pg_temp.as_user(po);
  denied := false;
  begin insert into public.documents (project_id, title, category) values (pid, 'After closing', 'other');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a closed project cannot get new documents';
  denied := false;
  begin insert into public.document_versions (document_id, storage_path, mime, size) values (d2, pid::text || '/g.pdf', 'application/pdf', 10);
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a closed project cannot get new versions';
  denied := false;
  begin update public.documents set title = 'Edit after closing' where id = d2;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a closed project document cannot be edited';
end $$;

rollback;
