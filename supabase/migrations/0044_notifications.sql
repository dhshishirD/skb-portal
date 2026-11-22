-- 0044: in-app notifications (bell). First two kinds: a new direct message, and a task assigned to you.
-- They live in the new table staff_notifications; the old `notifications` table from 0003 is left untouched.
--
-- Each notification belongs to ONE person (the recipient). The recipient can read their own and mark them as read;
-- nobody else can see them, and nobody can create or change one from the browser: they are written only by the
-- database triggers below, so a notification always matches a real message or a real assignment.
-- The message preview is the first 140 characters of the message, visible only to the person it was sent to.
-- Additive: one new table and two new triggers on existing tables. No existing rule is changed.

create table public.staff_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('message', 'task_assigned')),
  title text not null check (char_length(title) between 1 and 200),
  body text check (body is null or char_length(body) <= 300),
  link text not null check (link like '/%' and link not like '//%'),
  actor_id uuid references public.profiles(id) on delete set null,
  ref_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index staff_notifications_recipient_idx on public.staff_notifications (recipient_id, created_at desc);
create index staff_notifications_unread_idx on public.staff_notifications (recipient_id) where read_at is null;

alter table public.staff_notifications enable row level security;
revoke all on public.staff_notifications from anon, authenticated;
grant select on public.staff_notifications to authenticated;
grant update (read_at) on public.staff_notifications to authenticated;

create policy staff_notifications_select on public.staff_notifications for select to authenticated
  using (recipient_id = (select auth.uid()));
create policy staff_notifications_mark_read on public.staff_notifications for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

-- new rows reach the open page at once (Supabase Realtime sends each row only to its owner, under the policy above)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'staff_notifications') then
    alter publication supabase_realtime add table public.staff_notifications;
  end if;
end $$;

-- a new direct message -> notify the person it was sent to
create or replace function public.notify_direct_message() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.staff_notifications (recipient_id, kind, title, body, link, actor_id, ref_id)
  values (
    new.recipient_id, 'message',
    'New message from ' || coalesce(nullif(new.sender_name, ''), 'a colleague'),
    left(new.text, 140),
    '/community', new.sender_id, new.id
  );
  return new;
end $$;
revoke execute on function public.notify_direct_message() from public, anon, authenticated;

create trigger notify_direct_message after insert on public.direct_messages
  for each row execute function public.notify_direct_message();

-- a task given (or handed) to someone -> notify them, unless they gave it to themselves
create or replace function public.notify_task_assigned() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  _actor uuid := (select auth.uid());
  _actor_name text;
  _code text;
begin
  if new.assignee_id is null or new.deleted_at is not null then return new; end if;
  if tg_op = 'UPDATE' and new.assignee_id is not distinct from old.assignee_id then return new; end if;
  if new.assignee_id is not distinct from _actor then return new; end if;
  select full_name into _actor_name from public.profiles where id = _actor;
  select code into _code from public.projects where id = new.project_id;
  insert into public.staff_notifications (recipient_id, kind, title, body, link, actor_id, ref_id)
  values (
    new.assignee_id, 'task_assigned',
    case when nullif(_actor_name, '') is null then 'A task was assigned to you'
         else _actor_name || ' assigned you a task' end,
    left(new.title || coalesce(' · ' || _code, ''), 300),
    '/projects/' || new.project_id || '/tasks', _actor, new.id
  );
  return new;
end $$;
revoke execute on function public.notify_task_assigned() from public, anon, authenticated;

create trigger notify_task_assigned after insert or update of assignee_id on public.tasks
  for each row execute function public.notify_task_assigned();
