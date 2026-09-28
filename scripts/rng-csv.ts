/**
 * rng-csv.ts — build a personalised creator CSV for the RnR Auto-Messenger.
 *
 * Auto mode sends ONE static template. CSV mode ships a fully rendered,
 * per-creator message. This pulls creators from the RnG (rngrow) API,
 * classifies them, renders Skyler's musician opener, and writes the CSV.
 *
 *   export RNG_API_KEY=rng_live_xxxxxxxx
 *
 *   # 1. See which endpoints the plan exposes and what fields come back.
 *   bun scripts/rng-csv.ts --inspect --country US
 *
 *   # 2. Build the CSV. Default source is every league board for the country,
 *   #    keeping only recruit_status=available (rank + division in the opener).
 *   bun scripts/rng-csv.ts --country US --min-diamonds 5000 --out creators.csv --preview 5
 *
 *   #    Or the full eligible-creator feed (441k US, no stats, generic opener):
 *   bun scripts/rng-csv.ts --source creators --limit 500
 *
 *   # Offline: render from a saved API response instead of calling the API.
 *   bun scripts/rng-csv.ts --fixture sample.json --preview 3
 */

import { readFile, writeFile } from 'node:fs/promises';

type Row = Record<string, unknown>;

const BASE = 'https://rngrow.com/api/v1';
const KEY = process.env.RNG_API_KEY;

// ---------------------------------------------------------------- args
const argv = process.argv.slice(2);
const arg = (name: string, fallback: string | null = null) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : (argv[i + 1] ?? fallback);
};
const flag = (name: string) => argv.includes(`--${name}`);

const COUNTRY = arg('country', 'US')!;
const MIN_DIAMONDS = Number(arg('min-diamonds', '0'));
const OUT = arg('out', 'creators.csv')!;
const LIMIT = Number(arg('limit', '1000'));
const SOURCE = arg('source', 'board')!;
const FIXTURE = arg('fixture');
const PREVIEW = Number(arg('preview', '0'));

if (!KEY && !FIXTURE) {
  console.error('Missing RNG_API_KEY. Run: export RNG_API_KEY=rng_live_...');
  process.exit(1);
}

// ---------------------------------------------------------------- http
async function get(path: string, params: Record<string, unknown> = {}): Promise<any> {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) {
    if (v !== null && v !== undefined) url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, { headers: { 'X-API-Key': KEY! } });
  const body = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${url.pathname} — ${body.slice(0, 200)}`);
  return JSON.parse(body);
}

const rowsOf = (json: any): Row[] | null =>
  Array.isArray(json) ? json : (json?.data ?? json?.creators ?? json?.rows ?? json?.results ?? null);

// Cursor pagination; also handles a plain array response.
async function getAll(path: string, params: Record<string, unknown> = {}, cap = LIMIT): Promise<Row[]> {
  const out: Row[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 50; page++) {
    const json = await get(path, { ...params, cursor, limit: 100 });
    const rows = rowsOf(json) ?? [];
    out.push(...rows);
    cursor = json?.next_cursor ?? json?.cursor ?? null;
    if (!cursor || rows.length === 0 || out.length >= cap) break;
  }
  return out.slice(0, cap);
}

// Every league board the country has (GET /leagues lists them). Rows carry
// no division of their own, so it is stamped on from the board.
async function getBoards(): Promise<Row[]> {
  const leagues = await get('/leagues');
  const country = (leagues.countries ?? []).find((c: any) => c.country === COUNTRY);
  if (!country) throw new Error(`No league boards for ${COUNTRY}`);
  const out: Row[] = [];
  for (const { division } of country.divisions) {
    const board = await get('/leagues/board', { country: COUNTRY, division });
    out.push(...(board.rows ?? []).map((r: Row) => ({ ...r, division })));
  }
  return out; // --limit caps output rows, after the recruit filter
}

// ------------------------------------------------------------- inspect
// Probes the endpoints the radar plan serves and dumps ONE record from each
// so FIELD below stays pinned to reality.
const CANDIDATES: [string, Record<string, unknown>][] = [
  ['/me', {}],
  ['/leagues', {}],
  ['/creators', { country: COUNTRY }],
  ['/leagues/board', { country: COUNTRY, division: 'C5' }],
];

async function inspect() {
  for (const [path, params] of CANDIDATES) {
    try {
      const json = await get(path, params);
      const rows = rowsOf(json);
      console.log(`\n=== OK  ${path} ${JSON.stringify(params)}`);
      console.log(`    count: ${rows ? rows.length : 'n/a'}`);
      console.log(JSON.stringify(rows ? rows[0] : json, null, 2).slice(0, 1200));
    } catch (e) {
      console.log(`\n=== ERR ${path} — ${(e as Error).message}`);
    }
  }
}

// --------------------------------------------------------- field map
// Candidate field names in priority order; the first one present wins.
// Confirmed 2026-09-28 against the radar plan:
//   /leagues/board rows: rank, username, nickname, score, follower_count,
//     was_live, recruit_status ("available" | "not_available"), hot_status
//   /creators: id, username, display_name, invitation_type, follower_count
// `username` must stay first: nickname is a display name, not a handle.
const FIELD = {
  username: ['username', 'unique_id', 'handle'],
  diamonds: ['diamonds', 'diamonds_30d', 'diamond_count', 'score'],
  followers: ['followers', 'follower_count', 'fans'],
  division: ['division', 'league_division', 'league'],
  rank: ['rank', 'position'],
  game: ['game', 'game_name', 'gaming_category'],
  recruitable: ['recruit_status', 'recruitable', 'is_recruitable', 'free_to_join'],
};

const pick = (row: Row, keys: string[]) => {
  for (const k of keys) if (row[k] !== undefined && row[k] !== null && row[k] !== '') return row[k];
  return null;
};

// APIs send booleans as true/false, 0/1 or "false"; only an explicit no counts as no.
// recruit_status uses "available" / "not_available".
const isNo = (v: unknown) =>
  v === false || v === 0 || ['0', 'false', 'not_available'].includes(String(v).toLowerCase());

type Creator = {
  username: string | null;
  diamonds: number;
  followers: number;
  division: string | null;
  rank: string | null;
  game: string | null;
  recruitable: unknown;
};

const str = (v: unknown) => (v === null ? null : String(v).trim() || null);

const norm = (row: Row): Creator => ({
  username: str(pick(row, FIELD.username))?.replace(/^@/, '') ?? null,
  diamonds: Number(pick(row, FIELD.diamonds)) || 0,
  followers: Number(pick(row, FIELD.followers)) || 0,
  division: str(pick(row, FIELD.division)),
  rank: str(pick(row, FIELD.rank)),
  game: str(pick(row, FIELD.game)),
  recruitable: pick(row, FIELD.recruitable),
});

// --------------------------------------------------------- the opener
//
// RULE: every line below is a fact the API actually returned. Nothing claims
// Skyler watched their stream — a fabricated "I caught your live earlier" is
// false and the fastest way to read as a bot; creators compare DMs.
//
// Priority order: most specific verifiable fact first.
function opener(c: Creator): string {
  if (c.game) return `your ${c.game} streams keep showing up on the board and they look like a good time`;
  // Rank only brags when it is worth bragging about; rank 87 reads backhanded.
  if (c.division && c.rank && Number(c.rank) <= 10) return `you're sitting rank ${c.rank} in ${c.division} right now and that is no accident`;
  // "Holding your own in D5" is backhanded — D5 is the bottom division.
  if (c.division && /^[AB]/.test(c.division)) return `you're holding your own in ${c.division} which is not easy`;
  if (c.division) return `you popped up on the ${c.division} league board and i had to reach out`;
  // Board score is league points, not a calendar month, so no "this month".
  if (c.diamonds >= 50000) return `your numbers are genuinely impressive`;
  if (c.followers >= 10000) return `you've built a real room over there`;
  return `your live caught my eye`;
}

// Skyler's musician script.
function renderMessage(c: Creator): string {
  return [
    `heyy!! ${opener(c)}!! i'm a drummer on livestream and i'm with the agency taboost`,
    `and you should look into joining!! they have really good opportunities for creators`,
    `and they have helped me become a musician live streamer full time ! let me know if you`,
    `want more information, i would love to be in the same agency together !☺️`,
  ].join(' ');
}

// ------------------------------------------------------------------ csv
const esc = (v: unknown) => {
  const s = String(v ?? '');
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

async function build() {
  const raw = FIXTURE
    ? (rowsOf(JSON.parse(await readFile(FIXTURE, 'utf8'))) ?? [])
    : SOURCE === 'board'
      ? await getBoards()
      : await getAll(SOURCE.startsWith('/') ? SOURCE : `/${SOURCE}`, { country: COUNTRY });

  const seen = new Set<string>();
  const rows: unknown[][] = [];
  const skipped = { noUsername: 0, duplicate: 0, belowMin: 0, notRecruitable: 0 };

  for (const r of raw) {
    const c = norm(r);
    if (!c.username) { skipped.noUsername++; continue; }
    const key = c.username.toLowerCase();
    if (seen.has(key)) { skipped.duplicate++; continue; }
    if (c.diamonds < MIN_DIAMONDS) { skipped.belowMin++; continue; }
    if (isNo(c.recruitable)) { skipped.notRecruitable++; continue; }
    seen.add(key);
    rows.push([c.username, renderMessage(c), c.diamonds, c.division ?? '', c.game ?? '']);
    if (rows.length >= LIMIT) break;
  }

  const csv = [
    ['username', 'message', 'diamonds', 'division', 'game'].join(','),
    ...rows.map((r) => r.map(esc).join(',')),
  ].join('\n');

  await writeFile(OUT, csv + '\n', 'utf8');
  console.log(
    `Wrote ${rows.length} creators to ${OUT} from ${FIXTURE ?? SOURCE} ` +
      `(country=${COUNTRY}, min diamonds=${MIN_DIAMONDS}, raw=${raw.length}, skipped=${JSON.stringify(skipped)})`,
  );
  for (const r of rows.slice(0, PREVIEW)) console.log(`\n@${r[0]}\n${r[1]}`);
}

(flag('inspect') ? inspect() : build()).catch((e) => {
  console.error('Failed:', (e as Error).message);
  process.exit(1);
});
