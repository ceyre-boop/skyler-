import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { getUser } from "@/lib/auth";
import { STORAGE_FOLDER, storageConfigured } from "@/lib/storage";

// Mints a short-lived signature so the browser can upload the video directly to
// Cloudinary (bypassing Netlify's ~6 MB function body limit). The API secret is
// only ever used here, server-side, to sign — it never reaches the client.
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  if (!storageConfigured()) {
    return NextResponse.json(
      { error: "Media storage is not configured for this deployment." },
      { status: 501 }
    );
  }

  const timestamp = Math.round(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder: STORAGE_FOLDER },
    process.env.CLOUDINARY_API_SECRET!
  );

  return NextResponse.json({
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    timestamp,
    folder: STORAGE_FOLDER,
    signature,
  });
}
