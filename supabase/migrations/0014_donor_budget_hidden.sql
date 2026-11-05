-- 0014_donor_budget_hidden.sql
-- Donors no longer read budget lines by default. SKB decides when a budget is shown to a donor;
-- until a donor-release step exists (Grants module), budget lines stay internal.
--
-- Only the SELECT policy of budget_lines changes. Finance / Programme Manager write access,
-- board / legal read-only oversight and staff access are unchanged. No data is touched.
-- (The donor still sees the project's own budget total on the project record.)

drop policy if exists budget_lines_select on public.budget_lines;
create policy budget_lines_select on public.budget_lines for select to authenticated
  using (public.can_access_project(project_id) and not public.has_role('donor'));
