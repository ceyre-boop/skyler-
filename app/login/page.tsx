"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

function ShotsStudiosLogo() {
  const [errored, setErrored] = useState(false);
  if (errored) {
    return (
      <span className="text-xs font-bold uppercase tracking-widest text-ink">
        SHOTS STUDIOS
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/shots-studios-logo.png"
      alt="Shots Studios"
      className="h-8 w-auto object-contain"
      onError={() => setErrored(true)}
    />
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Sign in failed");
      setBusy(false);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-[80dvh] flex-col items-center justify-center gap-10">
      {/* Co-branding */}
      <div className="flex items-center gap-3">
        <Image
          src="/icon-192.png"
          alt="TABOOST"
          width={40}
          height={40}
          className="rounded-xl"
        />
        <span className="text-xl font-black text-accent">×</span>
        <ShotsStudiosLogo />
      </div>

      {/* Wordmark */}
      <div className="text-center">
        <h1 className="text-6xl font-black tracking-tight text-white">Fable</h1>
        <p className="mt-2 text-sm text-ink-dim">Professional cross-posting for creators.</p>
      </div>

      {/* Form */}
      <form onSubmit={signIn} className="flex w-full max-w-sm flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="email"
            className="text-xs font-bold uppercase tracking-wide text-ink-dim"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl border border-line bg-card px-4 py-3.5 text-base outline-none focus:border-accent"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="password"
            className="text-xs font-bold uppercase tracking-wide text-ink-dim"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-xl border border-line bg-card px-4 py-3.5 text-base outline-none focus:border-accent"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="mt-1 rounded-xl bg-accent py-4 text-base font-black text-white shadow-lg shadow-accent/20 active:bg-accent-dim disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign In"}
        </button>
      </form>

      {/* Footer */}
      <p className="text-xs text-ink-dim/50">Built for Shots Studios creators.</p>
    </div>
  );
}
