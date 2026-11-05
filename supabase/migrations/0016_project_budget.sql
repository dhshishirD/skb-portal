-- 0016_project_budget.sql
-- Budget and packages (donor-pack module 1).
--
--   * project_budget_items: what one package contains (name, measure, quantity, BDT unit price),
--     plus one-off cost lines that are not multiplied by the number of packages (rent, trainer fees).
--   * project_budget_settings: one row per project: number of packages (households or beneficiaries),
--     the BDT-per-donor-currency exchange rate, the target administration percentage.
--   * The exchange rate is entered by the Executive Director only (with a date and an optional note);
--     the database records who set it and when. Every change to both tables is in the audit log.
--   * The donor amount and currency are NOT stored here: they stay on the project (projects.budget_amount /
--     budget_currency). Totals (package cost, project cost, admin cost, balance) are calculated by the
--     application from these inputs; nothing derived is stored.
--   * Donors cannot read any of it (as for budget lines, 0014). Board / legal officer: read-only oversight.
--   * A closed project's budget cannot be changed.
--
-- Additive: two new tables, three functions, triggers and policies. No existing table or row is touched.
-- Direct database sessions with no signed-in user (SQL editor, migrations, service role) are not restricted,
-- as in 0012 and 0015.

-- ===== settings: one row per project =====
create table if not exists public.project_budget_settings (
  project_id     uuid primary key references public.projects(id) on delete cascade,
  packages_count integer not null default 0 check (packages_count between 0 and 10000000),
  admin_percent  numeric(5,2) not null default 5 check (admin_percent >= 0 and admin_percent <= 30),
  -- BDT for 1 unit of the project's donor currency (for example 140 BDT = 1 EUR)
  exchange_rate  numeric(12,4) check (exchange_rate > 0),
  rate_date      date,
  rate_note      text check (rate_note is null or char_length(rate_note) <= 500),
  rate_set_by    uuid references auth.users(id),
  rate_set_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint project_budget_rate_has_date check (exchange_rate is null or rate_date is not null)
);

-- ===== items =====
create table if not exists public.project_budget_items (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects(id) on delete cascade,
  kind           text not null default 'per_package' check (kind in ('per_package', 'one_off')),
  group_name     text check (group_name is null or char_length(group_name) between 1 and 120),
  position       integer not null default 0,
  name           text not null check (char_length(name) between 2 and 200),
  measure        text not null default 'Pcs' check (char_length(measure) between 1 and 30),
  quantity       numeric(12,3) not null check (quantity > 0),
  unit_price_bdt numeric(14,2) not null check (unit_price_bdt >= 0),
  created_by     uuid default auth.uid() references auth.users(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists project_budget_items_project_idx on public.project_budget_items (project_id, position);
create index if not exists project_budget_items_created_by_idx on public.project_budget_items (created_by);
create index if not exists project_budget_settings_rate_set_by_idx on public.project_budget_settings (rate_set_by);

-- ===== rules (signed-in users only) =====
create or replace function public.guard_project_budget_settings()
returns trigger language plpgsql security definer set search_path = '' as $$
declare stage_now public.project_stage;
begin
  if (select auth.uid()) is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.project_id is distinct from old.project_id then
    raise exception 'budget settings cannot move to another project' using errcode = '42501';
  end if;
  select p.stage into stage_now from public.projects p where p.id = new.project_id;
  if stage_now = 'closed' then
    raise exception 'the budget of a closed project cannot be changed' using errcode = '42501';
  end if;

  if (tg_op = 'INSERT' and (new.exchange_rate is not null or new.rate_date is not null or new.rate_note is not null))
     or (tg_op = 'UPDATE' and (new.exchange_rate is distinct from old.exchange_rate
                               or new.rate_date is distinct from old.rate_date
                               or new.rate_note is distinct from old.rate_note)) then
    if not public.has_role('executive') then
      raise exception 'only the Executive Director can set the exchange rate' using errcode = '42501';
    end if;
    new.rate_set_by := (select auth.uid());
    new.rate_set_at := now();
  elsif tg_op = 'UPDATE' then
    new.rate_set_by := old.rate_set_by;
    new.rate_set_at := old.rate_set_at;
  else
    new.rate_set_by := null;
    new.rate_set_at := null;
  end if;

  new.updated_at := now();
  return new;
end $$;
revoke execute on function public.guard_project_budget_settings() from public, anon, authenticated;

drop trigger if exists guard_project_budget_settings on public.project_budget_settings;
create trigger guard_project_budget_settings before insert or update on public.project_budget_settings
  for each row execute function public.guard_project_budget_settings();

create or replace function public.guard_project_budget_item()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  pid uuid;
  stage_now public.project_stage;
begin
  if (select auth.uid()) is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  pid := case when tg_op = 'DELETE' then old.project_id else new.project_id end;
  if tg_op = 'UPDATE' and new.project_id is distinct from old.project_id then
    raise exception 'a budget item cannot move to another project' using errcode = '42501';
  end if;
  select p.stage into stage_now from public.projects p where p.id = pid;
  if stage_now = 'closed' then
    raise exception 'the budget of a closed project cannot be changed' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  if tg_op = 'UPDATE' then
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end $$;
revoke execute on function public.guard_project_budget_item() from public, anon, authenticated;

drop trigger if exists guard_project_budget_item on public.project_budget_items;
create trigger guard_project_budget_item before insert or update or delete on public.project_budget_items
  for each row execute function public.guard_project_budget_item();

-- ===== who changed what and when =====
drop trigger if exists audit_project_budget_settings on public.project_budget_settings;
create trigger audit_project_budget_settings after insert or update or delete on public.project_budget_settings
  for each row execute function public.log_audit();
drop trigger if exists audit_project_budget_items on public.project_budget_items;
create trigger audit_project_budget_items after insert or update or delete on public.project_budget_items
  for each row execute function public.log_audit();

-- ===== access =====
alter table public.project_budget_settings enable row level security;
alter table public.project_budget_items enable row level security;

revoke all on table public.project_budget_settings from anon, authenticated;
revoke all on table public.project_budget_items from anon, authenticated;
grant select, insert, update on table public.project_budget_settings to authenticated;
grant select, insert, update, delete on table public.project_budget_items to authenticated;

-- read: people on the project, never a donor; board / legal officer read everything (oversight)
drop policy if exists project_budget_settings_select on public.project_budget_settings;
create policy project_budget_settings_select on public.project_budget_settings for select to authenticated
  using (public.can_access_project(project_id) and not public.has_role('donor'));
drop policy if exists project_budget_settings_select_oversight on public.project_budget_settings;
create policy project_budget_settings_select_oversight on public.project_budget_settings for select to authenticated
  using (public.has_oversight_read());

drop policy if exists project_budget_items_select on public.project_budget_items;
create policy project_budget_items_select on public.project_budget_items for select to authenticated
  using (public.can_access_project(project_id) and not public.has_role('donor'));
drop policy if exists project_budget_items_select_oversight on public.project_budget_items;
create policy project_budget_items_select_oversight on public.project_budget_items for select to authenticated
  using (public.has_oversight_read());

-- write: Executive Director, Programme Manager and Program Officers on their own projects
drop policy if exists project_budget_settings_insert on public.project_budget_settings;
create policy project_budget_settings_insert on public.project_budget_settings for insert to authenticated
  with check (
    public.can_access_project(project_id)
    and public.has_any_role(array['executive','programme_manager','project_officer']::public.app_role[])
  );
drop policy if exists project_budget_settings_update on public.project_budget_settings;
create policy project_budget_settings_update on public.project_budget_settings for update to authenticated
  using (
    public.can_access_project(project_id)
    and public.has_any_role(array['executive','programme_manager','project_officer']::public.app_role[])
  )
  with check (
    public.has_any_role(array['executive','programme_manager','project_officer']::public.app_role[])
  );

drop policy if exists project_budget_items_insert on public.project_budget_items;
create policy project_budget_items_insert on public.project_budget_items for insert to authenticated
  with check (
    public.can_access_project(project_id)
    and public.has_any_role(array['executive','programme_manager','project_officer']::public.app_role[])
    and created_by = (select auth.uid())
  );
drop policy if exists project_budget_items_update on public.project_budget_items;
create policy project_budget_items_update on public.project_budget_items for update to authenticated
  using (
    public.can_access_project(project_id)
    and public.has_any_role(array['executive','programme_manager','project_officer']::public.app_role[])
  )
  with check (
    public.has_any_role(array['executive','programme_manager','project_officer']::public.app_role[])
  );
drop policy if exists project_budget_items_delete on public.project_budget_items;
create policy project_budget_items_delete on public.project_budget_items for delete to authenticated
  using (
    public.can_access_project(project_id)
    and public.has_any_role(array['executive','programme_manager','project_officer']::public.app_role[])
  );
