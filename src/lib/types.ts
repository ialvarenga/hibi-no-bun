export interface GrammarTopic {
  id: string;
  jp: string;
  pt: string;
}

export interface VocabItem {
  word: string;
  reading: string;
  meaning_pt: string;
}

export interface ComprehensionQuestion {
  question: string;
  choices: string[];
  answer_index: number;
}

export interface ReadingEntry {
  date: string; // YYYY-MM-DD
  theme: string;
  topicsUsed: string[];
  paragraph_jp: string;
  translation_pt: string;
  vocab: VocabItem[];
  grammar_used: string[];
  source_title: string;
  source_url: string;
  comprehension?: ComprehensionQuestion[];
  comprehensionAnswers?: Record<number, number>;
}

export interface Profile {
  studied: Record<string, boolean>;
  themes: string[];
  showFurigana: boolean;
  apiKey: string;
  jlptLevels: string[];
  shareGenerations: boolean;
  reviewBatchSize: number;
}

// A reading retrieved from the shared community pool (GET /api/shared).
// Kept separate from ReadingEntry/history: it belongs to whoever generated
// it, not to "today" for the person who retrieved it.
export interface SharedEntry {
  id: string;
  retrievedAt: string;
  date: string;
  theme: string;
  topicsUsed: string[];
  paragraph_jp: string;
  translation_pt: string;
  vocab: VocabItem[];
  grammar_used: string[];
  source_title: string;
  source_url: string;
  comprehension?: ComprehensionQuestion[];
  comprehensionAnswers?: Record<number, number>;
}

// A shared pool entry as returned to the owner dashboard's pool browser
// (snake_case from Postgres, unlike SharedEntry which is the camelCase shape
// served to regular users via GET /api/shared).
export interface SharedEntryAdminRow {
  id: string;
  created_at: string;
  date: string;
  theme: string;
  topics_used: string[];
  jlpt_level: string | null;
  paragraph_jp: string;
  translation_pt: string;
  vocab: VocabItem[];
  grammar_used: string[];
  source_title: string;
  source_url: string;
  comprehension: ComprehensionQuestion[] | null;
}

export interface SharedEntryListResponse {
  rows: SharedEntryAdminRow[];
  total: number;
}

export interface VocabCard {
  id: string; // `${word}::${reading}`
  word: string;
  reading: string;
  meaning_pt: string;
  box: number; // Leitner box, 0-5
  due: string; // YYYY-MM-DD, next review date
  reps: number;
  lapses: number;
  firstSeen: string;
  lastReviewed: string | null;
}

export type FeedbackCategory =
  | "paragraph"
  | "furigana"
  | "translation"
  | "vocab"
  | "grammar"
  | "comprehension"
  | "other";

// What the client sends when a user reports an AI-generated text. Carries a
// snapshot of the text because a user's own reading has no server id.
export interface FeedbackInput {
  category: FeedbackCategory;
  comment?: string;
  source: "own" | "shared";
  sharedEntryId?: string;
  paragraph_jp: string;
  translation_pt?: string;
  theme?: string;
  jlptLevel?: string;
  readingDate?: string;
}

// A feedback row as returned to the owner dashboard (snake_case from Postgres).
export interface FeedbackRow {
  id: string;
  created_at: string;
  category: string;
  comment: string | null;
  source: string;
  shared_entry_id: string | null;
  paragraph_jp: string;
  translation_pt: string | null;
  theme: string | null;
  jlpt_level: string | null;
  reading_date: string | null;
  resolved: boolean;
}

export interface ExportedData {
  exported_at: string;
  profile: Profile;
  history: ReadingEntry[];
}
