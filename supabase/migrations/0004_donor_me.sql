-- 0004_donor_me.sql
-- Phase 4: Donor Portal, M&E Dashboards, Report Templates & Published Reports

-- ===== Enums =====
create type public.donor_report_status as enum ('draft', 'pm_approved', 'published');
create type public.report_format as enum ('pdf', 'word', 'excel');

-- ===== Tables =====
create table public.donor_report_templates (
  id uuid primary key default gen_random_uuid(),
  donor_org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  format public.report_format not null default 'pdf',
  definition jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.donor_reports (
  id uuid primary key default gen_random_uuid(),
  grant_id uuid not null references public.grants(id) on delete cascade,
  template_id uuid references public.donor_report_templates(id),
  period text not null,
  status public.donor_report_status not null default 'draft',
  file_path text,
  published_at timestamptz,
  published_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.donor_report_templates enable row level security;
alter table public.donor_reports enable row level security;

revoke all on public.donor_report_templates, public.donor_reports from anon;

-- Donors see ONLY published reports for grants owned by their organization
create policy donor_reports_select on public.donor_reports for select to authenticated
  using (
    public.is_internal_user()
    or (
      public.has_role('donor')
      and status = 'published'
      and exists (
        select 1 from public.grants g
        where g.id = grant_id and g.donor_org_id = public.current_org_id()
      )
    )
  );

create policy donor_reports_write on public.donor_reports for all to authenticated
  using (public.has_any_role(array['programme_manager','executive','me_officer']::public.app_role[]));

-- Audit Triggers
create trigger audit_donor_report_templates after insert or update or delete on public.donor_report_templates for each row execute function public.log_audit();
create trigger audit_donor_reports after insert or update or delete on public.donor_reports for each row execute function public.log_audit();
