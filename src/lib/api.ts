import type { ComprehensionQuestion, GrammarTopic, SharedEntry, VocabItem } from './types'

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
