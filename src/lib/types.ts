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
}

export interface Profile {
  studied: Record<string, boolean>
  themes: string[]
  allThemes: string[]
  showFurigana: boolean
}

export interface ExportedData {
  exported_at: string
  profile: Profile
  history: ReadingEntry[]
}
