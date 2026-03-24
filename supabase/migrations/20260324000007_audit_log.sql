-- MK8-INT-003: Immutable audit log
-- Sprint MK-8 · Phase 1 (foundation — all other tasks depend on this)

CREATE TABLE audit_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type    text NOT NULL,
  actor_id      uuid REFERENCES auth.users(id),
  actor_type    text NOT NULL CHECK (actor_type IN ('user','cron','system','api-key')),
  resource_type text NOT NULL,
  resource_id   text NOT NULL,
  metadata      jsonb,
  ip_hash       text,
  occurred_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Immutability: prevent UPDATE and DELETE at the database level
CREATE RULE no_update_audit_log AS ON UPDATE TO audit_log DO INSTEAD NOTHING;
CREATE RULE no_delete_audit_log AS ON DELETE TO audit_log DO INSTEAD NOTHING;

-- Performance indexes
CREATE INDEX idx_audit_log_event_type ON audit_log(event_type);
CREATE INDEX idx_audit_log_occurred_at ON audit_log(occurred_at DESC);
