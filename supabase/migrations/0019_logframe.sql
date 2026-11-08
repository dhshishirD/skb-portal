-- 0019_logframe.sql
-- Logframe and indicators (projects step 4): rules and access for the tables created in 0002.
--
-- Before this, logframe_nodes / indicators had one broad "for all" policy with no checks, and
-- indicator_values had RLS on but NO policy at all (so nobody could use it). This migration adds:
--   * Structure rules: a node's parent must be in the same project and exactly one level up
--     (goal > outcome > output > activity); parent, kind and project cannot be changed later;
--     codes are unique per project; sensible length limits.
--   * indicators.measure: how progress is counted ('cumulative' = add up the values of all periods;
--     'latest' = the newest value counts, for rates and percentages).
--   * indicator_values.created_by (who entered it) and rules: a validated value is frozen; only
--     the Programme Manager, M&E Officer or Executive Director validate; the database records who
--     and when; you cannot validate a value you entered yourself (except the Executive Director).
--   * Clear policies: staff on the project read everything; donors read the logframe, indicators and
--     VALIDATED values of their own projects only; board / legal officer read-only oversight.
--   * Every change is in the audit log; a closed project's logframe is frozen.
--
-- Additive for data: the three tables are empty in production today (checked before applying).
-- Direct database sessions with no signed-in user (SQL editor, migrations, service role) are not restricted,
-- as in 0012, 0015, 0016, 0017 and 0018.

-- ===== table changes =====
alter table public.indicators add column if not exists measure text not null default 'cumulative';
alter table public.indicator_values add column if not exists created_by uuid default auth.uid() references auth.users(id);
create index if not exists indicator_values_created_by_idx on public.indicator_values (created_by);
create index if not exists indicator_values_validated_by_idx on public.indicator_values (validated_by);
create index if not exists indicator_values_indicator_idx on public.indicator_values (indicator_id, period_start);
create index if not exists logframe_nodes_project_idx on public.logframe_nodes (project_id, kind);
create index if not exists logframe_nodes_parent_idx on public.logframe_nodes (parent_id);
create index if not exists indicators_node_idx on public.indicators (node_id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'logframe_nodes_code_unique') then
    alter table public.logframe_nodes add constraint logframe_nodes_code_unique unique (project_id, code);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'logframe_nodes_text_limits') then
    alter table public.logframe_nodes add constraint logframe_nodes_text_limits check (
      char_length(code) between 1 and 20 and char_length(title) between 2 and 300
      and (description is null or char_length(description) <= 2000));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'indicators_text_limits') then
    alter table public.indicators add constraint indicators_text_limits check (
      char_length(name) between 2 and 300 and char_length(unit) between 1 and 40
      and baseline >= 0 and target >= 0
      and (frequency is null or char_length(frequency) <= 100)
      and (means_of_verification is null or char_length(means_of_verification) <= 1000)
      and measure in ('cumulative', 'latest'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'indicator_values_limits') then
    alter table public.indicator_values add constraint indicator_values_limits check (
      value >= 0 and period_end >= period_start
      and ((validated_by is null) = (validated_at is null)));
  end if;
end $$;

-- ===== rules: logframe nodes =====
create or replace function public.guard_logframe_node()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  stage_now public.project_stage;
  parent_row record;
  pid uuid;
begin
  if (select auth.uid()) is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  pid := case when tg_op = 'DELETE' then old.project_id else new.project_id end;
  select p.stage into stage_now from public.projects p where p.id = pid;
  if stage_now = 'closed' then
    raise exception 'the logframe of a closed project cannot be changed' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;

  if tg_op = 'UPDATE' and (new.project_id is distinct from old.project_id
                           or new.parent_id is distinct from old.parent_id
                           or new.kind is distinct from old.kind) then
    raise exception 'a logframe item cannot be moved or change level' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    if new.kind = 'goal' then
      if new.parent_id is not null then
        raise exception 'a goal has no parent' using errcode = '23514';
      end if;
    else
      select n.project_id, n.kind into parent_row from public.logframe_nodes n where n.id = new.parent_id;
      if not found or parent_row.project_id is distinct from new.project_id then
        raise exception 'the parent must be in the same project' using errcode = '23514';
      end if;
      if not ((new.kind = 'outcome' and parent_row.kind = 'goal')
           or (new.kind = 'output' and parent_row.kind = 'outcome')
           or (new.kind = 'activity' and parent_row.kind = 'output')) then
        raise exception 'the parent is at the wrong level' using errcode = '23514';
      end if;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
revoke execute on function public.guard_logframe_node() from public, anon, authenticated;

drop trigger if exists guard_logframe_node on public.logframe_nodes;
create trigger guard_logframe_node before insert or update or delete on public.logframe_nodes
  for each row execute function public.guard_logframe_node();

-- ===== rules: indicators =====
create or replace function public.guard_indicator()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  stage_now public.project_stage;
  nid uuid;
begin
  if (select auth.uid()) is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  nid := case when tg_op = 'DELETE' then old.node_id else new.node_id end;
  select p.stage into stage_now from public.logframe_nodes n join public.projects p on p.id = n.project_id where n.id = nid;
  if stage_now = 'closed' then
    raise exception 'the logframe of a closed project cannot be changed' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  if tg_op = 'UPDATE' and new.node_id is distinct from old.node_id then
    raise exception 'an indicator cannot move to another logframe item' using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end $$;
revoke execute on function public.guard_indicator() from public, anon, authenticated;

drop trigger if exists guard_indicator on public.indicators;
create trigger guard_indicator before insert or update or delete on public.indicators
  for each row execute function public.guard_indicator();

-- ===== rules: indicator values =====
create or replace function public.guard_indicator_value()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  stage_now public.project_stage;
  iid uuid;
begin
  if (select auth.uid()) is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  iid := case when tg_op = 'DELETE' then old.indicator_id else new.indicator_id end;
  select p.stage into stage_now
    from public.indicators i join public.logframe_nodes n on n.id = i.node_id join public.projects p on p.id = n.project_id
    where i.id = iid;
  if stage_now = 'closed' then
    raise exception 'the logframe of a closed project cannot be changed' using errcode = '42501';
  end if;

  if tg_op = 'DELETE' then
    if old.validated_at is not null then
      raise exception 'a validated value cannot be deleted' using errcode = '42501';
    end if;
    return old;
  end if;

  if tg_op = 'INSERT' then
    new.created_by := (select auth.uid());
    new.validated_by := null;
    new.validated_at := null;
    new.updated_at := now();
    return new;
  end if;

  -- UPDATE
  if new.indicator_id is distinct from old.indicator_id or new.created_by is distinct from old.created_by then
    raise exception 'an indicator value cannot move or change author' using errcode = '42501';
  end if;
  if old.validated_at is not null then
    raise exception 'a validated value cannot be changed' using errcode = '42501';
  end if;
  if new.validated_at is not null then
    if not public.has_any_role(array['executive','programme_manager','me_officer']::public.app_role[]) then
      raise exception 'only the Programme Manager, M&E Officer or Executive Director can validate a value' using errcode = '42501';
    end if;
    if old.created_by is not distinct from (select auth.uid()) and not public.has_role('executive') then
      raise exception 'you cannot validate a value you entered yourself' using errcode = '42501';
    end if;
    new.validated_by := (select auth.uid());
    new.validated_at := now();
  else
    new.validated_by := null;
  end if;
  new.updated_at := now();
  return new;
end $$;
revoke execute on function public.guard_indicator_value() from public, anon, authenticated;

drop trigger if exists guard_indicator_value on public.indicator_values;
create trigger guard_indicator_value before insert or update or delete on public.indicator_values
  for each row execute function public.guard_indicator_value();

-- ===== who changed what and when =====
drop trigger if exists audit_logframe_nodes on public.logframe_nodes;
create trigger audit_logframe_nodes after insert or update or delete on public.logframe_nodes
  for each row execute function public.log_audit();
drop trigger if exists audit_indicators on public.indicators;
create trigger audit_indicators after insert or update or delete on public.indicators
  for each row execute function public.log_audit();
drop trigger if exists audit_indicator_values on public.indicator_values;
create trigger audit_indicator_values after insert or update or delete on public.indicator_values
  for each row execute function public.log_audit();

-- ===== access =====
alter table public.logframe_nodes enable row level security;
alter table public.indicators enable row level security;
alter table public.indicator_values enable row level security;
revoke all on table public.indicator_values from anon, authenticated;
grant select, insert, update, delete on table public.indicator_values to authenticated;

-- logframe nodes: read as before (donors read the logframe of their own projects by design, 0013)
drop policy if exists logframe_write on public.logframe_nodes;
drop policy if exists logframe_nodes_insert on public.logframe_nodes;
create policy logframe_nodes_insert on public.logframe_nodes for insert to authenticated
  with check (
    public.can_access_project(project_id)
    and public.has_any_role(array['executive','programme_manager','project_officer']::public.app_role[])
  );
drop policy if exists logframe_nodes_update on public.logframe_nodes;
create policy logframe_nodes_update on public.logframe_nodes for update to authenticated
  using (
    public.can_access_project(project_id)
    and public.has_any_role(array['executive','programme_manager','project_officer']::public.app_role[])
  )
  with check (
    public.has_any_role(array['executive','programme_manager','project_officer']::public.app_role[])
  );
drop policy if exists logframe_nodes_delete on public.logframe_nodes;
create policy logframe_nodes_delete on public.logframe_nodes for delete to authenticated
  using (
    public.can_access_project(project_id)
    and public.has_any_role(array['executive','programme_manager','project_officer']::public.app_role[])
  );

-- indicators
drop policy if exists indicators_write on public.indicators;
drop policy if exists indicators_insert on public.indicators;
create policy indicators_insert on public.indicators for insert to authenticated
  with check (
    exists (select 1 from public.logframe_nodes n where n.id = node_id and public.can_access_project(n.project_id))
    and public.has_any_role(array['executive','programme_manager','project_officer','me_officer']::public.app_role[])
  );
drop policy if exists indicators_update on public.indicators;
create policy indicators_update on public.indicators for update to authenticated
  using (
    exists (select 1 from public.logframe_nodes n where n.id = node_id and public.can_access_project(n.project_id))
    and public.has_any_role(array['executive','programme_manager','project_officer','me_officer']::public.app_role[])
  )
  with check (
    public.has_any_role(array['executive','programme_manager','project_officer','me_officer']::public.app_role[])
  );
drop policy if exists indicators_delete on public.indicators;
create policy indicators_delete on public.indicators for delete to authenticated
  using (
    exists (select 1 from public.logframe_nodes n where n.id = node_id and public.can_access_project(n.project_id))
    and public.has_any_role(array['executive','programme_manager','project_officer','me_officer']::public.app_role[])
  );

-- indicator values: staff on the project read all; donors read only VALIDATED values of their own projects
drop policy if exists indicator_values_select on public.indicator_values;
create policy indicator_values_select on public.indicator_values for select to authenticated
  using (
    exists (
      select 1 from public.indicators i join public.logframe_nodes n on n.id = i.node_id
      where i.id = indicator_id and public.can_access_project(n.project_id)
    )
    and (validated_at is not null or not public.has_role('donor'))
  );
drop policy if exists indicator_values_select_oversight on public.indicator_values;
create policy indicator_values_select_oversight on public.indicator_values for select to authenticated
  using (public.has_oversight_read());

drop policy if exists indicator_values_insert on public.indicator_values;
create policy indicator_values_insert on public.indicator_values for insert to authenticated
  with check (
    exists (
      select 1 from public.indicators i join public.logframe_nodes n on n.id = i.node_id
      where i.id = indicator_id and public.can_access_project(n.project_id)
    )
    and public.has_any_role(array['executive','programme_manager','project_officer','me_officer']::public.app_role[])
  );
drop policy if exists indicator_values_update on public.indicator_values;
create policy indicator_values_update on public.indicator_values for update to authenticated
  using (
    exists (
      select 1 from public.indicators i join public.logframe_nodes n on n.id = i.node_id
      where i.id = indicator_id and public.can_access_project(n.project_id)
    )
    and public.has_any_role(array['executive','programme_manager','project_officer','me_officer']::public.app_role[])
  )
  with check (
    public.has_any_role(array['executive','programme_manager','project_officer','me_officer']::public.app_role[])
  );
drop policy if exists indicator_values_delete on public.indicator_values;
create policy indicator_values_delete on public.indicator_values for delete to authenticated
  using (
    exists (
      select 1 from public.indicators i join public.logframe_nodes n on n.id = i.node_id
      where i.id = indicator_id and public.can_access_project(n.project_id)
    )
    and public.has_any_role(array['executive','programme_manager','project_officer','me_officer']::public.app_role[])
  );
