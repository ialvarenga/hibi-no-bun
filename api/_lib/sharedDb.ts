import { Pool } from 'pg'
import type { GeneratedReading } from './generateReading'

export interface SharedEntryInput extends GeneratedReading {
  date: string
  theme: string
  topicsUsed: string[]
  jlptLevel?: string
}

export interface SharedEntryRow extends GeneratedReading {
  id: string
  created_at: string
  date: string
  theme: string
  topics_used: string[]
  jlpt_level: string | null
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Neon (production) requires TLS; a local Docker Postgres (see
// docker-compose.yml) doesn't speak TLS at all — toggle based on host so the
// same code works against both without extra config.
let pool: Pool | null = null

function getPool(): Pool {
  if (pool) return pool
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!connectionString) {
    throw new Error(
      'Nenhum banco de dados configurado — defina DATABASE_URL (ou POSTGRES_URL) no servidor.',
    )
  }
  const isLocal = /localhost|127\.0\.0\.1/.test(connectionString)
  pool = new Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  })
  return pool
}

let ensureTablePromise: Promise<void> | null = null

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
      .then(() => undefined)
  }
  await ensureTablePromise
}

// Only ever called with the output of generateReading() — never with a
// client-supplied payload — so there's no untrusted input to validate here.
export async function saveSharedEntry(input: SharedEntryInput): Promise<void> {
  const db = getPool()
  await ensureTable(db)
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
  )
}

// Picks one random shared entry, skipping ids the caller already has. Falls
// back to a possible repeat once every entry in the pool has been seen,
// rather than erroring — the pool is small enough that this is fine.
export async function getRandomShared(excludeIds: string[]): Promise<SharedEntryRow | null> {
  const db = getPool()
  await ensureTable(db)
  const validExcludeIds = excludeIds.filter((id) => UUID_RE.test(id))

  const result =
    validExcludeIds.length > 0
      ? await db.query<SharedEntryRow>(
          `SELECT * FROM shared_entries WHERE id <> ALL($1::uuid[]) ORDER BY random() LIMIT 1`,
          [validExcludeIds],
        )
      : await db.query<SharedEntryRow>(`SELECT * FROM shared_entries ORDER BY random() LIMIT 1`)

  if (result.rows.length > 0) return result.rows[0]

  if (validExcludeIds.length > 0) {
    const fallback = await db.query<SharedEntryRow>(
      `SELECT * FROM shared_entries ORDER BY random() LIMIT 1`,
    )
    return fallback.rows[0] ?? null
  }

  return null
}

export async function getSharedById(id: string): Promise<SharedEntryRow | null> {
  if (!UUID_RE.test(id)) return null
  const db = getPool()
  await ensureTable(db)
  const result = await db.query<SharedEntryRow>(
    `SELECT * FROM shared_entries WHERE id = $1 LIMIT 1`,
    [id],
  )
  return result.rows[0] ?? null
}
