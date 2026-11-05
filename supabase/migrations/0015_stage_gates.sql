-- 0015_stage_gates.sql
-- Stage gates (Projects step 2).
--
--   * A standard checklist (templates) per stage; every project gets its own copy.
--   * Staff tick items of the project's CURRENT stage; who ticked and when is recorded by the database.
--   * Only the Executive Director moves a project to another stage, one step at a time, and only
--     through advance_project_stage(): forward needs every required item of the current stage done,
--     going back needs a written reason. Every move is written to project_stage_history.
--   * A direct UPDATE of projects.stage (or a direct insert into the history) is refused for signed-in
--     users, so the rule cannot be bypassed from the API.
--
-- Additive: new table, new columns, new functions. The only existing rows touched are none: gate items
-- are created for each project (the tables were empty). Direct database sessions with no signed-in user
-- (SQL editor, migrations, service role) are not restricted, as in 0012.
--
-- NOTE: the checklist wording below is SKB's proposed standard (PMD Pro / NGO practice, plus NGO Affairs
-- Bureau steps). It is data, not code: it can be edited by a later migration after the owner reviews it.

-- ===== gate items: order, required flag, one row per label =====
alter table public.stage_gate_items
  add column if not exists position integer not null default 0,
  add column if not exists required boolean not null default true;

alter table public.stage_gate_items
  add constraint stage_gate_items_label_length check (char_length(label) between 3 and 200) not valid;

create unique index if not exists stage_gate_items_project_stage_label_key
  on public.stage_gate_items (project_id, stage, label);

-- ===== standard checklist =====
create table if not exists public.stage_gate_templates (
  stage    public.project_stage not null,
  position integer not null,
  label    text not null check (char_length(label) between 3 and 200),
  required boolean not null default true,
  primary key (stage, position)
);
alter table public.stage_gate_templates enable row level security;
revoke all on table public.stage_gate_templates from anon, authenticated;
grant select on table public.stage_gate_templates to authenticated;
drop policy if exists stage_gate_templates_select on public.stage_gate_templates;
create policy stage_gate_templates_select on public.stage_gate_templates for select to authenticated
  using (public.is_internal_user());

insert into public.stage_gate_templates (stage, position, label, required) values
  ('concept', 1, 'Concept note written and shared with the Executive Director', true),
  ('concept', 2, 'Need / problem analysis completed', true),
  ('concept', 3, 'Funding opportunity or donor identified', true),
  ('concept', 4, 'Preliminary budget estimate prepared', true),
  ('concept', 5, 'Risk and safeguarding screening done', true),

  ('proposal', 1, 'Results framework (logframe) drafted', true),
  ('proposal', 2, 'Detailed budget prepared', true),
  ('proposal', 3, 'Beneficiary selection criteria defined', true),
  ('proposal', 4, 'Data protection and safeguarding check done', true),
  ('proposal', 5, 'Proposal submitted to the donor', true),
  ('proposal', 6, 'NGO Affairs Bureau approval requested (foreign-funded projects)', false),

  ('approved', 1, 'Donor agreement signed', true),
  ('approved', 2, 'NGO Affairs Bureau approval received (foreign-funded projects)', false),
  ('approved', 3, 'Project charter approved by the Executive Director', true),
  ('approved', 4, 'Project budget set up in finance', true),
  ('approved', 5, 'Project team and Program Officers assigned', true),

  ('implementation', 1, 'Baseline completed', true),
  ('implementation', 2, 'Work plan and procurement plan in place', true),
  ('implementation', 3, 'Monitoring plan and indicator targets agreed', true),
  ('implementation', 4, 'Beneficiary consent process approved by the Law Officer', true),
  ('implementation', 5, 'Project kick-off held', true),

  ('monitoring_evaluation', 1, 'Indicator data up to date', true),
  ('monitoring_evaluation', 2, 'Donor reports submitted on schedule', true),
  ('monitoring_evaluation', 3, 'Final evaluation completed', true),
  ('monitoring_evaluation', 4, 'Lessons learned recorded', true),
  ('monitoring_evaluation', 5, 'Audit completed', false)
on conflict (stage, position) do nothing;
-- 'closed' is the final stage: it has no checklist.

-- ===== every project gets its own copy of the checklist =====
create or replace function public.seed_project_gates(_project uuid)
returns void language sql security definer set search_path = '' as $$
  insert into public.stage_gate_items (project_id, stage, label, position, required)
  select _project, t.stage, t.label, t.position, t.required
  from public.stage_gate_templates t
  on conflict (project_id, stage, label) do nothing;
$$;
revoke execute on function public.seed_project_gates(uuid) from public, anon, authenticated;

create or replace function public.projects_seed_gates()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.seed_project_gates(new.id);
  return new;
end $$;
revoke execute on function public.projects_seed_gates() from public, anon, authenticated;

drop trigger if exists projects_seed_gates on public.projects;
create trigger projects_seed_gates after insert on public.projects
  for each row execute function public.projects_seed_gates();

-- existing projects (including demo ones) get the checklist too; nothing is ticked
select public.seed_project_gates(id) from public.projects;

-- ===== ticking items =====
drop policy if exists stage_gate_update on public.stage_gate_items;
create policy stage_gate_update on public.stage_gate_items for update to authenticated
  using (
    public.can_access_project(project_id)
    and public.has_any_role(array['executive','programme_manager','project_officer']::public.app_role[])
  )
  with check (
    public.has_any_role(array['executive','programme_manager','project_officer']::public.app_role[])
  );

-- Only the checkbox can change, only for the project's current stage; the database records who and when.
create or replace function public.guard_stage_gate_item()
returns trigger language plpgsql security definer set search_path = '' as $$
declare cur public.project_stage;
begin
  if (select auth.uid()) is null then
    return new;
  end if;
  if new.project_id is distinct from old.project_id
     or new.stage is distinct from old.stage
     or new.label is distinct from old.label
     or new.position is distinct from old.position
     or new.required is distinct from old.required then
    raise exception 'only the checkbox of a gate item can be changed' using errcode = '42501';
  end if;
  select p.stage into cur from public.projects p where p.id = new.project_id;
  if cur is distinct from new.stage then
    raise exception 'only the checklist of the current stage can be changed' using errcode = '42501';
  end if;
  if new.done then
    new.done_by := (select auth.uid());
    new.done_at := now();
  else
    new.done_by := null;
    new.done_at := null;
  end if;
  return new;
end $$;
revoke execute on function public.guard_stage_gate_item() from public, anon, authenticated;

drop trigger if exists guard_stage_gate_item on public.stage_gate_items;
create trigger guard_stage_gate_item before update on public.stage_gate_items
  for each row execute function public.guard_stage_gate_item();

-- ===== changing the stage: Executive Director only, through one function =====
create or replace function public.advance_project_stage(
  _project uuid,
  _to public.project_stage,
  _note text default null
) returns public.project_stage
language plpgsql security definer set search_path = '' as $$
declare
  cur public.project_stage;
  stages public.project_stage[];
  idx integer;
  missing integer;
  note text := nullif(btrim(coalesce(_note, '')), '');
begin
  if (select auth.uid()) is null then
    raise exception 'sign in required' using errcode = '42501';
  end if;
  if not public.has_role('executive') then
    raise exception 'only the Executive Director can change a project stage' using errcode = '42501';
  end if;

  select p.stage into cur from public.projects p where p.id = _project and p.deleted_at is null for update;
  if not found then
    raise exception 'project not found' using errcode = 'P0002';
  end if;

  stages := enum_range(null::public.project_stage);
  idx := array_position(stages, cur);

  if cur = 'closed' then
    raise exception 'a closed project cannot change stage' using errcode = '22023';
  elsif idx < array_length(stages, 1) and _to = stages[idx + 1] then
    select count(*) into missing from public.stage_gate_items g
      where g.project_id = _project and g.stage = cur and g.required and not g.done;
    if missing > 0 then
      raise exception '% required checklist item(s) of this stage are not complete', missing using errcode = '23514';
    end if;
  elsif idx > 1 and _to = stages[idx - 1] then
    if note is null or char_length(note) < 5 then
      raise exception 'a reason (at least 5 characters) is required to move a project back' using errcode = '23514';
    end if;
  else
    raise exception 'a project can only move one stage forward or one stage back' using errcode = '22023';
  end if;

  perform set_config('app.stage_change', 'on', true);
  update public.projects set stage = _to where id = _project;
  perform set_config('app.stage_change', 'off', true);

  insert into public.project_stage_history (project_id, from_stage, to_stage, changed_by, note)
  values (_project, cur, _to, (select auth.uid()), note);

  return _to;
end $$;
revoke execute on function public.advance_project_stage(uuid, public.project_stage, text) from public, anon;
grant execute on function public.advance_project_stage(uuid, public.project_stage, text) to authenticated;

-- ===== close the side doors =====
-- 1. projects.stage can only change through advance_project_stage(); created_by stays fixed;
--    only the Executive Director archives (as in 0012).
create or replace function public.guard_project_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) is null then
    return new;
  end if;
  if new.created_by is distinct from old.created_by then
    raise exception 'created_by cannot be changed' using errcode = '42501';
  end if;
  if new.deleted_at is distinct from old.deleted_at and not public.has_role('executive') then
    raise exception 'only the Executive Director can archive a project' using errcode = '42501';
  end if;
  if new.stage is distinct from old.stage and coalesce(current_setting('app.stage_change', true), '') <> 'on' then
    raise exception 'a project stage can only be changed through its stage gate' using errcode = '42501';
  end if;
  return new;
end $$;

-- 2. nobody signed in writes the history directly
drop policy if exists stage_history_insert on public.project_stage_history;

-- 3. new projects always start at the first stage
drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects for insert to authenticated
  with check (
    public.has_any_role(array['executive','programme_manager','project_officer']::public.app_role[])
    and created_by = (select auth.uid())
    and stage = 'concept'
  );
