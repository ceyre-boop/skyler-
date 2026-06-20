-- Multi-user migration: per-user platform configs, caption templates, and post ownership.
-- Run once in the Neon SQL editor or via psql.

-- Per-user platform connections (replaces global platforms.config)
create table if not exists public.user_platforms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  platform_id text not null references public.platforms(id),
  kind text not null default 'manual' check (kind in ('api', 'webhook', 'manual')),
  enabled boolean not null default true,
  config jsonb not null default '{}',
  unique (user_id, platform_id)
);

-- Per-user caption templates
create table if not exists public.user_caption_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  platform_id text not null references public.platforms(id),
  content_type text not null check (content_type in ('story', 'video', 'post')),
  template text not null default '',
  unique (user_id, platform_id, content_type)
);

-- Posts need a user owner
alter table public.posts
  add column if not exists user_id uuid references public.users(id) on delete cascade;

-- Seed user_platforms for every existing user from the global platforms table
insert into public.user_platforms (user_id, platform_id, kind, enabled, config)
  select u.id, p.id, p.kind, p.enabled, p.config
  from public.users u cross join public.platforms p
  on conflict (user_id, platform_id) do nothing;

-- Seed user_caption_templates for every existing user from the global templates
insert into public.user_caption_templates (user_id, platform_id, content_type, template)
  select u.id, ct.platform_id, ct.content_type, ct.template
  from public.users u cross join public.caption_templates ct
  on conflict (user_id, platform_id, content_type) do nothing;

-- Assign existing unowned posts to the earliest user
update public.posts
  set user_id = (select id from public.users order by created_at limit 1)
  where user_id is null;

-- Now enforce not-null
alter table public.posts alter column user_id set not null;

-- Indexes
create index if not exists user_platforms_user_id_idx on public.user_platforms (user_id);
create index if not exists user_caption_templates_user_id_idx on public.user_caption_templates (user_id);
create index if not exists posts_user_id_idx on public.posts (user_id);
