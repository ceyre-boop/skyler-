import { getIronSession, type IronSession } from "iron-session";
import { cookies } from "next/headers";
import { db } from "./db";
import { sessionOptions, type SessionData } from "./session";
import crypto from "crypto";

export type { SessionData } from "./session";

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function getUser(): Promise<SessionData | null> {
  const session = await getSession();
  if (!session.userId) return null;
  return { userId: session.userId, email: session.email };
}

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + process.env.SESSION_SECRET).digest("hex");
}

export async function signIn(
  email: string,
  password: string
): Promise<{ ok: true; user: SessionData } | { ok: false; error: string }> {
  const hash = hashPassword(password);
  const rows = await db`
    select id, email from users
    where email = ${email.toLowerCase()} and password_hash = ${hash}
    limit 1
  `;
  if (!rows.length) return { ok: false, error: "Invalid email or password" };
  const user = { userId: rows[0].id as string, email: rows[0].email as string };
  const session = await getSession();
  session.userId = user.userId;
  session.email = user.email;
  await session.save();
  return { ok: true, user };
}

export async function signOut() {
  const session = await getSession();
  session.destroy();
}

// Seed helper — call once via scripts/seed-users.ts
export function hashPw(password: string, secret: string): string {
  return crypto.createHash("sha256").update(password + secret).digest("hex");
}
