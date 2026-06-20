"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Clock, Share2, Copy, Check, RotateCcw } from "lucide-react";

const PLATFORM_EMOJI: Record<string, string> = {
  tiktok: "🎵",
  instagram: "📸",
  facebook: "👥",
  snapchat: "👻",
  discord: "🎮",
};

interface Target {
  id: string;
  platformId: string;
  platformName: string;
  kind: "api" | "webhook" | "manual";
  caption: string;
  status: "pending" | "posted" | "manual_done" | "failed";
  error: string | null;
}

export default function TargetCard({
  target,
  videoUrl,
  videoTitle,
}: {
  target: Target;
  videoUrl: string | null;
  videoTitle: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  const done = target.status === "posted" || target.status === "manual_done";

  const StatusIcon = done ? CheckCircle2 : target.status === "failed" ? XCircle : Clock;
  const statusColorClass = done
    ? "text-green-400"
    : target.status === "failed"
      ? "text-red-400"
      : "text-ink-dim";
  const statusLabel = done ? "Done" : target.status === "failed" ? "Failed" : "To do";

  async function copyCaption() {
    await navigator.clipboard.writeText(target.caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function shareVideo() {
    if (!videoUrl) return setShareError("Video link expired — reload the page.");
    setShareError(null);
    setBusy(true);
    try {
      await navigator.clipboard.writeText(target.caption).catch(() => {});

      const res = await fetch(videoUrl);
      const blob = await res.blob();
      const file = new File([blob], `${videoTitle.slice(0, 40) || "video"}.mp4`, {
        type: blob.type || "video/mp4",
      });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(a.href);
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        setShareError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setBusy(false);
    }
  }

  async function action(name: "mark_done" | "retry") {
    setBusy(true);
    try {
      await fetch(`/api/targets/${target.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: name }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`rounded-2xl border p-4 ${
        done
          ? "border-green-500/30 bg-green-500/5"
          : target.status === "failed"
            ? "border-red-500/40 bg-red-500/5"
            : "border-line bg-card"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-xl">{PLATFORM_EMOJI[target.platformId] ?? "🌐"}</span>
        <span className="flex-1 font-bold">{target.platformName}</span>
        <div className={`flex items-center gap-1.5 text-sm font-semibold ${statusColorClass}`}>
          <StatusIcon className="h-4 w-4" />
          <span>{statusLabel}</span>
        </div>
      </div>

      {target.error && (
        <p className="mt-2 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {target.error}
        </p>
      )}
      {shareError && (
        <p className="mt-2 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {shareError}
        </p>
      )}

      <p className="mt-2 line-clamp-3 whitespace-pre-line text-xs text-ink-dim">
        {target.caption}
      </p>

      {!done && (
        <div className="mt-3 flex flex-wrap gap-2">
          {target.kind === "manual" ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={shareVideo}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent py-2.5 text-sm font-bold text-white active:bg-accent-dim disabled:opacity-50"
              >
                <Share2 className="h-4 w-4" />
                {busy ? "Sharing…" : "Share video"}
              </button>
              <button
                type="button"
                onClick={copyCaption}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-line bg-bg py-2.5 text-sm font-bold active:bg-card-hover"
              >
                {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied!" : "Copy caption"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => action("mark_done")}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-green-500/40 py-2.5 text-sm font-bold text-green-400 active:bg-green-500/10 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                I posted it
              </button>
            </>
          ) : (
            target.status === "failed" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => action("retry")}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-2.5 text-sm font-bold text-white active:bg-accent-dim disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" />
                {busy ? "Retrying…" : "Retry"}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
