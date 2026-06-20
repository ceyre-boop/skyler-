import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";

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

    const [platform] = await db`select config from platforms where id = ${"tiktok"}`;
    const current = (platform?.config as Record<string, unknown>) ?? {};
    const rest = { ...current };
    delete rest.tiktok_tokens;
    await db`update platforms set kind = ${"manual"}, config = ${rest as never} where id = ${"tiktok"}`;

    return NextResponse.redirect(new URL("/settings", request.url));
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }
}
