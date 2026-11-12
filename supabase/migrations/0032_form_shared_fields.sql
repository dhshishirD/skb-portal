-- 0032_form_shared_fields.sql
-- Facts that every donor form (Form 1, 3, 7 ...) asks for again and again, kept once in the portal:
--   * the organisation's address, phone, fax, e-mail and website (Admin > Users > Organisation details);
--   * "where the project runs": one row per region with its cities, villages, item quantity and families
--     (the table in Form 3 section 2.3 and Form 7 section 2.3).
--
-- Who may do what (project areas): the Executive Director, Programme Manager and Project Officers on the project
-- write; M&E Officers on the project read, and so do the Board and the Law Officer (oversight). Donors, finance,
-- procurement and field officers see nothing. A closed project is frozen. Every change is audited.
-- No personal data: organisation contact details and place names only.
-- Additive: new nullable columns, one new table, one function, triggers and policies.

-- ===== organisation contact details =====
alter table public.organizations
  add column if not exists address text check (address is null or char_length(address) <= 300),
  add column if not exists phone   text check (phone is null or char_length(phone) <= 40),
  add column if not exists fax     text check (fax is null or char_length(fax) <= 40),
  add column if not exists email   text check (email is null or (char_length(email) <= 200 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  add column if not exists website text check (website is null or char_length(website) <= 200);

-- ===== project areas =====
create table if not exists public.project_areas (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  position      integer not null default 0 check (position between 0 and 1000),
  region        text not null check (char_length(btrim(region)) between 1 and 120),
  cities        text check (cities is null or char_length(cities) <= 500),
  villages      text check (villages is null or char_length(villages) <= 500),
  item_quantity numeric(12,2) check (item_quantity is null or (item_quantity >= 0 and item_quantity <= 100000000)),
  item_unit     text check (item_unit is null or char_length(item_unit) <= 40),
  families      integer check (families is null or (families >= 0 and families <= 10000000)),
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_by    uuid references auth.users(id),
  updated_at    timestamptz not null default now()
);
create index if not exists project_areas_project_idx on public.project_areas (project_id, position);
create index if not exists project_areas_created_by_idx on public.project_areas (created_by);
create index if not exists project_areas_updated_by_idx on public.project_areas (updated_by);

create or replace function public.guard_project_area()
returns trigger language plpgsql security definer set search_path = '' as $$
declare stage_now public.project_stage;
begin
  if (select auth.uid()) is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  select p.stage into stage_now from public.projects p where p.id = case when tg_op = 'DELETE' then old.project_id else new.project_id end;
  if stage_now = 'closed' then
    raise exception 'the areas of a closed project cannot be changed' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  if tg_op = 'INSERT' then
    new.created_by := (select auth.uid());
    new.created_at := now();
  else
    if new.project_id is distinct from old.project_id
       or new.created_by is distinct from old.created_by
       or new.created_at is distinct from old.created_at then
      raise exception 'an area cannot move to another project or change who added it' using errcode = '42501';
    end if;
  end if;
  new.updated_by := (select auth.uid());
  new.updated_at := now();
  return new;
end $$;
revoke execute on function public.guard_project_area() from public, anon, authenticated;

drop trigger if exists guard_project_area on public.project_areas;
create trigger guard_project_area before insert or update or delete on public.project_areas
  for each row execute function public.guard_project_area();

drop trigger if exists audit_project_areas on public.project_areas;
create trigger audit_project_areas after insert or update or delete on public.project_areas
  for each row execute function public.log_audit();

alter table public.project_areas enable row level security;
revoke all on table public.project_areas from anon, authenticated;
grant select, insert, update, delete on table public.project_areas to authenticated;

drop policy if exists areas_select on public.project_areas;
create policy areas_select on public.project_areas for select to authenticated
  using (
    public.can_access_project(project_id)
    and public.has_any_role(array['executive','programme_manager','project_officer','me_officer']::public.app_role[])
  );
drop policy if exists areas_select_oversight on public.project_areas;
create policy areas_select_oversight on public.project_areas for select to authenticated
  using (public.has_oversight_read());
drop policy if exists areas_insert on public.project_areas;
create policy areas_insert on public.project_areas for insert to authenticated
  with check (
    public.can_access_project(project_id)
    and public.has_any_role(array['executive','programme_manager','project_officer']::public.app_role[])
  );
drop policy if exists areas_update on public.project_areas;
create policy areas_update on public.project_areas for update to authenticated
  using (
    public.can_access_project(project_id)
    and public.has_any_role(array['executive','programme_manager','project_officer']::public.app_role[])
  )
  with check (
    public.has_any_role(array['executive','programme_manager','project_officer']::public.app_role[])
  );
drop policy if exists areas_delete on public.project_areas;
create policy areas_delete on public.project_areas for delete to authenticated
  using (
    public.can_access_project(project_id)
    and public.has_any_role(array['executive','programme_manager','project_officer']::public.app_role[])
  );
