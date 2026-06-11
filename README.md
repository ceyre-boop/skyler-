# Fable 🎬✦

One upload, every platform. Fable is Skyler's cross-posting studio: pick a
video, pick **Story / Video / Post**, get the right caption for every platform,
and hit Publish once.

| Platform | How it posts |
|----------|--------------|
| Discord (SkyFam) | ✅ Automatic via webhook — video attached (≤10 MB) or linked |
| TikTok | 📤 Share button today · 🤖 auto-post code ready, activates when the TikTok dev app is approved |
| Instagram | 📤 Share button (Meta API planned, P3) |
| Facebook | 📤 Share button (Meta API planned, P3) |
| Snapchat | 📤 Share button (no public API — permanent) |

The **Share button** copies the caption to the clipboard and opens the phone's
native share sheet with the video file — pick the app, paste, post, then tap
"I posted it" so the dashboard shows ✅.

The old link-in-bio site still lives in [`linkhub/`](linkhub/) and deploys to
GitHub Pages from there — Skyler's bio link is untouched.

## Stack

Next.js 15 (App Router) · Supabase (auth, Postgres, storage) · Tailwind 4 ·
Render · Bun. Mobile-first PWA — add it to the home screen.

## Local dev

```bash
bun install
cp .env.example .env.local   # fill in Supabase keys
bun run dev
```

Apply `supabase/migrations/0001_init.sql` to the Supabase project (SQL editor
or MCP), create the two auth users (email+password, email confirm off), and
disable public signups (Auth → Providers → Email → "Allow new users to sign
up" off).

## Deploy (Render)

`render.yaml` is a Blueprint — New → Blueprint → point at this repo. Set the
env vars from `.env.example`. Web Share API needs HTTPS, which Render provides.

## Architecture

- `lib/platforms/` — one adapter per platform behind the `PlatformAdapter`
  interface. `discord` is live; `tiktok` is code-complete and dormant;
  `instagram`/`facebook` are stubs for P3.
- `app/api/publish` — creates the post + targets, fans out to auto platforms,
  records per-target status (`pending` → `posted` / `manual_done` / `failed`).
- `supabase/migrations/0001_init.sql` — schema, RLS (authenticated-only),
  private `videos` bucket, platform + caption-template seed data.
- Captions are templates per **platform × type** (Settings → Caption
  templates); `{{title}}` is replaced with the post title.

## Approval runbook (turning on real auto-posting)

### TikTok (P2)
1. <https://developers.tiktok.com> → create an app.
2. Add products **Login Kit** + **Content Posting API**; scopes
   `user.info.basic`, `video.publish`; redirect URI
   `https://YOUR_APP/api/tiktok/callback`.
3. Set `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET` on Render → a **Connect
   TikTok** button appears in Settings → sign in with Skyler's account.
4. Until the app passes TikTok's audit, posts land as **private (SELF_ONLY)**.
   Apply for the audit in the developer portal; once approved, raise
   `privacy_level` in `lib/platforms/tiktok.ts`.

### Instagram + Facebook (P3)
1. Convert Skyler's Instagram to a **Creator** account and link it to a
   Facebook **Page** (the personal profile can't use the API).
2. <https://developers.facebook.com> → app with Instagram Graph API +
   `instagram_content_publish`, `pages_manage_posts`; submit for App Review.
3. Implement `lib/platforms/instagram.ts` / `facebook.ts` against the Graph
   API (the adapter interface is already in place) and flip those platform
   rows from `manual` to `api`.
