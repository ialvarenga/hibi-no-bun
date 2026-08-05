import { useEffect, useState } from 'react'
import { Loader2, LogOut, RefreshCw, Check, Undo2, Trash2 } from 'lucide-react'
import {
  listFeedback,
  resolveFeedback,
  deleteFeedback,
  adminLogin,
  adminLogout,
  NOT_AUTHED,
} from '../lib/api'
import { FEEDBACK_CATEGORY_LABELS } from '../lib/constants'
import type { FeedbackRow } from '../lib/types'

// Owner-only view, reached at /?admin. The ?admin flag carries no secret — the
// real gate is the HttpOnly session cookie set by /api/admin-session. If the
// list endpoint 401s, we show the password login form.
export default function FeedbackDashboard() {
  const [authed, setAuthed] = useState<boolean | null>(null) // null = checking
  const [rows, setRows] = useState<FeedbackRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)
  const [onlyUnresolved, setOnlyUnresolved] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await listFeedback()
      setRows(data)
      setAuthed(true)
    } catch (err) {
      if (err instanceof Error && err.message === NOT_AUTHED) {
        setAuthed(false)
      } else {
        setError(err instanceof Error ? err.message : 'Erro ao carregar')
        setAuthed(true)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function handleLogin() {
    setLoggingIn(true)
    setError(null)
    try {
      await adminLogin(password)
      setPassword('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Senha incorreta.')
    } finally {
      setLoggingIn(false)
    }
  }

  async function handleLogout() {
    await adminLogout()
    setAuthed(false)
    setRows([])
  }

  async function toggleResolved(row: FeedbackRow) {
    const next = !row.resolved
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, resolved: next } : r)))
    try {
      await resolveFeedback(row.id, next)
    } catch (err) {
      // Revert on failure.
      setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, resolved: !next } : r)))
      setError(err instanceof Error ? err.message : 'Erro ao atualizar')
    }
  }

  async function handleDelete(row: FeedbackRow) {
    if (!window.confirm('Excluir este feedback permanentemente?')) return
    const prev = rows
    setRows((rs) => rs.filter((r) => r.id !== row.id))
    try {
      await deleteFeedback(row.id)
    } catch (err) {
      // Restore on failure.
      setRows(prev)
      setError(err instanceof Error ? err.message : 'Erro ao excluir')
    }
  }

  const unresolvedCount = rows.filter((r) => !r.resolved).length
  const visible = onlyUnresolved ? rows.filter((r) => !r.resolved) : rows

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen w-full bg-paper font-body text-ink">
      <div className="max-w-2xl mx-auto px-5 py-8">{children}</div>
    </div>
  )

  if (authed === null) {
    return shell(
      <p className="text-ink-soft text-sm inline-flex items-center gap-2">
        <Loader2 size={16} className="animate-spin" /> Carregando...
      </p>,
    )
  }

  if (!authed) {
    return shell(
      <div className="max-w-sm">
        <h1 className="text-lg font-bold mb-4 text-indigo">Painel de feedback</h1>
        <p className="text-sm text-ink-soft mb-4">Entre com a senha do administrador.</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && password && void handleLogin()}
          placeholder="Senha"
          className="w-full border border-paper-line bg-card rounded-lg px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus:outline-none focus:border-indigo-soft mb-3"
        />
        {error && <p className="text-xs mb-3 text-vermillion">{error}</p>}
        <button
          onClick={() => void handleLogin()}
          disabled={!password || loggingIn}
          className="bg-indigo text-white rounded-full px-5 py-2 text-sm font-medium inline-flex items-center gap-2 disabled:opacity-60"
        >
          {loggingIn && <Loader2 size={14} className="animate-spin" />}
          Entrar
        </button>
      </div>,
    )
  }

  return shell(
    <>
      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="text-lg font-bold text-indigo">
          Feedback{' '}
          <span className="text-ink-soft font-normal text-sm">
            ({unresolvedCount} não {unresolvedCount === 1 ? 'resolvido' : 'resolvidos'})
          </span>
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void load()}
            disabled={loading}
            className="border border-paper-line rounded-full px-3 py-1.5 text-xs inline-flex items-center gap-1.5 text-ink-soft disabled:opacity-60"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : undefined} /> Atualizar
          </button>
          <button
            onClick={() => void handleLogout()}
            className="border border-paper-line rounded-full px-3 py-1.5 text-xs inline-flex items-center gap-1.5 text-ink-soft"
          >
            <LogOut size={13} /> Sair
          </button>
        </div>
      </div>

      <label className="flex items-center gap-2 text-xs text-ink-soft mb-4 select-none">
        <input
          type="checkbox"
          checked={onlyUnresolved}
          onChange={(e) => setOnlyUnresolved(e.target.checked)}
        />
        Mostrar apenas não resolvidos
      </label>

      {error && <p className="text-xs mb-4 text-vermillion">{error}</p>}

      {visible.length === 0 ? (
        <p className="text-sm text-ink-soft">Nenhum feedback {onlyUnresolved ? 'pendente' : 'ainda'}.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((r) => (
            <div
              key={r.id}
              className={`border rounded-xl px-4 py-3 ${
                r.resolved ? 'border-paper-line bg-paper opacity-60' : 'border-paper-line bg-card'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo">
                  {FEEDBACK_CATEGORY_LABELS[r.category] ?? r.category}
                </span>
                <span className="text-xs text-ink-soft shrink-0">
                  {r.source === 'shared' ? 'Comunidade' : 'Próprio'}
                  {r.reading_date ? ` · ${r.reading_date}` : ''}
                  {r.theme ? ` · ${r.theme}` : ''}
                </span>
              </div>
              {r.comment && <p className="text-sm mb-2 text-ink whitespace-pre-wrap">{r.comment}</p>}
              <p className="font-display text-sm leading-loose text-ink-soft mb-2">
                {r.paragraph_jp}
              </p>
              {r.translation_pt && (
                <p className="text-xs text-ink-soft mb-2">{r.translation_pt}</p>
              )}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-ink-soft">
                  {new Date(r.created_at).toLocaleString('pt-BR')}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => void toggleResolved(r)}
                    className="border border-paper-line rounded-full px-3 py-1 text-xs inline-flex items-center gap-1.5 text-ink-soft"
                  >
                    {r.resolved ? (
                      <>
                        <Undo2 size={12} /> Reabrir
                      </>
                    ) : (
                      <>
                        <Check size={12} /> Resolver
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => void handleDelete(r)}
                    aria-label="Excluir feedback"
                    className="border border-paper-line rounded-full px-3 py-1 text-xs inline-flex items-center gap-1.5 text-vermillion"
                  >
                    <Trash2 size={12} /> Excluir
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>,
  )
}
