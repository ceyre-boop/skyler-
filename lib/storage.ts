import { mkdir, writeFile, readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export async function saveUpload(
  filename: string,
  data: Buffer
): Promise<string> {
  if (!existsSync(UPLOAD_DIR)) await mkdir(UPLOAD_DIR, { recursive: true });
  const safeName = filename.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;
  await writeFile(path.join(UPLOAD_DIR, unique), data);
  return unique;
}

export async function readUpload(filename: string): Promise<Buffer> {
  const safeName = filename.replace(/\.\./g, "");
  return readFile(path.join(UPLOAD_DIR, safeName));
}

export function fileUrl(filename: string): string {
  return `/api/files/${encodeURIComponent(filename)}`;
}

export function fileSize(filename: string): number {
  try {
    return require("fs").statSync(path.join(UPLOAD_DIR, filename)).size;
  } catch {
    return 0;
  }
}
