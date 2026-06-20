"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CONTENT_TYPES } from "@/lib/captions";
import { ChevronRight, ChevronDown, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";

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
  meta,
}: {
  platforms: Platform[];
  templates: Template[];
  tiktok: { envReady: boolean; connected: boolean };
  meta: { envReady: boolean; igConnected: boolean; fbConnected: boolean; fbPageName: string | null };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [platforms, setPlatforms] = useState(initialPlatforms);
  const [templates, setTemplates] = useState(initialTemplates);
  const [webhookUrl, setWebhookUrl] = useState(
    (initialPlatforms.find((p) => p.id === "discord")?.config.webhookUrl as string) ?? ""
  );
  const [openEditor, setOpenEditor] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const tiktokError = searchParams.get("tiktok_error");
  const metaError = searchParams.get("meta_error");

  function flash(msg: string) {
    setSaved(msg);
    setTimeout(() => setSaved(null), 1500);
  }

  async function api(body: object) {
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function togglePlatform(p: Platform) {
    const enabled = !p.enabled;
    setPlatforms((prev) => prev.map((x) => (x.id === p.id ? { ...x, enabled } : x)));
    await api({ type: "toggle", platformId: p.id, enabled });
  }

  async function saveWebhook() {
    const discord = platforms.find((p) => p.id === "discord");
    if (!discord) return;
    const config = { ...discord.config, webhookUrl: webhookUrl.trim() };
    await api({ type: "config", platformId: "discord", config });
    setPlatforms((prev) => prev.map((x) => (x.id === "discord" ? { ...x, config } : x)));
    flash("Webhook saved");
  }

  async function saveTemplate(t: Template) {
    await api({ type: "template", templateId: t.id, template: t.template });
    flash("Caption saved");
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div>
      <h1 className="mb-6 text-3xl font-black tracking-tight">Settings</h1>

      {saved && (
        <p className="fixed left-1/2 top-4 z-30 -translate-x-1/2 rounded-full bg-green-500/90 px-4 py-2 text-sm font-bold text-white">
          {saved}
        </p>
      )}

      {(tiktokError || metaError) && (
        <div className="mb-6 flex items-start gap-2 rounded-2xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{tiktokError ?? metaError}</span>
        </div>
      )}

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-dim">Platforms</h2>
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
              <span className={`h-7 w-12 rounded-full p-1 transition-colors ${p.enabled ? "bg-accent" : "bg-line"}`}>
                <span className={`block h-5 w-5 rounded-full bg-white transition-transform ${p.enabled ? "translate-x-5" : ""}`} />
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-dim">Discord webhook</h2>
        <p className="mb-2 text-xs text-ink-dim">
          Server Settings → Integrations → Webhooks → copy the URL of the channel Fable should post to.
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

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-dim">TikTok auto-posting</h2>
        {!tiktok.envReady ? (
          <p className="rounded-2xl border border-line bg-card px-4 py-3 text-sm text-ink-dim">
            Add TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET to .env to enable TikTok auto-posting
          </p>
        ) : tiktok.connected ? (
          <div className="rounded-2xl border border-green-500/30 bg-green-500/5 px-4 py-3 text-sm">
            <div className="mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-400" />
              <span className="font-bold text-green-300">TikTok connected</span>
            </div>
            <p className="mb-3 text-ink-dim">Posts as private until developer app review.</p>
            <a href="/api/tiktok/disconnect" className="text-sm font-bold text-accent">
              Disconnect
            </a>
          </div>
        ) : (
          <a href="/api/tiktok/connect" className="block rounded-2xl bg-accent py-3.5 text-center text-sm font-bold text-white active:bg-accent-dim">
            🎵 Connect TikTok
          </a>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-dim">Connect Accounts</h2>
        <div className="rounded-2xl border border-line bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-bold">Meta (Instagram + Facebook)</h3>
          </div>
          {!meta.envReady ? (
            <p className="rounded-2xl border border-line bg-bg px-4 py-3 text-sm text-ink-dim">
              Add META_APP_ID and META_APP_SECRET to .env to enable Instagram + Facebook auto-posting. Create a free app at developers.facebook.com.
            </p>
          ) : (
            <div>
              <div className="mb-3 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-bg px-3 py-2">
                  <span className="text-sm font-bold">Instagram</span>
                  {meta.igConnected ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-green-300">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      connected
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-ink-dim">not connected</span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-bg px-3 py-2">
                  <span className="text-sm font-bold">Facebook</span>
                  {meta.fbConnected ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-green-300">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {meta.fbPageName ?? "connected"}
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-ink-dim">not connected — requires a Facebook Page</span>
                  )}
                </div>
              </div>
              {!meta.igConnected && !meta.fbConnected ? (
                <a href="/api/meta/connect" className="block rounded-2xl bg-accent py-3.5 text-center text-sm font-bold text-white active:bg-accent-dim">
                  Connect Meta
                </a>
              ) : (
                <div className="flex gap-2">
                  <a href="/api/meta/connect" className="flex-1 rounded-2xl bg-accent py-3.5 text-center text-sm font-bold text-white active:bg-accent-dim">
                    Reconnect
                  </a>
                  <a href="/api/meta/disconnect" className="flex-1 rounded-2xl border border-line py-3.5 text-center text-sm font-bold text-ink-dim active:bg-bg">
                    Disconnect
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-dim">Caption templates</h2>
        <p className="mb-2 text-xs text-ink-dim">
          <code className="rounded bg-card px-1">{"{{title}}"}</code> becomes the post title.
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
                {openEditor === p.id ? (
                  <ChevronDown className="h-4 w-4 text-ink-dim" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-ink-dim" />
                )}
              </button>
              {openEditor === p.id && (
                <div className="flex flex-col gap-3 border-t border-line p-4">
                  {CONTENT_TYPES.map((ct) => {
                    const t = templates.find((t) => t.platform_id === p.id && t.content_type === ct.id);
                    if (!t) return null;
                    return (
                      <div key={ct.id}>
                        <p className="mb-1 text-xs font-bold text-ink-dim">{ct.emoji} {ct.label}</p>
                        <textarea
                          value={t.template}
                          rows={3}
                          onChange={(e) =>
                            setTemplates((prev) =>
                              prev.map((x) => (x.id === t.id ? { ...x, template: e.target.value } : x))
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
