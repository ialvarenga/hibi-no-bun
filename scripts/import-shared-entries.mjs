// Importa textos gerados externamente (por outra API/LLM) para o pool
// compartilhado (`shared_entries`), o mesmo banco usado por /api/generate
// (via saveSharedEntry) e servido em "Pergunta da comunidade".
//
// Uso:
//   node scripts/import-shared-entries.mjs caminho/para/textos.json
//
// O arquivo JSON deve ser um array de objetos no formato descrito no
// cabeçalho de `validateEntry` abaixo (mesmo shape de GeneratedReading, mais
// date/theme/topicsUsed/jlptLevel — veja src/lib/types.ts:ReadingEntry e
// api/_lib/generateReading.ts:GeneratedReading).
//
// Cada entrada pode incluir um campo "id" (UUID). Se ausente, o script deriva
// um id determinístico a partir de date+theme+paragraph_jp, então rodar o
// script de novo com o mesmo texto não duplica a linha — é isso que
// implementa o "checar se já está na base antes de inserir".
//
// Precisa de DATABASE_URL (ou POSTGRES_URL) no ambiente ou em um `.env` na
// raiz do projeto (mesmo formato usado por `npm run dev`/Vercel).

import { Pool } from 'pg'
import { createHash } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'

// Mirrors api/_lib/constants.ts — mantenha em sincronia se a lista mudar lá.
const ALLOWED_THEMES = [
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
const CANONICAL_TOPIC_IDS = [
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
const ALLOWED_JLPT_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1']

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function loadDotEnv() {
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
}

// Content-derived id: same input -> same id, so re-running the script on a
// JSON that repeats an entry (no explicit "id") still dedupes via ON CONFLICT.
function deriveId(entry) {
  const hash = createHash('sha1').update(`${entry.date}|${entry.theme}|${entry.paragraph_jp}`).digest('hex')
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`
}

function validateEntry(entry, index) {
  const errors = []
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
    console.warn(`  aviso ${label}: "vocab" tem ${entry.vocab.length} palavras (ideal: 5–8)`)
  }
  if (!Array.isArray(entry.grammar_used)) {
    errors.push(`${label}: "grammar_used" deve ser um array de ids`)
  } else {
    const unknown = entry.grammar_used.filter((id) => !CANONICAL_TOPIC_IDS.includes(id))
    if (unknown.length > 0) console.warn(`  aviso ${label}: grammar_used com ids desconhecidos: ${unknown.join(', ')}`)
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

  return errors
}

async function main() {
  const jsonPath = process.argv[2]
  if (!jsonPath) {
    console.error('Uso: node scripts/import-shared-entries.mjs caminho/para/textos.json')
    process.exit(1)
  }

  loadDotEnv()

  const raw = JSON.parse(readFileSync(path.resolve(jsonPath), 'utf-8'))
  const entries = Array.isArray(raw) ? raw : raw.entries
  if (!Array.isArray(entries)) {
    console.error('O JSON deve ser um array de entradas (ou um objeto { "entries": [...] }).')
    process.exit(1)
  }

  const pool = getPool()
  let inserted = 0
  let duplicates = 0
  let invalid = 0

  try {
    await ensureTable(pool)

    for (const [index, entry] of entries.entries()) {
      const errors = validateEntry(entry, index)
      if (errors.length > 0) {
        invalid++
        for (const e of errors) console.error(`  erro ${e}`)
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
        console.log(`  inserido ${id} (${entry.date} · ${entry.theme})`)
      } else {
        duplicates++
        console.log(`  já existia ${id} — pulado`)
      }
    }
  } finally {
    await pool.end()
  }

  console.log(
    `\nResumo: ${entries.length} lidas · ${inserted} inseridas · ${duplicates} já existiam · ${invalid} inválidas`,
  )
  if (invalid > 0) process.exit(1)
}

main().catch((err) => {
  console.error('Falha ao importar:', err.message)
  process.exit(1)
})
