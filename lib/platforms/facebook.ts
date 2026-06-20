import type { MetaTokens } from "@/lib/meta";
import { readUpload } from "@/lib/storage";
import type { PlatformAdapter, PublishInput, PublishResult } from "./types";

const GRAPH = "https://graph.facebook.com/v20.0";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasApiError(value: unknown): boolean {
  return isObject(value) && Boolean(value.error);
}

export const facebook: PlatformAdapter = {
  id: "facebook",

  async publish(input: PublishInput): Promise<PublishResult> {
    const tokens = input.config.meta_tokens as MetaTokens | undefined;
    if (!tokens?.fb_page_id || !tokens?.fb_page_token) {
      return { ok: false, error: "Facebook Page not connected — tap Connect Meta in Settings." };
    }

    try {
      const video = await readUpload(input.videoPath);
      const form = new FormData();
      form.append("source", new Blob([new Uint8Array(video)], { type: "video/mp4" }), "video.mp4");
      form.append("description", input.caption.slice(0, 63206));
      form.append("access_token", tokens.fb_page_token);

      const res = await fetch(`${GRAPH}/${tokens.fb_page_id}/videos`, {
        method: "POST",
        body: form,
      });
      const data = await res.json() as unknown;
      if (!res.ok || hasApiError(data) || !isObject(data) || typeof data.id !== "string") {
        return { ok: false, error: `Facebook video publish failed: ${JSON.stringify(data).slice(0, 300)}` };
      }

      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  },
};
