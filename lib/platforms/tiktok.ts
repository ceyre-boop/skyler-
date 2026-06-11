import type { PlatformAdapter, PublishInput, PublishResult } from "./types";

/**
 * TikTok Content Posting API adapter — code-complete but dormant until
 * TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET are set AND the account is
 * connected in Settings.
 *
 * IMPORTANT: until the TikTok developer app passes audit, posts can only be
 * created as SELF_ONLY (private). After audit approval, flip privacy_level
 * below (or surface it in Settings).
 */

const AUTH_BASE = "https://www.tiktok.com/v2/auth/authorize/";
const API_BASE = "https://open.tiktokapis.com/v2";
const SCOPES = "user.info.basic,video.publish";

// Chunking rules: single chunk allowed up to 64 MB; larger files use 10 MB
// chunks with the remainder folded into the final chunk.
const SINGLE_CHUNK_MAX = 64 * 1024 * 1024;
const CHUNK_SIZE = 10 * 1024 * 1024;

export function tiktokEnabled(): boolean {
  return Boolean(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET);
}

export interface TikTokTokens {
  access_token: string;
  refresh_token: string;
  /** Unix ms when access_token expires. */
  expires_at: number;
  open_id: string;
}

export function buildAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY!,
    scope: SCOPES,
    response_type: "code",
    redirect_uri: redirectUri,
    state,
  });
  return `${AUTH_BASE}?${params}`;
}

export async function exchangeCode(
  code: string,
  redirectUri: string
): Promise<TikTokTokens> {
  const res = await fetch(`${API_BASE}/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`TikTok token exchange failed: ${JSON.stringify(data).slice(0, 300)}`);
  }
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
    open_id: data.open_id,
  };
}

export async function refreshTokens(refreshToken: string): Promise<TikTokTokens> {
  const res = await fetch(`${API_BASE}/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`TikTok token refresh failed: ${JSON.stringify(data).slice(0, 300)}`);
  }
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
    open_id: data.open_id,
  };
}

export const tiktok: PlatformAdapter = {
  id: "tiktok",

  async publish(input: PublishInput): Promise<PublishResult> {
    if (!tiktokEnabled()) {
      return { ok: false, error: "TikTok API keys not configured yet — share manually." };
    }
    const tokens = input.config.tiktok_tokens as TikTokTokens | undefined;
    if (!tokens?.refresh_token) {
      return { ok: false, error: "TikTok account not connected — connect it in Settings." };
    }

    try {
      // Refresh if the access token expires within 5 minutes. The caller is
      // responsible for persisting refreshed tokens (returned via config mutation).
      let access = tokens;
      if (tokens.expires_at < Date.now() + 5 * 60 * 1000) {
        access = await refreshTokens(tokens.refresh_token);
        (input.config as Record<string, unknown>).tiktok_tokens = access;
      }

      const videoRes = await fetch(input.signedUrl);
      if (!videoRes.ok) {
        return { ok: false, error: `Could not download video (${videoRes.status})` };
      }
      const video = new Uint8Array(await videoRes.arrayBuffer());
      const size = video.byteLength;

      const singleChunk = size <= SINGLE_CHUNK_MAX;
      const chunkSize = singleChunk ? size : CHUNK_SIZE;
      const totalChunks = singleChunk ? 1 : Math.floor(size / CHUNK_SIZE);

      // 1. Initialize a direct post.
      const initRes = await fetch(`${API_BASE}/post/publish/video/init/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access.access_token}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify({
          post_info: {
            title: input.caption.slice(0, 2200),
            // SELF_ONLY is the only level unaudited apps may use.
            privacy_level: "SELF_ONLY",
            disable_duet: false,
            disable_comment: false,
            disable_stitch: false,
          },
          source_info: {
            source: "FILE_UPLOAD",
            video_size: size,
            chunk_size: chunkSize,
            total_chunk_count: totalChunks,
          },
        }),
      });
      const init = await initRes.json();
      if (!initRes.ok || init.error?.code !== "ok") {
        return { ok: false, error: `TikTok init failed: ${JSON.stringify(init.error ?? init).slice(0, 300)}` };
      }
      const { publish_id, upload_url } = init.data;

      // 2. Upload chunks. The final chunk absorbs the remainder.
      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = i === totalChunks - 1 ? size : start + chunkSize;
        const chunk = video.slice(start, end);
        const putRes = await fetch(upload_url, {
          method: "PUT",
          headers: {
            "Content-Type": "video/mp4",
            "Content-Range": `bytes ${start}-${end - 1}/${size}`,
            "Content-Length": String(chunk.byteLength),
          },
          body: chunk,
        });
        if (!putRes.ok && putRes.status !== 206) {
          return { ok: false, error: `TikTok chunk ${i + 1}/${totalChunks} upload failed (${putRes.status})` };
        }
      }

      // 3. Poll publish status (up to ~60s).
      for (let attempt = 0; attempt < 12; attempt++) {
        await new Promise((r) => setTimeout(r, 5000));
        const statusRes = await fetch(`${API_BASE}/post/publish/status/fetch/`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${access.access_token}`,
            "Content-Type": "application/json; charset=UTF-8",
          },
          body: JSON.stringify({ publish_id }),
        });
        const status = await statusRes.json();
        const s = status.data?.status;
        if (s === "PUBLISH_COMPLETE") {
          return { ok: true };
        }
        if (s === "FAILED") {
          return { ok: false, error: `TikTok publish failed: ${status.data?.fail_reason ?? "unknown"}` };
        }
      }
      // Still processing — TikTok finishes async; treat as success-in-flight.
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  },
};
