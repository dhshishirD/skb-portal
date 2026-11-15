-- 0034_task_raci.sql
-- RACI for project tasks. The person a task is assigned to stays the RESPONSIBLE one (tasks.assignee_id,
-- nothing changes there). This adds the other three letters in a new table:
--   Accountable (one person per task, the one who answers for the result and approves it),
--   Consulted   (asked before the work is done),
--   Informed    (told when it is done).
-- Each person holds at most one of these three letters on a task. The same person may also be the
-- Responsible one (R and A together is normal).
--
-- Who may do what: the Executive Director, Programme Manager and Project Officers on the project set the
-- letters (the same people who create and assign tasks). Everyone who can read the tasks can read the
-- letters; donors cannot; the Board and the Law Officer read through oversight. Only people on the
-- project team can be given a letter. A closed project is frozen. Every change is audited.
-- No personal data beyond who holds which role on a task. Additive: one new table, one function,
-- triggers and policies; no existing row is touched.

create table if not exists public.task_raci (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.tasks(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  raci_role  text not null check (raci_role in ('accountable','consulted','informed')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (task_id, user_id)
);
create unique index if not exists task_raci_one_accountable on public.task_raci (task_id) where raci_role = 'accountable';
create index if not exists task_raci_user_idx on public.task_raci (user_id);
create index if not exists task_raci_created_by_idx on public.task_raci (created_by);

create or replace function public.guard_task_raci()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  pid uuid;
  stage_now public.project_stage;
begin
  if (select auth.uid()) is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  select t.project_id into pid from public.tasks t where t.id = case when tg_op = 'DELETE' then old.task_id else new.task_id end;
  select p.stage into stage_now from public.projects p where p.id = pid;
  if stage_now = 'closed' then
    raise exception 'the tasks of a closed project cannot be changed' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  if tg_op = 'UPDATE' and (new.task_id is distinct from old.task_id or new.user_id is distinct from old.user_id) then
    raise exception 'a RACI entry cannot move to another task or person' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' then
    new.created_by := (select auth.uid());
    new.created_at := now();
    if not exists (select 1 from public.project_team(pid) t where t.id = new.user_id) then
      raise exception 'only someone on the project team can be given a role on a task' using errcode = '23514';
    end if;
  end if;
  return new;
end $$;
revoke execute on function public.guard_task_raci() from public, anon, authenticated;

drop trigger if exists guard_task_raci on public.task_raci;
create trigger guard_task_raci before insert or update or delete on public.task_raci
  for each row execute function public.guard_task_raci();

drop trigger if exists audit_task_raci on public.task_raci;
create trigger audit_task_raci after insert or update or delete on public.task_raci
  for each row execute function public.log_audit();

alter table public.task_raci enable row level security;
revoke all on table public.task_raci from anon, authenticated;
grant select, insert, update, delete on table public.task_raci to authenticated;

drop policy if exists task_raci_select on public.task_raci;
create policy task_raci_select on public.task_raci for select to authenticated
  using (
    exists (select 1 from public.tasks t where t.id = task_id and public.can_access_project(t.project_id))
    and not public.has_role('donor')
  );
drop policy if exists task_raci_select_oversight on public.task_raci;
create policy task_raci_select_oversight on public.task_raci for select to authenticated
  using (public.has_oversight_read());
drop policy if exists task_raci_insert on public.task_raci;
create policy task_raci_insert on public.task_raci for insert to authenticated
  with check (
    exists (select 1 from public.tasks t where t.id = task_id and public.can_access_project(t.project_id))
    and public.has_any_role(array['executive','programme_manager','project_officer']::public.app_role[])
  );
drop policy if exists task_raci_update on public.task_raci;
create policy task_raci_update on public.task_raci for update to authenticated
  using (
    exists (select 1 from public.tasks t where t.id = task_id and public.can_access_project(t.project_id))
    and public.has_any_role(array['executive','programme_manager','project_officer']::public.app_role[])
  )
  with check (
    public.has_any_role(array['executive','programme_manager','project_officer']::public.app_role[])
  );
drop policy if exists task_raci_delete on public.task_raci;
create policy task_raci_delete on public.task_raci for delete to authenticated
  using (
    exists (select 1 from public.tasks t where t.id = task_id and public.can_access_project(t.project_id))
    and public.has_any_role(array['executive','programme_manager','project_officer']::public.app_role[])
  );
