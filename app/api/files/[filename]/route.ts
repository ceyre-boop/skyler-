import { NextResponse } from "next/server";
import { readUpload } from "@/lib/storage";
import { getUser } from "@/lib/auth";
import { lookup } from "mime-types";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { filename } = await params;
  try {
    const data = await readUpload(decodeURIComponent(filename));
    const mime = lookup(filename) || "application/octet-stream";
    return new NextResponse(data.buffer as ArrayBuffer, {
      headers: {
        "Content-Type": mime,
        "Content-Length": String(data.byteLength),
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
