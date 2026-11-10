-- 0025_project_headcounts.sql
-- A head count for a project: how many women, men, girls and boys it reached, entered as numbers only.
--
-- For finished or older projects the signed lists are kept on paper or in the project folder, and no one
-- wants to register every person in the portal just to count them. Form-7 uses this count when no
-- individual beneficiary is registered for the project (registered people always come first).
-- No names, IDs or other personal data are stored here.
--
-- Who may do what: the Executive Director, Programme Manager and Project Officers on the project write.
-- M&E Officers on the project read, and so do the Board and the Law Officer (oversight).
-- Donors, finance, procurement and field officers see nothing. A closed project is frozen.
-- Every change is audited.
--
-- Direct database sessions with no signed-in user (SQL editor, migrations, service role) are not restricted,
-- as in 0012 and later. Additive: one new table, one function, triggers and policies.

create table if not exists public.project_headcounts (
  project_id uuid primary key references public.projects(id) on delete cascade,
  women      integer not null default 0 check (women between 0 and 1000000),
  men        integer not null default 0 check (men between 0 and 1000000),
  girls      integer not null default 0 check (girls between 0 and 1000000),
  boys       integer not null default 0 check (boys between 0 and 1000000),
  note       text check (note is null or char_length(note) <= 300),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
create index if not exists project_headcounts_created_by_idx on public.project_headcounts (created_by);
create index if not exists project_headcounts_updated_by_idx on public.project_headcounts (updated_by);

create or replace function public.guard_project_headcount()
returns trigger language plpgsql security definer set search_path = '' as $$
declare stage_now public.project_stage;
begin
  if (select auth.uid()) is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  select p.stage into stage_now from public.projects p where p.id = case when tg_op = 'DELETE' then old.project_id else new.project_id end;
  if stage_now = 'closed' then
    raise exception 'the head count of a closed project cannot be changed' using errcode = '42501';
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
      raise exception 'a head count cannot move to another project or change who added it' using errcode = '42501';
    end if;
  end if;
  new.updated_by := (select auth.uid());
  new.updated_at := now();
  return new;
end $$;
revoke execute on function public.guard_project_headcount() from public, anon, authenticated;

drop trigger if exists guard_project_headcount on public.project_headcounts;
create trigger guard_project_headcount before insert or update or delete on public.project_headcounts
  for each row execute function public.guard_project_headcount();

drop trigger if exists audit_project_headcounts on public.project_headcounts;
create trigger audit_project_headcounts after insert or update or delete on public.project_headcounts
  for each row execute function public.log_audit();

alter table public.project_headcounts enable row level security;
revoke all on table public.project_headcounts from anon, authenticated;
grant select, insert, update on table public.project_headcounts to authenticated;

drop policy if exists headcounts_select on public.project_headcounts;
create policy headcounts_select on public.project_headcounts for select to authenticated
  using (
    public.can_access_project(project_id)
    and public.has_any_role(array['executive','programme_manager','project_officer','me_officer']::public.app_role[])
  );
drop policy if exists headcounts_select_oversight on public.project_headcounts;
create policy headcounts_select_oversight on public.project_headcounts for select to authenticated
  using (public.has_oversight_read());
drop policy if exists headcounts_insert on public.project_headcounts;
create policy headcounts_insert on public.project_headcounts for insert to authenticated
  with check (
    public.can_access_project(project_id)
    and public.has_any_role(array['executive','programme_manager','project_officer']::public.app_role[])
  );
drop policy if exists headcounts_update on public.project_headcounts;
create policy headcounts_update on public.project_headcounts for update to authenticated
  using (
    public.can_access_project(project_id)
    and public.has_any_role(array['executive','programme_manager','project_officer']::public.app_role[])
  )
  with check (
    public.has_any_role(array['executive','programme_manager','project_officer']::public.app_role[])
  );
