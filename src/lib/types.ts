export interface GrammarTopic {
  id: string
  jp: string
  pt: string
}

export interface VocabItem {
  word: string
  reading: string
  meaning_pt: string
}

export interface ComprehensionQuestion {
  question: string
  choices: string[]
  answer_index: number
}

export interface ReadingEntry {
  date: string // YYYY-MM-DD
  theme: string
  topicsUsed: string[]
  paragraph_jp: string
  translation_pt: string
  vocab: VocabItem[]
  grammar_used: string[]
  source_title: string
  source_url: string
  comprehension?: ComprehensionQuestion[]
}

export interface Profile {
  studied: Record<string, boolean>
  themes: string[]
  allThemes: string[]
  showFurigana: boolean
  apiKey: string
  jlptLevels: string[]
}

export interface VocabCard {
  id: string // `${word}::${reading}`
  word: string
  reading: string
  meaning_pt: string
  box: number // Leitner box, 0-5
  due: string // YYYY-MM-DD, next review date
  reps: number
  lapses: number
  firstSeen: string
  lastReviewed: string | null
}

export interface ExportedData {
  exported_at: string
  profile: Profile
  history: ReadingEntry[]
}
