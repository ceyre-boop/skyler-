"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Sign up failed");
      setBusy(false);
      return;
    }
    // Account created and signed in — go connect your accounts.
    router.replace("/settings");
    router.refresh();
  }

  return (
    <div className="flex min-h-[80dvh] flex-col items-center justify-center gap-10">
      <div className="flex items-center gap-3">
        <Image src="/icon-192.png" alt="TABOOST" width={40} height={40} className="rounded-xl" />
      </div>

      <div className="text-center">
        <h1 className="text-5xl font-black tracking-tight text-white">Create account</h1>
        <p className="mt-2 text-sm text-ink-dim">Post one video everywhere. Connect your own accounts.</p>
      </div>

      <form onSubmit={signUp} className="flex w-full max-w-sm flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-xs font-bold uppercase tracking-wide text-ink-dim">
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
          <label htmlFor="password" className="text-xs font-bold uppercase tracking-wide text-ink-dim">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="at least 8 characters"
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
          {busy ? "Creating account…" : "Create Account"}
        </button>
      </form>

      <p className="text-sm text-ink-dim">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-accent">
          Sign in
        </Link>
      </p>
    </div>
  );
}
