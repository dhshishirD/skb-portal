-- 0026_reopen_closed_project.sql
-- The Executive Director can reopen a closed project (to redo work): closed -> Monitoring & evaluation,
-- through the same stage gate, with a written reason (>= 5 chars) kept in project_stage_history and the
-- audit log. Every module freezes a project only while its stage is 'closed', so reopening unfreezes it.
-- A signed-off closing report stays signed off until the Executive Director reopens that sign-off too.
-- Only the closed -> forward refusal is removed; nothing else changes. No data is touched.

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

  if idx < array_length(stages, 1) and _to = stages[idx + 1] then
    select count(*) into missing from public.stage_gate_items g
      where g.project_id = _project and g.stage = cur and g.required and not g.done;
    if missing > 0 then
      raise exception '% required checklist item(s) of this stage are not complete', missing using errcode = '23514';
    end if;
  elsif idx > 1 and _to = stages[idx - 1] then
    if note is null or char_length(note) < 5 then
      raise exception 'a reason (at least 5 characters) is required to move a project back or to reopen it' using errcode = '23514';
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
