-- Media library metadata (files stored in Supabase Storage bucket "media")
create table if not exists media_assets (
  id          uuid primary key default gen_random_uuid(),
  filename    text not null,
  storage_path text not null,
  mime_type   text not null,
  size_bytes  bigint not null default 0,
  alt_text    text,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at  timestamptz default now()
);

alter table media_assets enable row level security;

create index if not exists idx_media_mime on media_assets(mime_type);
create index if not exists idx_media_created on media_assets(created_at desc);
