-- Deal/opportunity pipeline for sales tracking
create table if not exists deals (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  value       numeric(12,2) default 0,
  currency    text default 'CAD',
  stage       text not null default 'lead'
                check (stage in ('lead','qualified','proposal','negotiation','won','lost')),
  contact_id  uuid references outreach_contacts(id) on delete set null,
  account_id  uuid references abm_accounts(id) on delete set null,
  owner_id    uuid references auth.users(id) on delete set null,
  notes       text,
  expected_close_date date,
  closed_at   timestamptz,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table deals enable row level security;

create index if not exists idx_deals_stage on deals(stage);
create index if not exists idx_deals_contact on deals(contact_id);
create index if not exists idx_deals_owner on deals(owner_id);
