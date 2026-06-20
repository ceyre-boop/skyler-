import type { PlatformAdapter, PublishInput, PublishResult } from "./types";
import { readUpload } from "@/lib/storage";

// Discord webhooks accept file attachments up to 10 MB on non-boosted servers.
// Leave headroom for the multipart envelope.
const MAX_ATTACH_BYTES = 9.5 * 1024 * 1024;

export const discord: PlatformAdapter = {
  id: "discord",

  async publish(input: PublishInput): Promise<PublishResult> {
    const webhookUrl = input.config.webhookUrl;
    if (typeof webhookUrl !== "string" || !webhookUrl.startsWith("https://")) {
      return {
        ok: false,
        error: "No Discord webhook URL set. Add one in Settings.",
      };
    }

    try {
      let res: Response;

      if (input.videoSize <= MAX_ATTACH_BYTES) {
        const video = await readUpload(input.videoPath);
        const blob = new Blob([new Uint8Array(video)], { type: "video/mp4" });

        const form = new FormData();
        form.append(
          "payload_json",
          JSON.stringify({ content: input.caption })
        );
        form.append("files[0]", blob, fileNameFromPath(input.videoPath));

        res = await fetch(`${webhookUrl}?wait=true`, {
          method: "POST",
          body: form,
        });
      } else {
        // Too big to attach — post the caption with a long-lived signed link.
        res = await fetch(`${webhookUrl}?wait=true`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: `${input.caption}\n\n🎬 ${input.shareUrl}`,
          }),
        });
      }

      if (!res.ok) {
        const body = await res.text();
        return { ok: false, error: `Discord said ${res.status}: ${body.slice(0, 200)}` };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  },
};

function fileNameFromPath(path: string): string {
  const base = path.split("/").pop() ?? "video.mp4";
  return base.includes(".") ? base : `${base}.mp4`;
}
