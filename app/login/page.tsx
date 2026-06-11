"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-8">
      <div className="text-center">
        <h1 className="text-5xl font-extrabold tracking-tight text-accent">Fable</h1>
        <p className="mt-2 text-ink-dim">One upload, every platform 🤘</p>
      </div>
      <form onSubmit={signIn} className="flex w-full max-w-sm flex-col gap-3">
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-2xl border border-line bg-card px-4 py-3.5 text-base outline-none focus:border-accent"
        />
        <input
          type="password"
          required
          autoComplete="current-password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-2xl border border-line bg-card px-4 py-3.5 text-base outline-none focus:border-accent"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="mt-2 rounded-2xl bg-accent py-3.5 text-base font-bold text-white active:bg-accent-dim disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
