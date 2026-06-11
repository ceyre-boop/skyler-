"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "New Post", icon: "✨" },
  { href: "/posts", label: "Posts", icon: "📼" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export default function BottomNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/login")) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-lg border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="grid grid-cols-3">
        {tabs.map((tab) => {
          const active =
            tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-1 py-3 text-xs font-semibold ${
                active ? "text-accent" : "text-ink-dim"
              }`}
            >
              <span className="text-xl leading-none">{tab.icon}</span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
