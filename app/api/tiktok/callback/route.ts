import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { exchangeCode } from "@/lib/platforms/tiktok";

// TikTok OAuth callback: verify state, exchange the code, store tokens on the
// tiktok platform row, and flip it from manual to api.
export async function GET(request: Request) {
  const fail = (msg: string) =>
    NextResponse.redirect(
      new URL(`/settings?tiktok_error=${encodeURIComponent(msg)}`, request.url)
    );

  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const cookieStore = await cookies();
    const expectedState = cookieStore.get("tiktok_oauth_state")?.value;
    cookieStore.delete("tiktok_oauth_state");

    if (!code) return fail(url.searchParams.get("error_description") ?? "No code returned");
    if (!state || state !== expectedState) return fail("State mismatch — try again");

    const redirectUri = new URL("/api/tiktok/callback", request.url).toString();
    const tokens = await exchangeCode(code, redirectUri);

    const [row] = await db`
      select config from user_platforms
      where user_id = ${user.userId} and platform_id = ${"tiktok"}
    `;
    const currentConfig = (row?.config as Record<string, unknown>) ?? {};
    const mergedConfig = { ...currentConfig, tiktok_tokens: tokens };
    await db`
      insert into user_platforms (user_id, platform_id, kind, enabled, config)
      values (${user.userId}, ${"tiktok"}, ${"api"}, ${true}, ${mergedConfig as never})
      on conflict (user_id, platform_id)
      do update set kind = ${"api"}, config = ${mergedConfig as never}
    `;

    return NextResponse.redirect(new URL("/settings", request.url));
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }
}
