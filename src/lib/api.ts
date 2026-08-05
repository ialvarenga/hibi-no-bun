import type {
  ComprehensionQuestion,
  FeedbackInput,
  FeedbackRow,
  GrammarTopic,
  SharedEntry,
  VocabItem,
} from './types'

export interface GenerateRequest {
  topics: Pick<GrammarTopic, 'id' | 'jp' | 'pt'>[]
  theme: string
  recentTopics?: string[]
  jlptLevel?: string
  share?: boolean
}

export interface GenerateResponse {
  paragraph_jp: string
  translation_pt: string
  vocab: VocabItem[]
  grammar_used: string[]
  source_title: string
  source_url: string
  comprehension: ComprehensionQuestion[]
}

export async function generateReading(
  req: GenerateRequest,
  apiKey?: string,
): Promise<GenerateResponse> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (apiKey) headers['X-Anthropic-Api-Key'] = apiKey

  const res = await fetch('/api/generate', {
    method: 'POST',
    headers,
    body: JSON.stringify(req),
  })

  if (!res.ok) {
    let message = `Erro ${res.status} ao gerar o parágrafo`
    try {
      const body = await res.json()
      if (body?.error) message = body.error
    } catch {
      // ignore — keep default message
    }
    throw new Error(message)
  }

  return res.json()
}

interface SharedEntryResponse {
  id: string
  date: string
  theme: string
  topics_used: string[]
  paragraph_jp: string
  translation_pt: string
  vocab: VocabItem[]
  grammar_used: string[]
  source_title: string
  source_url: string
  comprehension: ComprehensionQuestion[]
}

// Fetches one random shared entry, asking the server to skip ids this
// device already has (best-effort — the server falls back to a possible
// repeat once everything has been seen).
export async function retrieveShared(excludeIds: string[]): Promise<SharedEntry> {
  const params = excludeIds.length > 0 ? `?exclude=${excludeIds.slice(-200).join(',')}` : ''
  const res = await fetch(`/api/shared${params}`)

  if (!res.ok) {
    let message = `Erro ${res.status} ao buscar pergunta compartilhada`
    try {
      const body = await res.json()
      if (body?.error) message = body.error
    } catch {
      // ignore — keep default message
    }
    throw new Error(message)
  }

  const body: SharedEntryResponse = await res.json()
  return {
    id: body.id,
    retrievedAt: new Date().toISOString(),
    date: body.date,
    theme: body.theme,
    topicsUsed: body.topics_used,
    paragraph_jp: body.paragraph_jp,
    translation_pt: body.translation_pt,
    vocab: body.vocab,
    grammar_used: body.grammar_used,
    source_title: body.source_title,
    source_url: body.source_url,
    comprehension: body.comprehension,
  }
}

async function parseError(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json()
    if (body?.error) return body.error
  } catch {
    // ignore — keep default message
  }
  return fallback
}

// Submits a user report about an AI-generated text (public endpoint).
export async function submitFeedback(input: FeedbackInput): Promise<void> {
  const res = await fetch('/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error(await parseError(res, `Erro ${res.status} ao enviar o feedback`))
}

// ---- Owner dashboard (session-cookie authed; credentials ride along) ----

// 401 from these means "not logged in" — surfaced as this sentinel so the
// dashboard can show its login form instead of a generic error.
export const NOT_AUTHED = 'NOT_AUTHED'

export async function adminLogin(password: string): Promise<void> {
  const res = await fetch('/api/admin-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ password }),
  })
  if (!res.ok) throw new Error(await parseError(res, 'Senha incorreta.'))
}

export async function adminLogout(): Promise<void> {
  await fetch('/api/admin-session', { method: 'DELETE', credentials: 'same-origin' })
}

export async function listFeedback(): Promise<FeedbackRow[]> {
  const res = await fetch('/api/feedback', { credentials: 'same-origin' })
  if (res.status === 401) throw new Error(NOT_AUTHED)
  if (!res.ok) throw new Error(await parseError(res, `Erro ${res.status} ao carregar feedbacks`))
  return res.json()
}

export async function resolveFeedback(id: string, resolved: boolean): Promise<void> {
  const res = await fetch('/api/feedback', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ id, resolved }),
  })
  if (res.status === 401) throw new Error(NOT_AUTHED)
  if (!res.ok) throw new Error(await parseError(res, `Erro ${res.status} ao atualizar`))
}

export async function deleteFeedback(id: string): Promise<void> {
  const res = await fetch('/api/feedback', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ id }),
  })
  if (res.status === 401) throw new Error(NOT_AUTHED)
  if (!res.ok) throw new Error(await parseError(res, `Erro ${res.status} ao excluir`))
}

// Removes a reported text from the community pool (owner action). A 404 means
// it's already gone, which is treated as success (idempotent).
export async function deleteSharedEntry(id: string): Promise<void> {
  const res = await fetch(`/api/shared/${id}`, { method: 'DELETE', credentials: 'same-origin' })
  if (res.status === 401) throw new Error(NOT_AUTHED)
  if (res.status === 404) return
  if (!res.ok) throw new Error(await parseError(res, `Erro ${res.status} ao remover do pool`))
}
