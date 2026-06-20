// Edge-safe shared iron-session config. NO node/next-server imports here so this
// module can be imported by middleware (Edge runtime) and server code alike.
import type { SessionOptions } from "iron-session";

export interface SessionData {
  userId: string;
  email: string;
}

// Resolved lazily (at request time, not module load) so a missing SESSION_SECRET
// fails a single request with a clear message instead of crashing the build/import.
export function getSessionOptions(): SessionOptions {
  const password = process.env.SESSION_SECRET;
  if (!password) {
    // Clear replacement for iron-session's cryptic "Bad usage. Missing password."
    throw new Error(
      "SESSION_SECRET is not set — add it to your environment (Netlify env vars in production, .env.local locally). Generate one with `openssl rand -hex 32`."
    );
  }
  return {
    password,
    cookieName: "fable_session",
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30,
    },
  };
}
