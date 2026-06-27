import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { connectUserPlatform, disconnectUserPlatform } from "@/lib/connections";

export async function PATCH(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { type, platformId, webhookUrl, templateId, template } = await request.json();

  if (type === "connectDiscord") {
    const url = String(webhookUrl ?? "").trim();
    if (!url.startsWith("https://discord.com/api/webhooks/")) {
      return NextResponse.json({ error: "Enter a valid Discord webhook URL" }, { status: 400 });
    }
    await connectUserPlatform(user.userId, "discord", "webhook", { webhookUrl: url });
    return NextResponse.json({ ok: true });
  }
  if (type === "disconnect") {
    await disconnectUserPlatform(user.userId, platformId);
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
