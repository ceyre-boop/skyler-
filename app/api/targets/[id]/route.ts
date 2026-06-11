import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAdapter } from "@/lib/platforms";

// Actions on a single post target: mark a manual share done, or retry a
// failed auto-post.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { id } = await params;
  const { action } = (await request.json()) as { action: "mark_done" | "retry" };
  const db = createServiceClient();

  const { data: target } = await db
    .from("post_targets")
    .select("*, posts(*), platforms:platform_id(*)")
    .eq("id", id)
    .single();
  if (!target) {
    return NextResponse.json({ error: "Target not found" }, { status: 404 });
  }

  if (action === "mark_done") {
    await db
      .from("post_targets")
      .update({ status: "manual_done", posted_at: new Date().toISOString() })
      .eq("id", id);
    return NextResponse.json({ status: "manual_done" });
  }

  if (action === "retry") {
    const platform = target.platforms;
    const adapter = platform ? getAdapter(platform.id) : undefined;
    if (!platform || platform.kind === "manual" || !adapter) {
      return NextResponse.json({ error: "Not retryable" }, { status: 400 });
    }

    const videoPath = target.posts.video_path;
    const [{ data: signed }, { data: share }] = await Promise.all([
      db.storage.from("videos").createSignedUrl(videoPath, 60 * 10),
      db.storage.from("videos").createSignedUrl(videoPath, 60 * 60 * 24 * 7),
    ]);
    if (!signed || !share) {
      return NextResponse.json({ error: "Video missing from storage" }, { status: 500 });
    }

    // Size lookup for the attach-vs-link decision.
    const head = await fetch(signed.signedUrl, { method: "HEAD" });
    const videoSize = Number(head.headers.get("content-length") ?? 0);

    const config = { ...(platform.config as Record<string, unknown>) };
    const result = await adapter.publish({
      caption: target.caption,
      videoPath,
      signedUrl: signed.signedUrl,
      shareUrl: share.signedUrl,
      videoSize,
      config,
    });
    await db.from("platforms").update({ config }).eq("id", platform.id);

    const update = result.ok
      ? { status: "posted", posted_at: new Date().toISOString(), error: null }
      : { status: "failed", error: result.error };
    await db.from("post_targets").update(update).eq("id", id);
    return NextResponse.json({ status: update.status, error: result.ok ? null : result.error });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
