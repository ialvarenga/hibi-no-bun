// Shared logic between the manual CLI (scripts/import-shared-entries.mjs)
// and the build-time hook (scripts/deploy-ingest.mjs). Pure: never calls
// process.exit — callers decide how to react to the returned summary.

import { Pool } from 'pg'
import { createHash } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'

// Mirrors api/_lib/constants.ts — mantenha em sincronia se a lista mudar lá.
export const ALLOWED_THEMES = [
  'Tecnologia',
  'Culinária',
  'Viagem',
  'Notícias',
  'Cultura pop',
  'Esportes',
  'Natureza',
  'Negócios',
  'Games',
  'Anime',
]
export const CANONICAL_TOPIC_IDS = [
  'passive',
  'causative',
  'causative_passive',
  'keigo_sonkei',
  'keigo_kenjou',
  'potential',
  'volitional',
  'conditional_ba',
  'conditional_tara',
  'conditional_to',
  'conditional_nara',
  'te_form',
  'comparison',
  'giving_receiving',
]
export const ALLOWED_JLPT_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1']

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function loadDotEnv() {
  if (process.env.DATABASE_URL || process.env.POSTGRES_URL) return
  const envPath = path.resolve(process.cwd(), '.env')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (/^".*"$/.test(value) || /^'.*'$/.test(value)) value = value.slice(1, -1)
    if (!(key in process.env)) process.env[key] = value
  }
}

// Same local-vs-Neon SSL toggle as api/_lib/sharedDb.ts.
function getPool() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!connectionString) {
    throw new Error('Defina DATABASE_URL (ou POSTGRES_URL) no ambiente ou em um .env na raiz do projeto.')
  }
  const isLocal = /localhost|127\.0\.0\.1/.test(connectionString)
  return new Pool({ connectionString, ssl: isLocal ? false : { rejectUnauthorized: false } })
}

async function ensureTable(db) {
  await db.query(`CREATE TABLE IF NOT EXISTS shared_entries (
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
  )`)
  await db.query(`CREATE TABLE IF NOT EXISTS shared_ingestions (
    id TEXT PRIMARY KEY,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    entry_count INTEGER NOT NULL
  )`)
}

// Content-derived id: same input -> same id, so re-running on a JSON that
// repeats an entry (no explicit "id") still dedupes via ON CONFLICT.
function deriveId(entry) {
  const hash = createHash('sha1').update(`${entry.date}|${entry.theme}|${entry.paragraph_jp}`).digest('hex')
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`
}

export function validateEntry(entry, index) {
  const errors = []
  const warnings = []
  const label = `entrada #${index + 1}`

  for (const field of ['date', 'theme', 'paragraph_jp', 'translation_pt', 'source_title', 'source_url']) {
    if (typeof entry[field] !== 'string' || entry[field].trim() === '') {
      errors.push(`${label}: campo "${field}" ausente ou vazio`)
    }
  }
  if (typeof entry.date === 'string' && !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
    errors.push(`${label}: "date" deve ser YYYY-MM-DD`)
  }
  if (typeof entry.theme === 'string' && !ALLOWED_THEMES.includes(entry.theme)) {
    errors.push(`${label}: "theme" "${entry.theme}" não está em ALLOWED_THEMES (${ALLOWED_THEMES.join(', ')})`)
  }
  if (!Array.isArray(entry.topicsUsed)) {
    errors.push(`${label}: "topicsUsed" deve ser um array de strings`)
  }
  if (
    !Array.isArray(entry.vocab) ||
    entry.vocab.some(
      (v) => typeof v?.word !== 'string' || typeof v?.reading !== 'string' || typeof v?.meaning_pt !== 'string',
    )
  ) {
    errors.push(`${label}: "vocab" deve ser array de {word, reading, meaning_pt}`)
  } else if (entry.vocab.length < 5 || entry.vocab.length > 8) {
    warnings.push(`${label}: "vocab" tem ${entry.vocab.length} palavras (ideal: 5–8)`)
  }
  if (!Array.isArray(entry.grammar_used)) {
    errors.push(`${label}: "grammar_used" deve ser um array de ids`)
  } else {
    const unknown = entry.grammar_used.filter((id) => !CANONICAL_TOPIC_IDS.includes(id))
    if (unknown.length > 0) warnings.push(`${label}: grammar_used com ids desconhecidos: ${unknown.join(', ')}`)
  }
  if (
    !Array.isArray(entry.comprehension) ||
    entry.comprehension.length === 0 ||
    entry.comprehension.some(
      (q) =>
        typeof q?.question !== 'string' ||
        !Array.isArray(q?.choices) ||
        q.choices.length !== 4 ||
        !Number.isInteger(q?.answer_index) ||
        q.answer_index < 0 ||
        q.answer_index > 3,
    )
  ) {
    errors.push(`${label}: "comprehension" deve ter ao menos 1 pergunta com 4 "choices" e "answer_index" 0-3`)
  }
  if (entry.id !== undefined && !UUID_RE.test(entry.id)) {
    errors.push(`${label}: "id" presente mas não é um UUID válido (${entry.id})`)
  }
  if (entry.jlptLevel !== undefined && !ALLOWED_JLPT_LEVELS.includes(entry.jlptLevel)) {
    errors.push(
      `${label}: "jlptLevel" "${entry.jlptLevel}" inválido — use um único nível: ${ALLOWED_JLPT_LEVELS.join(', ')}`,
    )
  }

  return { errors, warnings }
}

// Reads, validates and inserts every entry in `jsonPath`. Never calls
// process.exit — returns a summary the caller logs/reacts to as it sees fit.
// Throws only for hard failures (missing file, bad JSON, no DB connection).
export async function runIngest(jsonPath) {
  loadDotEnv()

  const raw = JSON.parse(readFileSync(path.resolve(jsonPath), 'utf-8'))
  const entries = Array.isArray(raw) ? raw : raw.entries
  const batchId = Array.isArray(raw) ? undefined : raw.batchId
  if (!Array.isArray(entries)) {
    throw new Error('O JSON deve ser um array de entradas (ou um objeto { "entries": [...] }).')
  }
  if (batchId !== undefined && (typeof batchId !== 'string' || batchId.trim() === '')) {
    throw new Error('"batchId", quando presente, deve ser uma string não vazia.')
  }

  const pool = getPool()
  const log = []
  let inserted = 0
  let duplicates = 0
  let invalid = 0

  try {
    await ensureTable(pool)

    if (batchId) {
      const seen = await pool.query('SELECT ingested_at FROM shared_ingestions WHERE id = $1', [batchId])
      if (seen.rowCount > 0) {
        log.push(`Lote "${batchId}" já foi importado em ${seen.rows[0].ingested_at} — nada a fazer.`)
        return { batchId, batchSkipped: true, totalEntries: entries.length, inserted, duplicates, invalid, log }
      }
    }

    for (const [index, entry] of entries.entries()) {
      const { errors, warnings } = validateEntry(entry, index)
      for (const w of warnings) log.push(`  aviso ${w}`)
      if (errors.length > 0) {
        invalid++
        for (const e of errors) log.push(`  erro ${e}`)
        continue
      }

      const id = entry.id ?? deriveId(entry)
      const result = await pool.query(
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
      )

      if (result.rowCount > 0) {
        inserted++
        log.push(`  inserido ${id} (${entry.date} · ${entry.theme})`)
      } else {
        duplicates++
        log.push(`  já existia ${id} — pulado`)
      }
    }

    if (batchId && invalid === 0) {
      await pool.query(
        `INSERT INTO shared_ingestions (id, entry_count) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
        [batchId, entries.length],
      )
      log.push(`Lote "${batchId}" marcado como importado.`)
    } else if (batchId) {
      log.push(
        `Lote "${batchId}" NÃO marcado como importado (havia entradas inválidas) — rodar de novo depois de corrigir vai tentar de novo.`,
      )
    }
  } finally {
    await pool.end()
  }

  return { batchId, batchSkipped: false, totalEntries: entries.length, inserted, duplicates, invalid, log }
}
