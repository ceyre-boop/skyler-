/**
 * Usage: NEON_DATABASE_URL=... SESSION_SECRET=... bun run scripts/seed-users.ts
 * Creates or updates the two app users.
 */
import postgres from "postgres";
import crypto from "crypto";

const NEON_DATABASE_URL = process.env.NEON_DATABASE_URL!;
const SESSION_SECRET = process.env.SESSION_SECRET!;

if (!NEON_DATABASE_URL || !SESSION_SECRET) {
  console.error("NEON_DATABASE_URL and SESSION_SECRET are required");
  process.exit(1);
}

function hash(password: string) {
  return crypto.createHash("sha256").update(password + SESSION_SECRET).digest("hex");
}

const sql = postgres(NEON_DATABASE_URL, { ssl: "require" });

const users = [
  { email: process.env.COLIN_EMAIL!, password: process.env.COLIN_PASSWORD! },
  { email: process.env.SKYLER_EMAIL!, password: process.env.SKYLER_PASSWORD! },
];

for (const u of users) {
  if (!u.email || !u.password) {
    console.warn("Skipping user with missing email/password");
    continue;
  }
  await sql`
    insert into users (email, password_hash)
    values (${u.email.toLowerCase()}, ${hash(u.password)})
    on conflict (email) do update set password_hash = excluded.password_hash
  `;
  console.log(`✅ User ${u.email} ready`);
}

await sql.end();
