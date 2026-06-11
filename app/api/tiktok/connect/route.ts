import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { buildAuthUrl, tiktokEnabled } from "@/lib/platforms/tiktok";

// Starts the TikTok OAuth flow. Dormant until TIKTOK_CLIENT_KEY/SECRET exist.
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (!tiktokEnabled()) {
    return NextResponse.json(
      { error: "TikTok API keys not configured" },
      { status: 400 }
    );
  }

  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set("tiktok_oauth_state", state, {
    httpOnly: true,
    secure: true,
    maxAge: 600,
    path: "/",
  });

  const redirectUri = new URL("/api/tiktok/callback", request.url).toString();
  return NextResponse.redirect(buildAuthUrl(redirectUri, state));
}
