-- Migration 0011: organisational hierarchy + access for board / legal / IT roles
--
-- Design rules (keep them when adding policies later):
--   * is_internal_user()  = OPERATIONAL staff. Every write policy that is not role-specific
--                           uses it, so it deliberately EXCLUDES board, legal_officer and
--                           it_officer. That is what keeps the Chairman read-only even if she
--                           is ever given a project assignment.
--   * is_staff_member()   = anyone working at SKB (operational + board + legal + IT). Use it
--                           for directory/community style access only.
--   * has_oversight_read()= board or legal_officer: read-only visibility across all projects.
--   All new policies below are SELECT policies, except community posting/DMs.

-- ===== Hierarchy fields on profiles (edited by Super Admins through server code only) =====
alter table public.profiles
  add column if not exists designation text check (designation is null or char_length(designation) <= 120),
  add column if not exists reports_to uuid references public.profiles(id) on delete set null,
  add column if not exists display_order smallint not null default 100 check (display_order between 0 and 999);

alter table public.profiles
  add constraint profiles_reports_to_not_self check (reports_to is null or reports_to <> id);

create index if not exists idx_profiles_reports_to on public.profiles(reports_to);

-- Users may still update only full_name / phone / language (column grants from 0008);
-- designation, reports_to and display_order stay admin-only.

-- ===== Helper functions =====
create or replace function public.is_staff_member()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_any_role(array[
    'super_admin','executive','programme_manager','project_officer',
    'field_officer','finance','procurement','me_officer',
    'board','legal_officer','it_officer'
  ]::public.app_role[]);
$$;

create or replace function public.has_oversight_read()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_any_role(array['board','legal_officer']::public.app_role[]);
$$;

revoke execute on function public.is_staff_member() from public, anon;
revoke execute on function public.has_oversight_read() from public, anon;
grant execute on function public.is_staff_member() to authenticated, service_role;
grant execute on function public.has_oversight_read() to authenticated, service_role;

-- ===== Directory & community: every staff member =====
create policy organizations_select_staff on public.organizations for select to authenticated
  using (public.is_staff_member());

create policy profiles_select_staff on public.profiles for select to authenticated
  using (
    public.is_staff_member()
    and org_id in (select o.id from public.organizations o where o.type = 'internal')
  );

create policy user_roles_select_directory on public.user_roles for select to authenticated
  using (public.has_any_role(array['board','it_officer']::public.app_role[]));

create policy community_posts_select_staff on public.community_posts for select to authenticated
  using (public.is_staff_member() and deleted_at is null);
create policy community_posts_insert_staff on public.community_posts for insert to authenticated
  with check (public.is_staff_member() and author_id = (select auth.uid()));
create policy community_comments_select_staff on public.community_comments for select to authenticated
  using (public.is_staff_member() and deleted_at is null);
create policy community_comments_insert_staff on public.community_comments for insert to authenticated
  with check (public.is_staff_member() and author_id = (select auth.uid()));
create policy direct_messages_insert_staff on public.direct_messages for insert to authenticated
  with check (public.is_staff_member() and sender_id = (select auth.uid()));

-- ===== Audit log: oversight + IT =====
create policy audit_select_oversight on public.audit_log for select to authenticated
  using (public.has_any_role(array['board','legal_officer','it_officer']::public.app_role[]));

-- ===== Read-only oversight across all projects (board + legal_officer) =====
create policy projects_select_oversight on public.projects for select to authenticated
  using (public.has_oversight_read() and deleted_at is null);
create policy grants_select_oversight on public.grants for select to authenticated
  using (public.has_oversight_read() and deleted_at is null);

do $$
declare t text;
begin
  foreach t in array array[
    'project_stage_history','stage_gate_items','logframe_nodes','tasks','documents',
    'field_reports','budget_lines','expenses','purchase_requests','ai_report_narratives',
    'user_project_access'
  ] loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.has_oversight_read())',
      t || '_select_oversight', t
    );
  end loop;
end $$;

create policy indicators_select_oversight on public.indicators for select to authenticated
  using (public.has_oversight_read());
create policy user_location_access_select_oversight on public.user_location_access for select to authenticated
  using (public.has_oversight_read());
create policy approvals_select_oversight on public.approvals for select to authenticated
  using (public.has_oversight_read());
create policy vendors_select_oversight on public.vendors for select to authenticated
  using (public.has_oversight_read());
create policy donor_reports_select_oversight on public.donor_reports for select to authenticated
  using (public.has_oversight_read());

-- ===== Beneficiary records: Law Officer only (consent / data-protection review) =====
-- The Board sees programme figures, not individual refugees' personal data.
create policy beneficiaries_select_legal on public.beneficiaries for select to authenticated
  using (public.has_role('legal_officer'));
