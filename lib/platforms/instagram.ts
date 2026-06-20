import type { MetaTokens } from "@/lib/meta";
import { refreshIGToken } from "@/lib/meta";
import { readUpload } from "@/lib/storage";
import type { PlatformAdapter, PublishInput, PublishResult } from "./types";

const GRAPH = "https://graph.facebook.com/v20.0";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringifyError(data: unknown): string {
  return JSON.stringify(data).slice(0, 300);
}

function hasApiError(value: unknown): boolean {
  return isObject(value) && Boolean(value.error);
}

export const instagram: PlatformAdapter = {
  id: "instagram",

  async publish(input: PublishInput): Promise<PublishResult> {
    const tokens = input.config.meta_tokens as MetaTokens | undefined;
    if (!tokens?.ig_user_id || !tokens?.access_token) {
      return { ok: false, error: "Instagram account not connected — tap Connect Meta in Settings." };
    }

    try {
      let accessToken = tokens.access_token;
      if (tokens.expires_at < Date.now() + 7 * 24 * 60 * 60 * 1000) {
        try {
          const refreshed = await refreshIGToken(tokens.access_token);
          const refreshedTokens: MetaTokens = {
            ...tokens,
            access_token: refreshed.access_token,
            expires_at: Date.now() + refreshed.expires_in * 1000,
          };
          (input.config as Record<string, unknown>).meta_tokens = refreshedTokens;
          accessToken = refreshedTokens.access_token;
        } catch {
          // A still-valid long-lived token may publish even if proactive refresh fails.
        }
      }

      const video = await readUpload(input.videoPath);

      const createRes = await fetch(`${GRAPH}/${tokens.ig_user_id}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media_type: "REELS",
          upload_type: "resumable",
          caption: input.caption.slice(0, 2200),
          share_to_feed: true,
          access_token: accessToken,
        }),
      });
      const container = await createRes.json() as unknown;
      if (
        !createRes.ok ||
        hasApiError(container) ||
        !isObject(container) ||
        typeof container.id !== "string" ||
        typeof container.uri !== "string"
      ) {
        return { ok: false, error: `Instagram container creation failed: ${stringifyError(container)}` };
      }

      const uploadRes = await fetch(container.uri, {
        method: "POST",
        headers: {
          Authorization: `OAuth ${accessToken}`,
          "Content-Type": "video/mp4",
          offset: "0",
          file_size: String(video.byteLength),
        },
        body: new Uint8Array(video),
      });
      if (!uploadRes.ok) {
        const uploadError = await uploadRes.text();
        return { ok: false, error: `Instagram upload failed (${uploadRes.status}): ${uploadError.slice(0, 300)}` };
      }

      for (let attempt = 0; attempt < 24; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        const statusParams = new URLSearchParams({
          fields: "status_code",
          access_token: accessToken,
        });
        const statusRes = await fetch(`${GRAPH}/${container.id}?${statusParams}`);
        const status = await statusRes.json() as unknown;
        if (!statusRes.ok || hasApiError(status) || !isObject(status)) {
          return { ok: false, error: `Instagram status check failed: ${stringifyError(status)}` };
        }
        const statusCode = status.status_code;
        if (statusCode === "FINISHED") break;
        if (statusCode === "ERROR" || statusCode === "PROCESSING_ERROR") {
          return { ok: false, error: "Instagram video processing failed." };
        }
        if (attempt === 23) {
          return { ok: true };
        }
      }

      const publishRes = await fetch(`${GRAPH}/${tokens.ig_user_id}/media_publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: container.id,
          access_token: accessToken,
        }),
      });
      const published = await publishRes.json() as unknown;
      if (!publishRes.ok || hasApiError(published) || !isObject(published) || typeof published.id !== "string") {
        return { ok: false, error: `Instagram publish failed: ${stringifyError(published)}` };
      }

      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  },
};
