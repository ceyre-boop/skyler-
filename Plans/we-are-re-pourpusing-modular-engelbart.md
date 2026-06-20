# Fable — Multi-User + Netlify Deploy Plan

*Replaces prior plan. Two problems to solve.*

---

## First: The OAuth Credentials Misunderstanding (no code needed)

Your TikTok Client Key (`awn85l4e1s0xc11b`) and Client Secret are **NOT your personal TikTok credentials**. They identify your *developer app*, not your account. Here's how it works:

- You put Client Key + Secret in the server's env vars once — they never change
- When Skyler (or any creator) clicks "Connect TikTok" → she sees TikTok's own login page → she logs in with HER account → TikTok gives your app an access token for HER account → that token is stored in the DB under her user row
- When another creator connects, same flow — their own token, stored separately
- Your Client Key/Secret work for every user who connects. One developer app = unlimited creators.

**Same for Meta.** The App ID/Secret go in env vars once. Every creator who clicks "Connect Meta" connects their own Instagram/Facebook.

**The credentials you shared are correct and go straight into `.env.local`:**
```
TIKTOK_CLIENT_KEY=awn85l4e1s0xc11b
TIKTOK_CLIENT_SECRET=lURT7W1gqKAW4pYiLyUKDbcCHcyFxui5
```

---

## Problem 1: Database Has Zero User Isolation

Every user currently shares one set of platform configs, one set of caption templates, and all posts are in a single global pile. If Skyler and another creator both used the app right now, connecting Skyler's TikTok would immediately affect the other creator's settings.

### Fix: New DB migration + user-scoped queries

**New file: `supabase/migrations/0002_multiuser.sql`**

```sql
-- Per-user platform connections (replaces global platforms config)
create table public.user_platforms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  platform_id text not null references public.platforms(id),
  kind text not null default 'manual' check (kind in ('api', 'webhook', 'manual')),
  enabled boolean not null default true,
  config jsonb not null default '{}',
  unique (user_id, platform_id)
);

-- Per-user caption templates (replaces global caption_templates)
create table public.user_caption_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  platform_id text not null references public.platforms(id),
  content_type text not null check (content_type in ('story', 'video', 'post')),
  template text not null default '',
  unique (user_id, platform_id, content_type)
);

-- Posts need a user owner
alter table public.posts
  add column user_id uuid references public.users(id) on delete cascade;

-- Seed user_platforms + user_caption_templates for every existing user
-- (copies current global state to each user so no one loses their config)
insert into public.user_platforms (user_id, platform_id, kind, enabled, config)
  select u.id, p.id, p.kind, p.enabled, p.config
  from public.users u cross join public.platforms p
  on conflict (user_id, platform_id) do nothing;

insert into public.user_caption_templates (user_id, platform_id, content_type, template)
  select u.id, ct.platform_id, ct.content_type, ct.template
  from public.users u cross join public.caption_templates ct
  on conflict (user_id, platform_id, content_type) do nothing;

-- Assign existing posts to the first user (best we can do for legacy data)
update public.posts set user_id = (select id from public.users order by created_at limit 1)
  where user_id is null;

-- Now enforce not-null
alter table public.posts alter column user_id set not null;

-- Index
create index user_platforms_user_id_idx on public.user_platforms(user_id);
create index user_caption_templates_user_id_idx on public.user_caption_templates(user_id);
create index posts_user_id_idx on public.posts(user_id);
```

**Files to update (route queries):**

| File | Change |
|------|--------|
| `app/page.tsx` | Query `user_platforms` where `user_id = user.userId`; query `user_caption_templates` same |
| `app/settings/page.tsx` | Same — query user-scoped tables |
| `app/api/settings/route.ts` | Toggle/config → update `user_platforms where user_id=... and platform_id=...`; template → update `user_caption_templates where user_id=...` |
| `app/api/publish/route.ts` | Add `user_id` to posts insert; query `user_platforms` not `platforms` |
| `app/api/tiktok/callback/route.ts` | Write to `user_platforms` not `platforms` |
| `app/api/tiktok/disconnect/route.ts` | Update `user_platforms` filtered by user_id |
| `app/api/meta/callback/route.ts` | Write to `user_platforms` not `platforms` |
| `app/api/meta/disconnect/route.ts` | Update `user_platforms` filtered by user_id |
| `app/posts/page.tsx` | Query posts where `user_id = user.userId` |
| `app/api/targets/[id]/route.ts` | Verify the target's post belongs to the user |

Pattern for all queries — replace:
```ts
db`select * from platforms where id = any(${ids})`
```
With:
```ts
db`select * from user_platforms where user_id = ${user.userId} and platform_id = any(${ids})`
```

---

## Problem 2: Local Disk Storage Doesn't Work on Netlify

Netlify runs serverless functions — no persistent disk. Every deploy wipes the filesystem. Videos would vanish. Fix: **Cloudinary**.

### Why Cloudinary
- Free tier: 25GB storage, 25GB/month bandwidth — plenty for one creator
- Handles video natively (no transcoding needed for social posting)
- Supports direct browser uploads (no large video passing through Netlify function)
- Returns a public URL — all three platforms (TikTok, Instagram, Facebook) can pull from it directly, so adapters never need to download video bytes

### New upload architecture

**Old flow:** browser → POST /api/upload (video bytes) → saved to ./uploads → path in DB

**New flow:** browser → GET /api/upload-signature (tiny, just crypto) → browser uploads directly to Cloudinary → Cloudinary returns public URL → URL stored in DB as `video_path`

**Adapter change:** instead of `readUpload(videoPath)` + binary upload, pass the Cloudinary URL directly to each platform:
- TikTok: `source: "PULL_FROM_URL", video_url: cloudinaryUrl`
- Instagram: `video_url: cloudinaryUrl` in container init (no resumable upload needed)
- Facebook: `file_url: cloudinaryUrl` in the videos endpoint

This eliminates all the chunked upload complexity from the adapters.

### New files

**`lib/cloudinary.ts`** — server-side helpers:
- `cloudinaryEnabled(): boolean` — checks env vars
- `generateUploadSignature(folder: string): { signature, timestamp, apiKey, cloudName, uploadPreset? }` — signs a direct upload
- `deleteVideo(publicId: string): Promise<void>` — cleanup (optional)

**`app/api/upload-signature/route.ts`** — GET handler:
- Auth check
- Calls `generateUploadSignature("fable")`
- Returns `{ signature, timestamp, apiKey, cloudName, folder }`

**Remove:** `app/api/upload/route.ts` — replaced by Cloudinary direct upload
**Remove:** `app/api/files/[filename]/route.ts` — no longer needed (Cloudinary URLs are public)
**Remove:** `lib/storage.ts` — no longer needed

### Files to update

| File | Change |
|------|--------|
| `components/NewPostForm.tsx` | On video select, upload directly to Cloudinary using signature from `/api/upload-signature`; use returned URL as `videoPath` |
| `lib/platforms/tiktok.ts` | Replace FILE_UPLOAD chunked flow with PULL_FROM_URL using `input.videoPath` (the Cloudinary URL) |
| `lib/platforms/instagram.ts` | Replace resumable binary upload with `video_url: input.videoPath` in container init |
| `lib/platforms/facebook.ts` | Replace multipart bytes with `file_url: input.videoPath` |
| `lib/platforms/discord.ts` | Already posts URLs; just use `input.videoPath` directly |
| `app/api/publish/route.ts` | Remove `fileUrl()` and `fileSize()` calls — not needed |
| `.env.example` | Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET |

### New env vars (Colin adds these)
Sign up at cloudinary.com (free) → Dashboard shows these three values:
```
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

---

## Problem 3: Deploy to Netlify

**New file: `netlify.toml`**
```toml
[build]
  command = "bun install && bun run build"
  publish = ".next"

[build.environment]
  NEXT_USE_NETLIFY_EDGE = "true"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

**New dependency:** `bun add -d @netlify/plugin-nextjs`

**Netlify dashboard env vars to add:**
```
DATABASE_URL
SESSION_SECRET
TIKTOK_CLIENT_KEY=awn85l4e1s0xc11b
TIKTOK_CLIENT_SECRET=lURT7W1gqKAW4pYiLyUKDbcCHcyFxui5
META_APP_ID
META_APP_SECRET
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
```

TikTok redirect URI to add in developers.tiktok.com → your app → Login Kit:
`https://YOUR_NETLIFY_DOMAIN/api/tiktok/callback`

Meta redirect URI to add in developers.facebook.com → your app → Facebook Login → Valid OAuth Redirect URIs:
`https://YOUR_NETLIFY_DOMAIN/api/meta/callback`

---

## Execution Order

1. Run the DB migration against Neon (Neon SQL editor or `psql`)
2. Update all DB-touching routes and pages to use `user_platforms` / `user_caption_templates`
3. Sign up for Cloudinary, add env vars to `.env.local`
4. Replace upload flow (signature route + NewPostForm change)
5. Simplify all four adapters to use URL-based posting
6. Create `netlify.toml`, install `@netlify/plugin-nextjs`
7. Push to GitHub → connect to Netlify → add env vars → deploy

---

## Verification

- `bunx tsc --noEmit` → 0 errors
- `bunx next build` → passes
- Log in as two different users → Settings shows independent platform connections
- Upload a video → Cloudinary URL appears in DB (not a local path)
- Publish to Discord → video posts
- Connect TikTok (once credentials are set) → posts to TikTok draft
- Connect Meta (once credentials are set) → posts to Instagram/Facebook
