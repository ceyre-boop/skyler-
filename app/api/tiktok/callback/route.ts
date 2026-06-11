import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { exchangeCode } from "@/lib/platforms/tiktok";

// TikTok OAuth callback: verify state, exchange the code, store tokens on the
// tiktok platform row, and flip it from manual to api.
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("tiktok_oauth_state")?.value;
  cookieStore.delete("tiktok_oauth_state");

  const fail = (msg: string) =>
    NextResponse.redirect(
      new URL(`/settings?tiktok_error=${encodeURIComponent(msg)}`, request.url)
    );

  if (!code) return fail(url.searchParams.get("error_description") ?? "No code returned");
  if (!state || state !== expectedState) return fail("State mismatch — try again");

  try {
    const redirectUri = new URL("/api/tiktok/callback", request.url).toString();
    const tokens = await exchangeCode(code, redirectUri);

    const db = createServiceClient();
    const { data: platform } = await db
      .from("platforms")
      .select("config")
      .eq("id", "tiktok")
      .single();
    await db
      .from("platforms")
      .update({
        kind: "api",
        config: { ...(platform?.config ?? {}), tiktok_tokens: tokens },
      })
      .eq("id", "tiktok");

    return NextResponse.redirect(new URL("/settings", request.url));
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }
}
