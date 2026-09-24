-- 0001_foundation.sql
-- Foundation: enums, core tables, helper functions, Row Level Security, audit log.
-- Deny by default: no table is readable/writable without an explicit policy.

-- ===== Enums =====
create type public.app_role as enum (
  'super_admin','executive','programme_manager','project_officer','field_officer',
  'finance','procurement','me_officer','donor','partner','auditor'
);
create type public.org_type as enum ('internal','donor','implementing_partner');
create type public.project_stage as enum (
  'concept','proposal','approved','implementation','monitoring_evaluation','closed'
);
create type public.grant_status as enum ('draft','active','closed');
create type public.location_level as enum ('division','district','upazila','union','village');

-- ===== Utility =====
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ===== Tables =====
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type public.org_type not null,
  country text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid references public.organizations(id),
  full_name text not null default '',
  phone text,
  language text not null default 'en' check (language in ('en','bn')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null,
  granted_by uuid default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.locations(id),
  level public.location_level not null,
  name_en text not null,
  name_bn text,
  code text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index locations_parent_idx on public.locations(parent_id);

create table public.grants (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  donor_org_id uuid not null references public.organizations(id),
  currency char(3) not null default 'USD',
  total_amount numeric(14,2) not null check (total_amount >= 0),
  start_date date,
  end_date date,
  status public.grant_status not null default 'draft',
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (start_date is null or end_date is null or end_date >= start_date)
);
create index grants_donor_idx on public.grants(donor_org_id);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text,
  grant_id uuid references public.grants(id),
  stage public.project_stage not null default 'concept',
  manager_id uuid references public.profiles(id),
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (start_date is null or end_date is null or end_date >= start_date)
);
create index projects_grant_idx on public.projects(grant_id);

create table public.user_project_access (
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  granted_by uuid default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  primary key (user_id, project_id)
);
create index upa_project_idx on public.user_project_access(project_id);

create table public.user_location_access (
  user_id uuid not null references public.profiles(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  granted_by uuid default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  primary key (user_id, location_id)
);
create index ula_location_idx on public.user_location_access(location_id);

create table public.audit_log (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_id uuid,
  table_name text not null,
  record_id text,
  action text not null check (action in ('INSERT','UPDATE','DELETE')),
  old_data jsonb,
  new_data jsonb
);
create index audit_table_record_idx on public.audit_log(table_name, record_id);
create index audit_time_idx on public.audit_log(occurred_at desc);

-- ===== Helper functions (SECURITY DEFINER so policies do not recurse) =====
create or replace function public.is_active_user()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.is_active
  );
$$;

create or replace function public.has_role(_role public.app_role)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_active_user() and exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid()) and ur.role = _role
  );
$$;

create or replace function public.has_any_role(_roles public.app_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_active_user() and exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid()) and ur.role = any(_roles)
  );
$$;

create or replace function public.is_internal_user()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_any_role(array[
    'super_admin','executive','programme_manager','project_officer',
    'field_officer','finance','procurement','me_officer'
  ]::public.app_role[]);
$$;

create or replace function public.current_org_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select p.org_id from public.profiles p where p.id = (select auth.uid());
$$;

create or replace function public.can_access_project(_project_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_active_user() and exists (
    select 1 from public.projects pr
    where pr.id = _project_id and pr.deleted_at is null
      and (
        public.has_role('executive')
        or pr.created_by = (select auth.uid())
        or exists (
          select 1 from public.user_project_access a
          where a.user_id = (select auth.uid()) and a.project_id = pr.id
            and (a.expires_at is null or a.expires_at > now())
        )
        or (
          public.has_role('donor') and exists (
            select 1 from public.grants g
            where g.id = pr.grant_id and g.deleted_at is null
              and g.donor_org_id = public.current_org_id()
          )
        )
      )
  );
$$;

create or replace function public.can_access_grant(_grant_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_active_user() and exists (
    select 1 from public.grants g
    where g.id = _grant_id and g.deleted_at is null
      and (
        public.has_role('executive')
        or g.created_by = (select auth.uid())
        or (public.has_role('donor') and g.donor_org_id = public.current_org_id())
        or exists (
          select 1 from public.projects pr
          where pr.grant_id = g.id and public.can_access_project(pr.id)
        )
      )
  );
$$;

-- Helpers are callable by signed-in users only (policies need this), never by anon.
revoke execute on function
  public.is_active_user(), public.has_role(public.app_role),
  public.has_any_role(public.app_role[]), public.is_internal_user(),
  public.current_org_id(), public.can_access_project(uuid), public.can_access_grant(uuid)
from public, anon;
grant execute on function
  public.is_active_user(), public.has_role(public.app_role),
  public.has_any_role(public.app_role[]), public.is_internal_user(),
  public.current_org_id(), public.can_access_project(uuid), public.can_access_grant(uuid)
to authenticated;

-- ===== Triggers =====
-- updated_at
do $$
declare t text;
begin
  foreach t in array array['organizations','profiles','locations','grants','projects'] loop
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- audit log (append-only; actor = signed-in user, or app.actor_id set by trusted server code)
create or replace function public.log_audit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  _rec jsonb;
  _actor uuid;
begin
  if tg_op = 'DELETE' then _rec := to_jsonb(old); else _rec := to_jsonb(new); end if;
  _actor := coalesce((select auth.uid()), nullif(current_setting('app.actor_id', true), '')::uuid);
  insert into public.audit_log (actor_id, table_name, record_id, action, old_data, new_data)
  values (
    _actor, tg_table_name,
    coalesce(_rec->>'id', concat_ws('/', _rec->>'user_id', _rec->>'role', _rec->>'project_id', _rec->>'location_id')),
    tg_op,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
revoke execute on function public.log_audit() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array[
    'organizations','profiles','user_roles','locations','grants','projects',
    'user_project_access','user_location_access'
  ] loop
    execute format(
      'create trigger audit_%1$s after insert or update or delete on public.%1$s for each row execute function public.log_audit()', t);
  end loop;
end $$;

-- new auth user -> profile row (role/org are NEVER taken from user-editable metadata)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===== Row Level Security =====
do $$
declare t text;
begin
  foreach t in array array[
    'organizations','profiles','user_roles','locations','grants','projects',
    'user_project_access','user_location_access','audit_log'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- No anonymous access to anything in this schema.
revoke all on all tables in schema public from anon;

-- organizations
create policy organizations_select on public.organizations for select to authenticated
  using (public.is_internal_user() or (public.is_active_user() and id = public.current_org_id()));
create policy organizations_insert on public.organizations for insert to authenticated
  with check (public.has_role('super_admin'));
create policy organizations_update on public.organizations for update to authenticated
  using (public.has_role('super_admin')) with check (public.has_role('super_admin'));

-- profiles (users may edit only their own name/phone/language; admins use trusted server code)
create policy profiles_select on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or public.has_any_role(array['super_admin','executive']::public.app_role[])
    or (public.is_internal_user() and org_id in (select o.id from public.organizations o where o.type = 'internal'))
  );
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke update on public.profiles from authenticated;
grant update (full_name, phone, language) on public.profiles to authenticated;

-- user_roles: read-only for clients; changes only via trusted server code (service role)
create policy user_roles_select on public.user_roles for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.has_any_role(array['super_admin','executive']::public.app_role[])
  );

-- locations: reference data
create policy locations_select on public.locations for select to authenticated
  using (public.is_active_user());
create policy locations_insert on public.locations for insert to authenticated
  with check (public.has_role('super_admin'));
create policy locations_update on public.locations for update to authenticated
  using (public.has_role('super_admin')) with check (public.has_role('super_admin'));

-- grants
create policy grants_select on public.grants for select to authenticated
  using (public.can_access_grant(id));
create policy grants_insert on public.grants for insert to authenticated
  with check (public.has_role('finance'));
create policy grants_update on public.grants for update to authenticated
  using (public.can_access_grant(id) and public.has_role('finance'))
  with check (public.has_role('finance'));

-- projects
create policy projects_select on public.projects for select to authenticated
  using (public.can_access_project(id));
create policy projects_insert on public.projects for insert to authenticated
  with check (public.has_role('programme_manager'));
create policy projects_update on public.projects for update to authenticated
  using (public.can_access_project(id)
         and public.has_any_role(array['programme_manager','project_officer']::public.app_role[]))
  with check (public.has_any_role(array['programme_manager','project_officer']::public.app_role[]));

-- user_project_access
create policy upa_select on public.user_project_access for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.has_any_role(array['super_admin','executive']::public.app_role[])
    or (public.has_role('programme_manager') and public.can_access_project(project_id))
  );
create policy upa_insert on public.user_project_access for insert to authenticated
  with check (
    public.has_role('super_admin')
    or (public.has_role('programme_manager') and public.can_access_project(project_id))
  );
create policy upa_update on public.user_project_access for update to authenticated
  using (
    public.has_role('super_admin')
    or (public.has_role('programme_manager') and public.can_access_project(project_id))
  )
  with check (
    public.has_role('super_admin')
    or (public.has_role('programme_manager') and public.can_access_project(project_id))
  );
create policy upa_delete on public.user_project_access for delete to authenticated
  using (
    public.has_role('super_admin')
    or (public.has_role('programme_manager') and public.can_access_project(project_id))
  );

-- user_location_access
create policy ula_select on public.user_location_access for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.has_any_role(array['super_admin','executive','programme_manager']::public.app_role[])
  );
create policy ula_insert on public.user_location_access for insert to authenticated
  with check (public.has_any_role(array['super_admin','programme_manager']::public.app_role[]));
create policy ula_update on public.user_location_access for update to authenticated
  using (public.has_any_role(array['super_admin','programme_manager']::public.app_role[]))
  with check (public.has_any_role(array['super_admin','programme_manager']::public.app_role[]));
create policy ula_delete on public.user_location_access for delete to authenticated
  using (public.has_any_role(array['super_admin','programme_manager']::public.app_role[]));

-- audit_log: readable by admin/executive/auditor; NEVER writable by app roles (trigger only)
revoke all on public.audit_log from authenticated;
grant select on public.audit_log to authenticated;
create policy audit_select on public.audit_log for select to authenticated
  using (public.has_any_role(array['super_admin','executive','auditor']::public.app_role[]));
