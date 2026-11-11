-- rls_community.sql - proves the 0027 rules for the staff community.
-- One transaction, rolled back; any failed assert raises an error. LOCAL / STAGING Supabase only.
-- All values below are synthetic test data.
begin;

insert into auth.users (id) values
  ('c1000000-0000-0000-0000-000000000001'), -- executive
  ('c1000000-0000-0000-0000-000000000002'), -- project officer
  ('c1000000-0000-0000-0000-000000000003'), -- field officer
  ('c1000000-0000-0000-0000-000000000004'), -- donor (not staff)
  ('c1000000-0000-0000-0000-000000000005'); -- finance
update public.profiles set full_name = 'Test Executive', designation = 'Executive Director' where id = 'c1000000-0000-0000-0000-000000000001';
update public.profiles set full_name = 'Test Officer', designation = 'Project Officer' where id = 'c1000000-0000-0000-0000-000000000002';
update public.profiles set full_name = 'Test Field', designation = 'Field Officer' where id = 'c1000000-0000-0000-0000-000000000003';
update public.profiles set full_name = 'Test Donor' where id = 'c1000000-0000-0000-0000-000000000004';
update public.profiles set full_name = 'Test Finance', designation = 'Finance Officer' where id = 'c1000000-0000-0000-0000-000000000005';
insert into public.user_roles (user_id, role) values
  ('c1000000-0000-0000-0000-000000000001','executive'),
  ('c1000000-0000-0000-0000-000000000002','project_officer'),
  ('c1000000-0000-0000-0000-000000000003','field_officer'),
  ('c1000000-0000-0000-0000-000000000004','donor'),
  ('c1000000-0000-0000-0000-000000000005','finance');

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
  dn text := 'c1000000-0000-0000-0000-000000000004';
  fi text := 'c1000000-0000-0000-0000-000000000005';
  pid uuid; cid uuid; mid uuid;
  denied boolean;
  n int;
begin
  -- 1. A staff member posts; the name and designation come from the profile, not from the request
  perform pg_temp.as_user(po);
  insert into public.community_posts (category, title, content, author_name, author_role)
    values ('Field Updates', 'Distribution done', 'All 100 packs handed over.', 'Somebody Else', 'Executive Director')
    returning id into pid;
  assert (select author_id from public.community_posts where id = pid) = po::uuid, 'author is the signed-in user';
  assert (select author_name from public.community_posts where id = pid) = 'Test Officer', 'name comes from the profile';
  assert (select author_role from public.community_posts where id = pid) = 'Project Officer', 'designation comes from the profile';

  -- cannot post as somebody else
  denied := false;
  begin insert into public.community_posts (author_id, category, title, content) values (ed::uuid, 'General', 'x', 'y');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'cannot post as another person';

  -- 2. A donor cannot read or write
  perform pg_temp.as_user(dn);
  assert (select count(*) from public.community_posts) = 0, 'a donor sees no posts';
  denied := false;
  begin insert into public.community_posts (category, title, content) values ('General', 'x', 'y');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'a donor cannot post';

  -- 3. Other staff read and comment
  perform pg_temp.as_user(fo);
  assert (select count(*) from public.community_posts where id = pid) = 1, 'a field officer reads the post';
  insert into public.community_comments (post_id, text) values (pid, 'Well done') returning id into cid;
  assert (select author_name from public.community_comments where id = cid) = 'Test Field', 'comment name comes from the profile';

  -- 4. One like per person; the count follows
  insert into public.community_post_likes (post_id) values (pid);
  denied := false;
  begin insert into public.community_post_likes (post_id) values (pid);
  exception when unique_violation then denied := true; end;
  assert denied, 'a second like by the same person is refused';
  perform pg_temp.as_user(fi);
  insert into public.community_post_likes (post_id) values (pid);
  assert (select likes_count from public.community_posts where id = pid) = 2, 'two likes counted';
  perform pg_temp.as_user(po);
  denied := false;
  begin update public.community_posts set likes_count = 99 where id = pid;
  exception when others then denied := true; end;
  assert denied, 'the like count cannot be edited by hand';
  perform pg_temp.as_user(fi);
  delete from public.community_post_likes where post_id = pid;
  assert (select likes_count from public.community_posts where id = pid) = 1, 'an unlike lowers the count';
  -- cannot remove somebody else's like
  delete from public.community_post_likes where post_id = pid and user_id = fo::uuid;
  assert (select count(*) from public.community_post_likes where post_id = pid) = 1, 'somebody else''s like stays';

  -- 5. Edit and pin
  perform pg_temp.as_user(fo);
  update public.community_posts set content = 'Changed by someone else' where id = pid;
  assert (select content from public.community_posts where id = pid) = 'All 100 packs handed over.', 'only the author edits a post (no row updated)';
  perform pg_temp.as_user(po);
  update public.community_posts set content = 'All 100 packs handed over today.' where id = pid;
  assert (select edited_at from public.community_posts where id = pid) is not null, 'edit time is recorded';
  denied := false;
  begin update public.community_posts set pinned = true where id = pid;
  exception when others then denied := true; end;
  assert denied, 'an officer cannot pin';
  denied := false;
  begin update public.community_posts set author_name = 'Boss' where id = pid;
  exception when others then denied := true; end;
  assert denied, 'the author name cannot be rewritten';
  perform pg_temp.as_user(ed);
  update public.community_posts set pinned = true where id = pid;
  assert (select pinned from public.community_posts where id = pid), 'the Executive Director pins';
  denied := false;
  begin update public.community_posts set title = 'Renamed by the boss' where id = pid;
  exception when others then denied := true; end;
  assert denied, 'even the Executive Director cannot rewrite another person''s words';

  -- 6. Delete: author or Executive Director only
  perform pg_temp.as_user(fo);
  denied := false;
  begin perform public.delete_community_post(pid);
  exception when others then denied := true; end;
  assert denied, 'a field officer cannot delete another person''s post';
  denied := false;
  begin perform public.delete_community_comment(cid); exception when others then denied := true; end;
  assert not denied, 'the author deletes their own comment';
  assert (select count(*) from public.community_comments where id = cid) = 0, 'a deleted comment disappears';
  perform pg_temp.as_user(po);
  perform public.delete_community_post(pid);
  assert (select count(*) from public.community_posts where id = pid) = 0, 'a deleted post disappears';

  -- 7. Direct messages: names from profiles, only to active staff, only the two people read
  perform pg_temp.as_user(po);
  insert into public.direct_messages (recipient_id, text, sender_name, recipient_name, sender_role)
    values (fo::uuid, 'Please send the sheet', 'Fake', 'Fake', 'Fake') returning id into mid;
  assert (select sender_name from public.direct_messages where id = mid) = 'Test Officer', 'sender name from profile';
  assert (select recipient_name from public.direct_messages where id = mid) = 'Test Field', 'recipient name from profile';
  denied := false;
  begin insert into public.direct_messages (recipient_id, text) values (dn::uuid, 'hello donor');
  exception when others then denied := true; end;
  assert denied, 'cannot message a donor';
  perform pg_temp.as_user(fi);
  assert (select count(*) from public.direct_messages) = 0, 'a third person cannot read it';
  perform pg_temp.as_user(ed);
  assert (select count(*) from public.direct_messages) = 0, 'not even the Executive Director reads other people''s messages';
  perform pg_temp.as_user(fo);
  assert (select count(*) from public.direct_messages where id = mid) = 1, 'the recipient reads it';
  update public.direct_messages set read_at = now() where id = mid;
  assert (select read_at from public.direct_messages where id = mid) is not null, 'the recipient marks it read';
  denied := false;
  begin update public.direct_messages set text = 'edited' where id = mid; exception when others then denied := true; end;
  assert denied, 'a message text cannot be edited';

  -- 8. Online status
  perform pg_temp.as_user(po);
  perform public.touch_presence();
  perform public.touch_presence();
  perform pg_temp.as_user(fo);
  assert (select count(*) from public.staff_presence where user_id = po::uuid) = 1, 'staff see who is online (one row per person)';
  denied := false;
  begin insert into public.staff_presence (user_id) values (fo::uuid); exception when others then denied := true; end;
  assert denied, 'presence cannot be written directly';
  perform pg_temp.as_user(dn);
  perform public.touch_presence();
  assert (select count(*) from public.staff_presence) = 0, 'a donor is not recorded and sees nobody';
end $$;

rollback;
