import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUser } from "@/lib/auth";
import { buildMetaAuthUrl, metaEnabled } from "@/lib/meta";

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
    if (!metaEnabled()) {
      return NextResponse.json(
        { error: "Meta API keys not configured" },
        { status: 400 }
      );
    }

    const state = crypto.randomUUID();
    const cookieStore = await cookies();
    cookieStore.set("meta_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 600,
      path: "/",
    });

    const redirectUri = new URL("/api/meta/callback", request.url).toString();
    return NextResponse.redirect(buildMetaAuthUrl(redirectUri, state));
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }
}
