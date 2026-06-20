---
task: "Real OAuth account connections + live posting for TikTok, Instagram, Facebook"
slug: fable-platform-oauth
effort: deep
phase: execute
progress: 0/128
mode: algorithm
project: fable
started: 2026-06-11
updated: 2026-06-11
---

## Problem

Fable can upload videos and auto-post to Discord, but TikTok, Instagram, and Facebook only work via manual iOS share-sheet. The user wants Skyler to connect her accounts once and have Fable post automatically.

Three concrete blockers exist today:
1. TikTok OAuth routes (`/api/tiktok/connect`, `/api/tiktok/callback`) import `@/lib/supabase/server` — Supabase was removed; these routes crash at runtime with a module-not-found error.
2. All adapters call `fetch(input.signedUrl)` where `signedUrl` is a relative auth-gated URL (`/api/files/...`). Server-side `fetch` without the session cookie gets a 401 — videos never load.
3. Instagram and Facebook adapters are stubs that always return an error string.

## Vision

Skyler opens Settings, taps "Connect TikTok" and "Connect Meta." She goes through the OAuth dance once per platform. From that point on, every Publish hits TikTok, Instagram, and Facebook automatically — same as Discord works today. The settings screen shows which accounts are live, what they're connected as, and a Disconnect option. A clear notice explains that TikTok posts privately until Colin gets the dev app reviewed.

## Out of Scope

- Snapchat: no public posting API exists — share-sheet is the permanent answer
- Scheduling or queuing posts for future delivery
- Analytics pull-back (views, likes, engagement)
- Multi-user account management (not needed for Skyler's single-user setup)
- TikTok app review itself (that's on Colin via developers.tiktok.com)
- Meta app review for public distribution (dev-mode test users bypass this for Skyler)
- Video transcoding or format conversion before posting

## Principles

- Adapters never throw — always return `{ok: false, error: string}`
- Read files via `readUpload(videoPath)` directly, never via HTTP self-call (eliminates auth and URL issues in one move)
- Token storage in existing `platforms.config jsonb` — no schema migration
- Single Meta OAuth flow covers both Instagram and Facebook (same developer app, combined scopes)
- If a platform can't be connected from Meta OAuth (no IG account, no managed page), the other still connects

## Constraints

- Stack: Next.js 15, TypeScript, Neon Postgres (`postgres` package), iron-session — no Supabase
- bun/bunx only — no npm/npx
- `platforms.config jsonb` is the token store — avoids new migration
- TikTok posts as `SELF_ONLY` (private) until the app passes TikTok's developer review
- Facebook posting requires a Page (personal profile API removed by Meta in 2018)
- Instagram requires Creator or Business account linked to a Facebook Page
- Meta developer app must be created by Colin; Skyler added as test user bypasses review requirement

## Goal

Rewrite the broken TikTok OAuth routes to use iron-session + Neon. Fix all adapters to read video bytes via `readUpload` (no HTTP). Build Meta OAuth flow and real Instagram/Facebook posting adapters. Update Settings UI to show connection status and connect/disconnect controls. After completion: `bun run build` is clean, TikTok auto-posts (privately), Instagram and Facebook auto-post when Colin sets up the Meta dev app and adds Skyler as a test user.

## Criteria

### TikTok OAuth Rewrite
- [ ] ISC-1: `app/api/tiktok/connect/route.ts` imports `getUser` from `@/lib/auth` not `@/lib/supabase/server`
- [ ] ISC-2: Connect route calls `getUser()` and redirects to `/login` when null
- [ ] ISC-3: Connect route returns 400 JSON `{ error: "TikTok API keys not configured" }` when `tiktokEnabled()` is false
- [ ] ISC-4: Connect route sets `tiktok_oauth_state` cookie with `httpOnly: true, maxAge: 600`
- [ ] ISC-5: Connect route redirects to TikTok authorization URL with `client_key, scope, redirect_uri, state` params
- [ ] ISC-6: `app/api/tiktok/callback/route.ts` imports `db` from `@/lib/db` for Neon queries
- [ ] ISC-7: Callback route imports `getUser` from `@/lib/auth` for session check
- [ ] ISC-8: Callback route deletes `tiktok_oauth_state` cookie immediately after reading it
- [ ] ISC-9: Callback route uses `db\`update platforms set ...\`` (Neon tagged template) not Supabase client
- [ ] ISC-10: Callback route redirects to `/settings` on success
- [ ] ISC-11: Callback route redirects to `/settings?tiktok_error=...` on any failure (missing code, state mismatch, exchange error)

### TikTok Adapter File Fix
- [ ] ISC-12: `lib/platforms/tiktok.ts` imports `readUpload` from `@/lib/storage`
- [ ] ISC-13: TikTok adapter reads video via `const video = await readUpload(input.videoPath)` not `fetch(input.signedUrl)`
- [ ] ISC-14: TikTok adapter uses `video.byteLength` for size calculation after `readUpload`
- [ ] ISC-15: TikTok adapter wraps `readUpload` call in try/catch, returns `{ok: false, error: "Could not read video file"}` on failure

### Meta Library (lib/meta.ts)
- [ ] ISC-16: `lib/meta.ts` exports `metaEnabled(): boolean` — returns true only if both `META_APP_ID` and `META_APP_SECRET` are set
- [ ] ISC-17: `lib/meta.ts` exports `buildMetaAuthUrl(redirectUri, state)` returning full `graph.facebook.com/oauth/authorize` URL
- [ ] ISC-18: Meta auth URL includes scopes `instagram_basic,instagram_content_publish,pages_manage_posts,pages_read_engagement`
- [ ] ISC-19: `lib/meta.ts` exports `exchangeMetaCode(code, redirectUri)` returning short-lived user access token
- [ ] ISC-20: `lib/meta.ts` exports `getLongLivedToken(shortToken)` — exchanges for 60-day token via `oauth/access_token?grant_type=fb_exchange_token`
- [ ] ISC-21: `lib/meta.ts` exports `getIGBusinessAccountId(accessToken, fbUserId)` — calls `/{fb-user-id}?fields=instagram_business_account` returning IG user id or null
- [ ] ISC-22: `lib/meta.ts` exports `getFBPages(accessToken)` — calls `/me/accounts` returning `{id, name, access_token}[]`
- [ ] ISC-23: `lib/meta.ts` exports `MetaTokens` interface with fields: `access_token, fb_user_id, ig_user_id?, fb_page_id?, fb_page_name?, fb_page_token?, expires_at`

### Meta OAuth Connect Route
- [ ] ISC-24: `GET /api/meta/connect` returns 400 JSON when `metaEnabled()` is false
- [ ] ISC-25: Connect route redirects to `/login` when user not authenticated
- [ ] ISC-26: Connect route generates state via `crypto.randomUUID()`
- [ ] ISC-27: Connect route stores state in `meta_oauth_state` cookie (httpOnly, maxAge 600)
- [ ] ISC-28: Connect route redirects to Meta authorization URL with correct scopes and redirect URI

### Meta OAuth Callback Route
- [ ] ISC-29: `GET /api/meta/callback` verifies state param matches `meta_oauth_state` cookie; redirects to `/settings?meta_error=State+mismatch` on mismatch
- [ ] ISC-30: Callback deletes `meta_oauth_state` cookie immediately after reading
- [ ] ISC-31: Callback exchanges `code` for short-lived token then long-lived token
- [ ] ISC-32: Callback calls `getFBPages` — if pages exist, stores first page's `{id, name, access_token}` in Facebook platform config
- [ ] ISC-33: Callback calls `getIGBusinessAccountId` — if IG account found, stores `ig_user_id` in Instagram platform config
- [ ] ISC-34: Callback sets `kind = 'api'` on Facebook platform row when `fb_page_id` is stored
- [ ] ISC-35: Callback sets `kind = 'api'` on Instagram platform row when `ig_user_id` is stored
- [ ] ISC-36: Callback sets `kind = 'manual'` if platform could not be connected (no IG account or no FB page)
- [ ] ISC-37: All DB updates use Neon `db` tagged template
- [ ] ISC-38: Callback redirects to `/settings` on success (even partial — one platform connected)
- [ ] ISC-39: Callback redirects to `/settings?meta_error=...` on total failure (token exchange fails)

### Instagram Adapter
- [ ] ISC-40: `lib/platforms/instagram.ts` exports a `PlatformAdapter` with `id: "instagram"`
- [ ] ISC-41: Instagram adapter returns `{ok: false, error: "Instagram account not connected — tap Connect Meta in Settings."}` when `config.meta_tokens?.ig_user_id` is absent
- [ ] ISC-42: Adapter reads video bytes via `readUpload(input.videoPath)` — no HTTP fetch
- [ ] ISC-43: Adapter creates Reels container via `POST /v20.0/{ig_user_id}/media` with `media_type=REELS, upload_type=resumable`
- [ ] ISC-44: Container creation request includes `caption` field with `input.caption.slice(0, 2200)`
- [ ] ISC-45: Adapter extracts `uri` (upload URL) and `id` (container id) from container creation response
- [ ] ISC-46: Adapter uploads video binary to the `uri` with `Content-Type: video/mp4` and `file_size` header
- [ ] ISC-47: Adapter polls container status via `GET /v20.0/{container_id}?fields=status_code` at 5s intervals
- [ ] ISC-48: Adapter polls at most 24 times (≤2 min total); returns `{ok: true}` if still PROCESSING after max polls (async finish)
- [ ] ISC-49: Adapter returns `{ok: false, error: "..."}` immediately on `PROCESSING_ERROR` or `ERROR` status
- [ ] ISC-50: Adapter publishes via `POST /v20.0/{ig_user_id}/media_publish` with `creation_id={container_id}`
- [ ] ISC-51: Adapter returns `{ok: true}` on successful publish (HTTP 200 with `id` field)
- [ ] ISC-52: Adapter returns `{ok: false, error: <API error message>}` on any non-200 API response

### Facebook Adapter
- [ ] ISC-53: `lib/platforms/facebook.ts` exports a `PlatformAdapter` with `id: "facebook"`
- [ ] ISC-54: Facebook adapter returns `{ok: false, error: "Facebook Page not connected — tap Connect Meta in Settings."}` when `config.meta_tokens?.fb_page_id` is absent
- [ ] ISC-55: Adapter reads video bytes via `readUpload(input.videoPath)`
- [ ] ISC-56: Adapter POSTs to `https://graph.facebook.com/v20.0/{fb_page_id}/videos` using page access token
- [ ] ISC-57: Request is multipart/form-data with `source` = video bytes and `description` = caption
- [ ] ISC-58: Adapter returns `{ok: true}` when API returns `{id: "..."}` (video created)
- [ ] ISC-59: Adapter returns `{ok: false, error: <meta error message>}` on API error response
- [ ] ISC-60: Adapter uses `config.meta_tokens.fb_page_token` (page-level token, not user token) for authorization

### Publish Route
- [ ] ISC-61: `app/api/publish/route.ts` persists refreshed `meta_tokens` if adapter mutates `config.meta_tokens`
- [ ] ISC-62: Publish route checks for meta_tokens change via reference inequality (same pattern as existing tiktok_tokens check)

### Settings UI
- [ ] ISC-63: `app/settings/page.tsx` reads `config` and `kind` for all platforms from Neon
- [ ] ISC-64: Page passes `meta: { envReady, igConnected, fbConnected, fbPageName, igUsername }` to `SettingsForm`
- [ ] ISC-65: Page passes `tiktok: { envReady, connected }` to `SettingsForm` (fixes existing broken TikTok status display)
- [ ] ISC-66: `SettingsForm` renders a "Connect Accounts" section with TikTok and Meta subsections
- [ ] ISC-67: TikTok subsection shows "Connect TikTok" button when `tiktok.envReady && !tiktok.connected`
- [ ] ISC-68: TikTok subsection shows connected badge + "Disconnect" button when `tiktok.connected`
- [ ] ISC-69: TikTok subsection shows "Private posts until review" notice when `tiktok.connected`
- [ ] ISC-70: TikTok subsection shows "Add TIKTOK_CLIENT_KEY + TIKTOK_CLIENT_SECRET to .env" guide when `!tiktok.envReady`
- [ ] ISC-71: Meta subsection shows "Connect Meta" button when `meta.envReady && !meta.igConnected && !meta.fbConnected`
- [ ] ISC-72: Meta subsection shows Instagram connected status (username or "not connected") when `meta.envReady`
- [ ] ISC-73: Meta subsection shows Facebook Page connected status (page name or "not connected") when `meta.envReady`
- [ ] ISC-74: Meta subsection shows "Disconnect Meta" button when at least one Meta platform is connected
- [ ] ISC-75: Meta subsection shows "Add META_APP_ID + META_APP_SECRET to .env" guide when `!meta.envReady`
- [ ] ISC-76: Meta subsection shows "Facebook requires a Page (not personal profile)" explainer always
- [ ] ISC-77: `GET /api/meta/disconnect` sets `kind = 'manual'` and clears `meta_tokens` from both IG and FB platform rows
- [ ] ISC-78: `GET /api/tiktok/disconnect` sets `kind = 'manual'` and clears `tiktok_tokens` from TikTok platform row
- [ ] ISC-79: Both disconnect routes require authenticated session

### Token Lifecycle
- [ ] ISC-80: Instagram `config.meta_tokens` stored per `MetaTokens` interface shape
- [ ] ISC-81: Facebook `config.meta_tokens` stored per `MetaTokens` interface shape (shared user token + page-specific fields)
- [ ] ISC-82: TikTok `config.tiktok_tokens` stored per existing `TikTokTokens` interface
- [ ] ISC-83: Instagram token refresh: when `expires_at < Date.now() + 7 days`, exchange via `/oauth/access_token?grant_type=ig_refresh_token`
- [ ] ISC-84: TikTok token refresh behavior preserved (existing: refresh when `expires_at < now + 5min`)
- [ ] ISC-85: Facebook page access tokens don't expire — no refresh logic needed

### Error Handling
- [ ] ISC-86: TikTok adapter returns `{ok: false}` (never throws) — try/catch wraps entire `publish()`
- [ ] ISC-87: Instagram adapter returns `{ok: false}` (never throws) — try/catch wraps entire `publish()`
- [ ] ISC-88: Facebook adapter returns `{ok: false}` (never throws) — try/catch wraps entire `publish()`
- [ ] ISC-89: All adapter error strings are ≤300 chars (truncated with `.slice(0, 300)` if from API response)
- [ ] ISC-90: Instagram container `PROCESSING_ERROR` surfaces `error_code` from Meta response body
- [ ] ISC-91: Facebook API error surfaces `error.message` from Meta response body
- [ ] ISC-92: TikTok publish `FAILED` status surfaces `fail_reason` from TikTok response (existing behavior preserved)

### Security
- [ ] ISC-93: TikTok OAuth state is `crypto.randomUUID()` (not guessable)
- [ ] ISC-94: Meta OAuth state is `crypto.randomUUID()` (not guessable)
- [ ] ISC-95: Both OAuth state cookies are `httpOnly: true`
- [ ] ISC-96: Both OAuth state cookies are `secure: process.env.NODE_ENV === "production"`
- [ ] ISC-97: OAuth state cookies have `maxAge: 600` (10 min)
- [ ] ISC-98: Session authenticated before ANY OAuth initiation
- [ ] ISC-99: Session authenticated before ANY OAuth callback processing
- [ ] ISC-100: Anti: No `META_APP_SECRET` or `TIKTOK_CLIENT_SECRET` appears in any API response body
- [ ] ISC-101: Anti: No platform token appears in any client-accessible JS variable or HTML
- [ ] ISC-102: Disconnect routes require authenticated session (prevent CSRF-triggered disconnect)

### Build & Types
- [ ] ISC-103: `bun run build` exits 0 with zero TypeScript errors
- [ ] ISC-104: No `import from "@/lib/supabase"` anywhere under `app/api/tiktok/` or `app/api/meta/`
- [ ] ISC-105: `lib/meta.ts` type exports consumed correctly by `app/api/meta/callback/route.ts`
- [ ] ISC-106: `lib/platforms/types.ts` `PublishInput.videoPath` is `string` (unchanged — used by new adapters)
- [ ] ISC-107: No `@/lib/supabase` imports remain anywhere in the codebase (grep confirms zero)

### UX Flow After Connection
- [ ] ISC-108: Newly connected TikTok has `kind = 'api'` in `platforms` table — publish route auto-posts
- [ ] ISC-109: Newly connected Instagram has `kind = 'api'` — publish route auto-posts
- [ ] ISC-110: Newly connected Facebook has `kind = 'api'` — publish route auto-posts
- [ ] ISC-111: Platform card on post detail shows "Done" after successful auto-post
- [ ] ISC-112: Platform card shows "Failed" with error text after failed auto-post
- [ ] ISC-113: After disconnect, platform `kind` = `'manual'` — next publish shows Share button, not auto-posts
- [ ] ISC-114: Post detail TargetCard's Share/Copy/Mark-done buttons appear for `kind='manual'` targets only

### Antecedents
- [ ] ISC-115: Antecedent: `META_APP_ID` + `META_APP_SECRET` env vars set — required for Meta OAuth to activate
- [ ] ISC-116: Antecedent: `TIKTOK_CLIENT_KEY` + `TIKTOK_CLIENT_SECRET` env vars set — required for TikTok OAuth to activate
- [ ] ISC-117: Antecedent: Skyler added as Meta test user in Colin's developer app — required for IG/FB posting to work without public review
- [ ] ISC-118: Antecedent: Skyler has a Creator/Business Instagram account linked to a Facebook Page — required for IG auto-post

### Anti-criteria
- [ ] ISC-119: Anti: TikTok connect route crashes with "Cannot find module supabase" at runtime
- [ ] ISC-120: Anti: Any adapter silently succeeds when the underlying API returned an error
- [ ] ISC-121: Anti: Facebook adapter attempts to post to `/me/feed` (personal profile endpoint — removed 2018)
- [ ] ISC-122: Anti: OAuth callback stores state from the URL query param rather than the signed cookie
- [ ] ISC-123: Anti: Any adapter throws an unhandled exception to the publish route
- [ ] ISC-124: Anti: Platform `kind` remains `'api'` after disconnect
- [ ] ISC-125: Anti: `readUpload` replaced by `fetch(signedUrl)` in new adapters — file auth bug would recur
- [ ] ISC-126: Anti: Meta tokens stored with only `access_token` but missing `ig_user_id` / `fb_page_id` — adapters would silently fail on first post
- [ ] ISC-127: Anti: `META_APP_SECRET` logged to console or returned in any HTTP response
- [ ] ISC-128: Anti: Short-lived Meta token (2-hour expiry) stored without exchange for long-lived token

## Test Strategy

| isc | type | check | threshold | tool |
|-----|------|-------|-----------|------|
| ISC-1 | import | `grep "supabase" app/api/tiktok/connect/route.ts` | zero matches | Grep |
| ISC-4 | code | `grep "tiktok_oauth_state" app/api/tiktok/connect/route.ts` | ≥1 match | Grep |
| ISC-6 | import | `grep "supabase" app/api/tiktok/callback/route.ts` | zero matches | Grep |
| ISC-9 | code | `grep "db\`" app/api/tiktok/callback/route.ts` | ≥1 match | Grep |
| ISC-12 | import | `grep "readUpload" lib/platforms/tiktok.ts` | ≥1 match | Grep |
| ISC-13 | code | `grep "readUpload(input.videoPath)" lib/platforms/tiktok.ts` | ≥1 match | Grep |
| ISC-16 | code | `grep "metaEnabled" lib/meta.ts` | ≥1 match | Grep |
| ISC-17 | code | `grep "buildMetaAuthUrl" lib/meta.ts` | ≥1 match | Grep |
| ISC-40 | import | `grep "PlatformAdapter" lib/platforms/instagram.ts` | ≥1 match | Grep |
| ISC-42 | code | `grep "readUpload" lib/platforms/instagram.ts` | ≥1 match | Grep |
| ISC-43 | code | `grep "REELS" lib/platforms/instagram.ts` | ≥1 match | Grep |
| ISC-53 | import | `grep "PlatformAdapter" lib/platforms/facebook.ts` | ≥1 match | Grep |
| ISC-55 | code | `grep "readUpload" lib/platforms/facebook.ts` | ≥1 match | Grep |
| ISC-100 | security | `grep -r "META_APP_SECRET\|TIKTOK_CLIENT_SECRET" app/api/` | zero values logged | Grep |
| ISC-103 | build | `bun run build` | exit 0 | Bash |
| ISC-104 | import | `grep -r "supabase" app/api/tiktok/ app/api/meta/` | zero matches | Grep |
| ISC-107 | import | `grep -r "supabase" app/ lib/` | zero matches | Grep |
| ISC-119 | anti | build exits 0; no supabase import in tiktok routes | confirmed | Grep+Bash |
| ISC-121 | anti | `grep "me/feed" lib/platforms/facebook.ts` | zero matches | Grep |
| ISC-125 | anti | `grep "signedUrl" lib/platforms/instagram.ts lib/platforms/facebook.ts` | zero matches | Grep |
| ISC-128 | anti | `grep "fb_exchange_token" lib/meta.ts` | ≥1 match (exchange IS done) | Grep |

## Features

| name | satisfies | depends_on | parallelizable |
|------|-----------|------------|----------------|
| tiktok-oauth-rewrite | ISC-1..11 | none | yes (no shared state with other features) |
| tiktok-adapter-fix | ISC-12..15 | none | yes |
| meta-library | ISC-16..23 | none | yes (pure utility, no DB) |
| meta-oauth-connect | ISC-24..28 | meta-library | no (depends on meta-library) |
| meta-oauth-callback | ISC-29..39 | meta-library, meta-oauth-connect | no |
| instagram-adapter | ISC-40..52 | meta-library | yes (parallel with facebook-adapter) |
| facebook-adapter | ISC-53..60 | meta-library | yes |
| publish-route-fix | ISC-61..62 | none | yes |
| settings-ui | ISC-63..79 | meta-library | no (depends on knowing meta prop shape) |
| token-lifecycle | ISC-80..85 | meta-library, instagram-adapter, facebook-adapter | no |
| disconnect-routes | ISC-77..79 | none | yes |
| build-verification | ISC-103..107 | all | no |

## Decisions

- 2026-06-11: Using `readUpload(videoPath)` in all adapters instead of `fetch(signedUrl)`. The `signedUrl` is a relative, auth-gated URL — server-side `fetch` without session cookies returns 401. Direct storage read eliminates the problem cleanly and avoids creating public file endpoints.
- 2026-06-11: Single Meta OAuth flow for both Instagram and Facebook. Same developer app, combined permission scopes in one authorization URL. This means one "Connect Meta" button gives both IG + FB in a single OAuth dance.
- 2026-06-11: Meta tokens stored in `platforms.config jsonb` on each respective platform row. No migration needed. Instagram row gets `meta_tokens.ig_user_id + access_token`; Facebook row gets `meta_tokens.fb_page_id + fb_page_name + fb_page_token`.
- 2026-06-11: Instagram uses resumable upload (`upload_type=resumable`) not `video_url`. This avoids the requirement for a publicly accessible video URL, making it work in both development and production identically.
- 2026-06-11: Facebook posts to `/{page_id}/videos` (Page API), never `/me/feed`. Meta removed personal profile posting in 2018. Colin must have a Facebook Page for Skyler's music.
- 2026-06-11: TikTok posts as `SELF_ONLY` (private) until the app passes TikTok developer review. No code change needed for this — it's already implemented in the existing (but broken) adapter.
- 2026-06-11 refined: Caller (publish route) is responsible for persisting mutated config back to DB. This is already the pattern for TikTok token refresh; extending to meta_tokens follows the same convention.

## Changelog

- conjectured: Supabase removal was complete and all routes worked
  refuted_by: `app/api/tiktok/connect/route.ts` and `callback/route.ts` still import `@/lib/supabase/server`
  learned: Route files under `app/api/` must be audited specifically when migrating auth providers — component-level migration can miss leaf API routes
  criterion_now: ISC-104 (grep confirms zero supabase imports in tiktok + meta routes)

## Verification

<!-- Filled during VERIFY phase — one entry per passing ISC -->
