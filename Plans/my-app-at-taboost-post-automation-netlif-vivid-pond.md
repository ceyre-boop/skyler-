# Remove Supabase, run fully on Neon (Netlify deploy fix)

## Context

`taboost-post-automation.netlify.app` throws **"Your project's URL and Key are
required to create a Supabase client!"** on load. Goal: fully separate this
personal project from Supabase (which is tied to a paid work account) and run it
on a personal Neon Postgres database instead.

**Key finding from the audit: the working tree is already ~90% migrated off
Supabase.** The error comes from the *deployed* build (commit `be2bd54`), whose
pages still import Supabase and read `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY`
(unset on Netlify → `createClient` throws at render). The local working tree has
already replaced DB + auth, but those changes are **uncommitted and undeployed**,
and some Supabase leftovers remain. This plan finishes the cleanup, switches the
DB env var to `NEON_DATABASE_URL`, makes storage fail gracefully, commits, and
redeploys.

## Audit — what Supabase was used for, and the replacement

| Concern | Supabase role (old/deployed) | Current state in working tree | Verdict |
|---|---|---|---|
| **DB queries** | Postgres backend | Already Neon: `lib/db.ts` uses `postgres.js` against `DATABASE_URL`. All queries are raw SQL via the `db` tagged template. | ✅ **Neon drop-in, done.** Only change: rename env var to `NEON_DATABASE_URL`. |
| **Auth** | Supabase Auth (users, JWT sessions, RLS) | Already replaced: `lib/auth.ts` + `middleware.ts` use **`iron-session`** (encrypted cookie) + a custom `users` table + sha256 password hash. `SESSION_SECRET`. | ✅ **Done.** Neon alone has no auth; iron-session *is* the replacement and is already wired. ⚠️ sha256 hashing is weak (see Gaps). |
| **File / media storage** | Supabase Storage "private videos bucket" (see `0001_init.sql`) | `lib/storage.ts` writes to **local filesystem** (`./uploads`). Works locally; **breaks on Netlify** (ephemeral, read-only FS). | ⚠️ **GAP.** Needs object storage (R2 / Cloudinary / UploadThing). Per decision: **stub gracefully now**, implement later. |

**Confirmation Supabase is otherwise dead in the working tree:** no file under
`app/`, `components/`, or `lib/` (except the orphaned `lib/supabase/*`) imports
`@supabase` or `lib/supabase`. `lib/supabase/{client,server}.ts` are imported by
nothing.

## Decision

Storage: **stub for now** (smallest change). Page loads; login + DB work; the
upload feature returns a clear "media storage not configured" response in
production instead of crashing. Real object storage is a follow-up.

## Implementation — smallest change to get the page loading

### 1. Switch DB env var → `NEON_DATABASE_URL` (no hardcoding)
Replace `process.env.DATABASE_URL` with `process.env.NEON_DATABASE_URL` in:
- `lib/db.ts:8`
- `scripts/migrate.ts:7`
- `scripts/seed-users.ts:8` (+ the guard/message on lines 11–12 and usage docstring line 2)

User pastes the freshly-rotated Neon string into `.env.local` as `NEON_DATABASE_URL` themselves.

### 2. Delete orphaned Supabase code + deps
- Delete `lib/supabase/client.ts` and `lib/supabase/server.ts` (and the now-empty `lib/supabase/`).
- Remove `@supabase/ssr` and `@supabase/supabase-js` from `package.json` dependencies.
- `bun install` to refresh `bun.lock`.

### 3. Storage stub — fail gracefully on Netlify
- In `app/api/upload/route.ts`, wrap `saveUpload(...)` in try/catch; on write
  failure (e.g. read-only FS) return `501` with
  `{ error: "Media storage is not configured for this deployment." }` instead of a 500 crash.
- Local-fs path is left intact so uploads still work in local dev.
- (`app/api/files/[filename]/route.ts` already returns 404 on read failure — no change needed.)

### 4. Env template + dead config cleanup
- `.env.example`: rename `DATABASE_URL` → `NEON_DATABASE_URL`; **remove** the
  Supabase block (the three `NEXT_PUBLIC_SUPABASE_*` / `SUPABASE_SERVICE_ROLE_KEY`
  lines added previously).
- Delete `render.yaml` (stale — the project deploys on Netlify, not Render).
- Remove legacy Supabase migration `supabase/migrations/0001_init.sql` (RLS +
  storage bucket; superseded by `0001_neon.sql`). Keep `0001_neon.sql` and
  `0002_multiuser.sql`. *(Optional cosmetic: rename `supabase/` dir → `db/` and
  update the path in `scripts/migrate.ts:9`. Not required for the fix.)*

### 5. Commit & deploy
- Commit the migrated working tree.
- Push to `origin` (`github.com/ceyre-boop/skyler-`) → Netlify auto-builds (assuming the site is connected to this repo; confirm in Netlify if no build triggers).
- User sets Netlify env vars (below) **before/with** the deploy.

## Env vars to set in Netlify (Site settings → Environment variables)

| Var | Required? | Notes |
|---|---|---|
| `NEON_DATABASE_URL` | **Yes** | Freshly-rotated Neon pooled connection string. |
| `SESSION_SECRET` | **Yes** | 32-byte hex (`openssl rand -hex 32`). Auth/login breaks without it. |
| `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET` | Optional | Only if using TikTok publishing. |
| `META_APP_ID` / `META_APP_SECRET` | Optional | Only if using Instagram/Facebook publishing. |
| ~~`NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`~~ | **Remove** | No longer used — delete from Netlify if present. |

## What stays stubbed / known gaps (flagged honestly)

1. **Media storage is non-functional in production.** Uploading a video on the
   live site will return "media storage not configured." Needs Cloudflare R2 /
   Cloudinary / UploadThing wired into `lib/storage.ts` (`saveUpload`/`readUpload`/`fileUrl`).
   You already staged `CLOUDINARY_*` vars in `.env.local` — Cloudinary is the
   natural follow-up.
2. **Password hashing is sha256** (`lib/auth.ts`), which is weak for passwords.
   Recommend bcrypt/argon2 before any real users. Not blocking page load.
3. **`scripts/migrate.ts` only applies `0001_neon.sql`** — it does not run
   `0002_multiuser.sql`. Apply `0002` manually in the Neon SQL editor, or extend
   the script to run all migrations in order.
4. **Security:** the Neon connection string was pasted in chat — rotate it (you
   indicated you would) and only put the new value in `.env.local` / Netlify.

## Verification

1. `bun install` (confirm Supabase packages gone, no errors).
2. Add `NEON_DATABASE_URL` + `SESSION_SECRET` to `.env.local`; run migrations
   (`bun run scripts/migrate.ts` then apply `0002_multiuser.sql`); seed a user
   (`scripts/seed-users.ts`).
3. `bun run dev` → load `/login`: **renders, no Supabase error**. Sign in →
   redirected to `/` (New Post page) which runs Neon queries. ✅
4. `rg -i supabase app components lib` → only migration filenames/SQL, no client code.
5. After deploy: load `taboost-post-automation.netlify.app/login` → renders; sign
   in works. Attempt upload → graceful 501 (expected until storage is wired).
