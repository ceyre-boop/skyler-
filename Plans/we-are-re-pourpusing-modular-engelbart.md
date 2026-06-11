# Fable — Cross-Posting App for Skyler (repurpose `skyler-` repo)

## Context

This repo currently holds Skyler's static link-in-bio site (index.html/styles.css/script.js, deployed to GitHub Pages via `.github/workflows/deploy.yml`). We're repurposing it into **Fable**: a one-upload, multi-platform publishing app so Skyler can post one video with the right caption to TikTok, Instagram, Facebook, Snapchat, and Discord without redoing the work five times. Path chosen: **"Prep + push" hybrid** — auto-post where APIs allow today (Discord), native share-sheet handoff where they don't (Snapchat always; TikTok/IG/FB until API approvals land), with TikTok Content Posting API code built now and dormant behind env vars.

Decisions already made with Colin:
- Link hub → **archived to a `linkhub` branch**, GitHub Pages keeps serving it from there. `main` becomes the Fable app.
- Hosting: **single Next.js web service on Render** (no separate worker yet — Discord posting runs in an API route).
- Scope: **P1 polished + TikTok integration code-complete** (dormant until TikTok app approval; unaudited TikTok apps can only post private/draft).
- Data: **new Supabase project** (auth + Postgres + storage), set up via the Supabase MCP.
- Primary user is Skyler **on her phone** → mobile-first PWA; Web Share API needs HTTPS (Render provides it).

Her real targets (pulled from the current site): TikTok `@skylerclarkk`, Instagram `@crashingskymusic`, Facebook profile `61557407113127`, Snapchat `snapchat.com/t/IdUhhVky`, Discord `discord.gg/f64WqrJf5` (SkyFam server).

## Step 0 — Archive the link hub (do first, nothing breaks)

1. `git branch linkhub && git push origin linkhub` — snapshot of the current site.
2. On `linkhub`, edit `deploy.yml` trigger to `branches: [linkhub]` and push.
3. On `main`, delete the old site files (`index.html`, `styles.css`, `script.js`, `hero.png`) and `deploy.yml`.
4. **Manual/API step:** GitHub Pages environment protection may only allow `main` — update the `github-pages` environment branch rules to allow `linkhub` (via `gh api` or repo Settings → Environments).
5. Verify the Pages URL still serves the link hub before touching anything else.

## Stack

Next.js 15 (App Router, TypeScript, Tailwind) · Supabase (auth, Postgres, storage) · Render web service · **bun everywhere** (PAI rule — no npm/npx). PWA manifest so Skyler adds it to her home screen.

## Data model (Supabase Postgres, RLS = authenticated only)

- `platforms` — id, name, kind (`api` | `webhook` | `manual`), enabled, config jsonb (Discord webhook URL; TikTok tokens later)
- `caption_templates` — platform_id, content_type (`story` | `video` | `post`), template text + hashtag block (per-platform formatting, IG ≠ TikTok)
- `posts` — id, video_path (storage), content_type, title, created_at
- `post_targets` — post_id, platform_id, caption (rendered, editable), status (`pending` | `posted` | `manual_done` | `failed`), external_url, error, posted_at

Storage: private `videos` bucket, signed URLs. Auth: email+password, two accounts (Colin + Skyler), public signup disabled.

## App pages & flow (mobile-first)

1. **`/login`** — Supabase auth.
2. **`/` New Post** — pick/record video → tap Story / Video / Post → captions auto-fill per platform from templates, editable inline → **Publish**.
3. **Publish** (API route): creates post + targets.
   - **Discord (auto):** webhook post — attach the video file if under the webhook size limit (~10 MB default), otherwise post the caption + signed video URL. Status ✅/❌ recorded.
   - **Manual targets (Snapchat; TikTok/IG/FB until APIs live):** per-platform card with **Copy caption** + **Share video** (Web Share API with files → native share sheet → she picks the app) + **Mark as posted**.
4. **`/posts`** dashboard — per-platform ✅/❌/⏳ chips per post, retry failed Discord, mark-done for manual.
5. **`/settings`** — platform toggles, Discord webhook URL, caption template editor (platform × type grid), "Connect TikTok" button (appears when TikTok env vars are set).

## Platform adapter layer (the A-slots-in-later architecture)

`lib/platforms/types.ts` — `PlatformAdapter { publish(target, video): Promise<PublishResult> }`

- `discord.ts` — webhook publish (live in P1).
- `tiktok.ts` — **code-complete, dormant**: OAuth 2 (Login Kit) connect flow + token refresh stored in `platforms.config`, Content Posting API direct-post via FILE_UPLOAD (chunked — avoids PULL_FROM_URL domain verification). Activated by `TIKTOK_CLIENT_KEY`/`TIKTOK_CLIENT_SECRET` env vars. Until TikTok audits the app it can only post as private/draft — documented in README.
- `instagram.ts` / `facebook.ts` — stub files implementing the interface, throwing "pending Meta app review" (P3).

## Deploy

`render.yaml` blueprint: one web service, Bun runtime, env vars `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` (last two optional). Use the `render-deploy` skill. Discord webhook URL lives in the DB (settings page), not env.

## Build order

1. Step 0 (archive link hub, verify Pages).
2. Supabase project via MCP: schema migration, RLS, `videos` bucket, two auth users, seed `platforms` + default caption templates for all 5 platforms × 3 types.
3. Next.js scaffold + auth + upload + new-post flow.
4. Discord adapter + publish route + dashboard.
5. Share-sheet handoff cards + PWA manifest.
6. Settings page (templates, webhook, toggles).
7. TikTok adapter + connect flow (dormant).
8. `render.yaml` + deploy to Render.
9. New README documenting the app + the TikTok/Meta approval runbook (what Colin must do on developers.tiktok.com and developers.facebook.com when ready).

Forge (PAI rule: E3+ coding task) joins the EXECUTE phase for the Next.js build.

## Verification

- `bun run build` clean; schema applied (query Supabase via MCP).
- **Interceptor** (mandatory per PAI rules) on localhost: login → upload a small test video → pick "Video" → captions render per platform → Publish → Discord message lands in a **test channel** (not SkyFam) → dashboard shows ✅.
- Failed-webhook path: bogus webhook URL → ❌ + retry works.
- Deploy to Render → Interceptor on the live URL; then real-phone check: add to home screen, Share-video opens the iOS share sheet with the file (this only works on HTTPS + real device — Colin confirms on Skyler's or his phone).
- Old Pages URL still serves the link hub.

## Explicit non-goals (this build)

- Meta/IG/FB live posting (P3 — needs Creator account conversion + Meta app review, weeks).
- Snapchat automation (no public API — share sheet is the permanent answer).
- Scheduling + analytics pull-back (P4).
