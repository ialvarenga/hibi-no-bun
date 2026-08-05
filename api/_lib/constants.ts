// Mirrors src/lib/constants.ts — kept as a local copy since api/ and src/
// ship as separate bundles (Vercel Functions vs. the Vite app). These also
// double as the server-side allow-lists for /api/generate: theme, topic
// ids, and jlptLevel all get spliced into the LLM prompt, so only values
// that resolve against these are ever accepted from a request body — a
// request can't smuggle arbitrary text into the prompt via these fields.
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

export const CANONICAL_TOPICS: Record<string, { jp: string; pt: string }> = {
  passive: { jp: '受け身', pt: 'Voz passiva' },
  causative: { jp: '使役形', pt: 'Causativo' },
  causative_passive: { jp: '使役受身', pt: 'Causativo-passivo' },
  keigo_sonkei: { jp: '尊敬語', pt: 'Honorífico (respeito)' },
  keigo_kenjou: { jp: '謙譲語', pt: 'Honorífico (humilde)' },
  potential: { jp: '可能形', pt: 'Forma potencial' },
  volitional: { jp: '意向形', pt: 'Volitivo' },
  conditional_ba: { jp: '〜ば', pt: 'Condicional (ば)' },
  conditional_tara: { jp: '〜たら', pt: 'Condicional (たら)' },
  te_form: { jp: 'て形', pt: 'Forma て' },
  comparison: { jp: '比較', pt: 'Comparação' },
  giving_receiving: { jp: 'やりもらい', pt: 'Dar e receber' },
}

export const ALLOWED_JLPT_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1']

// Which part of an AI-generated text a report is about. Mirrors the label map
// in src/lib/constants.ts (FEEDBACK_CATEGORIES) — this is the server-side
// allow-list, the client only sends these ids.
export const FEEDBACK_CATEGORIES = [
  'paragraph',
  'furigana',
  'translation',
  'vocab',
  'grammar',
  'comprehension',
  'other',
] as const

export const FEEDBACK_SOURCES = ['own', 'shared'] as const

// Portuguese labels for the category ids above. Used in the notification
// e-mail; the client has its own copy in src/lib/constants.ts.
export const FEEDBACK_CATEGORY_LABELS: Record<string, string> = {
  paragraph: 'Texto em japonês',
  furigana: 'Furigana (leitura)',
  translation: 'Tradução',
  vocab: 'Vocabulário',
  grammar: 'Gramática',
  comprehension: 'Pergunta de compreensão',
  other: 'Outro',
}
