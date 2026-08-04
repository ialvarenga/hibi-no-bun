import Anthropic from '@anthropic-ai/sdk'

const MODEL = 'claude-sonnet-4-6'

export interface TopicInput {
  jp: string
  pt: string
}

export interface GeneratedReading {
  paragraph_jp: string
  translation_pt: string
  vocab: { word: string; reading: string; meaning_pt: string }[]
  grammar_used: string[]
  source_title: string
  source_url: string
}

function buildPrompt(topics: TopicInput[], theme: string): string {
  const grammarList = topics.map((t) => `${t.jp} (${t.pt})`).join(', ')

  return `Você gera conteúdo de leitura diária para quem estuda japonês (nível aproximado JLPT N4-N3).

1. Use a ferramenta de busca na web para encontrar UM artigo, notícia ou post real e atualmente acessível, em japonês, sobre o tema: "${theme}".
2. Escreva um parágrafo ORIGINAL em japonês (entre 90 e 150 caracteres), inspirado/parafraseado nesse conteúdo (não copie trechos literais da fonte), incorporando naturalmente pelo menos 2 destes pontos gramaticais: ${grammarList}.
3. Responda APENAS com um JSON válido, sem markdown, sem texto antes ou depois, no formato exato:
{"paragraph_jp": "...", "translation_pt": "...", "vocab": [{"word": "...", "reading": "...", "meaning_pt": "..."}], "grammar_used": ["..."], "source_title": "...", "source_url": "..."}
O campo "vocab" deve ter entre 5 e 8 palavras relevantes do parágrafo, com leitura em hiragana/katakana e significado em português. "grammar_used" deve listar (em português) quais dos pontos gramaticais acima foram efetivamente usados. "source_url" deve ser a URL real da fonte encontrada na busca.`
}

function extractJSON(message: Anthropic.Message): GeneratedReading {
  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim()
  const cleaned = text.replace(/```json|```/g, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1) {
    throw new Error('A resposta do modelo não contém JSON válido')
  }
  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as GeneratedReading
  if (!parsed.paragraph_jp || !parsed.translation_pt) {
    throw new Error('JSON retornado está incompleto')
  }
  return parsed
}

export async function generateReading(
  topics: TopicInput[],
  theme: string,
): Promise<GeneratedReading> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY não configurada no ambiente do servidor')
  }
  const client = new Anthropic()

  const params: Anthropic.MessageCreateParamsNonStreaming = {
    model: MODEL,
    max_tokens: 2048,
    messages: [{ role: 'user', content: buildPrompt(topics, theme) }],
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
  }

  let response = await client.messages.create(params)

  // Web search runs in a server-side loop; if it hits the iteration limit the
  // API pauses the turn and expects the conversation to be re-sent to resume.
  let continuations = 0
  while (response.stop_reason === 'pause_turn' && continuations < 5) {
    response = await client.messages.create({
      ...params,
      messages: [
        ...params.messages,
        { role: 'assistant', content: response.content },
      ],
    })
    continuations++
  }

  return extractJSON(response)
}
