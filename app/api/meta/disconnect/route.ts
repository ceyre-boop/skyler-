import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { disconnectUserPlatform } from "@/lib/connections";

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

    await disconnectUserPlatform(user.userId, "instagram");
    await disconnectUserPlatform(user.userId, "facebook");

    return NextResponse.redirect(new URL("/settings", request.url));
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }
}
