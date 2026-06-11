import { createClient } from "@/lib/supabase/server";
import { tiktokEnabled, type TikTokTokens } from "@/lib/platforms/tiktok";
import SettingsForm from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const [{ data: platforms }, { data: templates }] = await Promise.all([
    supabase.from("platforms").select("*").order("sort"),
    supabase.from("caption_templates").select("*").order("platform_id"),
  ]);

  const tiktokRow = platforms?.find((p) => p.id === "tiktok");
  const tokens = tiktokRow?.config?.tiktok_tokens as TikTokTokens | undefined;

  return (
    <SettingsForm
      platforms={platforms ?? []}
      templates={templates ?? []}
      tiktok={{
        envReady: tiktokEnabled(),
        connected: Boolean(tokens?.refresh_token),
      }}
    />
  );
}
