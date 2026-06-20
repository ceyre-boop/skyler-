"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

export default function AppHeader() {
  const pathname = usePathname();
  if (pathname.startsWith("/login")) return null;

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-bg/95 px-4 backdrop-blur">
      <Link href="/" className="text-xl font-black tracking-tight text-white">
        Fable
      </Link>
      <Image
        src="/icon-192.png"
        alt="TABOOST"
        width={28}
        height={28}
        className="rounded-lg"
      />
    </header>
  );
}
