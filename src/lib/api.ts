import type { GrammarTopic, VocabItem } from './types'

export interface GenerateRequest {
  topics: Pick<GrammarTopic, 'jp' | 'pt'>[]
  theme: string
}

export interface GenerateResponse {
  paragraph_jp: string
  translation_pt: string
  vocab: VocabItem[]
  grammar_used: string[]
  source_title: string
  source_url: string
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
