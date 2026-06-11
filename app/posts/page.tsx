import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CONTENT_TYPES } from "@/lib/captions";

export const dynamic = "force-dynamic";

const STATUS_EMOJI: Record<string, string> = {
  pending: "⏳",
  posted: "✅",
  manual_done: "✅",
  failed: "❌",
};

const PLATFORM_EMOJI: Record<string, string> = {
  tiktok: "🎵",
  instagram: "📸",
  facebook: "👥",
  snapchat: "👻",
  discord: "🎮",
};

export default async function PostsPage() {
  const supabase = await createClient();
  const { data: posts } = await supabase
    .from("posts")
    .select("*, post_targets(*)")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <h1 className="mb-6 text-3xl font-extrabold tracking-tight">
        Posts <span className="text-accent">✦</span>
      </h1>

      {!posts?.length && (
        <div className="rounded-3xl border border-line bg-card p-8 text-center text-ink-dim">
          <p className="text-3xl">🪩</p>
          <p className="mt-2 font-semibold">Nothing yet!</p>
          <p className="mt-1 text-sm">Your published posts will show up here.</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {posts?.map((post) => {
          const type = CONTENT_TYPES.find((t) => t.id === post.content_type);
          const open = post.post_targets.filter(
            (t: { status: string }) => t.status === "pending" || t.status === "failed"
          ).length;
          return (
            <Link
              key={post.id}
              href={`/posts/${post.id}`}
              className="rounded-2xl border border-line bg-card p-4 active:bg-card-hover"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-bold">{post.title}</p>
                <span className="shrink-0 text-xs text-ink-dim">
                  {type?.emoji} {type?.label}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex gap-1.5">
                  {post.post_targets.map(
                    (t: { id: string; platform_id: string; status: string }) => (
                      <span
                        key={t.id}
                        className="flex items-center gap-0.5 rounded-full bg-bg px-2 py-1 text-xs"
                      >
                        {PLATFORM_EMOJI[t.platform_id] ?? "🌐"}
                        {STATUS_EMOJI[t.status]}
                      </span>
                    )
                  )}
                </div>
                {open > 0 && (
                  <span className="text-xs font-bold text-accent">
                    {open} to finish →
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs text-ink-dim">
                {new Date(post.created_at).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
