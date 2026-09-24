-- 0003_field_finance.sql
-- Phase 3: Field Operations, Finance, Receipts/OCR, Multi-Step Approvals & Notifications

-- ===== Enums =====
create type public.report_status as enum ('draft','submitted','under_review','validated','approved','returned');
create type public.expense_status as enum ('draft','submitted','pm_approved','finance_verified','director_approved','paid','returned','rejected','cancelled');
create type public.approval_status as enum ('pending','approved','rejected','returned');

-- ===== Tables =====
create table public.field_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  location_id uuid references public.locations(id),
  reporter_id uuid not null default auth.uid() references public.profiles(id),
  period date not null,
  status public.report_status not null default 'draft',
  payload jsonb not null default '{}'::jsonb,
  gps_latitude numeric(9,6),
  gps_longitude numeric(9,6),
  submitted_at timestamptz,
  client_created_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.field_report_attachments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.field_reports(id) on delete cascade,
  storage_path text not null,
  mime text not null,
  size bigint not null check (size > 0),
  created_at timestamptz not null default now()
);

create table public.budget_lines (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  grant_id uuid references public.grants(id),
  code text not null,
  description text not null,
  amount numeric(14,2) not null check (amount >= 0),
  currency char(3) not null default 'BDT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  budget_line_id uuid references public.budget_lines(id),
  claimant_id uuid not null default auth.uid() references public.profiles(id),
  amount numeric(14,2) not null check (amount > 0),
  currency char(3) not null default 'BDT',
  fx_rate_to_bdt numeric(10,4) not null default 1.0,
  expense_date date not null,
  description text not null,
  status public.expense_status not null default 'submitted',
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  storage_path text not null,
  ocr_json jsonb,
  ocr_confirmed_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.approval_rules (
  id uuid primary key default gen_random_uuid(),
  scope text not null default 'expense',
  currency char(3) not null default 'BDT',
  min_amount numeric(14,2) not null default 0,
  max_amount numeric(14,2),
  steps jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table public.approvals (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('expense','field_report','procurement')),
  subject_id uuid not null,
  step_no int not null default 1,
  required_role public.app_role not null,
  status public.approval_status not null default 'pending',
  actor_id uuid references public.profiles(id),
  acted_at timestamptz,
  comment text,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  email_sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- ===== RLS Security =====
do $$
declare t text;
begin
  foreach t in array array[
    'field_reports','field_report_attachments','budget_lines','expenses',
    'receipts','approval_rules','approvals','notifications'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

revoke all on all tables in schema public from anon;

create policy field_reports_select on public.field_reports for select to authenticated
  using (public.can_access_project(project_id));
create policy field_reports_insert on public.field_reports for insert to authenticated
  with check (public.can_access_project(project_id) and public.has_any_role(array['field_officer','project_officer','partner']::public.app_role[]));

create policy budget_lines_select on public.budget_lines for select to authenticated
  using (public.can_access_project(project_id));
create policy budget_lines_write on public.budget_lines for all to authenticated
  using (public.can_access_project(project_id) and public.has_any_role(array['finance','programme_manager']::public.app_role[]));

create policy expenses_select on public.expenses for select to authenticated
  using (public.can_access_project(project_id));
create policy expenses_insert on public.expenses for insert to authenticated
  with check (public.can_access_project(project_id) and public.is_internal_user());

create policy approvals_select on public.approvals for select to authenticated
  using (public.is_internal_user());
create policy notifications_select on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));

-- Audit Triggers
do $$
declare t text;
begin
  foreach t in array array[
    'field_reports','field_report_attachments','budget_lines','expenses',
    'receipts','approval_rules','approvals','notifications'
  ] loop
    execute format('create trigger audit_%1$s after insert or update or delete on public.%1$s for each row execute function public.log_audit()', t);
  end loop;
end $$;
