-- 0002_project_core.sql
-- Phase 2: Project Core (Kanban Stage Gates, Logframe Tree, Indicators, Tasks, Documents)

-- ===== Enums =====
create type public.logframe_kind as enum ('goal', 'outcome', 'output', 'activity');
create type public.task_status as enum ('todo', 'doing', 'blocked', 'done');
create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');

-- ===== Tables =====
create table public.project_stage_history (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  from_stage public.project_stage,
  to_stage public.project_stage not null,
  changed_by uuid default auth.uid() references auth.users(id),
  note text,
  created_at timestamptz not null default now()
);

create table public.stage_gate_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  stage public.project_stage not null,
  label text not null,
  done boolean not null default false,
  done_by uuid references auth.users(id),
  done_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.logframe_nodes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  parent_id uuid references public.logframe_nodes(id) on delete cascade,
  kind public.logframe_kind not null,
  code text not null,
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.indicators (
  id uuid primary key default gen_random_uuid(),
  node_id uuid not null references public.logframe_nodes(id) on delete cascade,
  name text not null,
  unit text not null,
  baseline numeric(14,2) not null default 0,
  target numeric(14,2) not null,
  frequency text,
  means_of_verification text,
  disaggregation jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.indicator_values (
  id uuid primary key default gen_random_uuid(),
  indicator_id uuid not null references public.indicators(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  value numeric(14,2) not null,
  location_id uuid references public.locations(id),
  source_report_id uuid,
  validated_by uuid references auth.users(id),
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  node_id uuid references public.logframe_nodes(id) on delete set null,
  title text not null,
  assignee_id uuid references public.profiles(id),
  due_date date,
  status public.task_status not null default 'todo',
  priority public.task_priority not null default 'medium',
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  category text not null default 'general',
  current_version_id uuid,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  storage_path text not null,
  mime text not null,
  size bigint not null check (size > 0),
  version_no int not null default 1,
  uploaded_by uuid default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

-- ===== RLS Security =====
do $$
declare t text;
begin
  foreach t in array array[
    'project_stage_history','stage_gate_items','logframe_nodes','indicators',
    'indicator_values','tasks','task_comments','documents','document_versions'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

revoke all on all tables in schema public from anon;

create policy stage_history_select on public.project_stage_history for select to authenticated
  using (public.can_access_project(project_id));
create policy stage_history_insert on public.project_stage_history for insert to authenticated
  with check (public.can_access_project(project_id) and public.has_any_role(array['programme_manager','executive']::public.app_role[]));

create policy stage_gate_select on public.stage_gate_items for select to authenticated
  using (public.can_access_project(project_id));
create policy stage_gate_update on public.stage_gate_items for update to authenticated
  using (public.can_access_project(project_id) and public.has_any_role(array['programme_manager','project_officer']::public.app_role[]));

create policy logframe_select on public.logframe_nodes for select to authenticated
  using (public.can_access_project(project_id));
create policy logframe_write on public.logframe_nodes for all to authenticated
  using (public.can_access_project(project_id) and public.has_any_role(array['programme_manager','project_officer']::public.app_role[]));

create policy indicators_select on public.indicators for select to authenticated
  using (exists (select 1 from public.logframe_nodes n where n.id = node_id and public.can_access_project(n.project_id)));
create policy indicators_write on public.indicators for all to authenticated
  using (exists (select 1 from public.logframe_nodes n where n.id = node_id and public.can_access_project(n.project_id) and public.has_any_role(array['programme_manager','project_officer']::public.app_role[])));

create policy tasks_select on public.tasks for select to authenticated
  using (public.can_access_project(project_id));
create policy tasks_write on public.tasks for all to authenticated
  using (public.can_access_project(project_id) and public.is_internal_user());

create policy docs_select on public.documents for select to authenticated
  using (public.can_access_project(project_id));
create policy docs_write on public.documents for all to authenticated
  using (public.can_access_project(project_id) and public.is_internal_user());

-- Audit Triggers
do $$
declare t text;
begin
  foreach t in array array[
    'project_stage_history','stage_gate_items','logframe_nodes','indicators',
    'indicator_values','tasks','task_comments','documents','document_versions'
  ] loop
    execute format('create trigger audit_%1$s after insert or update or delete on public.%1$s for each row execute function public.log_audit()', t);
  end loop;
end $$;
