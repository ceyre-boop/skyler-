import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fileUrl, fileSize } from "@/lib/storage";
import { getAdapter } from "@/lib/platforms";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  const { action } = (await request.json()) as { action: "mark_done" | "retry" };

  const targets = await db`
    select pt.*, p.video_path, pl.kind, pl.config, pl.id as platform_id_col
    from post_targets pt
    join posts p on p.id = pt.post_id
    join platforms pl on pl.id = pt.platform_id
    where pt.id = ${id}
    limit 1
  `;
  if (!targets.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const target = targets[0];

  if (action === "mark_done") {
    await db`update post_targets set status = 'manual_done', posted_at = now() where id = ${id}`;
    return NextResponse.json({ status: "manual_done" });
  }

  if (action === "retry") {
    if (target.kind === "manual") return NextResponse.json({ error: "Not retryable" }, { status: 400 });
    const adapter = getAdapter(target.platform_id as string);
    if (!adapter) return NextResponse.json({ error: "No adapter" }, { status: 400 });

    const videoPath = target.video_path as string;
    const videoUrl = fileUrl(videoPath);
    const config = { ...(target.config as Record<string, unknown>) };

    const result = await adapter.publish({
      caption: target.caption as string,
      videoPath,
      signedUrl: videoUrl,
      shareUrl: videoUrl,
      videoSize: await fileSize(videoPath),
      config,
    });

    await db`
      update post_targets set
        status = ${result.ok ? "posted" : "failed"},
        posted_at = ${result.ok ? new Date().toISOString() : null},
        error = ${result.ok ? null : (result as { ok: false; error: string }).error}
      where id = ${id}
    `;
    return NextResponse.json({ status: result.ok ? "posted" : "failed" });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
