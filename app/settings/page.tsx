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
    db`
      select p.id, p.name, up.kind, up.enabled, p.sort, up.config
      from user_platforms up
      join platforms p on p.id = up.platform_id
      where up.user_id = ${user.userId}
      order by p.sort
    `,
    db`
      select id, platform_id, content_type, template
      from user_caption_templates
      where user_id = ${user.userId}
      order by platform_id
    `,
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
        igConnected: Boolean(instagramTokens?.ig_user_id),
        fbConnected: Boolean(facebookTokens?.fb_page_id),
        fbPageName: facebookTokens?.fb_page_name ?? null,
      }}
    />
  );
}
