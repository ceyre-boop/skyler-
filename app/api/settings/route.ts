import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { type, platformId, enabled, config, templateId, template } = await request.json();

  if (type === "toggle") {
    await db`
      update user_platforms set enabled = ${enabled}
      where user_id = ${user.userId} and platform_id = ${platformId}
    `;
    return NextResponse.json({ ok: true });
  }
  if (type === "config") {
    await db`
      update user_platforms set config = ${config as never}
      where user_id = ${user.userId} and platform_id = ${platformId}
    `;
    return NextResponse.json({ ok: true });
  }
  if (type === "template") {
    await db`
      update user_caption_templates set template = ${template}
      where id = ${templateId} and user_id = ${user.userId}
    `;
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown type" }, { status: 400 });
}
