import type { PlatformAdapter } from "./types";
import { discord } from "./discord";
import { tiktok } from "./tiktok";
import { instagram } from "./instagram";
import { facebook } from "./facebook";

const adapters: Record<string, PlatformAdapter> = {
  discord,
  tiktok,
  instagram,
  facebook,
};

export function getAdapter(platformId: string): PlatformAdapter | undefined {
  return adapters[platformId];
}
