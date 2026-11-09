-- 0020_project_tasks.sql
-- Tasks and workplan (projects step 5): rules and access for the tables created in 0002.
--
-- Before this, tasks had one broad "for all" policy for any internal user on the project, and
-- task_comments had RLS on but NO policy (so nobody could use it). This migration adds:
--   * tasks.description and tasks.completed_at (the database sets it when a task becomes "done").
--   * Who may do what: the Executive Director, Programme Manager and Program Officers create, edit,
--     assign and delete tasks on their projects. The person a task is assigned to (any internal staff,
--     for example a field officer) may change ONLY its status.
--   * A task can only be assigned to someone on the project team (team access, the project creator
--     or the Executive Director). A task can link to a logframe item of the SAME project.
--   * A closed project's tasks are frozen. Project and creator cannot be changed. Text limits.
--   * task_comments: staff on the project read and add comments; the database records the author;
--     comments cannot be edited or deleted. Donors see no tasks and no comments.
--   * project_team(): the list of people a task can be assigned to (id and name only), because
--     officers cannot read the access table directly.
--   * Every change is in the audit log (audit triggers already exist from 0002 for both tables).
--
-- Additive for data: the tables are empty in production today (checked before applying).
-- Direct database sessions with no signed-in user (SQL editor, migrations, service role) are not restricted,
-- as in 0012 and later.

-- ===== table changes =====
alter table public.tasks add column if not exists description text;
alter table public.tasks add column if not exists completed_at timestamptz;
create index if not exists tasks_project_status_idx on public.tasks (project_id, status);
create index if not exists tasks_assignee_idx on public.tasks (assignee_id);
create index if not exists tasks_node_idx on public.tasks (node_id);
create index if not exists tasks_created_by_idx on public.tasks (created_by);
create index if not exists task_comments_task_idx on public.task_comments (task_id, created_at);
create index if not exists task_comments_author_idx on public.task_comments (author_id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tasks_text_limits') then
    alter table public.tasks add constraint tasks_text_limits check (
      char_length(title) between 2 and 200
      and (description is null or char_length(description) <= 2000));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'task_comments_body_limits') then
    alter table public.task_comments add constraint task_comments_body_limits check (
      char_length(body) between 1 and 2000);
  end if;
end $$;

-- ===== who can be assigned =====
create or replace function public.project_team(_project_id uuid)
returns table (id uuid, full_name text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.full_name
  from public.profiles p
  where public.can_access_project(_project_id)
    and not public.has_role('donor')
    and p.is_active
    and (
      exists (select 1 from public.user_project_access a
              where a.user_id = p.id and a.project_id = _project_id
                and (a.expires_at is null or a.expires_at > now()))
      or exists (select 1 from public.projects pr where pr.id = _project_id and pr.created_by = p.id)
      or exists (select 1 from public.user_roles r where r.user_id = p.id and r.role = 'executive')
    )
  order by p.full_name;
$$;
revoke execute on function public.project_team(uuid) from public, anon;
grant execute on function public.project_team(uuid) to authenticated;

-- ===== rules: tasks =====
create or replace function public.guard_task()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  stage_now public.project_stage;
  pid uuid;
  manager boolean;
begin
  if (select auth.uid()) is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  pid := case when tg_op = 'DELETE' then old.project_id else new.project_id end;
  select p.stage into stage_now from public.projects p where p.id = pid;
  if stage_now = 'closed' then
    raise exception 'the tasks of a closed project cannot be changed' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;

  manager := public.has_any_role(array['executive','programme_manager','project_officer']::public.app_role[]);

  if tg_op = 'UPDATE' then
    if new.project_id is distinct from old.project_id or new.created_by is distinct from old.created_by
       or new.created_at is distinct from old.created_at then
      raise exception 'a task cannot move to another project or change its creator' using errcode = '42501';
    end if;
    if not manager and (new.title is distinct from old.title
                        or new.description is distinct from old.description
                        or new.assignee_id is distinct from old.assignee_id
                        or new.due_date is distinct from old.due_date
                        or new.priority is distinct from old.priority
                        or new.node_id is distinct from old.node_id
                        or new.deleted_at is distinct from old.deleted_at) then
      raise exception 'the person a task is assigned to can change only its status' using errcode = '42501';
    end if;
  else
    new.created_by := (select auth.uid());
  end if;

  if new.node_id is not null
     and (tg_op = 'INSERT' or new.node_id is distinct from old.node_id)
     and not exists (select 1 from public.logframe_nodes n where n.id = new.node_id and n.project_id = new.project_id) then
    raise exception 'the logframe item must be in the same project' using errcode = '23514';
  end if;

  if new.assignee_id is not null
     and (tg_op = 'INSERT' or new.assignee_id is distinct from old.assignee_id)
     and not exists (
       select 1 from public.project_team(new.project_id) t where t.id = new.assignee_id) then
    raise exception 'the task can only be assigned to someone on the project team' using errcode = '23514';
  end if;

  if new.status = 'done' then
    if tg_op = 'INSERT' or old.status is distinct from 'done' then new.completed_at := now(); else new.completed_at := old.completed_at; end if;
  else
    new.completed_at := null;
  end if;
  new.updated_at := now();
  return new;
end $$;
revoke execute on function public.guard_task() from public, anon, authenticated;

drop trigger if exists guard_task on public.tasks;
create trigger guard_task before insert or update or delete on public.tasks
  for each row execute function public.guard_task();

-- ===== rules: task comments =====
create or replace function public.guard_task_comment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare stage_now public.project_stage;
begin
  if (select auth.uid()) is null then
    return new;
  end if;
  select p.stage into stage_now
    from public.tasks t join public.projects p on p.id = t.project_id where t.id = new.task_id;
  if stage_now = 'closed' then
    raise exception 'the tasks of a closed project cannot be changed' using errcode = '42501';
  end if;
  new.author_id := (select auth.uid());
  new.created_at := now();
  return new;
end $$;
revoke execute on function public.guard_task_comment() from public, anon, authenticated;

drop trigger if exists guard_task_comment on public.task_comments;
create trigger guard_task_comment before insert on public.task_comments
  for each row execute function public.guard_task_comment();

-- ===== access =====
alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;
revoke all on table public.task_comments from anon, authenticated;
grant select, insert on table public.task_comments to authenticated;

-- tasks: read policies stay as in 0002 / 0013 (staff on the project, never a donor; oversight read-only)
drop policy if exists tasks_write on public.tasks;
drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks for insert to authenticated
  with check (
    public.can_access_project(project_id)
    and public.has_any_role(array['executive','programme_manager','project_officer']::public.app_role[])
  );
drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks for update to authenticated
  using (
    public.can_access_project(project_id)
    and (
      public.has_any_role(array['executive','programme_manager','project_officer']::public.app_role[])
      or (assignee_id = (select auth.uid()) and public.is_internal_user())
    )
  )
  with check (
    public.can_access_project(project_id)
    and (
      public.has_any_role(array['executive','programme_manager','project_officer']::public.app_role[])
      or (assignee_id = (select auth.uid()) and public.is_internal_user())
    )
  );
drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete on public.tasks for delete to authenticated
  using (
    public.can_access_project(project_id)
    and public.has_any_role(array['executive','programme_manager','project_officer']::public.app_role[])
  );

-- comments
drop policy if exists task_comments_select on public.task_comments;
create policy task_comments_select on public.task_comments for select to authenticated
  using (
    exists (select 1 from public.tasks t where t.id = task_id and public.can_access_project(t.project_id))
    and not public.has_role('donor')
  );
drop policy if exists task_comments_select_oversight on public.task_comments;
create policy task_comments_select_oversight on public.task_comments for select to authenticated
  using (public.has_oversight_read());
drop policy if exists task_comments_insert on public.task_comments;
create policy task_comments_insert on public.task_comments for insert to authenticated
  with check (
    exists (select 1 from public.tasks t where t.id = task_id and public.can_access_project(t.project_id))
    and public.is_internal_user()
  );
