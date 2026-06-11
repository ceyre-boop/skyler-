import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAdapter } from "@/lib/platforms";

export async function POST(request: Request) {
  // Gate on the caller's session; do the work with the service client.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json();
  const { videoPath, videoSize, title, contentType, platformIds, captions } = body as {
    videoPath: string;
    videoSize: number;
    title: string;
    contentType: string;
    platformIds: string[];
    captions: Record<string, string>;
  };

  if (!videoPath || !title || !platformIds?.length) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const db = createServiceClient();

  const { data: post, error: postErr } = await db
    .from("posts")
    .insert({ title, content_type: contentType, video_path: videoPath })
    .select()
    .single();
  if (postErr) {
    return NextResponse.json({ error: postErr.message }, { status: 500 });
  }

  const { data: platforms } = await db
    .from("platforms")
    .select("*")
    .in("id", platformIds);

  const targets = platformIds.map((pid) => ({
    post_id: post.id,
    platform_id: pid,
    caption: captions[pid] ?? title,
  }));
  const { data: inserted, error: targetErr } = await db
    .from("post_targets")
    .insert(targets)
    .select();
  if (targetErr) {
    return NextResponse.json({ error: targetErr.message }, { status: 500 });
  }

  // Signed URLs: a short one for server-side downloads, a week-long one for
  // links embedded in messages (oversized Discord attachments).
  const [{ data: signed }, { data: share }] = await Promise.all([
    db.storage.from("videos").createSignedUrl(videoPath, 60 * 10),
    db.storage.from("videos").createSignedUrl(videoPath, 60 * 60 * 24 * 7),
  ]);

  // Fan out to every auto-capable platform now. Manual ones stay pending.
  await Promise.all(
    (inserted ?? []).map(async (target) => {
      const platform = platforms?.find((p) => p.id === target.platform_id);
      if (!platform || platform.kind === "manual") return;

      const adapter = getAdapter(platform.id);
      if (!adapter || !signed || !share) return;

      const config = { ...(platform.config as Record<string, unknown>) };
      const result = await adapter.publish({
        caption: target.caption,
        videoPath,
        signedUrl: signed.signedUrl,
        shareUrl: share.signedUrl,
        videoSize: videoSize ?? 0,
        config,
      });

      // Adapters may rotate tokens into config (TikTok refresh) — persist.
      await db.from("platforms").update({ config }).eq("id", platform.id);

      await db
        .from("post_targets")
        .update(
          result.ok
            ? { status: "posted", posted_at: new Date().toISOString(), error: null }
            : { status: "failed", error: result.error }
        )
        .eq("id", target.id);
    })
  );

  return NextResponse.json({ postId: post.id });
}
