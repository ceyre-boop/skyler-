import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  exchangeMetaCode,
  getFBPages,
  getIGBusinessAccountId,
  getLongLivedToken,
  getMetaUserId,
  type MetaTokens,
} from "@/lib/meta";

export async function GET(request: Request) {
  const fail = (msg: string) =>
    NextResponse.redirect(
      new URL(`/settings?meta_error=${encodeURIComponent(msg)}`, request.url)
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
    const expectedState = cookieStore.get("meta_oauth_state")?.value;
    cookieStore.delete("meta_oauth_state");

    if (!code) return fail(url.searchParams.get("error_description") ?? "No code returned");
    if (!state || state !== expectedState) return fail("State mismatch — try again");

    const redirectUri = new URL("/api/meta/callback", request.url).toString();
    const shortToken = await exchangeMetaCode(code, redirectUri);
    const { access_token: longLivedToken, expires_in } = await getLongLivedToken(shortToken);
    const fbUserId = await getMetaUserId(longLivedToken);
    const igUserId = await getIGBusinessAccountId(longLivedToken, fbUserId);
    const fbPages = await getFBPages(longLivedToken);
    const baseTokens: MetaTokens = {
      access_token: longLivedToken,
      fb_user_id: fbUserId,
      expires_at: Date.now() + expires_in * 1000,
    };

    if (igUserId) {
      const igTokens: MetaTokens = { ...baseTokens, ig_user_id: igUserId };
      const [instagram] = await db`select config from platforms where id = ${"instagram"}`;
      const currentConfig = (instagram?.config as Record<string, unknown>) ?? {};
      const mergedConfig = { ...currentConfig, meta_tokens: igTokens };
      await db`update platforms set kind = ${"api"}, config = ${mergedConfig as never} where id = ${"instagram"}`;
    }

    if (fbPages.length > 0) {
      const page = fbPages[0];
      const fbTokens: MetaTokens = {
        ...baseTokens,
        fb_page_id: page.id,
        fb_page_name: page.name,
        fb_page_token: page.access_token,
      };
      const [facebook] = await db`select config from platforms where id = ${"facebook"}`;
      const currentConfig = (facebook?.config as Record<string, unknown>) ?? {};
      const mergedConfig = { ...currentConfig, meta_tokens: fbTokens };
      await db`update platforms set kind = ${"api"}, config = ${mergedConfig as never} where id = ${"facebook"}`;
    }

    if (!igUserId && fbPages.length === 0) {
      return fail("No Instagram business account or Facebook Page found on this account");
    }

    return NextResponse.redirect(new URL("/settings", request.url));
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }
}
