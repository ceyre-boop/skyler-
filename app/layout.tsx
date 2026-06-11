import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "Fable",
  description: "One upload, every platform. Skyler's cross-posting studio.",
  appleWebApp: {
    capable: true,
    title: "Fable",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0a0f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="mx-auto flex min-h-dvh max-w-lg flex-col">
        <main className="flex-1 px-4 pb-28 pt-6">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
