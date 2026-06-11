import type { PlatformAdapter, PublishResult } from "./types";

// P3: Instagram Graph API (Reels/Stories) requires a Creator/Business account
// linked to a Facebook Page plus Meta app review. Until then this platform is
// `manual` in the DB and this adapter is never selected.
export const instagram: PlatformAdapter = {
  id: "instagram",

  async publish(): Promise<PublishResult> {
    return {
      ok: false,
      error:
        "Instagram auto-posting is pending Meta app review — use the Share button for now.",
    };
  },
};
