import { v2 as cloudinary } from "cloudinary";

// Cloudinary-backed media storage. Uploads happen client-side (browser → Cloudinary)
// via a signed request; this module handles delivery-URL resolution and server-side
// reads (the platform adapters download the bytes to forward to TikTok/Meta/Discord).
//
// `video_path` stores the full Cloudinary secure_url. fileUrl() also resolves a bare
// public_id for forward-compatibility.

export const STORAGE_FOLDER = "fable";

export function storageConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/** Resolve a stored video_path (full secure_url, or a bare public_id) to a public URL. */
export function fileUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return cloudinary.url(path, { resource_type: "video", secure: true });
}

/** Download the video bytes — adapters upload these to TikTok/Meta/Discord. */
export async function readUpload(path: string): Promise<Buffer> {
  const res = await fetch(fileUrl(path));
  if (!res.ok) throw new Error(`Failed to fetch video (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

/** Video size in bytes, read from the CDN via a HEAD request. */
export async function fileSize(path: string): Promise<number> {
  try {
    const res = await fetch(fileUrl(path), { method: "HEAD" });
    return Number(res.headers.get("content-length") ?? 0);
  } catch {
    return 0;
  }
}
