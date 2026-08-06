import type { FeedbackCategory, GrammarTopic } from './types'

// Which part of an AI-generated text a report is about. The ids mirror the
// server allow-list in api/_lib/constants.ts (FEEDBACK_CATEGORIES); the labels
// are what the user sees in the report form.
export const FEEDBACK_CATEGORIES: { id: FeedbackCategory; label: string }[] = [
  { id: 'paragraph', label: 'Texto em japonês' },
  { id: 'furigana', label: 'Furigana (leitura)' },
  { id: 'translation', label: 'Tradução' },
  { id: 'vocab', label: 'Vocabulário' },
  { id: 'grammar', label: 'Gramática' },
  { id: 'comprehension', label: 'Pergunta de compreensão' },
  { id: 'other', label: 'Outro' },
]

export const FEEDBACK_CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  FEEDBACK_CATEGORIES.map((c) => [c.id, c.label]),
)

export const DEFAULT_TOPICS: GrammarTopic[] = [
  { id: 'passive', jp: '受け身', pt: 'Voz passiva' },
  { id: 'causative', jp: '使役形', pt: 'Causativo' },
  { id: 'causative_passive', jp: '使役受身', pt: 'Causativo-passivo' },
  { id: 'keigo_sonkei', jp: '尊敬語', pt: 'Honorífico (respeito)' },
  { id: 'keigo_kenjou', jp: '謙譲語', pt: 'Honorífico (humilde)' },
  { id: 'potential', jp: '可能形', pt: 'Forma potencial' },
  { id: 'volitional', jp: '意向形', pt: 'Volitivo' },
  { id: 'conditional_ba', jp: '〜ば', pt: 'Condicional (ば)' },
  { id: 'conditional_tara', jp: '〜たら', pt: 'Condicional (たら)' },
  { id: 'conditional_to', jp: '〜と', pt: 'Condicional (と)' },
  { id: 'conditional_nara', jp: '〜なら', pt: 'Condicional (なら)' },
  { id: 'te_form', jp: 'て形', pt: 'Forma て' },
  { id: 'comparison', jp: '比較', pt: 'Comparação' },
  { id: 'giving_receiving', jp: 'やりもらい', pt: 'Dar e receber' },
]

export const DEFAULT_THEMES: string[] = [
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

// Resolves a `grammar_used` entry to its topic. New entries store the topic
// id directly; older history entries stored a free-text Portuguese label the
// model paraphrased from `pt`, so that's kept as a fallback match. Anything
// that resolves to neither renders as a plain, non-interactive label.
export function resolveGrammarTopic(label: string): GrammarTopic | undefined {
  return (
    DEFAULT_TOPICS.find((t) => t.id === label) ??
    DEFAULT_TOPICS.find((t) => t.pt.toLowerCase() === label.trim().toLowerCase())
  )
}

export const DEFAULT_STUDIED_IDS = DEFAULT_TOPICS.slice(0, 3).map((t) => t.id)
export const DEFAULT_SELECTED_THEMES = ['Tecnologia', 'Viagem']

// Ordered easiest to hardest — selection order in the UI/prompt follows this.
export const JLPT_LEVELS: { value: string; label: string }[] = [
  { value: 'N5', label: 'N5' },
  { value: 'N4', label: 'N4' },
  { value: 'N3', label: 'N3' },
  { value: 'N2', label: 'N2' },
  { value: 'N1', label: 'N1' },
]

export const DEFAULT_JLPT_LEVELS = ['N4', 'N3']

// Cards per review session. Due cards beyond this stay queued for the next
// session instead of all showing up at once. User-configurable in Settings.
export const DEFAULT_REVIEW_BATCH_SIZE = 10
export const REVIEW_BATCH_SIZE_OPTIONS = [5, 10, 15, 20, 30]
