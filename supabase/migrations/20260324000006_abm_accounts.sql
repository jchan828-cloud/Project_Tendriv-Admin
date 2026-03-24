-- MK8-CRM-003: ABM account-based marketing
-- Sprint MK-8 · Phase 3

CREATE TABLE abm_accounts (
  id                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                         text NOT NULL,
  organisation_type            text NOT NULL CHECK (organisation_type IN ('ministry','agency','crown-corp','enterprise','indigenous-org')),
  province                     text,
  naics_codes                  text[] DEFAULT '{}',
  website                      text,
  annual_procurement_value_cad numeric,
  notes                        text,
  created_at                   timestamptz DEFAULT now(),
  updated_at                   timestamptz DEFAULT now()
);

ALTER TABLE abm_accounts ENABLE ROW LEVEL SECURITY;

CREATE TABLE abm_account_contacts (
  account_id  uuid NOT NULL REFERENCES abm_accounts(id) ON DELETE CASCADE,
  contact_id  uuid NOT NULL REFERENCES outreach_contacts(id) ON DELETE CASCADE,
  role        text,
  added_at    timestamptz DEFAULT now(),
  PRIMARY KEY (account_id, contact_id)
);

ALTER TABLE abm_account_contacts ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_abm_org_type ON abm_accounts(organisation_type);
CREATE INDEX idx_abm_province ON abm_accounts(province);
CREATE INDEX idx_abm_contacts_contact ON abm_account_contacts(contact_id);

-- Trigger for updated_at (uses set_updated_at() from blog_posts migration)
CREATE TRIGGER set_abm_accounts_updated_at
  BEFORE UPDATE ON abm_accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
