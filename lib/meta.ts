const GRAPH = "https://graph.facebook.com/v20.0";
const INSTAGRAM_GRAPH = "https://graph.instagram.com";
const AUTH_BASE = "https://www.facebook.com/v20.0/dialog/oauth";
const SCOPES = "instagram_basic,instagram_content_publish,pages_manage_posts,pages_read_engagement,public_profile";
const DEFAULT_LONG_LIVED_EXPIRES_IN = 60 * 24 * 60 * 60;

export interface MetaTokens {
  access_token: string;
  fb_user_id: string;
  ig_user_id?: string;
  fb_page_id?: string;
  fb_page_name?: string;
  fb_page_token?: string;
  expires_at: number;
}

interface MetaError {
  error?: unknown;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function errorPayload(data: unknown): string {
  return JSON.stringify(data).slice(0, 300);
}

async function readMetaJson(res: Response, operation: string): Promise<Record<string, unknown>> {
  let data: unknown;
  try {
    data = await res.json() as unknown;
  } catch (err) {
    throw new Error(`Meta ${operation} failed: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!isObject(data)) {
    throw new Error(`Meta ${operation} failed: invalid response`);
  }
  if (!res.ok || (data as MetaError).error) {
    throw new Error(`Meta ${operation} failed: ${errorPayload(data)}`);
  }
  return data;
}

export function metaEnabled(): boolean {
  return Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET);
}

export function buildMetaAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    redirect_uri: redirectUri,
    state,
    response_type: "code",
    scope: SCOPES,
  });
  return `${AUTH_BASE}?${params}`;
}

export async function exchangeMetaCode(code: string, redirectUri: string): Promise<string> {
  const res = await fetch(`${GRAPH}/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.META_APP_ID!,
      client_secret: process.env.META_APP_SECRET!,
      code,
      redirect_uri: redirectUri,
    }),
  });
  const data = await readMetaJson(res, "token exchange");
  if (typeof data.access_token !== "string") {
    throw new Error(`Meta token exchange failed: ${errorPayload(data)}`);
  }
  return data.access_token;
}

export async function getLongLivedToken(
  shortToken: string
): Promise<{ access_token: string; expires_in: number }> {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    fb_exchange_token: shortToken,
  });
  const res = await fetch(`${GRAPH}/oauth/access_token?${params}`);
  const data = await readMetaJson(res, "long-lived token exchange");
  if (typeof data.access_token !== "string") {
    throw new Error(`Meta long-lived token exchange failed: ${errorPayload(data)}`);
  }
  return {
    access_token: data.access_token,
    expires_in: typeof data.expires_in === "number" ? data.expires_in : DEFAULT_LONG_LIVED_EXPIRES_IN,
  };
}

export async function getMetaUserId(accessToken: string): Promise<string> {
  const params = new URLSearchParams({
    fields: "id",
    access_token: accessToken,
  });
  const res = await fetch(`${GRAPH}/me?${params}`);
  const data = await readMetaJson(res, "user lookup");
  if (typeof data.id !== "string") {
    throw new Error(`Meta user lookup failed: ${errorPayload(data)}`);
  }
  return data.id;
}

export async function getIGBusinessAccountId(
  accessToken: string,
  fbUserId: string
): Promise<string | null> {
  const params = new URLSearchParams({
    fields: "instagram_business_account",
    access_token: accessToken,
  });
  const res = await fetch(`${GRAPH}/${fbUserId}?${params}`);
  const data = await readMetaJson(res, "Instagram business account lookup");
  const account = data.instagram_business_account;
  if (!isObject(account)) return null;
  return typeof account.id === "string" ? account.id : null;
}

export async function getFBPages(
  accessToken: string
): Promise<{ id: string; name: string; access_token: string }[]> {
  const params = new URLSearchParams({ access_token: accessToken });
  const res = await fetch(`${GRAPH}/me/accounts?${params}`);
  const data = await readMetaJson(res, "Facebook Pages lookup");
  if (!Array.isArray(data.data)) return [];
  return data.data.flatMap((page: unknown) => {
    if (!isObject(page)) return [];
    if (
      typeof page.id !== "string" ||
      typeof page.name !== "string" ||
      typeof page.access_token !== "string"
    ) {
      return [];
    }
    return [{ id: page.id, name: page.name, access_token: page.access_token }];
  });
}

export async function refreshIGToken(
  accessToken: string
): Promise<{ access_token: string; expires_in: number }> {
  const params = new URLSearchParams({
    grant_type: "ig_refresh_token",
    access_token: accessToken,
  });
  const res = await fetch(`${INSTAGRAM_GRAPH}/refresh_access_token?${params}`);
  const data = await readMetaJson(res, "Instagram token refresh");
  if (typeof data.access_token !== "string" || typeof data.expires_in !== "number") {
    throw new Error(`Meta Instagram token refresh failed: ${errorPayload(data)}`);
  }
  return { access_token: data.access_token, expires_in: data.expires_in };
}
