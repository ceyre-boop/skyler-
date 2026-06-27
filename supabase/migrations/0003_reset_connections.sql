-- A user_platforms row now means "this account is connected." Remove the rows
-- that were pre-seeded for every user but were never actually connected, so all
-- members start at 0. Genuinely connected rows (with tokens or a webhook) stay.
-- Idempotent.

delete from public.user_platforms
where not (
  config ? 'tiktok_tokens'
  or config ? 'meta_tokens'
  or config ? 'webhookUrl'
);

-- Snapchat (and any no-API platform) can't be auto-posted — never surface it.
delete from public.user_platforms where platform_id = 'snapchat';
