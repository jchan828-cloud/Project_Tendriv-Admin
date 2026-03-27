-- Customer tiers: segment customers by plan/tier
create table if not exists customer_tiers (
  id              uuid primary key default gen_random_uuid(),
  name            text not null unique,               -- e.g. "Free", "Starter", "Pro", "Enterprise"
  display_order   int not null default 0,
  monthly_price   numeric(10,2) not null default 0,
  annual_price    numeric(10,2) not null default 0,
  is_active       boolean default true,
  created_at      timestamptz default now()
);

alter table customer_tiers enable row level security;

-- Customers: individual paying customers or organizations
create table if not exists customers (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  email           text,
  tier_id         uuid references customer_tiers(id) on delete set null,
  status          text not null default 'active'
                    check (status in ('active', 'churned', 'trial', 'paused')),
  mrr             numeric(10,2) not null default 0,     -- current monthly recurring revenue
  currency        text not null default 'CAD',
  acquisition_channel text,                              -- e.g. "organic", "paid-ad", "referral", "outbound"
  acquisition_cost numeric(10,2) default 0,              -- what it cost to acquire this customer
  first_payment_date date,
  churn_date      date,
  contact_id      uuid references outreach_contacts(id) on delete set null,
  account_id      uuid references abm_accounts(id) on delete set null,
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table customers enable row level security;

create index if not exists idx_customers_tier on customers(tier_id);
create index if not exists idx_customers_status on customers(status);
create index if not exists idx_customers_channel on customers(acquisition_channel);

-- Customer revenue: monthly revenue records per customer (for historical tracking)
create table if not exists customer_revenue (
  id              uuid primary key default gen_random_uuid(),
  customer_id     uuid not null references customers(id) on delete cascade,
  period          date not null,                         -- first day of the month
  amount          numeric(10,2) not null,
  currency        text not null default 'CAD',
  type            text not null default 'subscription'
                    check (type in ('subscription', 'one-time', 'overage', 'refund')),
  notes           text,
  created_at      timestamptz default now(),
  unique(customer_id, period, type)
);

alter table customer_revenue enable row level security;

create index if not exists idx_customer_revenue_period on customer_revenue(period desc);
create index if not exists idx_customer_revenue_customer on customer_revenue(customer_id);

-- Service usage: track which core app services each customer uses
create table if not exists service_usage (
  id              uuid primary key default gen_random_uuid(),
  customer_id     uuid not null references customers(id) on delete cascade,
  service_name    text not null,                         -- e.g. "api-calls", "storage", "ai-briefs", "email-sends", "contacts"
  period          date not null,                         -- first day of the month
  quantity        numeric(12,2) not null default 0,
  unit            text not null default 'count',         -- "count", "gb", "minutes", "requests"
  cost_allocated  numeric(10,2) default 0,               -- internal cost to serve this usage
  created_at      timestamptz default now(),
  unique(customer_id, service_name, period)
);

alter table service_usage enable row level security;

create index if not exists idx_service_usage_period on service_usage(period desc);
create index if not exists idx_service_usage_customer on service_usage(customer_id);
create index if not exists idx_service_usage_service on service_usage(service_name);

-- Expense categories mapping: link finance_transactions categories to service types
-- This helps compute cost-of-goods-sold (COGS) per service
create table if not exists expense_service_mapping (
  id              uuid primary key default gen_random_uuid(),
  vendor          text not null,
  category        text not null,
  mapped_service  text not null,                         -- maps to service_usage.service_name
  cost_type       text not null default 'cogs'
                    check (cost_type in ('cogs', 'opex', 'capex')),
  created_at      timestamptz default now(),
  unique(vendor, category)
);

alter table expense_service_mapping enable row level security;
