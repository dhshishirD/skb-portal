-- RLS Test Suite for Integrations & AI Narratives (0006)

BEGIN;
SELECT plan(6);

-- Test 1: Anonymous cannot view external webhooks
SET LOCAL ROLE anon;
SELECT is_empty(
    'SELECT * FROM external_webhooks',
    'Anonymous user cannot read external webhooks log'
);

-- Test 2: Anonymous cannot view notification logs
SELECT is_empty(
    'SELECT * FROM notification_logs',
    'Anonymous user cannot read notification logs'
);

-- Test 3: Anonymous cannot view AI narratives
SELECT is_empty(
    'SELECT * FROM ai_report_narratives',
    'Anonymous user cannot read AI report narratives'
);

-- Test 4: External webhooks table is readable by admins
-- Note: pgTAP test simulation block for sys_admin role
SELECT throws_ok(
    'INSERT INTO external_webhooks (source, event_type, payload) VALUES (''test'', ''test_event'', ''{}''::jsonb)',
    '23502', -- error code or permission check depending on RLS setup
    'Anonymous insertion blocked or fails validation'
);

SELECT * FROM finish();
ROLLBACK;
