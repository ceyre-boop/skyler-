# Connect-accounts onboarding: start at 0, connect per platform, post to any

## Context

The per-member model works, but onboarding isn't friendly: new members are pre-seeded with
all 5 platforms toggled on (including ones they haven't connected), and Settings mixes a
toggle list + scattered connect sections. Desired flow: **a member starts with 0 connected
accounts, is prompted to connect each platform they want (TikTok / Instagram / Facebook /
Discord), and then posts to all connected accounts or any subset at once.** Snapchat and other
no-API platforms are hidden (can't be auto-posted). Onboarding shape: an **Accounts hub with
empty states** (no separate wizard).

**Core model shift:** a `user_platforms` row now means **"this account is connected."** Rows
are created on connect, deleted on disconnect. New members have none. This replaces the old
"pre-seed every platform + enabled toggle" approach.

## Data-model changes

- **`lib/auth.ts` `signUp`**: stop seeding `user_platforms` and `user_caption_templates`.
  New members start at 0.
- **`supabase/migrations/0003_reset_connections.sql`** (new, idempotent): delete pre-seeded,
  not-actually-connected rows so existing users also start at 0 —
  `delete from user_platforms where not (config ? 'tiktok_tokens' or config ? 'meta_tokens' or
  config ? 'webhookUrl');` plus `delete from user_platforms where platform_id = 'snapchat';`
  (genuinely connected rows are kept). Run via `scripts/migrate.ts` (already runs all in order).

## Shared connect helper — `lib/connections.ts` (new)

Reused by every connect path so connecting also creates the caption templates for that platform:
- `connectUserPlatform(userId, platformId, kind, config)` — in a transaction: upsert the
  `user_platforms` row (`enabled = true`) **and** seed that platform's `user_caption_templates`
  from the global `caption_templates` (`on conflict do nothing`).
- `disconnectUserPlatform(userId, platformId)` — `delete from user_platforms where user_id/…`.

## Connect/disconnect wiring (use the helper)

- **`app/api/tiktok/callback`**: read existing row config, merge `tiktok_tokens`, call
  `connectUserPlatform(user, "tiktok", "api", merged)`. **`tiktok/disconnect`** → `disconnectUserPlatform`.
- **`app/api/meta/callback`**: for IG and FB, merge `meta_tokens`, call
  `connectUserPlatform(user, "instagram"|"facebook", "api", merged)`. **`meta/disconnect`** →
  `disconnectUserPlatform` for both. (Meta OAuth connects IG+FB together — unchanged.)
- **Discord** (webhook): `app/api/settings/route.ts` PATCH — change `config` to call
  `connectUserPlatform(user, "discord", "webhook", { webhookUrl })` (upsert, since there's no
  pre-seeded row), and add a `disconnect` action → `disconnectUserPlatform`. Drop the `toggle`
  type (no more global enable/disable; per-post selection covers it).

## UI — Accounts hub + New Post empty state

- **`components/SettingsForm.tsx`** → rebuild as the **Accounts hub**:
  - Top empty state when nothing connected: "Connect your first account to start posting."
  - One card per auto-post platform **(TikTok, Instagram, Facebook, Discord only — Snapchat
    hidden)** with three states: **connected** (show identity — TikTok ✓, IG by id, FB page
    name — + Disconnect), **available** (Connect button → `/api/tiktok/connect`,
    `/api/meta/connect`, or the Discord webhook input + Save), **not configured** (env keys
    missing → admin note). Remove the enabled-toggle list.
  - Caption-templates section shown only for **connected** platforms.
- **`app/settings/page.tsx`**: query the user's `user_platforms` (connected rows) + templates;
  pass a clean per-platform `{ connected, identity, envReady }` to `SettingsForm`. Reuses
  `tiktokEnabled()` / `metaEnabled()`.
- **`app/page.tsx` (New Post)** + **`components/NewPostForm.tsx`**: the query already returns only
  connected platforms (rows exist only when connected). Add an **empty state** in `NewPostForm`
  when `platforms.length === 0`: "No accounts connected yet — Connect an account →" linking to
  `/settings`. Keep the existing select-all-default / pick-any behavior for posting.
- Optional: rename the BottomNav "Settings" label to "Accounts" (`components/BottomNav.tsx`).

## After signup

`signUp` already redirects new members to `/settings` (now the Accounts hub) — they land on the
empty state prompting them to connect their first account. No extra screen needed.

## Deploy / env note (unchanged)

Still gated on Netlify having `SESSION_SECRET`, `NEON_DATABASE_URL`, `CLOUDINARY_*`, plus the
platform OAuth keys (`TIKTOK_*`, `META_*`) for those Connect buttons to be enabled in production.
Discord (webhook) works without any platform env keys.

## Verification

1. `bun run build` compiles clean.
2. Apply migrations (`bun run scripts/migrate.ts`) → confirm pre-seeded empty rows are gone
   (existing + new users show 0 connected).
3. Local (`bun run dev`): sign up → land on Accounts hub showing **empty state** + Connect
   buttons; New Post shows the "Connect an account" empty state.
4. Connect Discord (paste a webhook) → it appears as connected; a `user_platforms` row + that
   platform's caption templates now exist; New Post now lists Discord and posts to it.
5. Disconnect → row removed, New Post no longer lists it.
6. Second member sees none of the first member's connections (isolation intact).
