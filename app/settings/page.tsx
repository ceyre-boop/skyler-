import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { tiktokEnabled } from "@/lib/platforms/tiktok";
import { metaEnabled, type MetaTokens } from "@/lib/meta";
import SettingsForm from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

// Auto-postable platforms only (Snapchat etc. hidden — no posting API). The
// `connect` value drives how each card connects in the Accounts hub.
const ACCOUNTS = [
  { id: "tiktok", name: "TikTok", emoji: "🎵", connect: "oauth-tiktok" },
  { id: "instagram", name: "Instagram", emoji: "📸", connect: "oauth-meta" },
  { id: "facebook", name: "Facebook", emoji: "👥", connect: "oauth-meta" },
  { id: "discord", name: "Discord", emoji: "🎮", connect: "webhook" },
] as const;

export default async function SettingsPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const [rows, templates] = await Promise.all([
    db`select platform_id, config from user_platforms where user_id = ${user.userId}`,
    db`
      select id, platform_id, content_type, template
      from user_caption_templates
      where user_id = ${user.userId}
      order by platform_id
    `,
  ]);

  const configByPlatform = new Map<string, Record<string, unknown>>(
    rows.map((r) => [r.platform_id as string, (r.config as Record<string, unknown>) ?? {}])
  );

  const metaReady = metaEnabled();
  const tiktokReady = tiktokEnabled();

  const accounts = ACCOUNTS.map((p) => {
    const config = configByPlatform.get(p.id) ?? {};
    const meta = config.meta_tokens as MetaTokens | undefined;
    let connected = false;
    let identity: string | null = null;
    let envReady = true;

    if (p.id === "tiktok") {
      connected = Boolean(config.tiktok_tokens);
      identity = connected ? "Connected" : null;
      envReady = tiktokReady;
    } else if (p.id === "instagram") {
      connected = Boolean(meta?.ig_user_id);
      identity = connected ? "Connected" : null;
      envReady = metaReady;
    } else if (p.id === "facebook") {
      connected = Boolean(meta?.fb_page_id);
      identity = connected ? meta?.fb_page_name ?? "Connected" : null;
      envReady = metaReady;
    } else if (p.id === "discord") {
      connected = Boolean(config.webhookUrl);
      identity = connected ? "Webhook set" : null;
    }

    return { id: p.id, name: p.name, emoji: p.emoji, connect: p.connect, connected, identity, envReady };
  });

  const connectedIds = new Set<string>(accounts.filter((a) => a.connected).map((a) => a.id));
  const connectedTemplates = (templates as unknown as Array<{ platform_id: string }>).filter((t) =>
    connectedIds.has(t.platform_id)
  );

  return (
    <SettingsForm
      accounts={accounts as never}
      templates={connectedTemplates as never}
      discordWebhook={(configByPlatform.get("discord")?.webhookUrl as string) ?? ""}
    />
  );
}
