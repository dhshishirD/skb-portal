-- 0005_beneficiaries_procurement.sql
-- Phase 5: Beneficiary Registry (Consent, Encryption, Dedup) & Procurement Flow

-- ===== Enums =====
create type public.purchase_status as enum ('draft', 'submitted', 'quotations_attached', 'approved', 'po_issued', 'rejected');

-- ===== Tables =====
create table public.beneficiaries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  location_id uuid references public.locations(id),
  full_name_enc text not null,
  national_id_enc text,
  phone_enc text,
  sex text check (sex in ('male', 'female', 'other')),
  birth_year int check (birth_year between 1900 and 2026),
  vulnerability jsonb default '{}'::jsonb,
  consent_at timestamptz not null default now(),
  consent_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.beneficiary_participation (
  id uuid primary key default gen_random_uuid(),
  beneficiary_id uuid not null references public.beneficiaries(id) on delete cascade,
  activity_id uuid references public.logframe_nodes(id),
  date date not null,
  service_provided text not null,
  created_at timestamptz not null default now()
);

create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_person text,
  phone text,
  email text,
  is_blacklisted boolean not null default false,
  blacklist_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.purchase_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  requester_id uuid not null default auth.uid() references public.profiles(id),
  description text not null,
  estimated_amount numeric(14,2) not null check (estimated_amount > 0),
  status public.purchase_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quotations (
  id uuid primary key default gen_random_uuid(),
  purchase_request_id uuid not null references public.purchase_requests(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id),
  amount numeric(14,2) not null check (amount > 0),
  file_path text,
  is_selected boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  purchase_request_id uuid not null references public.purchase_requests(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id),
  total_amount numeric(14,2) not null check (total_amount > 0),
  issued_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- RLS Security
alter table public.beneficiaries enable row level security;
alter table public.beneficiary_participation enable row level security;
alter table public.vendors enable row level security;
alter table public.purchase_requests enable row level security;
alter table public.quotations enable row level security;
alter table public.purchase_orders enable row level security;

revoke all on all tables in schema public from anon;

-- Beneficiaries: Restrict access by role AND project
create policy beneficiaries_select on public.beneficiaries for select to authenticated
  using (public.can_access_project(project_id) and public.has_any_role(array['project_officer','field_officer','me_officer','programme_manager']::public.app_role[]));
create policy beneficiaries_insert on public.beneficiaries for insert to authenticated
  with check (public.can_access_project(project_id) and public.has_any_role(array['field_officer','project_officer']::public.app_role[]));

-- Procurement
create policy vendors_select on public.vendors for select to authenticated using (public.is_internal_user());
create policy purchase_requests_select on public.purchase_requests for select to authenticated using (public.can_access_project(project_id));
create policy purchase_requests_write on public.purchase_requests for all to authenticated using (public.can_access_project(project_id) and public.is_internal_user());

-- Audit Triggers
create trigger audit_beneficiaries after insert or update or delete on public.beneficiaries for each row execute function public.log_audit();
create trigger audit_vendors after insert or update or delete on public.vendors for each row execute function public.log_audit();
create trigger audit_purchase_requests after insert or update or delete on public.purchase_requests for each row execute function public.log_audit();
