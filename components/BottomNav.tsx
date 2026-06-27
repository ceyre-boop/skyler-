"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Film, Settings } from "lucide-react";

const tabs = [
  { href: "/", label: "New Post", Icon: Plus },
  { href: "/posts", label: "Posts", Icon: Film },
  { href: "/settings", label: "Accounts", Icon: Settings },
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/login") || pathname.startsWith("/signup")) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-lg border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="grid grid-cols-3">
        {tabs.map(({ href, label, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1.5 py-3 transition-colors ${
                active ? "text-accent" : "text-ink-dim"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
