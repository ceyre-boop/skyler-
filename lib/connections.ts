import { db } from "./db";

// A user_platforms row means "this account is connected." Rows are created on
// connect and deleted on disconnect — members start with none.

export async function connectUserPlatform(
  userId: string,
  platformId: string,
  kind: "api" | "webhook" | "manual",
  config: Record<string, unknown>
): Promise<void> {
  await db.begin(async (sql) => {
    await sql`
      insert into user_platforms (user_id, platform_id, kind, enabled, config)
      values (${userId}, ${platformId}, ${kind}, ${true}, ${config as never})
      on conflict (user_id, platform_id)
      do update set kind = ${kind}, enabled = ${true}, config = ${config as never}
    `;
    // Seed this platform's caption templates from the global defaults (once).
    await sql`
      insert into user_caption_templates (user_id, platform_id, content_type, template)
      select ${userId}, ct.platform_id, ct.content_type, ct.template
      from caption_templates ct
      where ct.platform_id = ${platformId}
      on conflict (user_id, platform_id, content_type) do nothing
    `;
  });
}

export async function disconnectUserPlatform(
  userId: string,
  platformId: string
): Promise<void> {
  await db`
    delete from user_platforms
    where user_id = ${userId} and platform_id = ${platformId}
  `;
}
