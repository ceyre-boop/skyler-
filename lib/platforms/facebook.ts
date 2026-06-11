import type { PlatformAdapter, PublishResult } from "./types";

// P3: Facebook Reels/Pages API requires a Page (not a personal profile) and
// Meta app review. Until then this platform is `manual` in the DB and this
// adapter is never selected.
export const facebook: PlatformAdapter = {
  id: "facebook",

  async publish(): Promise<PublishResult> {
    return {
      ok: false,
      error:
        "Facebook auto-posting is pending Meta app review — use the Share button for now.",
    };
  },
};
