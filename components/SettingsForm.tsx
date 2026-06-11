"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CONTENT_TYPES } from "@/lib/captions";

const PLATFORM_EMOJI: Record<string, string> = {
  tiktok: "🎵",
  instagram: "📸",
  facebook: "👥",
  snapchat: "👻",
  discord: "🎮",
};

interface Platform {
  id: string;
  name: string;
  kind: string;
  enabled: boolean;
  sort: number;
  config: Record<string, unknown>;
}

interface Template {
  id: string;
  platform_id: string;
  content_type: string;
  template: string;
}

export default function SettingsForm({
  platforms: initialPlatforms,
  templates: initialTemplates,
  tiktok,
}: {
  platforms: Platform[];
  templates: Template[];
  tiktok: { envReady: boolean; connected: boolean };
}) {
  const router = useRouter();
  const supabase = createClient();

  const [platforms, setPlatforms] = useState(initialPlatforms);
  const [templates, setTemplates] = useState(initialTemplates);
  const [webhookUrl, setWebhookUrl] = useState(
    (initialPlatforms.find((p) => p.id === "discord")?.config.webhookUrl as string) ?? ""
  );
  const [openEditor, setOpenEditor] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  function flash(msg: string) {
    setSaved(msg);
    setTimeout(() => setSaved(null), 1500);
  }

  async function togglePlatform(p: Platform) {
    const enabled = !p.enabled;
    setPlatforms((prev) =>
      prev.map((x) => (x.id === p.id ? { ...x, enabled } : x))
    );
    await supabase.from("platforms").update({ enabled }).eq("id", p.id);
  }

  async function saveWebhook() {
    const discord = platforms.find((p) => p.id === "discord");
    if (!discord) return;
    const config = { ...discord.config, webhookUrl: webhookUrl.trim() };
    await supabase.from("platforms").update({ config }).eq("id", "discord");
    setPlatforms((prev) =>
      prev.map((x) => (x.id === "discord" ? { ...x, config } : x))
    );
    flash("Webhook saved ✅");
  }

  async function saveTemplate(t: Template) {
    await supabase
      .from("caption_templates")
      .update({ template: t.template })
      .eq("id", t.id);
    flash("Caption saved ✅");
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div>
      <h1 className="mb-6 text-3xl font-extrabold tracking-tight">
        Settings <span className="text-accent">✦</span>
      </h1>

      {saved && (
        <p className="fixed left-1/2 top-4 z-30 -translate-x-1/2 rounded-full bg-green-500/90 px-4 py-2 text-sm font-bold text-white">
          {saved}
        </p>
      )}

      {/* Platform toggles */}
      <section className="mb-8">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-dim">
          Platforms
        </h2>
        <div className="overflow-hidden rounded-2xl border border-line">
          {platforms.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => togglePlatform(p)}
              className="flex w-full items-center gap-3 border-b border-line bg-card px-4 py-3.5 last:border-b-0"
            >
              <span className="text-xl">{PLATFORM_EMOJI[p.id] ?? "🌐"}</span>
              <span className="flex-1 text-left font-bold">{p.name}</span>
              <span
                className={`h-7 w-12 rounded-full p-1 transition-colors ${
                  p.enabled ? "bg-accent" : "bg-line"
                }`}
              >
                <span
                  className={`block h-5 w-5 rounded-full bg-white transition-transform ${
                    p.enabled ? "translate-x-5" : ""
                  }`}
                />
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Discord webhook */}
      <section className="mb-8">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-dim">
          Discord webhook
        </h2>
        <p className="mb-2 text-xs text-ink-dim">
          Server Settings → Integrations → Webhooks → copy the URL of the channel
          Fable should post to.
        </p>
        <div className="flex gap-2">
          <input
            type="url"
            placeholder="https://discord.com/api/webhooks/…"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            className="min-w-0 flex-1 rounded-2xl border border-line bg-card px-4 py-3 text-sm outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={saveWebhook}
            className="rounded-2xl bg-accent px-4 text-sm font-bold text-white active:bg-accent-dim"
          >
            Save
          </button>
        </div>
      </section>

      {/* TikTok connection */}
      <section className="mb-8">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-dim">
          TikTok auto-posting
        </h2>
        {tiktok.connected ? (
          <p className="rounded-2xl border border-green-500/30 bg-green-500/5 px-4 py-3 text-sm">
            ✅ TikTok connected — videos auto-post (private until the app passes
            TikTok review).
          </p>
        ) : tiktok.envReady ? (
          <a
            href="/api/tiktok/connect"
            className="block rounded-2xl bg-accent py-3.5 text-center text-sm font-bold text-white active:bg-accent-dim"
          >
            🎵 Connect TikTok
          </a>
        ) : (
          <p className="rounded-2xl border border-line bg-card px-4 py-3 text-sm text-ink-dim">
            Waiting on TikTok developer app approval — for now TikTok uses the
            Share button, which is still 2 taps.
          </p>
        )}
      </section>

      {/* Caption templates */}
      <section className="mb-8">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-dim">
          Caption templates
        </h2>
        <p className="mb-2 text-xs text-ink-dim">
          <code className="rounded bg-card px-1">{"{{title}}"}</code> becomes the
          post title.
        </p>
        <div className="flex flex-col gap-2">
          {platforms.map((p) => (
            <div key={p.id} className="rounded-2xl border border-line bg-card">
              <button
                type="button"
                onClick={() => setOpenEditor(openEditor === p.id ? null : p.id)}
                className="flex w-full items-center gap-3 px-4 py-3.5"
              >
                <span className="text-xl">{PLATFORM_EMOJI[p.id] ?? "🌐"}</span>
                <span className="flex-1 text-left font-bold">{p.name}</span>
                <span className="text-ink-dim">{openEditor === p.id ? "▾" : "▸"}</span>
              </button>
              {openEditor === p.id && (
                <div className="flex flex-col gap-3 border-t border-line p-4">
                  {CONTENT_TYPES.map((ct) => {
                    const t = templates.find(
                      (t) => t.platform_id === p.id && t.content_type === ct.id
                    );
                    if (!t) return null;
                    return (
                      <div key={ct.id}>
                        <p className="mb-1 text-xs font-bold text-ink-dim">
                          {ct.emoji} {ct.label}
                        </p>
                        <textarea
                          value={t.template}
                          rows={3}
                          onChange={(e) =>
                            setTemplates((prev) =>
                              prev.map((x) =>
                                x.id === t.id ? { ...x, template: e.target.value } : x
                              )
                            )
                          }
                          onBlur={() => {
                            const current = templates.find((x) => x.id === t.id);
                            if (current) saveTemplate(current);
                          }}
                          className="w-full rounded-xl border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <button
        type="button"
        onClick={signOut}
        className="w-full rounded-2xl border border-line py-3.5 text-sm font-bold text-ink-dim active:bg-card"
      >
        Sign out
      </button>
    </div>
  );
}
