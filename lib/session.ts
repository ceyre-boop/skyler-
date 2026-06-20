// Edge-safe shared iron-session config. NO node/next-server imports here so this
// module can be imported by middleware (Edge runtime) and server code alike.
import type { SessionOptions } from "iron-session";

export interface SessionData {
  userId: string;
  email: string;
}

const password = process.env.SESSION_SECRET;
if (!password) {
  // Fail loud and clear instead of iron-session's cryptic
  // "Bad usage. Missing password." Set SESSION_SECRET (>=32 chars) in the
  // environment (.env.local locally, Netlify env vars in production).
  throw new Error(
    "SESSION_SECRET is not set — generate one with `openssl rand -hex 32` and add it to the environment."
  );
}

export const sessionOptions: SessionOptions = {
  password,
  cookieName: "fable_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
  },
};
