import { Pool } from 'pg'

export interface FeedbackInput {
  category: string
  comment: string | null
  source: string // 'own' | 'shared'
  sharedEntryId: string | null
  paragraph_jp: string
  translation_pt: string | null
  theme: string | null
  jlptLevel: string | null
  readingDate: string | null
}

export interface FeedbackRow {
  id: string
  created_at: string
  category: string
  comment: string | null
  source: string
  shared_entry_id: string | null
  paragraph_jp: string
  translation_pt: string | null
  theme: string | null
  jlpt_level: string | null
  reading_date: string | null
  resolved: boolean
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Neon (production) requires TLS; a local Docker Postgres (see
// docker-compose.yml) doesn't speak TLS at all — toggle based on host so the
// same code works against both without extra config. Mirrors sharedDb.ts.
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

// Lazily created on first real query — this project has no separate migration
// step, so the table is brought up idempotently on demand (same as sharedDb).
async function ensureTable(db: Pool): Promise<void> {
  if (!ensureTablePromise) {
    ensureTablePromise = db
      .query(
        `CREATE TABLE IF NOT EXISTS feedback (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          category TEXT NOT NULL,
          comment TEXT,
          source TEXT NOT NULL,
          shared_entry_id UUID,
          paragraph_jp TEXT NOT NULL,
          translation_pt TEXT,
          theme TEXT,
          jlpt_level TEXT,
          reading_date TEXT,
          resolved BOOLEAN NOT NULL DEFAULT false
        )`,
      )
      .then(() => undefined)
  }
  await ensureTablePromise
}

export async function saveFeedback(input: FeedbackInput): Promise<FeedbackRow> {
  const db = getPool()
  await ensureTable(db)
  const result = await db.query<FeedbackRow>(
    `INSERT INTO feedback
      (category, comment, source, shared_entry_id, paragraph_jp, translation_pt, theme, jlpt_level, reading_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      input.category,
      input.comment,
      input.source,
      input.sharedEntryId && UUID_RE.test(input.sharedEntryId) ? input.sharedEntryId : null,
      input.paragraph_jp,
      input.translation_pt,
      input.theme,
      input.jlptLevel,
      input.readingDate,
    ],
  )
  return result.rows[0]
}

export async function listFeedback(): Promise<FeedbackRow[]> {
  const db = getPool()
  await ensureTable(db)
  const result = await db.query<FeedbackRow>(
    `SELECT * FROM feedback ORDER BY created_at DESC LIMIT 500`,
  )
  return result.rows
}

export async function setFeedbackResolved(id: string, resolved: boolean): Promise<boolean> {
  if (!UUID_RE.test(id)) return false
  const db = getPool()
  await ensureTable(db)
  const result = await db.query(`UPDATE feedback SET resolved = $2 WHERE id = $1`, [id, resolved])
  return (result.rowCount ?? 0) > 0
}
