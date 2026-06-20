import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { CONTENT_TYPES } from "@/lib/captions";
import { fileUrl } from "@/lib/storage";
import TargetCard from "@/components/TargetCard";

export const dynamic = "force-dynamic";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getUser();
  if (!user) redirect("/login");

  const { id } = await params;

  const posts = await db`
    select p.*,
      json_agg(
        json_build_object(
          'id', pt.id,
          'platform_id', pt.platform_id,
          'caption', pt.caption,
          'status', pt.status,
          'error', pt.error,
          'posted_at', pt.posted_at,
          'platform_name', pl.name,
          'platform_kind', pl.kind,
          'platform_sort', pl.sort
        ) order by pl.sort
      ) as targets
    from posts p
    left join post_targets pt on pt.post_id = p.id
    left join platforms pl on pl.id = pt.platform_id
    where p.id = ${id}
    group by p.id
  `;
  if (!posts.length) notFound();
  const post = posts[0];

  const videoUrl = fileUrl(post.video_path as string);
  const type = CONTENT_TYPES.find((t) => t.id === post.content_type);
  const targets = (post.targets as Array<{
    id: string;
    platform_id: string;
    platform_name: string;
    platform_kind: string;
    caption: string;
    status: string;
    error: string | null;
  }> | null) ?? [];

  return (
    <div>
      <Link href="/posts" className="text-sm font-semibold text-ink-dim">← All posts</Link>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight">{post.title as string}</h1>
      <p className="mb-6 mt-1 text-sm text-ink-dim">
        {type?.emoji} {type?.label} ·{" "}
        {new Date(post.created_at as string).toLocaleString(undefined, {
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
              platformName: target.platform_name ?? target.platform_id,
              kind: target.platform_kind as "api" | "webhook" | "manual",
              caption: target.caption,
              status: target.status as "pending" | "posted" | "manual_done" | "failed",
              error: target.error,
            }}
            videoUrl={videoUrl}
            videoTitle={post.title as string}
          />
        ))}
      </div>
    </div>
  );
}
