-- 0036: the written answers that donor forms ask for, kept once per project.
--
-- Form 3 asks (besides the charter and the budget) for: why the project is needed (2.5 rationale), the
-- organisation's experience (3.2), its internal control (3.3), other funding applied for (4.3) and
-- sustainability (4.4). Form 7 asks how the project supported local people and the local economy (4.2).
-- These are typed again for every form today. One row per project keeps them so the Word files fill in
-- by themselves. All six texts are optional.
--
-- Who may do what: the Executive Director, Programme Manager and Project Officers on the project write;
-- M&E Officers on the project read, and so do the Board and the Law Officer (oversight). Donors, finance,
-- procurement and field officers see nothing. A closed project is frozen. Every change is audited.
-- No personal data: organisation and project descriptions only. Additive: one new table, one function,
-- a trigger and policies; no existing row is touched.

create table if not exists public.project_form_texts (
  project_id       uuid primary key references public.projects(id) on delete cascade,
  rationale        text check (rationale is null or char_length(rationale) <= 4000),
  experience       text check (experience is null or char_length(experience) <= 4000),
  internal_control text check (internal_control is null or char_length(internal_control) <= 4000),
  other_funding    text check (other_funding is null or char_length(other_funding) <= 4000),
  sustainability   text check (sustainability is null or char_length(sustainability) <= 4000),
  local_support    text check (local_support is null or char_length(local_support) <= 4000),
  updated_by       uuid references auth.users(id),
  updated_at       timestamptz not null default now()
);
create index if not exists project_form_texts_updated_by_idx on public.project_form_texts (updated_by);

create or replace function public.guard_project_form_texts()
returns trigger language plpgsql security definer set search_path = '' as $$
declare stage_now public.project_stage;
begin
  if (select auth.uid()) is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  select p.stage into stage_now from public.projects p where p.id = case when tg_op = 'DELETE' then old.project_id else new.project_id end;
  if stage_now = 'closed' then
    raise exception 'the form texts of a closed project cannot be changed' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  if tg_op = 'UPDATE' and new.project_id is distinct from old.project_id then
    raise exception 'the form texts cannot move to another project' using errcode = '42501';
  end if;
  new.updated_by := (select auth.uid());
  new.updated_at := now();
  return new;
end $$;
revoke execute on function public.guard_project_form_texts() from public, anon, authenticated;

drop trigger if exists guard_project_form_texts on public.project_form_texts;
create trigger guard_project_form_texts before insert or update or delete on public.project_form_texts
  for each row execute function public.guard_project_form_texts();

drop trigger if exists audit_project_form_texts on public.project_form_texts;
create trigger audit_project_form_texts after insert or update or delete on public.project_form_texts
  for each row execute function public.log_audit();

alter table public.project_form_texts enable row level security;
revoke all on table public.project_form_texts from anon, authenticated;
grant select, insert, update, delete on table public.project_form_texts to authenticated;

drop policy if exists form_texts_select on public.project_form_texts;
create policy form_texts_select on public.project_form_texts for select to authenticated
  using (
    public.can_access_project(project_id)
    and public.has_any_role(array['executive','programme_manager','project_officer','me_officer']::public.app_role[])
  );
drop policy if exists form_texts_select_oversight on public.project_form_texts;
create policy form_texts_select_oversight on public.project_form_texts for select to authenticated
  using (public.has_oversight_read());
drop policy if exists form_texts_insert on public.project_form_texts;
create policy form_texts_insert on public.project_form_texts for insert to authenticated
  with check (
    public.can_access_project(project_id)
    and public.has_any_role(array['executive','programme_manager','project_officer']::public.app_role[])
  );
drop policy if exists form_texts_update on public.project_form_texts;
create policy form_texts_update on public.project_form_texts for update to authenticated
  using (
    public.can_access_project(project_id)
    and public.has_any_role(array['executive','programme_manager','project_officer']::public.app_role[])
  )
  with check (
    public.has_any_role(array['executive','programme_manager','project_officer']::public.app_role[])
  );
drop policy if exists form_texts_delete on public.project_form_texts;
create policy form_texts_delete on public.project_form_texts for delete to authenticated
  using (
    public.can_access_project(project_id)
    and public.has_any_role(array['executive','programme_manager','project_officer']::public.app_role[])
  );
