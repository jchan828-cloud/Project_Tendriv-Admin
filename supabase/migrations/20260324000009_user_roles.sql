-- RBAC: user roles + module access
-- Allows assigning users to roles with per-module sidebar visibility

CREATE TABLE user_roles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  role       text NOT NULL DEFAULT 'editor' CHECK (role IN ('admin','editor','analyst','crm-manager')),
  modules    text[] NOT NULL DEFAULT '{content,analytics,crm,system}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_user_roles_user ON user_roles(user_id);

CREATE TRIGGER set_user_roles_updated_at
  BEFORE UPDATE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
