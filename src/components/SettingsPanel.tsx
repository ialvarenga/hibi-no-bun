import { useState } from 'react'
import { Check, Bell, BellOff, Eye, EyeOff, KeyRound, Trash2, Users } from 'lucide-react'
import { DEFAULT_TOPICS, DEFAULT_THEMES, JLPT_LEVELS } from '../lib/constants'
import type { Profile } from '../lib/types'

interface SettingsPanelProps {
  profile: Profile
  onToggleTopic: (id: string) => void
  onToggleTheme: (name: string) => void
  onSetApiKey: (key: string) => void
  onToggleJlptLevel: (level: string) => void
  onToggleShareGenerations: () => void
  notificationPermission: NotificationPermission | 'unsupported'
  onRequestNotifications: () => void
  onResetData: () => void
}

export default function SettingsPanel({
  profile,
  onToggleTopic,
  onToggleTheme,
  onSetApiKey,
  onToggleJlptLevel,
  onToggleShareGenerations,
  notificationPermission,
  onRequestNotifications,
  onResetData,
}: SettingsPanelProps) {
  const [apiKeyInput, setApiKeyInput] = useState(profile.apiKey)
  const [showApiKey, setShowApiKey] = useState(false)

  function handleResetClick() {
    const confirmed = window.confirm(
      'Isso vai apagar todo o histórico de parágrafos gerados e o progresso de revisão de vocabulário. Essa ação não pode ser desfeita. Continuar?',
    )
    if (confirmed) onResetData()
  }

  return (
    <div className="border border-paper-line bg-card rounded-2xl p-5 mb-8">
      <h2 className="text-sm font-bold uppercase tracking-wider mb-3 text-indigo">
        Nível JLPT
      </h2>
      <div className="flex flex-wrap gap-2 mb-6">
        {JLPT_LEVELS.map((l) => {
          const on = profile.jlptLevels.includes(l.value)
          return (
            <button
              key={l.value}
              onClick={() => onToggleJlptLevel(l.value)}
              className={`border rounded-full px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors ${
                on
                  ? 'bg-indigo border-indigo text-white'
                  : 'bg-transparent border-paper-line text-ink-soft'
              }`}
            >
              {on && <Check size={12} />}
              {l.label}
            </button>
          )
        })}
      </div>

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
      <div className="flex flex-wrap gap-2 mb-6">
        {DEFAULT_THEMES.map((name) => {
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

      <h2 className="text-sm font-bold uppercase tracking-wider mb-3 mt-6 text-indigo">
        Chave de API (Anthropic)
      </h2>
      <p className="text-xs text-ink-soft mb-2">
        Opcional: informe sua própria chave para gerar os parágrafos a partir deste
        dispositivo, sem depender de uma chave configurada no servidor. Ela fica salva só
        neste aparelho.
      </p>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <KeyRound size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            onBlur={() => onSetApiKey(apiKeyInput.trim())}
            onKeyDown={(e) => e.key === 'Enter' && onSetApiKey(apiKeyInput.trim())}
            type={showApiKey ? 'text' : 'password'}
            placeholder="sk-ant-..."
            autoComplete="off"
            className="border border-paper-line bg-white rounded-full pl-8 pr-8 py-1.5 text-xs w-full outline-none"
          />
          <button
            type="button"
            onClick={() => setShowApiKey((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft"
            aria-label={showApiKey ? 'Ocultar chave' : 'Mostrar chave'}
          >
            {showApiKey ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        </div>
      </div>

      <h2 className="text-sm font-bold uppercase tracking-wider mb-3 mt-6 text-indigo">
        Comunidade
      </h2>
      <p className="text-xs text-ink-soft mb-2">
        Quando ativado, cada parágrafo que você gerar também é salvo em um banco compartilhado,
        para que outras pessoas possam recebê-lo em "Pergunta da comunidade".
      </p>
      <button
        onClick={onToggleShareGenerations}
        className={`border rounded-full px-3 py-1.5 text-xs inline-flex items-center gap-1.5 transition-colors ${
          profile.shareGenerations
            ? 'bg-indigo border-indigo text-white'
            : 'bg-transparent border-paper-line text-ink-soft'
        }`}
      >
        {profile.shareGenerations ? <Check size={12} /> : <Users size={13} />}
        {profile.shareGenerations
          ? 'Compartilhando meus parágrafos'
          : 'Compartilhar meus parágrafos gerados'}
      </button>

      <h2 className="text-sm font-bold uppercase tracking-wider mb-3 mt-6 text-vermillion">
        Zona de perigo
      </h2>
      <p className="text-xs text-ink-soft mb-2">
        Apaga o histórico de parágrafos gerados e o progresso de revisão de vocabulário
        deste dispositivo. Suas configurações (temas, tópicos, nível JLPT, chave de API)
        são mantidas.
      </p>
      <button
        onClick={handleResetClick}
        className="border border-vermillion/40 text-vermillion rounded-full px-3 py-1.5 text-xs inline-flex items-center gap-1.5"
      >
        <Trash2 size={13} /> Apagar todo o progresso
      </button>
    </div>
  )
}
