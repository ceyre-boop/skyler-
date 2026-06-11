import { createClient } from "@/lib/supabase/server";
import NewPostForm from "@/components/NewPostForm";

export const dynamic = "force-dynamic";

export default async function NewPostPage() {
  const supabase = await createClient();

  const [{ data: platforms }, { data: templates }] = await Promise.all([
    supabase.from("platforms").select("*").eq("enabled", true).order("sort"),
    supabase.from("caption_templates").select("*"),
  ]);

  return (
    <div>
      <h1 className="mb-1 text-3xl font-extrabold tracking-tight">
        New Post <span className="text-accent">✦</span>
      </h1>
      <p className="mb-6 text-sm text-ink-dim">
        One video, one tap, everywhere.
      </p>
      <NewPostForm platforms={platforms ?? []} templates={templates ?? []} />
    </div>
  );
}
