-- Fable schema for Neon/standard Postgres (no Supabase-specific extensions).
-- Run once in the Neon SQL editor or via psql.

create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.platforms (
  id text primary key,
  name text not null,
  kind text not null check (kind in ('api', 'webhook', 'manual')),
  enabled boolean not null default true,
  sort int not null default 0,
  config jsonb not null default '{}'::jsonb
);

create table if not exists public.caption_templates (
  id uuid primary key default gen_random_uuid(),
  platform_id text not null references public.platforms(id) on delete cascade,
  content_type text not null check (content_type in ('story', 'video', 'post')),
  template text not null default '',
  unique (platform_id, content_type)
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  content_type text not null check (content_type in ('story', 'video', 'post')),
  video_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.post_targets (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  platform_id text not null references public.platforms(id),
  caption text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'posted', 'manual_done', 'failed')),
  external_url text,
  error text,
  posted_at timestamptz,
  unique (post_id, platform_id)
);

create index if not exists post_targets_post_id_idx on public.post_targets (post_id);

-- Seed platforms
insert into public.platforms (id, name, kind, enabled, sort, config) values
  ('tiktok',    'TikTok',    'manual',  true, 1, '{"profileUrl": "https://www.tiktok.com/@skylerclarkk"}'),
  ('instagram', 'Instagram', 'manual',  true, 2, '{"profileUrl": "https://www.instagram.com/crashingskymusic"}'),
  ('facebook',  'Facebook',  'manual',  true, 3, '{"profileUrl": "https://www.facebook.com/profile.php?id=61557407113127"}'),
  ('snapchat',  'Snapchat',  'manual',  true, 4, '{"profileUrl": "https://snapchat.com/t/IdUhhVky"}'),
  ('discord',   'Discord',   'webhook', true, 5, '{"serverUrl": "https://discord.gg/f64WqrJf5"}')
on conflict (id) do nothing;

-- Seed caption templates (platform × story/video/post)
insert into public.caption_templates (platform_id, content_type, template) values
  ('tiktok', 'story', '{{title}} 🤘

#fyp #foryou #musician #livemusic #skyfam'),
  ('tiktok', 'video', '{{title}} 🥁🔥

#fyp #foryou #musician #drummer #livemusic #rockmusic #skyfam'),
  ('tiktok', 'post', '{{title}}

#fyp #musician #skyfam'),
  ('instagram', 'story', '{{title}} 🤘'),
  ('instagram', 'video', '{{title}} 🥁🔥
.
.
.
#musician #drummer #livemusic #rockmusic #newmusic #womeninmusic #skyfam'),
  ('instagram', 'post', '{{title}}
.
.
.
#musician #livemusic #skyfam'),
  ('facebook', 'story', '{{title}} 🤘'),
  ('facebook', 'video', '{{title}} 🥁🔥

New video is up — turn the sound ON 🔊'),
  ('facebook', 'post', '{{title}}'),
  ('snapchat', 'story', '{{title}} 🤘'),
  ('snapchat', 'video', '{{title}} 🥁🔥'),
  ('snapchat', 'post', '{{title}}'),
  ('discord', 'story', '🎬 **{{title}}**

New story for the SkyFam 💖'),
  ('discord', 'video', '🎬 **{{title}}**

New video just dropped — SkyFam, you''re seeing it first 🥁🔥'),
  ('discord', 'post', '📣 **{{title}}**')
on conflict (platform_id, content_type) do nothing;
