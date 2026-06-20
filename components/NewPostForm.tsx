"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Film } from "lucide-react";
import { CONTENT_TYPES, renderCaption, type ContentType } from "@/lib/captions";

interface Platform {
  id: string;
  name: string;
  kind: "api" | "webhook" | "manual";
  enabled: boolean;
}

interface Template {
  platform_id: string;
  content_type: string;
  template: string;
}

const PLATFORM_EMOJI: Record<string, string> = {
  tiktok: "🎵",
  instagram: "📸",
  facebook: "👥",
  snapchat: "👻",
  discord: "🎮",
};

export default function NewPostForm({
  platforms,
  templates,
}: {
  platforms: Platform[];
  templates: Template[];
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [video, setVideo] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [contentType, setContentType] = useState<ContentType>("video");
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(platforms.map((p) => p.id))
  );
  // Caption overrides keyed by platform id; null/absent = follow the template.
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const captions = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of platforms) {
      const t = templates.find(
        (t) => t.platform_id === p.id && t.content_type === contentType
      );
      map[p.id] =
        overrides[`${p.id}:${contentType}`] ??
        renderCaption(t?.template ?? "{{title}}", title || "…");
    }
    return map;
  }, [platforms, templates, contentType, title, overrides]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function publish() {
    if (!video) return setError("Pick a video first 🎥");
    if (!title.trim()) return setError("Give it a title ✍️");
    if (selected.size === 0) return setError("Pick at least one platform");
    setError(null);

    try {
      setBusy("Uploading video…");
      // 1. Get a short-lived signature from our server (API secret stays server-side).
      const signRes = await fetch("/api/upload/sign");
      if (!signRes.ok) {
        const data = await signRes.json().catch(() => ({}));
        throw new Error(data.error ?? "Upload failed");
      }
      const { cloudName, apiKey, timestamp, folder, signature } = await signRes.json();

      // 2. Upload the file straight to Cloudinary (bypasses the serverless body limit).
      const cloudForm = new FormData();
      cloudForm.append("file", video);
      cloudForm.append("api_key", apiKey);
      cloudForm.append("timestamp", String(timestamp));
      cloudForm.append("folder", folder);
      cloudForm.append("signature", signature);
      const upRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
        { method: "POST", body: cloudForm }
      );
      if (!upRes.ok) {
        const data = await upRes.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? "Cloudinary upload failed");
      }
      const { secure_url: path } = await upRes.json();

      setBusy("Publishing…");
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoPath: path,
          title: title.trim(),
          contentType,
          platformIds: [...selected],
          captions: Object.fromEntries(
            [...selected].map((id) => [id, captions[id]])
          ),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Publish failed");
      router.push(`/posts/${data.postId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Video picker */}
      <input
        ref={fileInput}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => setVideo(e.target.files?.[0] ?? null)}
      />
      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        className={`flex h-40 flex-col items-center justify-center gap-2 rounded-3xl border-2 text-center transition-colors ${
          video ? "border-accent bg-accent/10" : "border-line bg-card"
        }`}
      >
        {video ? (
          <>
            <Film className="h-8 w-8 text-accent" />
            <span className="max-w-[80%] truncate px-2 font-semibold">{video.name}</span>
            <span className="text-xs text-ink-dim">
              {(video.size / 1024 / 1024).toFixed(1)} MB — tap to change
            </span>
          </>
        ) : (
          <>
            <Upload className="h-8 w-8 text-ink-dim" />
            <span className="font-semibold">Tap to pick your video</span>
            <span className="text-xs text-ink-dim">straight from your camera roll</span>
          </>
        )}
      </button>

      {/* Title */}
      <input
        type="text"
        placeholder="What's this one called?"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="rounded-2xl border border-line bg-card px-4 py-3.5 text-base outline-none focus:border-accent"
      />

      {/* Content type */}
      <div className="grid grid-cols-3 gap-2">
        {CONTENT_TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setContentType(t.id)}
            className={`rounded-2xl border py-3 text-sm font-black transition-colors ${
              contentType === t.id
                ? "border-accent bg-accent/15 text-accent"
                : "border-line bg-card text-ink-dim"
            }`}
          >
            <span className="mr-1.5">{t.emoji}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Platforms + captions */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-ink-dim">Where's it going?</p>
        {platforms.map((p) => {
          const on = selected.has(p.id);
          const isEditing = editing === p.id;
          return (
            <div
              key={p.id}
              className={`rounded-2xl border transition-colors ${
                on ? "border-accent bg-card" : "border-line bg-card/50 opacity-60"
              }`}
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <button
                  type="button"
                  onClick={() => toggle(p.id)}
                  className="flex flex-1 items-center gap-3 text-left"
                >
                  <span className="text-xl">{PLATFORM_EMOJI[p.id] ?? "🌐"}</span>
                  <span className="font-bold">{p.name}</span>
                  {p.kind !== "manual" && (
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase text-accent">
                      auto
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(isEditing ? null : p.id)}
                  className="text-xs font-semibold text-ink-dim"
                >
                  {isEditing ? "done" : "edit caption"}
                </button>
                <span className={`text-lg ${on ? "" : "grayscale"}`}>
                  {on ? "✅" : "⬜️"}
                </span>
              </div>
              {isEditing ? (
                <textarea
                  value={captions[p.id]}
                  rows={5}
                  onChange={(e) =>
                    setOverrides((prev) => ({
                      ...prev,
                      [`${p.id}:${contentType}`]: e.target.value,
                    }))
                  }
                  className="w-full border-t border-line bg-transparent px-4 py-3 text-sm outline-none"
                />
              ) : (
                on && (
                  <p className="line-clamp-2 whitespace-pre-line border-t border-line px-4 py-2.5 text-xs text-ink-dim">
                    {captions[p.id]}
                  </p>
                )
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="text-sm font-semibold text-red-400">{error}</p>}

      <button
        type="button"
        onClick={publish}
        disabled={busy !== null}
        className="rounded-2xl bg-accent py-4 text-lg font-extrabold text-white shadow-lg shadow-accent/25 active:bg-accent-dim disabled:opacity-60"
      >
        {busy ?? "Publish 🚀"}
      </button>
    </div>
  );
}
