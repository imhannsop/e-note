-- Initial schema for e-note. Run this once in the Supabase SQL editor or with `supabase db push`.
--
-- Browser clients do not query these tables directly. Reads and writes go through
-- Next.js server actions, which validate the signed session and use the
-- service-role key. RLS is enabled with no policies, so the anon key cannot read
-- or write anything here.

create table public.profiles (
  id text primary key,                        -- 'sop', 'ling'
  display_name text not null,
  bio text not null default '',
  pin_hash text,                              -- bcrypt; null until set with scripts/set-pin.mjs
  failed_attempts int not null default 0,
  locked_until timestamptz,
  notif_seen_at timestamptz not null default 'epoch',
  created_at timestamptz not null default now()
);

insert into public.profiles (id, display_name) values ('sop', 'sop'), ('ling', 'ling');

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  profile_id text not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index posts_created_at_idx on public.posts (created_at desc);

create table public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  kind text not null check (kind in ('image', 'video')),
  path text not null unique,                  -- object path in the private 'media' bucket
  position int not null default 0
);
create index post_media_post_idx on public.post_media (post_id);

create table public.likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  profile_id text not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, profile_id)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  profile_id text not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index comments_post_idx on public.comments (post_id);

-- Per-profile app state for dev logs and the weekly planner; stored as full documents.
create table public.documents (
  profile_id text not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('devlog', 'planner')),
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (profile_id, kind)
);

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.post_media enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.documents enable row level security;

-- Keep the anon and authenticated roles empty unless a policy is explicitly added.
revoke all on public.profiles, public.posts, public.post_media, public.likes, public.comments, public.documents
  from anon, authenticated;

-- Private bucket for photos and videos. Access is limited to server-issued signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', false, 52428800, array['image/*', 'video/*']);
