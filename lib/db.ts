import postgres from "postgres";

// Singleton connection pool shared across server-side calls.
const globalForPg = globalThis as unknown as { pg: postgres.Sql | undefined };

export const db =
  globalForPg.pg ??
  postgres(process.env.NEON_DATABASE_URL!, {
    ssl: "require",
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== "production") globalForPg.pg = db;
