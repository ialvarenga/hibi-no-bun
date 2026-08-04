import type { GrammarTopic } from './types'

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

export const DEFAULT_STUDIED_IDS = DEFAULT_TOPICS.slice(0, 3).map((t) => t.id)
export const DEFAULT_SELECTED_THEMES = ['Tecnologia', 'Viagem']

export const JLPT_LEVELS: { value: string; label: string }[] = [
  { value: 'N5', label: 'N5 (iniciante)' },
  { value: 'N5-N4', label: 'N5-N4' },
  { value: 'N4', label: 'N4' },
  { value: 'N4-N3', label: 'N4-N3 (padrão)' },
  { value: 'N3', label: 'N3' },
  { value: 'N3-N2', label: 'N3-N2' },
  { value: 'N2', label: 'N2' },
  { value: 'N2-N1', label: 'N2-N1' },
  { value: 'N1', label: 'N1 (avançado)' },
]

export const DEFAULT_JLPT_LEVEL = 'N4-N3'
