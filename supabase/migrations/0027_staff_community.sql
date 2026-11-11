-- Migration 0027: Staff community on the real tables
--
-- Until now the Community page stored posts, comments and messages as JSON in `notifications`
-- through a service-role API, and wrote an "online" row every 30 seconds. The proper tables
-- (community_posts, community_comments, direct_messages, migration 0007) were never used.
-- This migration finishes them so the page can run on them under Row Level Security:
--   * a like is one row per person (no double likes); the count is kept by a trigger
--   * posts can be pinned (Executive Director / Super Admin) and edited (author only)
--   * posts and comments are deleted softly, by the author or the Executive Director / Super Admin
--   * the author's name and designation come from their profile, never from the browser
--   * a direct message can only go to an active staff member
--   * files live in a private bucket and are served by signed link
--   * "online" is one row per person (staff_presence), not a new row every heartbeat
-- Old JSON rows in `notifications` are left untouched.

-- ===== Posts =====
alter table public.community_posts
  add column if not exists pinned boolean not null default false,
  add column if not exists edited_at timestamptz;

alter table public.community_posts drop constraint if exists community_posts_category_check;
alter table public.community_posts add constraint community_posts_category_check
  check (category in ('HQ Announcements', 'Field Updates', 'Donor Objections & Corrections', 'NGO Best Practices', 'General'));

create index if not exists community_posts_pinned_idx on public.community_posts (pinned desc, created_at desc) where deleted_at is null;

-- ===== Who wrote it: taken from the profile =====
create or replace function public.community_fill_author() returns trigger
language plpgsql security definer set search_path = '' as $$
declare _name text; _role text;
begin
  select p.full_name, coalesce(nullif(p.designation, ''), 'Staff')
    into _name, _role
    from public.profiles p where p.id = new.author_id;
  new.author_name := coalesce(nullif(_name, ''), 'Staff member');
  new.author_role := coalesce(_role, 'Staff');
  new.author_avatar := null;
  return new;
end $$;

create trigger fill_author before insert on public.community_posts
  for each row execute function public.community_fill_author();
create trigger fill_author before insert on public.community_comments
  for each row execute function public.community_fill_author();

-- Direct messages: names from profiles; the recipient must be an active staff member.
create or replace function public.community_fill_dm() returns trigger
language plpgsql security definer set search_path = '' as $$
declare _sname text; _srole text; _rname text; _rok boolean;
begin
  select p.full_name, coalesce(nullif(p.designation, ''), 'Staff') into _sname, _srole
    from public.profiles p where p.id = new.sender_id;
  select p.full_name,
         p.is_active and exists (
           select 1 from public.user_roles ur
           where ur.user_id = p.id
             and ur.role in ('super_admin','executive','programme_manager','project_officer','field_officer',
                             'finance','procurement','me_officer','board','legal_officer','it_officer')
         )
    into _rname, _rok
    from public.profiles p where p.id = new.recipient_id;
  if _rok is not true then
    raise exception 'You can only message active SKB staff';
  end if;
  new.sender_name := coalesce(nullif(_sname, ''), 'Staff member');
  new.sender_role := coalesce(_srole, 'Staff');
  new.recipient_name := coalesce(nullif(_rname, ''), 'Staff member');
  new.read_at := null;
  return new;
end $$;

create trigger fill_dm before insert on public.direct_messages
  for each row execute function public.community_fill_dm();

-- ===== Editing rules for posts =====
create or replace function public.community_guard_post_update() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  _uid uuid := (select auth.uid());
  _mod boolean;
begin
  if _uid is null then return new; end if; -- direct database session
  _mod := public.has_any_role(array['super_admin','executive']::public.app_role[]);

  if new.author_id is distinct from old.author_id
     or new.author_name is distinct from old.author_name
     or new.author_role is distinct from old.author_role
     or new.author_avatar is distinct from old.author_avatar
     or new.created_at is distinct from old.created_at then
    raise exception 'The author of a post cannot be changed';
  end if;

  -- the like count is changed only by the likes trigger (a nested trigger)
  if new.likes_count is distinct from old.likes_count and pg_trigger_depth() = 1 then
    raise exception 'The like count cannot be edited';
  end if;

  if new.pinned is distinct from old.pinned and not _mod then
    raise exception 'Only the Executive Director or Super Admin can pin a post';
  end if;

  if new.deleted_at is distinct from old.deleted_at and old.author_id <> _uid and not _mod then
    raise exception 'You can only delete your own posts';
  end if;

  if (new.title is distinct from old.title or new.content is distinct from old.content
      or new.category is distinct from old.category
      or new.attachment_path is distinct from old.attachment_path
      or new.attachment_name is distinct from old.attachment_name)
     and old.author_id <> _uid then
    raise exception 'You can only edit your own posts';
  end if;

  if new.title is distinct from old.title or new.content is distinct from old.content then
    new.edited_at := now();
  end if;
  return new;
end $$;

create trigger guard_update before update on public.community_posts
  for each row execute function public.community_guard_post_update();

-- ===== Likes: one per person =====
create table public.community_post_likes (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index community_post_likes_user_idx on public.community_post_likes (user_id);

alter table public.community_post_likes enable row level security;
revoke all on public.community_post_likes from anon;

create policy community_likes_select on public.community_post_likes for select to authenticated
  using (public.is_staff_member());
create policy community_likes_insert on public.community_post_likes for insert to authenticated
  with check (public.is_staff_member() and user_id = (select auth.uid()));
create policy community_likes_delete on public.community_post_likes for delete to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.community_sync_likes() returns trigger
language plpgsql security definer set search_path = '' as $$
declare _post uuid := coalesce(new.post_id, old.post_id);
begin
  update public.community_posts
     set likes_count = (select count(*) from public.community_post_likes where post_id = _post)
   where id = _post;
  return null;
end $$;

create trigger sync_likes after insert or delete on public.community_post_likes
  for each row execute function public.community_sync_likes();

-- ===== Delete (soft), by the author or the Executive Director / Super Admin =====
create or replace function public.delete_community_post(_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare _uid uuid := (select auth.uid()); _author uuid;
begin
  if _uid is null or not public.is_staff_member() then raise exception 'Not allowed'; end if;
  select author_id into _author from public.community_posts where id = _id and deleted_at is null;
  if not found then raise exception 'Post not found'; end if;
  if _author <> _uid and not public.has_any_role(array['super_admin','executive']::public.app_role[]) then
    raise exception 'You can only delete your own posts';
  end if;
  update public.community_posts set deleted_at = now() where id = _id;
end $$;

create or replace function public.delete_community_comment(_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare _uid uuid := (select auth.uid()); _author uuid;
begin
  if _uid is null or not public.is_staff_member() then raise exception 'Not allowed'; end if;
  select author_id into _author from public.community_comments where id = _id and deleted_at is null;
  if not found then raise exception 'Comment not found'; end if;
  if _author <> _uid and not public.has_any_role(array['super_admin','executive']::public.app_role[]) then
    raise exception 'You can only delete your own comments';
  end if;
  update public.community_comments set deleted_at = now() where id = _id;
end $$;

revoke all on function public.delete_community_post(uuid), public.delete_community_comment(uuid) from public, anon;
grant execute on function public.delete_community_post(uuid), public.delete_community_comment(uuid) to authenticated;

-- ===== Online status: one row per person =====
create table public.staff_presence (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  last_seen_at timestamptz not null default now()
);
alter table public.staff_presence enable row level security;
revoke all on public.staff_presence from anon;
revoke insert, update, delete on public.staff_presence from authenticated;
create policy staff_presence_select on public.staff_presence for select to authenticated
  using (public.is_staff_member());

create or replace function public.touch_presence() returns void
language plpgsql security definer set search_path = '' as $$
declare _uid uuid := (select auth.uid());
begin
  if _uid is null or not public.is_staff_member() then return; end if;
  insert into public.staff_presence (user_id, last_seen_at) values (_uid, now())
  on conflict (user_id) do update set last_seen_at = excluded.last_seen_at;
end $$;
revoke all on function public.touch_presence() from public, anon;
grant execute on function public.touch_presence() to authenticated;

-- ===== Files: private bucket, served by signed link from the server =====
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'community-files', 'community-files', false, 10485760,
  array['application/pdf','application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv','image/jpeg','image/png','image/webp']
) on conflict (id) do nothing;
