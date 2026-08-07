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
  const db = getPool()
  await ensureTable(db)
  const validExcludeIds = excludeIds.filter((id) => UUID_RE.test(id))
  const levelPatterns = jlptLevels.length > 0 ? jlptLevels.map((l) => `%${l}%`) : null

  async function pick(withExclude: boolean): Promise<SharedEntryRow | null> {
    const clauses: string[] = []
    const params: unknown[] = []
    if (levelPatterns) {
      params.push(levelPatterns)
      clauses.push(`(jlpt_level IS NULL OR jlpt_level ILIKE ANY($${params.length}))`)
    }
    if (withExclude && validExcludeIds.length > 0) {
      params.push(validExcludeIds)
      clauses.push(`id <> ALL($${params.length}::uuid[])`)
    }
    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
    const result = await db.query<SharedEntryRow>(
      `SELECT * FROM shared_entries ${where} ORDER BY random() LIMIT 1`,
      params,
    )
    return result.rows[0] ?? null
  }

  return (await pick(true)) ?? (await pick(false))
}

// Removes a shared entry from the community pool so it stops being served to
// other users. Used by the owner to pull a reported (wrong) text. Returns
// false for a malformed id or when nothing matched.
export async function deleteSharedEntry(id: string): Promise<boolean> {
  if (!UUID_RE.test(id)) return false
  const db = getPool()
  await ensureTable(db)
  const result = await db.query(`DELETE FROM shared_entries WHERE id = $1`, [id])
  return (result.rowCount ?? 0) > 0
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
