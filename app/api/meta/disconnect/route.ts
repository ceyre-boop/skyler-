import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";

async function disconnectPlatform(platformId: string) {
  const [platform] = await db`select config from platforms where id = ${platformId}`;
  const current = (platform?.config as Record<string, unknown>) ?? {};
  const rest = { ...current };
  delete rest.meta_tokens;
  await db`update platforms set kind = ${"manual"}, config = ${rest as never} where id = ${platformId}`;
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

    await disconnectPlatform("instagram");
    await disconnectPlatform("facebook");

    return NextResponse.redirect(new URL("/settings", request.url));
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }
}
