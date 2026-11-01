-- Migration 0007: Real-Time Community Posts, Comments, and Direct Messages
--
-- Security fix (Nov 2026). The original version:
--   * allowed ANY caller (including anonymous) to read/insert/update posts and read all DMs (`using (true)`);
--   * identified people by display name only, so anyone could post as anyone;
--   * dropped and recreated the `supabase_realtime` publication (breaks other realtime tables);
--   * generated colliding IDs ('POST-' + 3 random digits).
-- Now: authenticated internal staff only, authorship bound to auth.uid(), DMs visible
-- only to sender and recipient, UUID keys, and tables added to the existing publication.

create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  author_name text not null,
  author_role text not null,
  author_avatar text,
  category text not null check (category in ('HQ Announcements', 'Field Updates', 'Donor Objections & Corrections', 'NGO Best Practices')),
  title text not null check (char_length(title) between 1 and 300),
  content text not null check (char_length(content) between 1 and 20000),
  attachment_name text,
  attachment_size text,
  attachment_type text,
  attachment_path text,           -- storage path in a private bucket (serve via signed URL)
  likes_count integer not null default 0 check (likes_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  author_name text not null,
  author_role text not null,
  author_avatar text,
  text text not null check (char_length(text) between 1 and 5000),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  sender_name text not null,
  sender_role text not null,
  recipient_name text not null,
  text text not null check (char_length(text) between 1 and 5000),
  attachment_name text,
  attachment_size text,
  attachment_type text,
  attachment_path text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);

create index community_posts_created_at_idx on public.community_posts(created_at desc);
create index community_comments_post_id_idx on public.community_comments(post_id);
create index direct_messages_recipient_idx on public.direct_messages(recipient_id, created_at desc);
create index direct_messages_sender_idx on public.direct_messages(sender_id, created_at desc);

create trigger set_updated_at before update on public.community_posts
  for each row execute function public.set_updated_at();

alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.direct_messages enable row level security;

revoke all on public.community_posts, public.community_comments, public.direct_messages from anon;

-- Posts: internal staff can read; authors write as themselves; author or admin can edit/soft-delete.
create policy community_posts_select on public.community_posts for select to authenticated
  using (public.is_internal_user() and deleted_at is null);
create policy community_posts_insert on public.community_posts for insert to authenticated
  with check (public.is_internal_user() and author_id = (select auth.uid()));
create policy community_posts_update on public.community_posts for update to authenticated
  using (author_id = (select auth.uid()) or public.has_any_role(array['super_admin','executive']::public.app_role[]))
  with check (author_id = (select auth.uid()) or public.has_any_role(array['super_admin','executive']::public.app_role[]));

-- Comments
create policy community_comments_select on public.community_comments for select to authenticated
  using (public.is_internal_user() and deleted_at is null);
create policy community_comments_insert on public.community_comments for insert to authenticated
  with check (public.is_internal_user() and author_id = (select auth.uid()));

-- Direct messages: only the two participants.
create policy direct_messages_select on public.direct_messages for select to authenticated
  using ((select auth.uid()) in (sender_id, recipient_id));
create policy direct_messages_insert on public.direct_messages for insert to authenticated
  with check (public.is_internal_user() and sender_id = (select auth.uid()));
create policy direct_messages_mark_read on public.direct_messages for update to authenticated
  using (recipient_id = (select auth.uid())) with check (recipient_id = (select auth.uid()));
revoke update on public.direct_messages from authenticated;
grant update (read_at) on public.direct_messages to authenticated;

-- Realtime: add to the existing publication instead of dropping it.
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  alter publication supabase_realtime add table public.community_posts, public.community_comments, public.direct_messages;
end $$;
