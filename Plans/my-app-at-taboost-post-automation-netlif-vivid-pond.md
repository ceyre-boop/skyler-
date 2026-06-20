# Cloudinary storage (signed direct upload) + fix iron-session "Missing password"

## Context

Phase 1 (remove Supabase → Neon + iron-session) **already shipped** (commit `0f56f35`).
Two things remain to make the live app fully work:

1. **Active blocker:** the deployed app now throws **`iron-session: Bad usage. Missing
   password`**. `middleware.ts` and `lib/auth.ts` build the session with
   `password: process.env.SESSION_SECRET!`. Locally `.env.local` has it (dev renders
   fine), so this is **`SESSION_SECRET` not set in the Netlify runtime**. Middleware runs
   on every request, so the whole site fails. Fix = set the env var + harden the code so
   the error is never cryptic again.
2. **Media storage** is stubbed (`lib/storage.ts` = local fs → 501 on Netlify). Wire it to
   **Cloudinary** so video upload + publish work. Decision: **signed direct browser→Cloudinary
   upload** (Netlify functions cap bodies at ~6 MB; real Reels/Stories are larger).

## How storage is consumed (the contract to preserve)

- `saveUpload(name, buf)` → path stored as `posts.video_path` (set in `app/api/upload`, value
  flows from `components/NewPostForm.tsx` → `app/api/publish/route.ts`).
- `fileUrl(path)` → URL used for the `<video>` preview (`app/posts/[id]/page.tsx`) and Discord
  share link / adapter `signedUrl`+`shareUrl` (`app/api/publish/route.ts`).
- `readUpload(path)` → **Buffer**, used by all four adapters (`lib/platforms/{tiktok,discord,
  instagram,facebook}.ts`) which upload raw bytes (FILE_UPLOAD / resumable / attachment) — **none
  use pull-from-URL**, so no TikTok/Meta domain verification is needed.
- `fileSize(path)` → number; gates Discord attach-vs-link in `app/api/publish/route.ts` (currently sync).

## Part A — Fix iron-session "Missing password"

**A1 (required, env, your action):** In Netlify → Site settings → Environment variables, set
`SESSION_SECRET` to a 32+ char value (`openssl rand -hex 32`) for all contexts, then redeploy.
This alone clears the current error.

**A2 (code hardening):** Create edge-safe `lib/session.ts` (NO `next/headers`/node imports) that
exports the shared `sessionOptions` (`cookieName: "fable_session"`, `cookieOptions`, `password`)
and **throws a clear `"SESSION_SECRET is not set"`** if the env var is missing. Refactor
`middleware.ts` and `lib/auth.ts` to import it (removes today's duplicated config). Keeps
middleware Edge-compatible; turns the cryptic failure into an obvious one.

## Part B — Cloudinary signed direct upload

**B1.** `bun add cloudinary` (server-side: signing + delivery-URL helpers).

**B2.** New `app/api/upload/sign/route.ts` (replaces `app/api/upload/route.ts`):
- Authed via `getUser()`. If `CLOUDINARY_*` unset → 501 `"Media storage is not configured."`.
- Returns `{ cloudName, apiKey, timestamp, folder, signature }` where
  `signature = cloudinary.utils.api_sign_request({ timestamp, folder }, api_secret)`.
- Keep signed params minimal (`timestamp`, `folder: "fable"`) so the browser signature matches.

**B3.** Rewrite `lib/storage.ts` to be Cloudinary-backed (store the full `secure_url` as `video_path`):
- `fileUrl(p)` → if `p` starts with `http` return as-is, else `cloudinary.url(p,{resource_type:"video",secure:true})`.
- `readUpload(p)` → `fetch(fileUrl(p))` → `Buffer.from(arrayBuffer())`; throw if not ok.
- `fileSize(p)` → **async**; `HEAD fileUrl(p)` → `content-length` number (fallback 0).
- Drop `saveUpload` (direct upload replaces it). `configured()` helper for the 501 guard.

**B4.** `app/api/publish/route.ts`: change `const size = fileSize(videoPath)` → `await fileSize(videoPath)`.

**B5.** `components/NewPostForm.tsx` `publish()` upload step:
- `GET /api/upload/sign` → params. Build FormData (`file, api_key, timestamp, signature, folder`),
  `POST https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, read `secure_url` from the response.
- Set `path = secure_url`, then continue to `/api/publish` exactly as today. Surface the 501 message
  if signing says storage isn't configured.

**B6.** Delete vestigial `app/api/files/[filename]/route.ts` (the `<video>` now points straight at the
Cloudinary CDN URL via `fileUrl`; nothing else links to it).

**B7.** `.env.example`: add `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
(already empty in `.env.local`). No Cloudinary upload preset needed — we use signed uploads.

## Env vars to set in Netlify (final)

| Var | Required | Note |
|---|---|---|
| `SESSION_SECRET` | **Yes** | **Fixes the current error.** `openssl rand -hex 32`. |
| `NEON_DATABASE_URL` | **Yes** | Rotated Neon string. |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | **Yes** (for uploads) | From Cloudinary console → Dashboard. |
| `TIKTOK_*`, `META_*` | Optional | Only for those integrations. |

## Gaps / notes

- Cloudinary free tier ≈ 100 MB/video and limited monthly credits — fine for personal use; flag if you hit limits.
- `posts.video_path` now stores a full Cloudinary URL (fresh DB, no legacy rows to migrate).
- API secret never reaches the browser — only the short-lived signature does.
- Still open from phase 1 (unchanged): sha256 password hashing is weak (recommend bcrypt/argon2);
  `scripts/migrate.ts` doesn't run `0002_multiuser.sql` (apply manually).

## Verification

1. `bun add cloudinary` && `bun run build` compiles clean.
2. Local: put `CLOUDINARY_*` in `.env.local`, `bun run dev` (free port), sign in → pick a video →
   Publish. Confirm: `/api/upload/sign` returns 200 (501 when unconfigured); file appears in
   Cloudinary Media Library; `/posts/[id]` plays the Cloudinary video.
3. `rg -n "process.env.SESSION_SECRET" middleware.ts lib` → only `lib/session.ts` reads it.
4. Netlify: set `SESSION_SECRET` + `CLOUDINARY_*` (+ `NEON_DATABASE_URL`), redeploy → `/login`
   renders (no iron-session error), sign-in works, and a >6 MB video uploads (direct to Cloudinary).
