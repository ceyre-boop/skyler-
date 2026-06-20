import postgres from "postgres";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dir = join(__dirname, "../supabase/migrations");
const sql = postgres(process.env.NEON_DATABASE_URL!, { ssl: "require" });

// Apply every migration in filename order. Migrations are written to be
// idempotent (create ... if not exists / on conflict do nothing).
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

for (const file of files) {
  await sql.unsafe(readFileSync(join(dir, file), "utf8"));
  console.log(`Applied ${file}`);
}

console.log("All migrations applied successfully");
await sql.end();
