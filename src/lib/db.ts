import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import {
  DEFAULT_STUDIED_IDS,
  DEFAULT_SELECTED_THEMES,
  DEFAULT_THEMES,
  DEFAULT_JLPT_LEVELS,
  JLPT_LEVELS,
} from './constants'
import { todayStr, addDaysStr } from './date'
import type { Profile, ReadingEntry, SharedEntry, VocabCard } from './types'

const DB_NAME = 'jp-daily-reading'
const DB_VERSION = 3
const PROFILE_KEY = 'profile'

// Leitner box -> days until next review. New/failed cards land in box 0.
const BOX_INTERVAL_DAYS = [1, 1, 3, 7, 14, 30]

interface AppDB extends DBSchema {
  profile: {
    key: string
    value: Profile
  }
  history: {
    key: string // date
    value: ReadingEntry
    indexes: { 'by-date': string }
  }
  vocab: {
    key: string // `${word}::${reading}`
    value: VocabCard
  }
  shared: {
    key: string // server-assigned id
    value: SharedEntry
  }
}

let dbPromise: Promise<IDBPDatabase<AppDB>> | null = null

function getDB(): Promise<IDBPDatabase<AppDB>> {
  if (!dbPromise) {
    dbPromise = openDB<AppDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('profile')) {
          db.createObjectStore('profile')
        }
        if (!db.objectStoreNames.contains('history')) {
          const store = db.createObjectStore('history', { keyPath: 'date' })
          store.createIndex('by-date', 'date')
        }
        if (!db.objectStoreNames.contains('vocab')) {
          db.createObjectStore('vocab', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('shared')) {
          db.createObjectStore('shared', { keyPath: 'id' })
        }
      },
    })
  }
  return dbPromise
}

function vocabCardId(word: string, reading: string): string {
  return `${word}::${reading}`
}

function defaultProfile(): Profile {
  return {
    studied: Object.fromEntries(DEFAULT_STUDIED_IDS.map((id) => [id, true])),
    themes: DEFAULT_SELECTED_THEMES,
    showFurigana: true,
    apiKey: '',
    jlptLevels: DEFAULT_JLPT_LEVELS,
    shareGenerations: false,
  }
}

// Custom themes were removed as a generation-prompt injection guardrail —
// profiles saved before that (or restored from an old export) may still
// carry free-text entries in `themes`. Drop anything outside the fixed
// list so a stale entry can't get silently sent to /api/generate (where
// it would now just be rejected) or, worse, leave the user with zero
// selected themes.
function sanitizeThemes(themes: string[]): string[] {
  const allowed = new Set(DEFAULT_THEMES)
  const filtered = themes.filter((t) => allowed.has(t))
  return filtered.length > 0 ? filtered : DEFAULT_SELECTED_THEMES
}

// Profiles saved before jlptLevels was a multi-select array may carry a
// leftover single-string `jlptLevel` (e.g. "N4-N3" or "N2") — split it back
// into the array so an earlier choice isn't silently lost.
function migrateLegacyJlptLevel(stored: Partial<Profile> & { jlptLevel?: string }): string[] | null {
  if (stored.jlptLevels || !stored.jlptLevel) return null
  const known = new Set(JLPT_LEVELS.map((l) => l.value))
  const levels = stored.jlptLevel.split(/[^A-Za-z0-9]+/).filter((v) => known.has(v))
  return levels.length > 0 ? levels : null
}

export async function loadProfile(): Promise<Profile> {
  const db = await getDB()
  const stored = await db.get('profile', PROFILE_KEY)
  // Merge over defaults so profiles saved before a field was added (e.g.
  // showFurigana) still come back fully populated.
  const migratedJlptLevels = stored ? migrateLegacyJlptLevel(stored) : null
  const merged = {
    ...defaultProfile(),
    ...stored,
    ...(migratedJlptLevels ? { jlptLevels: migratedJlptLevels } : {}),
  }
  return { ...merged, themes: sanitizeThemes(merged.themes) }
}

export async function saveProfile(profile: Profile): Promise<void> {
  const db = await getDB()
  await db.put('profile', profile, PROFILE_KEY)
}

export async function loadHistory(): Promise<ReadingEntry[]> {
  const db = await getDB()
  const all = await db.getAll('history')
  return all.sort((a, b) => (a.date < b.date ? 1 : -1))
}

export async function saveEntry(entry: ReadingEntry): Promise<void> {
  const db = await getDB()
  await db.put('history', entry)
  // New words start due tomorrow, so a word introduced today isn't
  // immediately asked back the same day it was first read.
  await upsertVocabFromEntry(entry, addDaysStr(todayStr(), 1))
}

export async function exportAll(): Promise<{ profile: Profile; history: ReadingEntry[] }> {
  const [profile, history] = await Promise.all([loadProfile(), loadHistory()])
  return { profile, history }
}

async function upsertVocabFromEntry(entry: ReadingEntry, initialDueDate: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('vocab', 'readwrite')
  const store = tx.objectStore('vocab')
  for (const v of entry.vocab ?? []) {
    if (!v.word || !v.reading) continue
    const id = vocabCardId(v.word, v.reading)
    const existing = await store.get(id)
    if (existing) {
      await store.put({ ...existing, meaning_pt: v.meaning_pt })
    } else {
      const card: VocabCard = {
        id,
        word: v.word,
        reading: v.reading,
        meaning_pt: v.meaning_pt,
        box: 0,
        due: initialDueDate,
        reps: 0,
        lapses: 0,
        firstSeen: entry.date,
        lastReviewed: null,
      }
      await store.put(card)
    }
  }
  await tx.done
}

// Fills in vocab cards for history entries saved before the review feature
// existed (or from before this session). Cards that already exist are left
// untouched (other than a meaning_pt refresh); backfilled cards are due
// immediately since the words were already read in the past.
export async function backfillVocabFromHistory(): Promise<void> {
  const db = await getDB()
  const historyAll = await db.getAll('history')
  const today = todayStr()
  for (const entry of historyAll) {
    await upsertVocabFromEntry(entry, today)
  }
}

export async function loadDueVocabCards(): Promise<VocabCard[]> {
  const db = await getDB()
  const all = await db.getAll('vocab')
  const today = todayStr()
  return all.filter((c) => c.due <= today).sort((a, b) => (a.due < b.due ? -1 : 1))
}

export async function countDueVocabCards(): Promise<number> {
  const db = await getDB()
  const all = await db.getAll('vocab')
  const today = todayStr()
  return all.reduce((n, c) => (c.due <= today ? n + 1 : n), 0)
}

// Wipes reading history and vocab review progress, keeping the profile
// (settings, themes, API key) untouched.
export async function resetProgress(): Promise<void> {
  const db = await getDB()
  await Promise.all([db.clear('history'), db.clear('vocab')])
}

// Comprehension answers live on the history entry itself so they survive
// page reloads and cache clears — previously they were only in React state
// (ComprehensionCheck's own useState) and vanished on any remount.
export async function saveComprehensionAnswer(
  date: string,
  questionIndex: number,
  choiceIndex: number,
): Promise<void> {
  const db = await getDB()
  const entry = await db.get('history', date)
  if (!entry) return
  await db.put('history', {
    ...entry,
    comprehensionAnswers: { ...entry.comprehensionAnswers, [questionIndex]: choiceIndex },
  })
}

export async function loadShared(): Promise<SharedEntry[]> {
  const db = await getDB()
  const all = await db.getAll('shared')
  return all.sort((a, b) => (a.retrievedAt < b.retrievedAt ? 1 : -1))
}

// Ids already retrieved, sent to the server so it can avoid re-serving the
// same entries to this device.
export async function loadSharedIds(): Promise<string[]> {
  const db = await getDB()
  return db.getAllKeys('shared')
}

export async function saveSharedEntry(entry: SharedEntry): Promise<void> {
  const db = await getDB()
  await db.put('shared', entry)
}

export async function saveSharedComprehensionAnswer(
  id: string,
  questionIndex: number,
  choiceIndex: number,
): Promise<void> {
  const db = await getDB()
  const entry = await db.get('shared', id)
  if (!entry) return
  await db.put('shared', {
    ...entry,
    comprehensionAnswers: { ...entry.comprehensionAnswers, [questionIndex]: choiceIndex },
  })
}

export async function reviewVocabCard(id: string, remembered: boolean): Promise<void> {
  const db = await getDB()
  const card = await db.get('vocab', id)
  if (!card) return
  const today = todayStr()
  const box = remembered ? Math.min(card.box + 1, BOX_INTERVAL_DAYS.length - 1) : 0
  await db.put('vocab', {
    ...card,
    box,
    due: addDaysStr(today, BOX_INTERVAL_DAYS[box]),
    reps: card.reps + 1,
    lapses: card.lapses + (remembered ? 0 : 1),
    lastReviewed: today,
  })
}
