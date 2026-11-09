-- 0023_project_closing.sql
-- Closing and Form-7 (projects step 8): the closure checklist and the Form-7 text (IHH template) for one project.
--
--   * closing_checklist_items: the fixed list of things to finish before a project is closed
--     (managed by migrations, read-only for everyone signed in).
--   * project_closing_checks: which items are ticked on a project, by whom and when, with an optional
--     note and an optional link to the document that proves it (for example the signed Form-7 scan).
--   * project_closing_reports: the written parts of Form-7 (summary, goals achieved, local manpower,
--     beneficiary story, challenges, lessons) and the Executive Director's sign-off.
--
-- The numbers in Form-7 (families, women/men/girls/boys, budget, fund received) are NOT stored here:
-- the app reads them from the Budget, Fund receipts and Beneficiaries tabs when it makes the PDF.
--
-- Who may do what: the Executive Director, Programme Manager and Program Officers write the report and
-- tick items. Only the Executive Director signs off, and only when every item is ticked. After sign-off
-- the report and the ticks are frozen until the Executive Director reopens it. A closed project is frozen.
-- Staff on the project, the Board and the Law Officer read; donors see nothing here.
-- Every change is in the audit log.
--
-- Direct database sessions with no signed-in user (SQL editor, migrations, service role) are not restricted,
-- as in 0012 and later.

-- ===== the checklist =====
create table if not exists public.closing_checklist_items (
  key        text primary key check (key ~ '^[a-z0-9_]{3,40}$'),
  label      text not null check (char_length(label) between 5 and 200),
  position   int  not null
);
insert into public.closing_checklist_items (key, label, position) values
  ('narrative_done',       'The written parts of Form-7 are complete', 10),
  ('beneficiaries_checked','Beneficiary counts checked against the signed distribution sheets', 20),
  ('budget_checked',       'Final budget checked: package cost, number of packages, administration cost', 30),
  ('receipts_recorded',    'All fund receipts recorded and acknowledged', 40),
  ('vouchers_filed',       'Vouchers and the invoice declaration filed', 50),
  ('distribution_filed',   'Signed distribution list filed, and the NID sheets recorded', 60),
  ('photos_filed',         'Photos with the donor banner filed', 70),
  ('ac_declaration',       'Administration cost declaration prepared', 80),
  ('form7_signed',         'Form-7 printed, signed by the Chairman and the Executive Director, signed scan uploaded', 90),
  ('documents_released',   'Final documents released to the donor', 100),
  ('lessons_recorded',     'Lessons learned recorded', 110)
on conflict (key) do nothing;

-- ===== the ticks =====
create table if not exists public.project_closing_checks (
  project_id  uuid not null references public.projects(id) on delete cascade,
  item_key    text not null references public.closing_checklist_items(key),
  checked_by  uuid not null default auth.uid() references auth.users(id),
  checked_at  timestamptz not null default now(),
  note        text check (note is null or char_length(note) <= 300),
  document_id uuid references public.documents(id) on delete set null,
  primary key (project_id, item_key)
);
create index if not exists project_closing_checks_item_idx on public.project_closing_checks (item_key);
create index if not exists project_closing_checks_by_idx on public.project_closing_checks (checked_by);
create index if not exists project_closing_checks_doc_idx on public.project_closing_checks (document_id);

-- ===== the report =====
create table if not exists public.project_closing_reports (
  project_id      uuid primary key references public.projects(id) on delete cascade,
  project_summary text not null default '' check (char_length(project_summary) <= 5000),
  goals_achieved  text not null default '' check (char_length(goals_achieved) <= 5000),
  general_impact  text not null default '' check (char_length(general_impact) <= 5000),
  negative_groups text not null default '' check (char_length(negative_groups) <= 2000),
  local_manpower  text not null default '' check (char_length(local_manpower) <= 2000),
  beneficiary_story text not null default '' check (char_length(beneficiary_story) <= 5000),
  challenges      text not null default '' check (char_length(challenges) <= 5000),
  lessons_learned text not null default '' check (char_length(lessons_learned) <= 5000),
  updated_by      uuid references auth.users(id),
  updated_at      timestamptz not null default now(),
  signed_off_by   uuid references auth.users(id),
  signed_off_at   timestamptz
);
create index if not exists project_closing_reports_updated_by_idx on public.project_closing_reports (updated_by);
create index if not exists project_closing_reports_signed_by_idx on public.project_closing_reports (signed_off_by);

-- ===== rules: report (signed-in users only) =====
create or replace function public.guard_closing_report()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  stage_now public.project_stage;
begin
  if (select auth.uid()) is null then
    return new;
  end if;
  select p.stage into stage_now from public.projects p where p.id = new.project_id;
  if stage_now = 'closed' then
    raise exception 'the closing report of a closed project cannot be changed' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and new.project_id is distinct from old.project_id then
    raise exception 'a closing report cannot move to another project' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    new.signed_off_by := null;
    new.signed_off_at := null;
  else
    if old.signed_off_at is not null and new.signed_off_at is not null
       and (new.project_summary, new.general_impact, new.negative_groups, new.goals_achieved, new.local_manpower, new.beneficiary_story, new.challenges, new.lessons_learned)
           is distinct from
           (old.project_summary, old.general_impact, old.negative_groups, old.goals_achieved, old.local_manpower, old.beneficiary_story, old.challenges, old.lessons_learned) then
      raise exception 'the report is signed off; the Executive Director must reopen it before it is changed' using errcode = '42501';
    end if;
    if (new.signed_off_at is not null) is distinct from (old.signed_off_at is not null) then
      if not public.has_role('executive') then
        raise exception 'only the Executive Director can sign off or reopen the closing report' using errcode = '42501';
      end if;
      if new.signed_off_at is not null then
        if exists (select 1 from public.closing_checklist_items i
                   where not exists (select 1 from public.project_closing_checks c
                                     where c.project_id = new.project_id and c.item_key = i.key)) then
          raise exception 'every item on the closing checklist must be ticked before sign-off' using errcode = '23514';
        end if;
        new.signed_off_by := (select auth.uid());
        new.signed_off_at := now();
      else
        new.signed_off_by := null;
        new.signed_off_at := null;
      end if;
    else
      new.signed_off_by := old.signed_off_by;
      new.signed_off_at := old.signed_off_at;
    end if;
  end if;
  new.updated_by := (select auth.uid());
  new.updated_at := now();
  return new;
end $$;
revoke execute on function public.guard_closing_report() from public, anon, authenticated;

drop trigger if exists guard_closing_report on public.project_closing_reports;
create trigger guard_closing_report before insert or update on public.project_closing_reports
  for each row execute function public.guard_closing_report();

-- ===== rules: ticks =====
create or replace function public.guard_closing_check()
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
  select p.stage into stage_now from public.projects p where p.id = pid;
  if stage_now = 'closed' then
    raise exception 'the closing checklist of a closed project cannot be changed' using errcode = '42501';
  end if;
  if exists (select 1 from public.project_closing_reports r where r.project_id = pid and r.signed_off_at is not null) then
    raise exception 'the closing report is signed off; the Executive Director must reopen it first' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  if tg_op = 'UPDATE' then
    raise exception 'a tick cannot be edited; remove it and tick it again' using errcode = '42501';
  end if;
  if new.document_id is not null
     and not exists (select 1 from public.documents d where d.id = new.document_id and d.project_id = new.project_id and d.deleted_at is null) then
    raise exception 'the linked document must belong to this project' using errcode = '23514';
  end if;
  new.checked_by := (select auth.uid());
  new.checked_at := now();
  return new;
end $$;
revoke execute on function public.guard_closing_check() from public, anon, authenticated;

drop trigger if exists guard_closing_check on public.project_closing_checks;
create trigger guard_closing_check before insert or update or delete on public.project_closing_checks
  for each row execute function public.guard_closing_check();

-- ===== audit =====
drop trigger if exists audit_project_closing_checks on public.project_closing_checks;
create trigger audit_project_closing_checks after insert or update or delete on public.project_closing_checks
  for each row execute function public.log_audit();
drop trigger if exists audit_project_closing_reports on public.project_closing_reports;
create trigger audit_project_closing_reports after insert or update or delete on public.project_closing_reports
  for each row execute function public.log_audit();

-- ===== access =====
alter table public.closing_checklist_items enable row level security;
alter table public.project_closing_checks enable row level security;
alter table public.project_closing_reports enable row level security;
revoke all on table public.closing_checklist_items, public.project_closing_checks, public.project_closing_reports from anon, authenticated;
grant select on table public.closing_checklist_items to authenticated;
grant select, insert, delete on table public.project_closing_checks to authenticated;
grant select, insert, update on table public.project_closing_reports to authenticated;

drop policy if exists closing_items_select on public.closing_checklist_items;
create policy closing_items_select on public.closing_checklist_items for select to authenticated
  using (not public.has_role('donor'));

drop policy if exists closing_checks_select on public.project_closing_checks;
create policy closing_checks_select on public.project_closing_checks for select to authenticated
  using (public.can_access_project(project_id) and not public.has_role('donor'));
drop policy if exists closing_checks_select_oversight on public.project_closing_checks;
create policy closing_checks_select_oversight on public.project_closing_checks for select to authenticated
  using (public.has_oversight_read());
drop policy if exists closing_checks_insert on public.project_closing_checks;
create policy closing_checks_insert on public.project_closing_checks for insert to authenticated
  with check (
    public.can_access_project(project_id)
    and public.has_any_role(array['executive','programme_manager','project_officer']::public.app_role[])
  );
drop policy if exists closing_checks_delete on public.project_closing_checks;
create policy closing_checks_delete on public.project_closing_checks for delete to authenticated
  using (
    public.can_access_project(project_id)
    and public.has_any_role(array['executive','programme_manager','project_officer']::public.app_role[])
  );

drop policy if exists closing_reports_select on public.project_closing_reports;
create policy closing_reports_select on public.project_closing_reports for select to authenticated
  using (public.can_access_project(project_id) and not public.has_role('donor'));
drop policy if exists closing_reports_select_oversight on public.project_closing_reports;
create policy closing_reports_select_oversight on public.project_closing_reports for select to authenticated
  using (public.has_oversight_read());
drop policy if exists closing_reports_insert on public.project_closing_reports;
create policy closing_reports_insert on public.project_closing_reports for insert to authenticated
  with check (
    public.can_access_project(project_id)
    and public.has_any_role(array['executive','programme_manager','project_officer']::public.app_role[])
  );
drop policy if exists closing_reports_update on public.project_closing_reports;
create policy closing_reports_update on public.project_closing_reports for update to authenticated
  using (
    public.can_access_project(project_id)
    and public.has_any_role(array['executive','programme_manager','project_officer']::public.app_role[])
  )
  with check (
    public.has_any_role(array['executive','programme_manager','project_officer']::public.app_role[])
  );
