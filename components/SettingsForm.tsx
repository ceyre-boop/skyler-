"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CONTENT_TYPES } from "@/lib/captions";
import { CheckCircle2, AlertCircle, ChevronRight, ChevronDown } from "lucide-react";

interface Account {
  id: string;
  name: string;
  emoji: string;
  connect: "oauth-tiktok" | "oauth-meta" | "webhook";
  connected: boolean;
  identity: string | null;
  envReady: boolean;
}

interface Template {
  id: string;
  platform_id: string;
  content_type: string;
  template: string;
}

const CONNECT_URL: Record<string, string> = {
  "oauth-tiktok": "/api/tiktok/connect",
  "oauth-meta": "/api/meta/connect",
};
const DISCONNECT_URL: Record<string, string> = {
  tiktok: "/api/tiktok/disconnect",
  instagram: "/api/meta/disconnect",
  facebook: "/api/meta/disconnect",
};

export default function SettingsForm({
  accounts,
  templates: initialTemplates,
  discordWebhook,
}: {
  accounts: Account[];
  templates: Template[];
  discordWebhook: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [templates, setTemplates] = useState(initialTemplates);
  const [webhookUrl, setWebhookUrl] = useState(discordWebhook);
  const [openEditor, setOpenEditor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const error = searchParams.get("tiktok_error") ?? searchParams.get("meta_error");

  const connectedCount = accounts.filter((a) => a.connected).length;

  async function api(body: object) {
    setBusy(true);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    router.refresh();
  }

  async function saveTemplate(t: Template) {
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "template", templateId: t.id, template: t.template }),
    });
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div>
      <h1 className="mb-1 text-3xl font-black tracking-tight">Accounts</h1>
      <p className="mb-6 text-sm text-ink-dim">Connect the accounts you want to post to.</p>

      {error && (
        <div className="mb-6 flex items-start gap-2 rounded-2xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {connectedCount === 0 && (
        <div className="mb-6 rounded-2xl border border-accent/30 bg-accent/5 px-4 py-4 text-center">
          <p className="text-2xl">🔗</p>
          <p className="mt-1 font-bold">Connect your first account</p>
          <p className="mt-1 text-sm text-ink-dim">Pick a platform below to start posting.</p>
        </div>
      )}

      <section className="mb-8 flex flex-col gap-3">
        {accounts.map((a) => (
          <div key={a.id} className="rounded-2xl border border-line bg-card p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{a.emoji}</span>
              <div className="flex-1">
                <p className="font-bold">{a.name}</p>
                {a.connected ? (
                  <p className="flex items-center gap-1 text-xs font-bold text-green-300">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {a.identity ?? "Connected"}
                  </p>
                ) : (
                  <p className="text-xs text-ink-dim">Not connected</p>
                )}
              </div>
              {a.connected ? (
                a.connect === "webhook" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => api({ type: "disconnect", platformId: a.id })}
                    className="rounded-xl border border-line px-3 py-2 text-xs font-bold text-ink-dim active:bg-bg disabled:opacity-50"
                  >
                    Disconnect
                  </button>
                ) : (
                  <a
                    href={DISCONNECT_URL[a.id]}
                    className="rounded-xl border border-line px-3 py-2 text-xs font-bold text-ink-dim active:bg-bg"
                  >
                    Disconnect
                  </a>
                )
              ) : !a.envReady ? (
                <span className="text-xs text-ink-dim">Needs API keys</span>
              ) : a.connect === "webhook" ? null : (
                <a
                  href={CONNECT_URL[a.connect]}
                  className="rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white active:bg-accent-dim"
                >
                  Connect
                </a>
              )}
            </div>

            {/* Discord webhook input (its "connect" is pasting a URL) */}
            {a.id === "discord" && !a.connected && (
              <div className="mt-3 flex gap-2">
                <input
                  type="url"
                  placeholder="https://discord.com/api/webhooks/…"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="min-w-0 flex-1 rounded-xl border border-line bg-bg px-3 py-2.5 text-sm outline-none focus:border-accent"
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => api({ type: "connectDiscord", webhookUrl })}
                  className="rounded-xl bg-accent px-4 text-sm font-bold text-white active:bg-accent-dim disabled:opacity-50"
                >
                  Connect
                </button>
              </div>
            )}

            {(a.id === "instagram" || a.id === "facebook") && !a.connected && a.envReady && (
              <p className="mt-2 text-xs text-ink-dim">Connecting Meta links both Instagram and Facebook.</p>
            )}
          </div>
        ))}
      </section>

      {/* Caption templates — only for connected platforms */}
      {connectedCount > 0 && templates.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-dim">Caption templates</h2>
          <p className="mb-2 text-xs text-ink-dim">
            <code className="rounded bg-card px-1">{"{{title}}"}</code> becomes the post title.
          </p>
          <div className="flex flex-col gap-2">
            {accounts
              .filter((a) => a.connected && templates.some((t) => t.platform_id === a.id))
              .map((a) => (
                <div key={a.id} className="rounded-2xl border border-line bg-card">
                  <button
                    type="button"
                    onClick={() => setOpenEditor(openEditor === a.id ? null : a.id)}
                    className="flex w-full items-center gap-3 px-4 py-3.5"
                  >
                    <span className="text-xl">{a.emoji}</span>
                    <span className="flex-1 text-left font-bold">{a.name}</span>
                    {openEditor === a.id ? (
                      <ChevronDown className="h-4 w-4 text-ink-dim" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-ink-dim" />
                    )}
                  </button>
                  {openEditor === a.id && (
                    <div className="flex flex-col gap-3 border-t border-line p-4">
                      {CONTENT_TYPES.map((ct) => {
                        const t = templates.find((x) => x.platform_id === a.id && x.content_type === ct.id);
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
      )}

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
