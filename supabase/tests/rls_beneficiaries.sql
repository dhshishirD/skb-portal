-- rls_beneficiaries.sql - proves the 0021 rules for the beneficiary registry and its access log.
-- One transaction, rolled back; any failed assert raises an error. LOCAL / STAGING Supabase only.
-- All values below are synthetic test data.
begin;

insert into public.organizations (id, name, type) values
  ('a0000000-0000-0000-0000-0000000000a1','SKB (test)','internal'),
  ('a0000000-0000-0000-0000-0000000000d1','Donor (test)','donor');
insert into auth.users (id) values
  ('a1000000-0000-0000-0000-000000000001'), -- executive
  ('a1000000-0000-0000-0000-000000000002'), -- project officer (assigned)
  ('a1000000-0000-0000-0000-000000000003'), -- field officer (assigned)
  ('a1000000-0000-0000-0000-000000000004'), -- board
  ('a1000000-0000-0000-0000-000000000005'), -- donor
  ('a1000000-0000-0000-0000-000000000006'), -- M&E officer (assigned)
  ('a1000000-0000-0000-0000-000000000007'), -- project officer (never assigned)
  ('a1000000-0000-0000-0000-000000000008'), -- programme manager (assigned)
  ('a1000000-0000-0000-0000-000000000009'), -- finance (assigned)
  ('a1000000-0000-0000-0000-00000000000a'); -- legal officer
update public.profiles set org_id = 'a0000000-0000-0000-0000-0000000000a1' where id::text like 'a1000000-%' and id::text not like '%05';
update public.profiles set org_id = 'a0000000-0000-0000-0000-0000000000d1' where id = 'a1000000-0000-0000-0000-000000000005';
insert into public.user_roles (user_id, role) values
  ('a1000000-0000-0000-0000-000000000001','executive'),
  ('a1000000-0000-0000-0000-000000000002','project_officer'),
  ('a1000000-0000-0000-0000-000000000003','field_officer'),
  ('a1000000-0000-0000-0000-000000000004','board'),
  ('a1000000-0000-0000-0000-000000000005','donor'),
  ('a1000000-0000-0000-0000-000000000006','me_officer'),
  ('a1000000-0000-0000-0000-000000000007','project_officer'),
  ('a1000000-0000-0000-0000-000000000008','programme_manager'),
  ('a1000000-0000-0000-0000-000000000009','finance'),
  ('a1000000-0000-0000-0000-00000000000a','legal_officer');
insert into public.grants (id, code, title, donor_org_id, total_amount) values
  ('a2000000-0000-0000-0000-00000000000a','BG','Beneficiary grant','a0000000-0000-0000-0000-0000000000d1',1000);
insert into public.projects (id, code, title, grant_id) values
  ('a3000000-0000-0000-0000-00000000000a','BN-DONOR','Donor-funded project','a2000000-0000-0000-0000-00000000000a'),
  ('a3000000-0000-0000-0000-00000000000b','BN-MAIN','Main test project',null),
  ('a3000000-0000-0000-0000-00000000000c','BN-OTHER','Other project',null);
insert into public.user_project_access (user_id, project_id) values
  ('a1000000-0000-0000-0000-000000000002','a3000000-0000-0000-0000-00000000000b'),
  ('a1000000-0000-0000-0000-000000000003','a3000000-0000-0000-0000-00000000000b'),
  ('a1000000-0000-0000-0000-000000000006','a3000000-0000-0000-0000-00000000000b'),
  ('a1000000-0000-0000-0000-000000000008','a3000000-0000-0000-0000-00000000000b'),
  ('a1000000-0000-0000-0000-000000000009','a3000000-0000-0000-0000-00000000000b');
-- a person on the donor-funded project (inserted as the database owner)
insert into public.beneficiaries (id, project_id, full_name_enc) values
  ('a4000000-0000-0000-0000-00000000000a','a3000000-0000-0000-0000-00000000000a','v1:AAAA:BBBB:CCCC');

create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid)::text, true);
  execute 'set local role authenticated';
end $$;

do $$
declare
  ed text := 'a1000000-0000-0000-0000-000000000001';
  po text := 'a1000000-0000-0000-0000-000000000002';
  fo text := 'a1000000-0000-0000-0000-000000000003';
  bd text := 'a1000000-0000-0000-0000-000000000004';
  dn text := 'a1000000-0000-0000-0000-000000000005';
  me text := 'a1000000-0000-0000-0000-000000000006';
  px text := 'a1000000-0000-0000-0000-000000000007';
  pm text := 'a1000000-0000-0000-0000-000000000008';
  fin text := 'a1000000-0000-0000-0000-000000000009';
  lg text := 'a1000000-0000-0000-0000-00000000000a';
  pid uuid := 'a3000000-0000-0000-0000-00000000000b';
  enc text := 'v1:QUJDRA==:RUZHSA==:SUpLTA==';
  h1 text := repeat('a', 64);
  b1 uuid; b2 uuid; l1 uuid; n int; denied boolean;
begin
  -- 1. Field officer registers people (ciphertext only)
  perform pg_temp.as_user(fo);
  insert into public.beneficiaries (project_id, full_name_enc, national_id_enc, national_id_hash, phone_enc, sex, birth_year, consent_at, consent_by, registered_by)
    values (pid, enc, enc, h1, enc, 'female', 1990, now(), fo::uuid, px::uuid) returning id into b1;
  assert (select registered_by from public.beneficiaries where id = b1) = fo::uuid, 'registered_by is the signed-in user';
  assert (select consent_at from public.beneficiaries where id = b1) is null, 'consent is not recorded automatically (empty even if sent)';
  assert (select consent_by from public.beneficiaries where id = b1) is null, 'consent_by stays empty';
  insert into public.beneficiaries (project_id, full_name_enc, sex) values (pid, enc, 'male') returning id into b2;
  assert (select national_id_hash from public.beneficiaries where id = b2) is null, 'ID is optional';

  denied := false;
  begin insert into public.beneficiaries (project_id, full_name_enc) values (pid, 'Plain Name');
  exception when check_violation then denied := true; end;
  assert denied, 'a plain-text name is refused';
  denied := false;
  begin insert into public.beneficiaries (project_id, full_name_enc, phone_enc) values (pid, enc, '01712345678');
  exception when check_violation then denied := true; end;
  assert denied, 'a plain-text phone number is refused';
  denied := false;
  begin insert into public.beneficiaries (project_id, full_name_enc, national_id_enc) values (pid, enc, enc);
  exception when check_violation then denied := true; end;
  assert denied, 'an ID without its fingerprint is refused';
  denied := false;
  begin insert into public.beneficiaries (project_id, full_name_enc, national_id_enc, national_id_hash) values (pid, enc, enc, 'not-a-hash');
  exception when check_violation then denied := true; end;
  assert denied, 'a malformed fingerprint is refused';
  denied := false;
  begin insert into public.beneficiaries (project_id, full_name_enc, national_id_enc, national_id_hash) values (pid, enc, enc, h1);
  exception when unique_violation then denied := true; end;
  assert denied, 'the same ID cannot be registered twice in a project';
  denied := false;
  begin insert into public.beneficiaries (project_id, full_name_enc, birth_year) values (pid, enc, 2999);
  exception when check_violation then denied := true; end;
  assert denied, 'a future birth year is refused';

  -- update: allowed fields yes, project move no, consent cannot be set
  update public.beneficiaries set sex = 'other', consent_at = now(), consent_by = fo::uuid where id = b2;
  assert (select sex from public.beneficiaries where id = b2) = 'other', 'a field officer can edit a person';
  assert (select consent_at from public.beneficiaries where id = b2) is null, 'consent cannot be set by an update';
  denied := false;
  begin update public.beneficiaries set project_id = 'a3000000-0000-0000-0000-00000000000c' where id = b2;
  exception when others then denied := true; end;
  assert denied, 'a person cannot move to another project';
  delete from public.beneficiaries where id = b2;
  get diagnostics n = row_count;
  assert n = 0, 'a field officer cannot delete';

  -- 2. Who reads
  perform pg_temp.as_user(me);
  assert (select count(*) from public.beneficiaries where project_id = pid) = 2, 'the M&E officer on the project reads';
  denied := false;
  begin insert into public.beneficiaries (project_id, full_name_enc) values (pid, enc);
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'the M&E officer cannot register';
  perform pg_temp.as_user(pm);
  assert (select count(*) from public.beneficiaries where project_id = pid) = 2, 'the programme manager reads';
  perform pg_temp.as_user(ed);
  assert (select count(*) from public.beneficiaries where project_id = pid) = 2, 'the executive director reads';
  perform pg_temp.as_user(lg);
  assert (select count(*) from public.beneficiaries) >= 3, 'the legal officer reads';
  perform pg_temp.as_user(fin);
  assert (select count(*) from public.beneficiaries where project_id = pid) = 0, 'finance sees nothing';
  denied := false;
  begin insert into public.beneficiaries (project_id, full_name_enc) values (pid, enc);
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'finance cannot register';
  perform pg_temp.as_user(dn);
  assert (select count(*) from public.beneficiaries) = 0, 'a donor sees nothing, even on its own project';
  perform pg_temp.as_user(bd);
  assert (select count(*) from public.beneficiaries) = 0, 'the board sees nothing';
  perform pg_temp.as_user(px);
  assert (select count(*) from public.beneficiaries where project_id = pid) = 0, 'an unassigned officer sees nothing';
  denied := false;
  begin insert into public.beneficiaries (project_id, full_name_enc) values (pid, enc);
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'an unassigned officer cannot register';

  -- 3. Access log: reveal is recorded; the log cannot be changed or read by field staff
  perform pg_temp.as_user(me);
  -- no RETURNING here: the M&E officer may write the log but not read it back
  insert into public.beneficiary_access_log (project_id, beneficiary_id, field, reason, accessed_by, accessed_at)
    values (pid, b1, 'national_id', 'Donor list check', px::uuid, '2020-01-01');
  assert (select count(*) from public.beneficiary_access_log where project_id = pid) = 0, 'the M&E officer cannot read the log';
  perform pg_temp.as_user(ed);
  select id into l1 from public.beneficiary_access_log where project_id = pid and beneficiary_id = b1;
  assert (select accessed_by from public.beneficiary_access_log where id = l1) = me::uuid, 'the log records the signed-in user, not what was sent';
  assert (select accessed_at from public.beneficiary_access_log where id = l1) > now() - interval '1 minute', 'the log time is set by the database';
  perform pg_temp.as_user(me);
  denied := false;
  begin update public.beneficiary_access_log set reason = 'changed' where id = l1;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a log row cannot be edited';
  denied := false;
  begin delete from public.beneficiary_access_log where id = l1;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a log row cannot be deleted';
  denied := false;
  begin insert into public.beneficiary_access_log (project_id, beneficiary_id, field) values (pid, b1, 'name');
  exception when check_violation then denied := true; end;
  assert denied, 'only the ID and phone fields are logged';
  perform pg_temp.as_user(fin);
  denied := false;
  begin insert into public.beneficiary_access_log (project_id, beneficiary_id, field) values (pid, b1, 'phone');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'finance cannot open (or log) a phone number';
  perform pg_temp.as_user(px);
  denied := false;
  begin insert into public.beneficiary_access_log (project_id, beneficiary_id, field) values (pid, b1, 'phone');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'an unassigned officer cannot log an access';
  perform pg_temp.as_user(pm);
  assert (select count(*) from public.beneficiary_access_log where project_id = pid) = 1, 'the programme manager reads the log';
  perform pg_temp.as_user(ed);
  assert (select count(*) from public.beneficiary_access_log where project_id = pid) = 1, 'the executive director reads the log';
  perform pg_temp.as_user(lg);
  assert (select count(*) from public.beneficiary_access_log where project_id = pid) = 1, 'the legal officer reads the log';
  perform pg_temp.as_user(dn);
  assert (select count(*) from public.beneficiary_access_log) = 0, 'a donor cannot read the log';

  -- 4. Delete: project officer removes; the log keeps its history
  perform pg_temp.as_user(po);
  delete from public.beneficiaries where id = b1;
  get diagnostics n = row_count;
  assert n = 1, 'a project officer can delete a person';
  perform pg_temp.as_user(ed);
  assert (select count(*) from public.beneficiary_access_log where beneficiary_id = b1) = 1, 'the access log survives deleting the person';

  -- 5. Audit
  reset role;
  assert (select count(*) from public.audit_log where table_name = 'beneficiaries' and record_id = b1::text) >= 2, 'registry changes are in the audit log';
  assert not exists (select 1 from public.audit_log where table_name = 'beneficiaries' and (new_data::text like '%Plain Name%')), 'no plain text in the audit log';

  -- 6. Closed project is frozen
  perform set_config('request.jwt.claims', '', true);
  update public.projects set stage = 'closed' where id = pid;
  perform pg_temp.as_user(fo);
  denied := false;
  begin insert into public.beneficiaries (project_id, full_name_enc) values (pid, enc);
  exception when others then denied := true; end;
  assert denied, 'a closed project cannot get new people';
  perform pg_temp.as_user(po);
  denied := false;
  begin delete from public.beneficiaries where id = b2;
  exception when others then denied := true; end;
  assert denied, 'a closed project registry cannot be changed (delete)';
  perform pg_temp.as_user(me);
  insert into public.beneficiary_access_log (project_id, beneficiary_id, field) values (pid, b2, 'phone');
end $$;

rollback;
