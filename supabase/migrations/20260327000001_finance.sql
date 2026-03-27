-- Financial transactions: income + expenses
create table if not exists finance_transactions (
  id              uuid primary key default gen_random_uuid(),
  type            text not null check (type in ('income', 'expense')),
  category        text not null,
  vendor          text,                         -- e.g. "Supabase", "Vercel", "Anthropic", "Client Name"
  description     text,
  amount          numeric(12,2) not null,
  currency        text not null default 'CAD',
  recurring       boolean default false,
  recurring_interval text check (recurring_interval in ('monthly', 'yearly', 'weekly', null)),
  invoice_url     text,                         -- link to invoice/receipt
  transaction_date date not null default current_date,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table finance_transactions enable row level security;

create index if not exists idx_finance_tx_type on finance_transactions(type);
create index if not exists idx_finance_tx_date on finance_transactions(transaction_date desc);
create index if not exists idx_finance_tx_category on finance_transactions(category);
create index if not exists idx_finance_tx_vendor on finance_transactions(vendor);

-- Billing accounts: centralized view of all service subscriptions
create table if not exists billing_accounts (
  id              uuid primary key default gen_random_uuid(),
  service_name    text not null,                -- e.g. "Supabase", "Vercel", "Anthropic", "Google Analytics"
  billing_email   text,                         -- centralized billing email
  plan_name       text,                         -- e.g. "Pro", "Hobby", "Team"
  monthly_cost    numeric(10,2) default 0,
  currency        text not null default 'CAD',
  billing_cycle   text check (billing_cycle in ('monthly', 'yearly', 'usage-based')),
  next_billing_date date,
  status          text not null default 'active' check (status in ('active', 'paused', 'cancelled', 'trial')),
  dashboard_url   text,                         -- link to service dashboard
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table billing_accounts enable row level security;

create index if not exists idx_billing_status on billing_accounts(status);
