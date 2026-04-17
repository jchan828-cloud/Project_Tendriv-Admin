-- Log drain ingestion: append-only store for Vercel + Supabase platform logs.
-- Mirrors the immutability pattern from 20260324000007_audit_log.sql.

CREATE TABLE log_drain_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source          text NOT NULL CHECK (source IN ('vercel','supabase')),
  received_at     timestamptz NOT NULL DEFAULT now(),
  event_timestamp timestamptz,
  severity        text,
  project_id      text,
  message         text,
  payload         jsonb NOT NULL
);

ALTER TABLE log_drain_events ENABLE ROW LEVEL SECURITY;

CREATE RULE no_update_log_drain_events AS ON UPDATE TO log_drain_events DO INSTEAD NOTHING;
CREATE RULE no_delete_log_drain_events AS ON DELETE TO log_drain_events DO INSTEAD NOTHING;

CREATE INDEX idx_log_drain_events_source_received ON log_drain_events(source, received_at DESC);
CREATE INDEX idx_log_drain_events_event_timestamp ON log_drain_events(event_timestamp DESC);
CREATE INDEX idx_log_drain_events_payload_gin ON log_drain_events USING GIN (payload);
