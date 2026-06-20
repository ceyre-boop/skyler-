import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";

async function disconnectPlatform(userId: string, platformId: string) {
  const [row] = await db`
    select config from user_platforms
    where user_id = ${userId} and platform_id = ${platformId}
  `;
  const current = (row?.config as Record<string, unknown>) ?? {};
  const rest = { ...current };
  delete rest.meta_tokens;
  await db`
    update user_platforms set kind = ${"manual"}, config = ${rest as never}
    where user_id = ${userId} and platform_id = ${platformId}
  `;
}

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

    await disconnectPlatform(user.userId, "instagram");
    await disconnectPlatform(user.userId, "facebook");

    return NextResponse.redirect(new URL("/settings", request.url));
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }
}
