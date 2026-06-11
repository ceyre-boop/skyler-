-- Fable initial schema: platforms, caption templates, posts, post targets,
-- private videos bucket. RLS: any authenticated user (the app has exactly two
-- accounts — Skyler and Colin) gets full access; anon gets nothing.

create extension if not exists "pgcrypto";

-- ── Tables ────────────────────────────────────────────────────────────────

create table public.platforms (
  id text primary key,
  name text not null,
  kind text not null check (kind in ('api', 'webhook', 'manual')),
  enabled boolean not null default true,
  sort int not null default 0,
  config jsonb not null default '{}'::jsonb
);

create table public.caption_templates (
  id uuid primary key default gen_random_uuid(),
  platform_id text not null references public.platforms(id) on delete cascade,
  content_type text not null check (content_type in ('story', 'video', 'post')),
  template text not null default '',
  unique (platform_id, content_type)
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  content_type text not null check (content_type in ('story', 'video', 'post')),
  video_path text not null,
  created_at timestamptz not null default now()
);

create table public.post_targets (
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

create index post_targets_post_id_idx on public.post_targets (post_id);

-- ── RLS ───────────────────────────────────────────────────────────────────

alter table public.platforms enable row level security;
alter table public.caption_templates enable row level security;
alter table public.posts enable row level security;
alter table public.post_targets enable row level security;

create policy "authenticated all" on public.platforms
  for all to authenticated using (true) with check (true);
create policy "authenticated all" on public.caption_templates
  for all to authenticated using (true) with check (true);
create policy "authenticated all" on public.posts
  for all to authenticated using (true) with check (true);
create policy "authenticated all" on public.post_targets
  for all to authenticated using (true) with check (true);

-- ── Storage ───────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('videos', 'videos', false)
on conflict (id) do nothing;

create policy "authenticated manage videos" on storage.objects
  for all to authenticated
  using (bucket_id = 'videos')
  with check (bucket_id = 'videos');

-- ── Seed: platforms ───────────────────────────────────────────────────────

insert into public.platforms (id, name, kind, enabled, sort, config) values
  ('tiktok',    'TikTok',    'manual',  true, 1, '{"profileUrl": "https://www.tiktok.com/@skylerclarkk"}'),
  ('instagram', 'Instagram', 'manual',  true, 2, '{"profileUrl": "https://www.instagram.com/crashingskymusic"}'),
  ('facebook',  'Facebook',  'manual',  true, 3, '{"profileUrl": "https://www.facebook.com/profile.php?id=61557407113127"}'),
  ('snapchat',  'Snapchat',  'manual',  true, 4, '{"profileUrl": "https://snapchat.com/t/IdUhhVky"}'),
  ('discord',   'Discord',   'webhook', true, 5, '{"serverUrl": "https://discord.gg/f64WqrJf5"}');

-- ── Seed: caption templates (platform × story/video/post) ────────────────
-- {{title}} is replaced with the post title in the app.

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
  ('discord', 'post', '📣 **{{title}}**');
