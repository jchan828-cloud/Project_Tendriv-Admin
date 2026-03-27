-- Customer feedback: submissions from widget, email, or manual entry
create table if not exists feedback (
  id              uuid primary key default gen_random_uuid(),
  -- Source context
  source          text not null default 'widget'
                    check (source in ('widget', 'email', 'in-app', 'support', 'survey', 'manual')),
  page_url        text,                                  -- URL where feedback was submitted
  -- Submitter (optional — widget can be anonymous)
  customer_id     uuid references customers(id) on delete set null,
  contact_id      uuid references outreach_contacts(id) on delete set null,
  submitter_name  text,
  submitter_email text,
  -- Feedback content
  category        text not null default 'general'
                    check (category in ('bug', 'feature-request', 'ux', 'performance', 'content', 'billing', 'general', 'praise')),
  sentiment       text check (sentiment in ('positive', 'neutral', 'negative', null)),
  rating          smallint check (rating between 1 and 5 or rating is null),
  title           text,
  body            text not null,
  screenshot_url  text,                                  -- optional screenshot (Supabase Storage)
  -- Internal management
  status          text not null default 'new'
                    check (status in ('new', 'reviewed', 'in-progress', 'resolved', 'wont-fix', 'duplicate')),
  priority        text default 'medium'
                    check (priority in ('low', 'medium', 'high', 'critical')),
  assigned_to     uuid references auth.users(id) on delete set null,
  internal_notes  text,
  resolved_at     timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table feedback enable row level security;

create index if not exists idx_feedback_status on feedback(status);
create index if not exists idx_feedback_category on feedback(category);
create index if not exists idx_feedback_sentiment on feedback(sentiment);
create index if not exists idx_feedback_created on feedback(created_at desc);
create index if not exists idx_feedback_customer on feedback(customer_id);

-- Feedback responses: internal replies to feedback
create table if not exists feedback_responses (
  id              uuid primary key default gen_random_uuid(),
  feedback_id     uuid not null references feedback(id) on delete cascade,
  author_id       uuid references auth.users(id) on delete set null,
  body            text not null,
  is_public       boolean default false,                 -- if true, visible to submitter
  created_at      timestamptz default now()
);

alter table feedback_responses enable row level security;

create index if not exists idx_feedback_responses_feedback on feedback_responses(feedback_id);
