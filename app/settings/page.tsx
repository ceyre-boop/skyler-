import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { tiktokEnabled } from "@/lib/platforms/tiktok";
import { metaEnabled, type MetaTokens } from "@/lib/meta";
import SettingsForm from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const [platforms, templates] = await Promise.all([
    db`select * from platforms order by sort`,
    db`select * from caption_templates order by platform_id`,
  ]);

  const tiktokRow = platforms.find((p) => p.id === "tiktok");
  const tokens = (tiktokRow?.config as Record<string, unknown>)?.tiktok_tokens;
  const instagramRow = platforms.find((p) => p.id === "instagram");
  const instagramTokens = (instagramRow?.config as Record<string, unknown>)?.meta_tokens as MetaTokens | undefined;
  const facebookRow = platforms.find((p) => p.id === "facebook");
  const facebookTokens = (facebookRow?.config as Record<string, unknown>)?.meta_tokens as MetaTokens | undefined;

  return (
    <SettingsForm
      platforms={platforms as never}
      templates={templates as never}
      tiktok={{ envReady: tiktokEnabled(), connected: Boolean(tokens) }}
      meta={{
        envReady: metaEnabled(),
        igConnected: instagramRow?.kind === "api" && Boolean(instagramTokens?.ig_user_id),
        fbConnected: facebookRow?.kind === "api" && Boolean(facebookTokens?.fb_page_id),
        fbPageName: facebookTokens?.fb_page_name ?? null,
      }}
    />
  );
}
