-- Migration 0006: Integrations, Webhooks, SMS Notifications, and AI Narrative Logs

CREATE TYPE webhook_status AS ENUM ('pending', 'processed', 'failed');
CREATE TYPE notification_channel AS ENUM ('sms', 'whatsapp', 'email');
CREATE TYPE notification_status AS ENUM ('queued', 'sent', 'failed');

-- External Webhooks log table
CREATE TABLE external_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source VARCHAR(50) NOT NULL, -- e.g. 'kobotoolbox', 'odk'
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status webhook_status NOT NULL DEFAULT 'pending',
    error_message TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SMS / WhatsApp / Email Notification logs
CREATE TABLE notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient VARCHAR(100) NOT NULL,
    channel notification_channel NOT NULL,
    message TEXT NOT NULL,
    status notification_status NOT NULL DEFAULT 'queued',
    provider_response JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI Narrative Assistant generated reports log
CREATE TABLE ai_report_narratives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    donor_report_id UUID REFERENCES donor_reports(id) ON DELETE SET NULL,
    prompt_summary TEXT NOT NULL,
    generated_narrative TEXT NOT NULL,
    model_name VARCHAR(100) NOT NULL DEFAULT 'gemini-1.5-pro',
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_external_webhooks_source ON external_webhooks(source);
CREATE INDEX idx_external_webhooks_status ON external_webhooks(status);
CREATE INDEX idx_notification_logs_recipient ON notification_logs(recipient);
CREATE INDEX idx_ai_narratives_project ON ai_report_narratives(project_id);

-- Enable RLS
ALTER TABLE external_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_report_narratives ENABLE ROW LEVEL SECURITY;

-- Policies for external_webhooks: System admins & managers can view webhooks
CREATE POLICY "Admins and managers view external webhooks"
    ON external_webhooks
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('sys_admin', 'super_admin', 'program_manager')
        )
    );

-- Policies for notification_logs: Admins & managers can view notifications
CREATE POLICY "Admins and managers view notifications"
    ON notification_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('sys_admin', 'super_admin', 'program_manager', 'finance_manager')
        )
    );

-- Policies for ai_report_narratives: Users with project access can view and create AI narratives
CREATE POLICY "Project members view AI narratives"
    ON ai_report_narratives
    FOR SELECT
    USING (
        project_id IS NULL OR can_access_project(project_id)
    );

CREATE POLICY "Project members create AI narratives"
    ON ai_report_narratives
    FOR INSERT
    WITH CHECK (
        project_id IS NULL OR can_access_project(project_id)
    );
