import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import NewPostForm from "@/components/NewPostForm";

export const dynamic = "force-dynamic";

export default async function NewPostPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const [platforms, templates] = await Promise.all([
    db`select * from platforms where enabled = true order by sort`,
    db`select * from caption_templates`,
  ]);

  return (
    <div>
      <h1 className="mb-1 text-3xl font-extrabold tracking-tight">
        New Post <span className="text-accent">✦</span>
      </h1>
      <p className="mb-6 text-sm text-ink-dim">One video, one tap, everywhere.</p>
      <NewPostForm platforms={platforms as never} templates={templates as never} />
    </div>
  );
}
