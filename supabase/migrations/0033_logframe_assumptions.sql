-- 0033_logframe_assumptions.sql
-- The standard logframe has four columns: narrative summary, indicators, means of verification and
-- ASSUMPTIONS. The first three already exist; this adds the fourth, one optional text for each level
-- (goal, outcome, output, activity). Additive: one nullable column and one length check. No existing
-- row is touched. Who may edit it is unchanged (the same rules as the title and description).
alter table public.logframe_nodes add column if not exists assumptions text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'logframe_nodes_assumptions_len') then
    alter table public.logframe_nodes add constraint logframe_nodes_assumptions_len
      check (assumptions is null or char_length(assumptions) <= 2000);
  end if;
end $$;
