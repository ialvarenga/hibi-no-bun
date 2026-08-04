import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import { DEFAULT_STUDIED_IDS, DEFAULT_SELECTED_THEMES, DEFAULT_THEMES } from './constants'
import type { Profile, ReadingEntry } from './types'

const DB_NAME = 'jp-daily-reading'
const DB_VERSION = 1
const PROFILE_KEY = 'profile'

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
      },
    })
  }
  return dbPromise
}

function defaultProfile(): Profile {
  return {
    studied: Object.fromEntries(DEFAULT_STUDIED_IDS.map((id) => [id, true])),
    themes: DEFAULT_SELECTED_THEMES,
    allThemes: DEFAULT_THEMES,
    showFurigana: true,
  }
}

export async function loadProfile(): Promise<Profile> {
  const db = await getDB()
  const stored = await db.get('profile', PROFILE_KEY)
  // Merge over defaults so profiles saved before a field was added (e.g.
  // showFurigana) still come back fully populated.
  return { ...defaultProfile(), ...stored }
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
}

export async function exportAll(): Promise<{ profile: Profile; history: ReadingEntry[] }> {
  const [profile, history] = await Promise.all([loadProfile(), loadHistory()])
  return { profile, history }
}
