-- Expand user_roles.modules default from 4 to all 7 modules
-- Previous default only included content, analytics, crm, system

ALTER TABLE user_roles
  ALTER COLUMN modules SET DEFAULT '{content,analytics,crm,sales,finance,feedback,system}';
