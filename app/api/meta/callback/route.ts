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

    const connect = async (platformId: string, tokens: MetaTokens) => {
      const [row] = await db`
        select config from user_platforms
        where user_id = ${user.userId} and platform_id = ${platformId}
      `;
      const currentConfig = (row?.config as Record<string, unknown>) ?? {};
      const mergedConfig = { ...currentConfig, meta_tokens: tokens };
      await db`
        insert into user_platforms (user_id, platform_id, kind, enabled, config)
        values (${user.userId}, ${platformId}, ${"api"}, ${true}, ${mergedConfig as never})
        on conflict (user_id, platform_id)
        do update set kind = ${"api"}, config = ${mergedConfig as never}
      `;
    };

    if (igUserId) {
      await connect("instagram", { ...baseTokens, ig_user_id: igUserId });
    }

    if (fbPages.length > 0) {
      const page = fbPages[0];
      await connect("facebook", {
        ...baseTokens,
        fb_page_id: page.id,
        fb_page_name: page.name,
        fb_page_token: page.access_token,
      });
    }

    if (!igUserId && fbPages.length === 0) {
      return fail("No Instagram business account or Facebook Page found on this account");
    }

    return NextResponse.redirect(new URL("/settings", request.url));
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }
}
