import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fileUrl, fileSize } from "@/lib/storage";
import { getAdapter } from "@/lib/platforms";

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { videoPath, title, contentType, platformIds, captions } = await request.json() as {
    videoPath: string;
    title: string;
    contentType: string;
    platformIds: string[];
    captions: Record<string, string>;
  };

  if (!videoPath || !title || !platformIds?.length) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const [post] = await db`
    insert into posts (title, content_type, video_path)
    values (${title}, ${contentType}, ${videoPath})
    returning *
  `;

  const targetRows = platformIds.map((pid) => ({
    post_id: post.id,
    platform_id: pid,
    caption: captions[pid] ?? title,
  }));

  const targets = await db`
    insert into post_targets ${db(targetRows, "post_id", "platform_id", "caption")}
    returning *
  `;

  const platforms = await db`select * from platforms where id = any(${platformIds})`;
  const videoUrl = fileUrl(videoPath);
  const size = fileSize(videoPath);

  await Promise.all(
    targets.map(async (target) => {
      const platform = platforms.find((p) => p.id === target.platform_id);
      if (!platform || platform.kind === "manual") return;

      const adapter = getAdapter(platform.id as string);
      if (!adapter) return;

      const config = { ...(platform.config as Record<string, unknown>) };
      const result = await adapter.publish({
        caption: target.caption as string,
        videoPath,
        signedUrl: videoUrl,
        shareUrl: videoUrl,
        videoSize: size,
        config,
      });

      if (
        (config as Record<string, unknown>).tiktok_tokens !== (platform.config as Record<string, unknown>).tiktok_tokens ||
        (config as Record<string, unknown>).meta_tokens !== (platform.config as Record<string, unknown>).meta_tokens
      ) {
        await db`update platforms set config = ${config as never} where id = ${platform.id}`;
      }

      await db`
        update post_targets set
          status = ${result.ok ? "posted" : "failed"},
          posted_at = ${result.ok ? new Date().toISOString() : null},
          error = ${result.ok ? null : (result as { ok: false; error: string }).error}
        where id = ${target.id}
      `;
    })
  );

  return NextResponse.json({ postId: post.id });
}
