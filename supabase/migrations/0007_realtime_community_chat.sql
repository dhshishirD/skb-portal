-- Migration 0007: Real-Time Community Posts, Comments, and Direct Messages
-- Created for SKB Works Portal Phase 1 Supabase Database & Realtime Messaging Sync

-- 1. Community Posts Table
create table if not exists public.community_posts (
  id text primary key default ('POST-' || floor(100 + random() * 900)::text),
  author_name text not null,
  author_role text not null,
  author_avatar text,
  category text not null check (category in ('HQ Announcements', 'Field Updates', 'Donor Objections & Corrections', 'NGO Best Practices')),
  title text not null,
  content text not null,
  attachment_name text,
  attachment_size text,
  attachment_type text,
  attachment_url text,
  likes_count integer default 1,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Community Comments Table
create table if not exists public.community_comments (
  id text primary key default ('c_' || extract(epoch from now())::text),
  post_id text references public.community_posts(id) on delete cascade not null,
  author_name text not null,
  author_role text not null,
  author_avatar text,
  text text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Direct Messages Table
create table if not exists public.direct_messages (
  id text primary key default ('dm-' || extract(epoch from now())::text),
  sender_name text not null,
  sender_role text not null,
  recipient_name text not null,
  text text not null,
  attachment_name text,
  attachment_size text,
  attachment_type text,
  attachment_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indexes for fast querying
create index if not exists community_comments_post_id_idx on public.community_comments(post_id);
create index if not exists direct_messages_recipient_idx on public.direct_messages(recipient_name, sender_name);
create index if not exists community_posts_created_at_idx on public.community_posts(created_at desc);

-- Enable RLS
alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.direct_messages enable row level security;

-- Permissive RLS policies for authenticated users & portal access
create policy "Allow all read on community_posts" on public.community_posts for select using (true);
create policy "Allow all insert on community_posts" on public.community_posts for insert with check (true);
create policy "Allow all update on community_posts" on public.community_posts for update using (true);

create policy "Allow all read on community_comments" on public.community_comments for select using (true);
create policy "Allow all insert on community_comments" on public.community_comments for insert with check (true);

create policy "Allow all read on direct_messages" on public.direct_messages for select using (true);
create policy "Allow all insert on direct_messages" on public.direct_messages for insert with check (true);

-- Enable Supabase Realtime for instant messaging
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime for table public.community_posts, public.community_comments, public.direct_messages;
commit;
