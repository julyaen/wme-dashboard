-- whatsmyedge — Supabase schema
-- Paste this into the SQL Editor at supabase.com → your project → SQL Editor → New query

-- ── Tables ────────────────────────────────────────────────────────────────────

-- Stores the full imported trade dataset (survives page refresh, syncs across devices)
create table if not exists sessions (
  id           text        primary key,
  file_name    text        not null,
  trades       jsonb       not null,
  imported_at  timestamptz default now()
);

-- Per-trade behavioral tags
create table if not exists trade_tags (
  trade_id  text    primary key,
  tags      text[]  not null default '{}'
);

-- Per-setup playbook notes
create table if not exists setup_notes (
  setup_name  text  primary key,
  note        text  not null default ''
);

-- ── Row Level Security ────────────────────────────────────────────────────────
-- Single-user setup: allow all operations without auth.
-- If you add auth later, replace these policies with user-scoped ones.

alter table sessions    enable row level security;
alter table trade_tags  enable row level security;
alter table setup_notes enable row level security;

create policy "allow_all" on sessions    for all using (true) with check (true);
create policy "allow_all" on trade_tags  for all using (true) with check (true);
create policy "allow_all" on setup_notes for all using (true) with check (true);

-- ── Storage bucket ────────────────────────────────────────────────────────────
-- Run this separately OR create the bucket manually in Storage → New bucket:
--   Name: setup-screenshots
--   Public: YES (so images load without signed URLs)
--
-- insert into storage.buckets (id, name, public)
-- values ('setup-screenshots', 'setup-screenshots', true)
-- on conflict (id) do nothing;
