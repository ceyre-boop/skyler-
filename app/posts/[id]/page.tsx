import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CONTENT_TYPES } from "@/lib/captions";
import TargetCard from "@/components/TargetCard";

export const dynamic = "force-dynamic";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: post } = await supabase
    .from("posts")
    .select("*, post_targets(*, platforms:platform_id(*))")
    .eq("id", id)
    .single();
  if (!post) notFound();

  // 1-hour signed URL so the Share button can hand the file to the share sheet.
  const { data: signed } = await supabase.storage
    .from("videos")
    .createSignedUrl(post.video_path, 60 * 60);

  const type = CONTENT_TYPES.find((t) => t.id === post.content_type);
  const targets = [...post.post_targets].sort(
    (a, b) => (a.platforms?.sort ?? 99) - (b.platforms?.sort ?? 99)
  );

  return (
    <div>
      <Link href="/posts" className="text-sm font-semibold text-ink-dim">
        ← All posts
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight">{post.title}</h1>
      <p className="mb-6 mt-1 text-sm text-ink-dim">
        {type?.emoji} {type?.label} ·{" "}
        {new Date(post.created_at).toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}
      </p>

      <div className="flex flex-col gap-3">
        {targets.map((target) => (
          <TargetCard
            key={target.id}
            target={{
              id: target.id,
              platformId: target.platform_id,
              platformName: target.platforms?.name ?? target.platform_id,
              kind: target.platforms?.kind ?? "manual",
              caption: target.caption,
              status: target.status,
              error: target.error,
            }}
            videoUrl={signed?.signedUrl ?? null}
            videoTitle={post.title}
          />
        ))}
      </div>
    </div>
  );
}
