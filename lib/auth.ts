import { getIronSession, type IronSession } from "iron-session";
import { cookies } from "next/headers";
import { db } from "./db";
import { getSessionOptions, type SessionData } from "./session";
import crypto from "crypto";

export type { SessionData } from "./session";

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, getSessionOptions());
}

export async function getUser(): Promise<SessionData | null> {
  const session = await getSession();
  if (!session.userId) return null;
  return { userId: session.userId, email: session.email };
}

// --- Password hashing ---------------------------------------------------------
// New accounts use salted scrypt (format: scrypt$<saltHex>$<hashHex>). Legacy
// rows seeded with unsalted sha256 still verify via the fallback below.

function scryptHash(password: string): string {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

function verifyPassword(password: string, stored: string): boolean {
  if (stored.startsWith("scrypt$")) {
    const [, saltHex, hashHex] = stored.split("$");
    if (!saltHex || !hashHex) return false;
    const expected = Buffer.from(hashHex, "hex");
    const derived = crypto.scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
    return expected.length === derived.length && crypto.timingSafeEqual(expected, derived);
  }
  // Legacy sha256 (seeded users).
  const legacy = crypto
    .createHash("sha256")
    .update(password + process.env.SESSION_SECRET)
    .digest("hex");
  return stored.length === legacy.length && crypto.timingSafeEqual(Buffer.from(stored), Buffer.from(legacy));
}

type AuthResult =
  | { ok: true; user: SessionData }
  | { ok: false; error: string };

async function startSession(user: SessionData): Promise<void> {
  const session = await getSession();
  session.userId = user.userId;
  session.email = user.email;
  await session.save();
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const normalized = email.trim().toLowerCase();
  const rows = await db`
    select id, email, password_hash from users where email = ${normalized} limit 1
  `;
  if (!rows.length || !verifyPassword(password, rows[0].password_hash as string)) {
    return { ok: false, error: "Invalid email or password" };
  }
  const user = { userId: rows[0].id as string, email: rows[0].email as string };
  await startSession(user);
  return { ok: true, user };
}

export async function signUp(email: string, password: string): Promise<AuthResult> {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) return { ok: false, error: "Enter a valid email" };
  if (password.length < 8) return { ok: false, error: "Password must be at least 8 characters" };

  const existing = await db`select 1 from users where email = ${normalized} limit 1`;
  if (existing.length) return { ok: false, error: "An account with that email already exists" };

  let created: { id: string; email: string };
  try {
    created = await db.begin(async (sql) => {
      const [u] = await sql`
        insert into users (email, password_hash)
        values (${normalized}, ${scryptHash(password)})
        returning id, email
      `;
      // Seed this member's own platform connections + caption templates from the
      // global defaults. config starts empty — they connect their own accounts.
      await sql`
        insert into user_platforms (user_id, platform_id, kind, enabled, config)
        select ${u.id}, p.id, p.kind, p.enabled, '{}'::jsonb from platforms p
        on conflict (user_id, platform_id) do nothing
      `;
      await sql`
        insert into user_caption_templates (user_id, platform_id, content_type, template)
        select ${u.id}, ct.platform_id, ct.content_type, ct.template from caption_templates ct
        on conflict (user_id, platform_id, content_type) do nothing
      `;
      return { id: u.id as string, email: u.email as string };
    });
  } catch {
    return { ok: false, error: "Could not create account — please try again" };
  }

  const user = { userId: created.id, email: created.email };
  await startSession(user);
  return { ok: true, user };
}

export async function signOut() {
  const session = await getSession();
  session.destroy();
}
