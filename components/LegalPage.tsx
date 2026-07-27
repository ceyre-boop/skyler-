import Link from "next/link";

/**
 * Shared chrome for the public /terms and /privacy pages.
 *
 * These are the URLs pasted into the TikTok and Meta developer-app review
 * forms, so they must render for signed-out visitors — `middleware.ts` keeps
 * them outside the auth gate.
 */
export default function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <article className="flex flex-col gap-6 pb-8">
      <header className="flex flex-col gap-1.5 border-b border-line pb-6">
        <Link href="/login" className="text-xl font-black tracking-tight text-white">
          Fable
        </Link>
        <h1 className="text-3xl font-black tracking-tight text-white">{title}</h1>
        <p className="text-sm text-ink-dim">TABOOST-Post-Automation</p>
        <p className="text-xs text-ink-dim/70">Last updated: {updated}</p>
      </header>

      <div className="flex flex-col gap-6 text-sm leading-relaxed text-ink-dim [&_a]:font-bold [&_a]:text-accent [&_h2]:text-base [&_h2]:font-black [&_h2]:text-white [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-ink [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2">
        {children}
      </div>

      <footer className="flex gap-4 border-t border-line pt-6 text-sm">
        <Link href="/terms" className="font-bold text-accent">
          Terms of Service
        </Link>
        <Link href="/privacy" className="font-bold text-accent">
          Privacy Policy
        </Link>
      </footer>
    </article>
  );
}
