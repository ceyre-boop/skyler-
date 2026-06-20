import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { saveUpload, fileUrl } from "@/lib/storage";

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    const filename = await saveUpload(file.name, buffer);
    return NextResponse.json({ path: filename, url: fileUrl(filename), size: buffer.byteLength });
  } catch (err) {
    // Local-fs storage is unavailable on serverless hosts (Netlify has an
    // ephemeral, read-only filesystem). Fail clearly instead of a 500 crash
    // until object storage (R2 / Cloudinary / UploadThing) is wired into lib/storage.ts.
    console.error("Upload failed — media storage not configured:", err);
    return NextResponse.json(
      { error: "Media storage is not configured for this deployment." },
      { status: 501 }
    );
  }
}
