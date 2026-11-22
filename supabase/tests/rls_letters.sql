-- rls_letters.sql - proves the 0042 rules: drafts are private, issuing spends the next Ref number, issued letters are
-- locked, a letter is cancelled with a reason, signature and stamp need to exist, and who may set the numbering.
-- One transaction, rolled back; any failed assert raises an error. LOCAL / STAGING Supabase only.
-- All values below are synthetic test data.
begin;

insert into auth.users (id) values
  ('f9000000-0000-0000-0000-000000000001'), -- staff member (project officer)
  ('f9000000-0000-0000-0000-000000000002'), -- other staff member (field officer)
  ('f9000000-0000-0000-0000-000000000003'), -- executive director
  ('f9000000-0000-0000-0000-000000000004'); -- super admin
insert into public.user_roles (user_id, role) values
  ('f9000000-0000-0000-0000-000000000001','project_officer'),
  ('f9000000-0000-0000-0000-000000000002','field_officer'),
  ('f9000000-0000-0000-0000-000000000003','executive'),
  ('f9000000-0000-0000-0000-000000000004','super_admin');

create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid)::text, true);
  execute 'set local role authenticated';
end $$;

do $$
declare
  u1 uuid := 'f9000000-0000-0000-0000-000000000001';
  u2 uuid := 'f9000000-0000-0000-0000-000000000002';
  u3 uuid := 'f9000000-0000-0000-0000-000000000003';
  u4 uuid := 'f9000000-0000-0000-0000-000000000004';
  yr int := extract(year from public.dhaka_today())::int;
  yy text := lpad((extract(year from public.dhaka_today())::int % 100)::text, 2, '0');
  a uuid; b uuid; c uuid; d uuid; ref text;
  denied boolean; msg text;
BEGIN
  -- 1. A draft is private to its writer, the Executive Director and the Super Admin
  perform pg_temp.as_user(u1::text);
  insert into public.letters (created_by, status, ref_no, subject) values (u2, 'issued', 'SKB-999/99', 'First') returning id into a;
  assert (select created_by from public.letters where id = a) = u1, 'the writer is the signed-in person';
  assert (select status from public.letters where id = a) = 'draft', 'a new letter is always a draft';
  assert (select ref_no from public.letters where id = a) is null, 'a new letter has no Ref number';
  perform pg_temp.as_user(u2::text);
  assert (select count(*) from public.letters where id = a) = 0, 'another staff member does not see a draft';
  update public.letters set subject = 'hacked' where id = a;
  perform pg_temp.as_user(u1::text);
  assert (select subject from public.letters where id = a) = 'First', 'another staff member cannot edit a draft';
  perform pg_temp.as_user(u3::text);
  assert (select count(*) from public.letters where id = a) = 1, 'the executive sees a draft';
  perform pg_temp.as_user(u4::text);
  assert (select count(*) from public.letters where id = a) = 1, 'the super admin sees a draft';

  -- 2. A letter cannot be issued by editing the status, and cannot be issued empty
  perform pg_temp.as_user(u1::text);
  denied := false;
  begin update public.letters set status = 'issued' where id = a;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'the status cannot be set by hand';
  update public.letters set ref_no = 'SKB-500/99', ref_seq = 500, ref_year = 2099 where id = a;
  assert (select ref_no from public.letters where id = a) is null, 'the Ref number cannot be written by hand';
  denied := false;
  begin perform public.issue_letter(a);
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'an empty letter cannot be issued';
  assert public.next_letter_number(yr) = 1, 'a refused issue spends no number';

  -- 3. Issue: the next number of the year
  update public.letters set to_lines = 'The Director', subject = 'First', body = 'Text', signatory_name = 'A Person' where id = a;
  ref := public.issue_letter(a);
  assert ref = 'SKB-001/' || yy, 'the first letter of the year is 001';
  assert (select status from public.letters where id = a) = 'issued', 'the letter is issued';
  assert (select letter_date from public.letters where id = a) = public.dhaka_today(), 'the date is today in Dhaka';
  assert (select issued_by from public.letters where id = a) = u1, 'the issuer is recorded';
  insert into public.letters (to_lines, subject, body, signatory_name) values ('To', 'Second', 'Text', 'A Person') returning id into b;
  assert public.issue_letter(b) = 'SKB-002/' || yy, 'the next letter gets the next number';
  assert public.next_letter_number(yr) = 3, 'the page shows the next number';

  -- 4. Issued letters form a register every staff member reads
  perform pg_temp.as_user(u2::text);
  assert (select count(*) from public.letters where status = 'issued') = 2, 'every staff member reads issued letters';

  -- 5. Another person cannot issue a draft they did not write
  perform pg_temp.as_user(u1::text);
  insert into public.letters (to_lines, subject, body, signatory_name) values ('To', 'Third', 'Text', 'A Person') returning id into c;
  perform pg_temp.as_user(u2::text);
  denied := false;
  begin perform public.issue_letter(c);
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'another staff member cannot issue my draft';
  perform pg_temp.as_user(u3::text);
  assert public.issue_letter(c) = 'SKB-003/' || yy, 'the executive can issue a draft';

  -- 6. An issued letter is locked; it is cancelled with a reason and keeps its number
  perform pg_temp.as_user(u1::text);
  denied := false;
  begin update public.letters set subject = 'Changed' where id = a;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'an issued letter cannot be edited';
  denied := false;
  begin update public.letters set status = 'void' where id = a;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a letter cannot be cancelled without a reason';
  update public.letters set status = 'void', void_reason = 'Wrong address', subject = 'Sneaky edit' where id = a;
  assert (select status from public.letters where id = a) = 'void', 'the writer cancels the letter';
  assert (select subject from public.letters where id = a) = 'First', 'a cancelled letter keeps its content';
  assert (select ref_no from public.letters where id = a) = 'SKB-001/' || yy, 'a cancelled letter keeps its number';
  delete from public.letters where id = b;
  assert (select count(*) from public.letters where id = b) = 1, 'an issued letter cannot be deleted';

  -- 7. A draft can be deleted by its writer
  insert into public.letters (subject) values ('Scrap') returning id into d;
  delete from public.letters where id = d;
  assert (select count(*) from public.letters where id = d) = 0, 'the writer deletes a draft';

  -- 8. Signature and stamp must exist before a letter asks for them
  insert into public.letters (to_lines, subject, body, signatory_name, with_signature) values ('To', 'Signed', 'Text', 'A Person', true) returning id into d;
  denied := false;
  begin perform public.issue_letter(d);
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a letter cannot ask for a signature that was never saved';
  update public.letters set with_signature = false, with_stamp = true where id = d;
  denied := false;
  begin perform public.issue_letter(d);
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a letter cannot ask for a stamp that was never saved';
  reset role;
  insert into public.staff_signatures (user_id, image_path, mime_type) values (u1, 'x/signature.png', 'image/png');
  insert into public.org_stamp (image_path, mime_type) values ('stamp.png', 'image/png');
  perform pg_temp.as_user(u1::text);
  update public.letters set with_signature = true where id = d;
  assert public.issue_letter(d) = 'SKB-004/' || yy, 'signature and stamp are allowed once saved';
  assert (select signature_user_id from public.letters where id = d) = u1, 'the signature is the issuer''s own';

  -- 9. Who sets the numbering
  denied := false;
  begin perform public.set_letter_counter(yr, 80);
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a staff member cannot set the numbering';
  perform pg_temp.as_user(u3::text);
  denied := false;
  begin perform public.set_letter_counter(yr, 2);
  exception when others then denied := true; end;
  assert denied, 'the numbering cannot go below what was issued';
  perform public.set_letter_counter(yr, 80);
  assert public.next_letter_number(yr) = 81, 'the next number follows the set one';
  perform pg_temp.as_user(u1::text);
  insert into public.letters (to_lines, subject, body, signatory_name) values ('To', 'After', 'Text', 'A Person') returning id into d;
  assert public.issue_letter(d) = 'SKB-081/' || yy, 'issuing continues from the set number';
end $$;

rollback;
