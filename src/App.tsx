import { useEffect, useMemo, useState, useCallback } from 'react'
import Header from './components/Header'
import StreakStamps from './components/StreakStamps'
import SettingsPanel from './components/SettingsPanel'
import TodayCard from './components/TodayCard'
import HistoryList from './components/HistoryList'
import { DEFAULT_TOPICS } from './lib/constants'
import { loadProfile, saveProfile, loadHistory, saveEntry } from './lib/db'
import { generateReading } from './lib/api'
import { exportHistoryAsJSON } from './lib/export'
import { todayStr } from './lib/date'
import {
  getNotificationPermission,
  requestNotificationPermission,
  maybeShowDailyReminder,
} from './lib/notifications'
import type { Profile, ReadingEntry } from './lib/types'

export default function App() {
  const [loaded, setLoaded] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [history, setHistory] = useState<ReadingEntry[]>([])
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | 'unsupported'
  >('default')

  const today = todayStr()
  const todayEntry = useMemo(
    () => history.find((h) => h.date === today) ?? null,
    [history, today],
  )
  const pastEntries = useMemo(() => history.filter((h) => h.date !== today), [history, today])
  const completedDates = useMemo(() => new Set(history.map((h) => h.date)), [history])

  useEffect(() => {
    ;(async () => {
      const [p, h] = await Promise.all([loadProfile(), loadHistory()])
      setProfile(p)
      setHistory(h)
      setLoaded(true)
      setNotificationPermission(getNotificationPermission())
    })()
  }, [])

  useEffect(() => {
    if (!loaded) return
    maybeShowDailyReminder(!!todayEntry)
  }, [loaded, todayEntry])

  const persistProfile = useCallback((next: Profile) => {
    setProfile(next)
    void saveProfile(next)
  }, [])

  function toggleTopic(id: string) {
    if (!profile) return
    persistProfile({ ...profile, studied: { ...profile.studied, [id]: !profile.studied[id] } })
  }

  function toggleTheme(name: string) {
    if (!profile) return
    const themes = profile.themes.includes(name)
      ? profile.themes.filter((t) => t !== name)
      : [...profile.themes, name]
    persistProfile({ ...profile, themes })
  }

  function toggleFurigana() {
    if (!profile) return
    persistProfile({ ...profile, showFurigana: !profile.showFurigana })
  }

  function addCustomTheme(name: string) {
    if (!profile) return
    const allThemes = profile.allThemes.includes(name)
      ? profile.allThemes
      : [...profile.allThemes, name]
    const themes = profile.themes.includes(name) ? profile.themes : [...profile.themes, name]
    persistProfile({ ...profile, allThemes, themes })
  }

  async function handleRequestNotifications() {
    const permission = await requestNotificationPermission()
    setNotificationPermission(permission)
  }

  async function handleGenerate() {
    if (!profile) return
    setError(null)

    const studiedTopics = DEFAULT_TOPICS.filter((t) => profile.studied[t.id])
    if (studiedTopics.length === 0) {
      setError('Selecione ao menos um tópico gramatical que você já estudou.')
      return
    }
    if (profile.themes.length === 0) {
      setError('Selecione ao menos um tema de interesse.')
      return
    }

    setGenerating(true)
    const theme = profile.themes[Math.floor(Math.random() * profile.themes.length)]

    try {
      const result = await generateReading({
        topics: studiedTopics.map((t) => ({ jp: t.jp, pt: t.pt })),
        theme,
      })
      const entry: ReadingEntry = {
        date: today,
        theme,
        topicsUsed: studiedTopics.map((t) => t.pt),
        ...result,
      }
      await saveEntry(entry)
      setHistory((h) => [entry, ...h.filter((x) => x.date !== today)])
    } catch (e) {
      const message = e instanceof Error ? e.message : 'erro desconhecido'
      setError(`Não consegui gerar o parágrafo de hoje (${message}). Tente novamente.`)
    } finally {
      setGenerating(false)
    }
  }

  if (!loaded || !profile) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <p className="text-ink-soft text-sm font-body">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-paper font-body text-ink">
      <div className="max-w-2xl mx-auto px-5 py-8">
        <Header
          settingsOpen={settingsOpen}
          onToggleSettings={() => setSettingsOpen((s) => !s)}
          onExport={() => void exportHistoryAsJSON()}
        />

        <StreakStamps completedDates={completedDates} />

        {settingsOpen && (
          <SettingsPanel
            profile={profile}
            onToggleTopic={toggleTopic}
            onToggleTheme={toggleTheme}
            onAddCustomTheme={addCustomTheme}
            notificationPermission={notificationPermission}
            onRequestNotifications={() => void handleRequestNotifications()}
          />
        )}

        <TodayCard
          entry={todayEntry}
          generating={generating}
          error={error}
          onGenerate={() => void handleGenerate()}
          showFurigana={profile.showFurigana}
          onToggleFurigana={toggleFurigana}
        />

        <HistoryList entries={pastEntries} showFurigana={profile.showFurigana} />
      </div>
    </div>
  )
}
