import { useState } from 'react'
import { Check, Plus, Bell, BellOff } from 'lucide-react'
import { DEFAULT_TOPICS } from '../lib/constants'
import type { Profile } from '../lib/types'

interface SettingsPanelProps {
  profile: Profile
  onToggleTopic: (id: string) => void
  onToggleTheme: (name: string) => void
  onAddCustomTheme: (name: string) => void
  notificationPermission: NotificationPermission | 'unsupported'
  onRequestNotifications: () => void
}

export default function SettingsPanel({
  profile,
  onToggleTopic,
  onToggleTheme,
  onAddCustomTheme,
  notificationPermission,
  onRequestNotifications,
}: SettingsPanelProps) {
  const [customThemeInput, setCustomThemeInput] = useState('')

  function handleAddTheme() {
    const value = customThemeInput.trim()
    if (!value) return
    onAddCustomTheme(value)
    setCustomThemeInput('')
  }

  return (
    <div className="border border-paper-line bg-card rounded-2xl p-5 mb-8">
      <h2 className="text-sm font-bold uppercase tracking-wider mb-3 text-indigo">
        Tópicos gramaticais estudados
      </h2>
      <div className="flex flex-wrap gap-2 mb-6">
        {DEFAULT_TOPICS.map((t) => {
          const on = !!profile.studied[t.id]
          return (
            <button
              key={t.id}
              onClick={() => onToggleTopic(t.id)}
              className={`border rounded-full px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors ${
                on
                  ? 'bg-moss border-moss text-white'
                  : 'bg-transparent border-paper-line text-ink-soft'
              }`}
            >
              {on && <Check size={12} />}
              <span className="font-display">{t.jp}</span>
              <span className="opacity-80">· {t.pt}</span>
            </button>
          )
        })}
      </div>

      <h2 className="text-sm font-bold uppercase tracking-wider mb-3 text-indigo">
        Temas de interesse
      </h2>
      <div className="flex flex-wrap gap-2 mb-3">
        {profile.allThemes.map((name) => {
          const on = profile.themes.includes(name)
          return (
            <button
              key={name}
              onClick={() => onToggleTheme(name)}
              className={`border rounded-full px-3 py-1.5 text-xs transition-colors ${
                on
                  ? 'bg-indigo border-indigo text-white'
                  : 'bg-transparent border-paper-line text-ink-soft'
              }`}
            >
              {name}
            </button>
          )
        })}
      </div>
      <div className="flex gap-2 mb-6">
        <input
          value={customThemeInput}
          onChange={(e) => setCustomThemeInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddTheme()}
          placeholder="Adicionar tema..."
          className="border border-paper-line bg-white rounded-full px-3 py-1.5 text-xs flex-1 outline-none"
        />
        <button
          onClick={handleAddTheme}
          className="bg-indigo text-white rounded-full px-3 py-1.5 text-xs flex items-center gap-1 shrink-0"
        >
          <Plus size={12} /> Adicionar
        </button>
      </div>

      <h2 className="text-sm font-bold uppercase tracking-wider mb-3 text-indigo">
        Lembrete diário
      </h2>
      {notificationPermission === 'unsupported' && (
        <p className="text-xs text-ink-soft">
          Notificações não são suportadas neste navegador.
        </p>
      )}
      {notificationPermission === 'granted' && (
        <p className="text-xs text-ink-soft flex items-center gap-1.5">
          <Bell size={13} className="text-moss" /> Lembretes ativados — avisamos se o
          parágrafo de hoje ainda não foi lido.
        </p>
      )}
      {notificationPermission !== 'unsupported' && notificationPermission !== 'granted' && (
        <button
          onClick={onRequestNotifications}
          className="border border-paper-line rounded-full px-3 py-1.5 text-xs inline-flex items-center gap-1.5 text-indigo-soft"
        >
          <BellOff size={13} /> Ativar lembrete diário
        </button>
      )}
    </div>
  )
}
