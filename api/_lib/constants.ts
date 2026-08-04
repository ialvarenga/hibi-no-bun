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
