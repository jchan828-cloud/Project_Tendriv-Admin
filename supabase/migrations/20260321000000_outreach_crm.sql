-- MK7-CRM-001: Outreach contacts (PSIB + future geo pipeline)
create table outreach_contacts (
  id uuid primary key default gen_random_uuid(),
  pipeline text not null check (pipeline in ('psib', 'geo', 'manual')),
  business_name text not null,
  contact_email text,
  contact_website text,
  province text,
  unspsc_categories text[] default '{}',
  ibd_registered boolean default false,
  source_url text,
  status text not null default 'prospect'
    check (status in ('prospect', 'contacted', 'replied', 'demo', 'converted', 'unsubscribed')),
  cyberimpact_member_id text,
  notes text,
  created_at timestamptz default now(),
  last_activity_at timestamptz,
  casl_consent_method text,
  casl_consent_date timestamptz,
  casl_consent_source text
);
alter table outreach_contacts enable row level security;
create index idx_outreach_contacts_pipeline on outreach_contacts(pipeline);
create index idx_outreach_contacts_status on outreach_contacts(status);
create unique index idx_outreach_contacts_upsert on outreach_contacts(business_name, province);

-- MK7-CRM-001: Email sequence templates
create table outreach_sequences (
  id uuid primary key default gen_random_uuid(),
  pipeline text not null check (pipeline in ('psib', 'geo')),
  step integer not null,
  delay_days integer not null default 0,
  subject_template text not null,
  body_template text not null,
  is_active boolean default true,
  created_at timestamptz default now(),
  unique(pipeline, step)
);
alter table outreach_sequences enable row level security;

-- MK7-CRM-001: Activity log (sent, opened, replied, bounced from Cyberimpact webhooks)
create table outreach_activity_log (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references outreach_contacts(id) on delete cascade,
  sequence_id uuid references outreach_sequences(id),
  event_type text not null
    check (event_type in ('sent', 'opened', 'clicked', 'replied', 'bounced', 'unsubscribed')),
  event_metadata jsonb default '{}',
  occurred_at timestamptz default now()
);
create index idx_outreach_activity_contact on outreach_activity_log(contact_id);
alter table outreach_activity_log enable row level security;

-- MK7-PSIB-002: PSIB tender — contact matches
create table outreach_matches (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references outreach_contacts(id) on delete cascade,
  notice_id uuid not null references scout_notices(id) on delete cascade,
  match_score numeric not null,
  matched_unspsc text,
  notified boolean default false,
  created_at timestamptz default now(),
  unique(contact_id, notice_id)
);
alter table outreach_matches enable row level security;
