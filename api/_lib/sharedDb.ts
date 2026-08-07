import { Pool } from "pg";
import type { GeneratedReading } from "./generateReading";
import { validateEntry, deriveId, type RawSharedEntry } from "./sharedEntryValidation";

export interface SharedEntryInput extends GeneratedReading {
  date: string;
  theme: string;
  topicsUsed: string[];
  jlptLevel?: string;
}

export interface SharedEntryRow extends GeneratedReading {
  id: string;
  created_at: string;
  date: string;
  theme: string;
  topics_used: string[];
  jlpt_level: string | null;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Neon (production) requires TLS; a local Docker Postgres (see
// docker-compose.yml) doesn't speak TLS at all — toggle based on host so the
// same code works against both without extra config.
let pool: Pool | null = null;

function getPool(): Pool {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error(
      "Nenhum banco de dados configurado — defina DATABASE_URL (ou POSTGRES_URL) no servidor.",
    );
  }
  const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);
  pool = new Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });
  return pool;
}

let ensureTablePromise: Promise<void> | null = null;

// Lazily created on first real query — this project has no separate
// migration step, so the table is brought up idempotently on demand.
async function ensureTable(db: Pool): Promise<void> {
  if (!ensureTablePromise) {
    ensureTablePromise = db
      .query(
        `CREATE TABLE IF NOT EXISTS shared_entries (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          date TEXT NOT NULL,
          theme TEXT NOT NULL,
          topics_used TEXT[] NOT NULL DEFAULT '{}',
          jlpt_level TEXT,
          paragraph_jp TEXT NOT NULL,
          translation_pt TEXT NOT NULL,
          vocab JSONB NOT NULL,
          grammar_used TEXT[] NOT NULL DEFAULT '{}',
          source_title TEXT,
          source_url TEXT,
          comprehension JSONB
        )`,
      )
      .then(() =>
        db.query(
          `CREATE TABLE IF NOT EXISTS shared_ingestions (
            id TEXT PRIMARY KEY,
            ingested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            entry_count INTEGER NOT NULL
          )`,
        ),
      )
      .then(() => undefined);
  }
  await ensureTablePromise;
}

// Only ever called with the output of generateReading() — never with a
// client-supplied payload — so there's no untrusted input to validate here.
export async function saveSharedEntry(input: SharedEntryInput): Promise<void> {
  const db = getPool();
  await ensureTable(db);
  await db.query(
    `INSERT INTO shared_entries
      (date, theme, topics_used, jlpt_level, paragraph_jp, translation_pt, vocab, grammar_used, source_title, source_url, comprehension)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      input.date,
      input.theme,
      input.topicsUsed,
      input.jlptLevel ?? null,
      input.paragraph_jp,
      input.translation_pt,
      JSON.stringify(input.vocab),
      input.grammar_used,
      input.source_title,
      input.source_url,
      JSON.stringify(input.comprehension),
    ],
  );
}

// Picks one random shared entry, skipping ids the caller already has and
// restricted to the caller's JLPT level(s) if given (an entry with no level
// classified always matches, so older/unclassified entries stay reachable).
// `jlpt_level` can hold either a single classified level ("N3", from the
// import script's own-level classification) or the multi-level string this
// app's own /api/generate saves ("N4-N3") — ILIKE '%N3%' matches both.
// Falls back to a possible id repeat once every matching entry has been
// seen, rather than erroring — the pool is small enough that this is fine.
export async function getRandomShared(
  excludeIds: string[],
  jlptLevels: string[] = [],
): Promise<SharedEntryRow | null> {
  const db = getPool();
  await ensureTable(db);
  const validExcludeIds = excludeIds.filter((id) => UUID_RE.test(id));
  const levelPatterns =
    jlptLevels.length > 0 ? jlptLevels.map((l) => `%${l}%`) : null;

  async function pick(withExclude: boolean): Promise<SharedEntryRow | null> {
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (levelPatterns) {
      params.push(levelPatterns);
      clauses.push(
        `(jlpt_level IS NULL OR jlpt_level ILIKE ANY($${params.length}))`,
      );
    }
    if (withExclude && validExcludeIds.length > 0) {
      params.push(validExcludeIds);
      clauses.push(`id <> ALL($${params.length}::uuid[])`);
    }
    const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
    const result = await db.query<SharedEntryRow>(
      `SELECT * FROM shared_entries ${where} ORDER BY random() LIMIT 1`,
      params,
    );
    return result.rows[0] ?? null;
  }

  return (await pick(true)) ?? (await pick(false));
}

// Removes a shared entry from the community pool so it stops being served to
// other users. Used by the owner to pull a reported (wrong) text. Returns
// false for a malformed id or when nothing matched.
export async function deleteSharedEntry(id: string): Promise<boolean> {
  if (!UUID_RE.test(id)) return false;
  const db = getPool();
  await ensureTable(db);
  const result = await db.query(`DELETE FROM shared_entries WHERE id = $1`, [
    id,
  ]);
  return (result.rowCount ?? 0) > 0;
}

export interface SharedEntryListResult {
  rows: SharedEntryRow[];
  total: number;
}

// Paginated listing for the owner dashboard's pool browser, newest first.
// Same jlpt_level ILIKE matching as getRandomShared, but without the
// "unclassified always matches" fallback — here the filter is a deliberate
// narrowing by the admin, not a serving fallback.
export async function listSharedEntries(
  offset: number,
  limit: number,
  jlptLevels: string[] = [],
): Promise<SharedEntryListResult> {
  const db = getPool();
  await ensureTable(db);

  const clauses: string[] = [];
  const params: unknown[] = [];
  if (jlptLevels.length > 0) {
    params.push(jlptLevels.map((l) => `%${l}%`));
    clauses.push(`jlpt_level ILIKE ANY($${params.length})`);
  }
  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";

  const countResult = await db.query<{ count: string }>(
    `SELECT COUNT(*) FROM shared_entries ${where}`,
    params,
  );
  const total = Number(countResult.rows[0]?.count ?? 0);

  const rowsResult = await db.query<SharedEntryRow>(
    `SELECT * FROM shared_entries ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset],
  );

  return { rows: rowsResult.rows, total };
}

export async function getSharedById(
  id: string,
): Promise<SharedEntryRow | null> {
  if (!UUID_RE.test(id)) return null;
  const db = getPool();
  await ensureTable(db);
  const result = await db.query<SharedEntryRow>(
    `SELECT * FROM shared_entries WHERE id = $1 LIMIT 1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export interface ImportResult {
  batchId?: string;
  batchSkipped: boolean;
  totalEntries: number;
  inserted: number;
  duplicates: number;
  invalid: number;
  messages: string[];
}

// Bulk-imports entries pasted/uploaded by the owner in the admin panel
// (Importar tab). Same validation + per-entry dedup (explicit or
// content-derived id, ON CONFLICT DO NOTHING) as scripts/import-shared-entries.mjs,
// plus optional whole-batch dedup via `batchId` (shared_ingestions) so
// re-submitting the same JSON is a no-op instead of a validation re-run.
export async function importSharedEntries(
  rawEntries: unknown[],
  batchId?: string,
): Promise<ImportResult> {
  const db = getPool();
  await ensureTable(db);
  const messages: string[] = [];
  let inserted = 0;
  let duplicates = 0;
  let invalid = 0;

  if (batchId) {
    const seen = await db.query<{ ingested_at: string }>(
      `SELECT ingested_at FROM shared_ingestions WHERE id = $1`,
      [batchId],
    );
    if ((seen.rowCount ?? 0) > 0) {
      messages.push(`Lote "${batchId}" já foi importado em ${seen.rows[0].ingested_at} — nada a fazer.`);
      return { batchId, batchSkipped: true, totalEntries: rawEntries.length, inserted, duplicates, invalid, messages };
    }
  }

  for (const [index, raw] of rawEntries.entries()) {
    const entry = raw as RawSharedEntry;
    const { errors, warnings } = validateEntry(entry, index);
    for (const w of warnings) messages.push(`aviso ${w}`);
    if (errors.length > 0) {
      invalid++;
      for (const e of errors) messages.push(`erro ${e}`);
      continue;
    }

    const id = entry.id ?? deriveId(entry);
    const result = await db.query(
      `INSERT INTO shared_entries
         (id, date, theme, topics_used, jlpt_level, paragraph_jp, translation_pt, vocab, grammar_used, source_title, source_url, comprehension)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (id) DO NOTHING
       RETURNING id`,
      [
        id,
        entry.date,
        entry.theme,
        entry.topicsUsed,
        entry.jlptLevel ?? null,
        entry.paragraph_jp,
        entry.translation_pt,
        JSON.stringify(entry.vocab),
        entry.grammar_used,
        entry.source_title,
        entry.source_url,
        JSON.stringify(entry.comprehension),
      ],
    );

    if ((result.rowCount ?? 0) > 0) {
      inserted++;
      messages.push(`inserido ${id} (${entry.date} · ${entry.theme})`);
    } else {
      duplicates++;
      messages.push(`já existia ${id} — pulado`);
    }
  }

  if (batchId && invalid === 0) {
    await db.query(
      `INSERT INTO shared_ingestions (id, entry_count) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
      [batchId, rawEntries.length],
    );
    messages.push(`Lote "${batchId}" marcado como importado.`);
  } else if (batchId) {
    messages.push(`Lote "${batchId}" NÃO marcado como importado (havia entradas inválidas).`);
  }

  return { batchId, batchSkipped: false, totalEntries: rawEntries.length, inserted, duplicates, invalid, messages };
}
