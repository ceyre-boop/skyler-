import postgres from "postgres";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = postgres(process.env.NEON_DATABASE_URL!, { ssl: "require" });
const migration = readFileSync(
  join(__dirname, "../supabase/migrations/0001_neon.sql"),
  "utf8"
);

await sql.unsafe(migration);
console.log("Migration applied successfully");
await sql.end();
