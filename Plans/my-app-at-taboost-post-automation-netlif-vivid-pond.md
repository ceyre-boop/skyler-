# Self-serve signup + per-member account connections

## Context

New members can't get in — login fails with "Invalid email or password" because **there
is no signup flow at all** (`lib/auth.ts` has `signIn` but no `signUp`; no `/signup` page;
no `/api/auth/register`). The only accounts are 3 seeded rows with unknown passwords.

Goal: (1) anyone can **sign up** with email + password and land in the app, and (2) each
member connects **their own** TikTok / Instagram / Facebook / Discord and posts only to
those. Decision (confirmed): **per-member accounts** + **email/password signup** (upgrade
hashing from weak sha256 → salted scrypt, Node built-in, no new dependency).

**Key finding:** the `0002_multiuser` migration already created the right tables
(`user_platforms`, `user_caption_templates`, `posts.user_id`) — but **no code uses them yet**.
The whole app still reads/writes the global `platforms.config` / `caption_templates`. So
Part 2 is wiring the existing schema through the app, not designing new data.

## Part 1 — Email/password signup

- **`lib/auth.ts`**: add `signUp(email, password)` → insert into `users` with a salted
  **scrypt** hash, seed the new user's `user_platforms` + `user_caption_templates` from the
  global `platforms`/`caption_templates` (cross join, in one transaction), then create the
  session. Replace `hashPassword` with scrypt (`crypto.scryptSync`, format
  `scrypt$<saltHex>$<hashHex>`). `signIn` verifies scrypt **and** falls back to legacy sha256
  so the existing rows still work.
- **`app/api/auth/register/route.ts`** (new): POST → validate email/password (length ≥ 8),
  `409` if email taken, else `signUp` and return ok.
- **`app/signup/page.tsx`** (new): client form mirroring `app/login/page.tsx` → POST
  `/api/auth/register` → on success `router.replace("/settings")` (land them where they connect
  accounts). Show inline errors.
- **`app/login/page.tsx`**: add a "Create an account →" link to `/signup`.
- **`middleware.ts`**: allow `/signup` unauthenticated (today only `/login` + `/api/` are public);
  add `/signup` to the public check and keep the signed-in→`/` redirect.

## Part 2 — Per-member connections (global → `user_platforms`)

**The pattern (applies everywhere):** replace global `platforms` `config`/`enabled`,
`caption_templates`, and unscoped `posts`/`post_targets` access with rows scoped to
`user.id` via `user_platforms` / `user_caption_templates` / `posts.user_id`. The session user
comes from `getUser()` (already called in every one of these handlers).

Representative files and what changes:
- **`app/settings/page.tsx`** + **`app/page.tsx`** (New Post): read `user_platforms up join
  platforms p on p.id = up.platform_id where up.user_id = ${user.id}` (name/sort/emoji from
  `platforms`, `enabled`/`kind`/`config` from `user_platforms`); read `user_caption_templates`
  for the user. Derive tiktok/meta "connected" from the user's row config.
- **`app/api/settings/route.ts`** (PATCH): `toggle`/`config` → `update user_platforms ... where
  user_id = ${user.id} and platform_id = ...`; `template` → `update user_caption_templates ...
  where id = ${templateId} and user_id = ${user.id}` (ownership-checked).
- **OAuth callbacks** store tokens per user: **`app/api/tiktok/callback`** and
  **`app/api/meta/callback`** write tokens into `user_platforms` for `(user.id, platform_id)`
  (upsert, set `kind='api'`) instead of the global `platforms` row. **`tiktok/disconnect`** and
  **`meta/disconnect`** clear the user's row. `connect` routes are unchanged (already per-session).
- **`app/api/publish/route.ts`**: set `posts.user_id = ${user.id}`; read the user's
  `user_platforms` for the selected `platformIds`; use per-user tokens; write refreshed tokens
  back to `user_platforms`.
- **`app/api/targets/[id]/route.ts`**: join `posts` to enforce `posts.user_id = ${user.id}`;
  read/write config from `user_platforms`.
- **`app/posts/page.tsx`** + **`app/posts/[id]/page.tsx`**: add `where p.user_id = ${user.id}`
  so members see only their own posts.

`components/SettingsForm.tsx` / `NewPostForm.tsx` stay structurally the same — they render
whatever rows the page passes; only the data source moves to per-user.

## Migration & seeding

- **`scripts/migrate.ts`**: run all migrations in order (`0001_neon.sql`, `0002_multiuser.sql`)
  instead of only `0001`. (Apply `0002` to Neon if not already applied — it's idempotent
  `create table if not exists`.)
- New signups get their `user_platforms` / `user_caption_templates` seeded in `signUp` (above),
  so they appear in Settings immediately with Connect buttons and nothing connected.

## Deploy / env note (still outstanding from before)

This ships behind the same gate as the earlier work: the live site needs `SESSION_SECRET`,
`NEON_DATABASE_URL`, and `CLOUDINARY_*` set **in Netlify**, and a successful deploy of the
latest commit. Locally it runs today (verified: 3 users, DB connects). No new env vars are
introduced by this feature.

## Verification

1. `bun run build` compiles clean.
2. Local (`bun run dev`): visit `/signup` → create `me@test.com` / a password → lands on
   `/settings`; the user exists in `users` and has seeded `user_platforms` rows.
3. Sign out, sign back in via `/login` with the same creds → success. Legacy seeded users
   still log in (sha256 fallback).
4. Connect a platform (e.g. Discord webhook) as user A; create a second account B → B sees
   **none** of A's connections, and B's posts list is empty. Confirms per-user isolation.
5. Publish a post → `posts.user_id` is set; it shows only under that member's `/posts`.
6. `rg -n "from platforms|platforms.config|caption_templates" app` → only the New Post/Settings
   joins that intentionally read `platforms` for display metadata remain; tokens/enabled/templates
   all go through the `user_*` tables.
