import { createHash } from "node:crypto";
import { ALLOWED_THEMES, ALLOWED_JLPT_LEVELS, CANONICAL_TOPICS } from "./constants";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface RawSharedEntry {
  id?: string;
  date?: string;
  theme?: string;
  topicsUsed?: string[];
  jlptLevel?: string;
  paragraph_jp?: string;
  translation_pt?: string;
  vocab?: { word: string; reading: string; meaning_pt: string }[];
  grammar_used?: string[];
  source_title?: string;
  source_url?: string;
  comprehension?: { question: string; choices: string[]; answer_index: number }[];
}

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

// Mirrors scripts/lib/ingest-core.mjs:validateEntry — kept in sync manually,
// the two run in different module systems (this is a Vercel Function,
// that's a standalone Node CLI script) so sharing one file isn't practical.
export function validateEntry(entry: RawSharedEntry, index: number): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const label = `entrada #${index + 1}`;

  for (const field of ["date", "theme", "paragraph_jp", "translation_pt", "source_title", "source_url"] as const) {
    if (typeof entry[field] !== "string" || (entry[field] as string).trim() === "") {
      errors.push(`${label}: campo "${field}" ausente ou vazio`);
    }
  }
  if (typeof entry.date === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
    errors.push(`${label}: "date" deve ser YYYY-MM-DD`);
  }
  if (typeof entry.theme === "string" && !ALLOWED_THEMES.includes(entry.theme)) {
    errors.push(`${label}: "theme" "${entry.theme}" não está em ALLOWED_THEMES (${ALLOWED_THEMES.join(", ")})`);
  }
  if (!Array.isArray(entry.topicsUsed)) {
    errors.push(`${label}: "topicsUsed" deve ser um array de strings`);
  }
  if (
    !Array.isArray(entry.vocab) ||
    entry.vocab.some((v) => typeof v?.word !== "string" || typeof v?.reading !== "string" || typeof v?.meaning_pt !== "string")
  ) {
    errors.push(`${label}: "vocab" deve ser array de {word, reading, meaning_pt}`);
  } else if (entry.vocab.length < 5 || entry.vocab.length > 8) {
    warnings.push(`${label}: "vocab" tem ${entry.vocab.length} palavras (ideal: 5–8)`);
  }
  if (!Array.isArray(entry.grammar_used)) {
    errors.push(`${label}: "grammar_used" deve ser um array de ids`);
  } else {
    const known = Object.keys(CANONICAL_TOPICS);
    const unknown = entry.grammar_used.filter((id) => !known.includes(id));
    if (unknown.length > 0) warnings.push(`${label}: grammar_used com ids desconhecidos: ${unknown.join(", ")}`);
  }
  if (
    !Array.isArray(entry.comprehension) ||
    entry.comprehension.length === 0 ||
    entry.comprehension.some(
      (q) =>
        typeof q?.question !== "string" ||
        !Array.isArray(q?.choices) ||
        q.choices.length !== 4 ||
        !Number.isInteger(q?.answer_index) ||
        q.answer_index < 0 ||
        q.answer_index > 3,
    )
  ) {
    errors.push(`${label}: "comprehension" deve ter ao menos 1 pergunta com 4 "choices" e "answer_index" 0-3`);
  }
  if (entry.id !== undefined && !UUID_RE.test(entry.id)) {
    errors.push(`${label}: "id" presente mas não é um UUID válido (${entry.id})`);
  }
  if (entry.jlptLevel !== undefined && !ALLOWED_JLPT_LEVELS.includes(entry.jlptLevel)) {
    errors.push(`${label}: "jlptLevel" "${entry.jlptLevel}" inválido — use um único nível: ${ALLOWED_JLPT_LEVELS.join(", ")}`);
  }

  return { errors, warnings };
}

// Content-derived id: same input -> same id, so re-importing a JSON that
// repeats an entry (no explicit "id") still dedupes via ON CONFLICT.
export function deriveId(entry: RawSharedEntry): string {
  const hash = createHash("sha1").update(`${entry.date}|${entry.theme}|${entry.paragraph_jp}`).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}
