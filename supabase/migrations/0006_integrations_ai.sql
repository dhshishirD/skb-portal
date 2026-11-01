-- Migration 0006: Integrations, Webhooks, SMS Notifications, and AI Narrative Logs
--
-- Security fix (Nov 2026): the original version referenced a non-existent
-- `profiles.role` column, so this migration failed on any clean database.
-- Policies now use the role helpers from 0001 (user_roles + has_any_role) and
-- are scoped to the `authenticated` role only.

create type public.webhook_status as enum ('pending', 'processed', 'failed');
create type public.notification_channel as enum ('sms', 'whatsapp', 'email');
create type public.notification_status as enum ('queued', 'sent', 'failed');

-- External Webhooks log table (written only by trusted server code / service role)
create table public.external_webhooks (
    id uuid primary key default gen_random_uuid(),
    source varchar(50) not null, -- e.g. 'kobotoolbox', 'odk'
    event_type varchar(100) not null,
    payload jsonb not null,
    status public.webhook_status not null default 'pending',
    error_message text,
    processed_at timestamptz,
    created_at timestamptz not null default now()
);

-- SMS / WhatsApp / Email Notification logs (written only by trusted server code)
create table public.notification_logs (
    id uuid primary key default gen_random_uuid(),
    recipient varchar(100) not null,
    channel public.notification_channel not null,
    message text not null,
    status public.notification_status not null default 'queued',
    provider_response jsonb,
    created_at timestamptz not null default now()
);

-- AI Narrative Assistant generated reports log
create table public.ai_report_narratives (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references public.projects(id) on delete cascade,
    donor_report_id uuid references public.donor_reports(id) on delete set null,
    prompt_summary text not null,
    generated_narrative text not null,
    model_name varchar(100) not null default 'gemini-1.5-pro',
    created_by uuid default auth.uid() references public.profiles(id) on delete set null,
    created_at timestamptz not null default now()
);

create index idx_external_webhooks_source on public.external_webhooks(source);
create index idx_external_webhooks_status on public.external_webhooks(status);
create index idx_notification_logs_recipient on public.notification_logs(recipient);
create index idx_ai_narratives_project on public.ai_report_narratives(project_id);

alter table public.external_webhooks enable row level security;
alter table public.notification_logs enable row level security;
alter table public.ai_report_narratives enable row level security;

revoke all on public.external_webhooks, public.notification_logs, public.ai_report_narratives from anon;

-- Webhook and notification logs: read-only for admins/executives; no client writes.
create policy external_webhooks_select on public.external_webhooks for select to authenticated
  using (public.has_any_role(array['super_admin','executive']::public.app_role[]));

create policy notification_logs_select on public.notification_logs for select to authenticated
  using (public.has_any_role(array['super_admin','executive','finance']::public.app_role[]));

-- AI narratives: internal staff with access to the project.
create policy ai_narratives_select on public.ai_report_narratives for select to authenticated
  using (public.is_internal_user() and public.can_access_project(project_id));

create policy ai_narratives_insert on public.ai_report_narratives for insert to authenticated
  with check (
    public.is_internal_user()
    and public.can_access_project(project_id)
    and created_by = (select auth.uid())
  );

create trigger audit_ai_report_narratives after insert or update or delete on public.ai_report_narratives
  for each row execute function public.log_audit();
