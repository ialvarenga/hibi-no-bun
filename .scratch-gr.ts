import Anthropic from '@anthropic-ai/sdk'

const MODEL = 'claude-sonnet-4-6'

export interface TopicInput {
  jp: string
  pt: string
}

export interface GeneratedReading {
  // Contains inline furigana annotations: each kanji run is immediately
  // followed by its reading in brackets, e.g. "私[わたし]は日本語[にほんご]".
  paragraph_jp: string
  translation_pt: string
  vocab: { word: string; reading: string; meaning_pt: string }[]
  grammar_used: string[]
  source_title: string
  source_url: string
}

const DEFAULT_JLPT_LEVEL = 'N4-N3'

function buildPrompt(
  topics: TopicInput[],
  theme: string,
  recentTopics: string[],
  jlptLevel: string,
): string {
  const grammarList = topics.map((t) => `${t.jp} (${t.pt})`).join(', ')
  const avoidList =
    recentTopics.length > 0
      ? `\n\nAssuntos já usados recentemente — escolha um artigo sobre um assunto DIFERENTE destes, mesmo que dentro do mesmo tema geral:\n${recentTopics.map((t) => `- ${t}`).join('\n')}`
      : ''

  return `Você gera conteúdo de leitura diária para quem estuda japonês (nível aproximado JLPT ${jlptLevel}).

1. Use a ferramenta de busca na web para encontrar UM artigo, notícia ou post real e atualmente acessível, em japonês, sobre o tema: "${theme}".${avoidList}
2. Escreva um parágrafo ORIGINAL em japonês (entre 90 e 150 caracteres, contando só o texto japonês, sem as leituras entre colchetes do passo 3), inspirado/parafraseado nesse conteúdo (não copie trechos literais da fonte), incorporando naturalmente pelo menos 2 destes pontos gramaticais: ${grammarList}.
3. Adicione furigana: logo após CADA palavra ou trecho contendo kanji, insira a leitura em hiragana entre colchetes, no formato 漢字[かんじ]. Não anote hiragana, katakana nem pontuação — só trechos com kanji. Exemplo: 私[わたし]は日本語[にほんご]を勉強[べんきょう]しています。
   ISSO INCLUI, SEM EXCEÇÃO: números escritos em kanji (一つ, 二人, 三年 etc.), nomes próprios e de lugares (東京[とうきょう], 日本[にほん]), kanji únicos comuns (今日[きょう], 人[ひと]) e qualquer kanji que se repita no texto — cada ocorrência precisa da sua própria anotação, mesmo repetida. NENHUM caractere kanji pode aparecer sem colchetes logo em seguida. Confira isso mentalmente antes de responder, mas NÃO escreva essa checagem, rascunho ou qualquer outro texto de raciocínio na resposta.
4. Responda SOMENTE com o JSON válido — a resposta deve começar diretamente em { e terminar em }, sem markdown, sem rascunho, sem explicação antes ou depois, no formato exato:
{"paragraph_jp": "...(com as anotações de furigana do passo 3)...", "translation_pt": "...", "vocab": [{"word": "...", "reading": "...", "meaning_pt": "..."}], "grammar_used": ["..."], "source_title": "...", "source_url": "..."}
O campo "vocab" deve ter entre 5 e 8 palavras relevantes do parágrafo, com leitura em hiragana/katakana e significado em português. "grammar_used" deve listar (em português) quais dos pontos gramaticais acima foram efetivamente usados. "source_url" deve ser a URL real da fonte encontrada na busca.`
}

function messageText(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim()
}

function extractJSON(message: Anthropic.Message): GeneratedReading {
  const text = messageText(message)
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

// Web search runs in a server-side loop; if it hits the iteration limit the
// API pauses the turn and expects the conversation to be re-sent to resume.
async function runToCompletion(
  client: Anthropic,
  params: Anthropic.MessageCreateParamsNonStreaming,
): Promise<Anthropic.Message> {
  let response = await client.messages.create(params)
  let continuations = 0
  while (response.stop_reason === 'pause_turn' && continuations < 5) {
    response = await client.messages.create({
      ...params,
      messages: [...params.messages, { role: 'assistant', content: response.content }],
    })
    continuations++
  }
  return response
}

export async function generateReading(
  topics: TopicInput[],
  theme: string,
  apiKey?: string,
  recentTopics: string[] = [],
  jlptLevel: string = DEFAULT_JLPT_LEVEL,
): Promise<GeneratedReading> {
  const key = apiKey || process.env.ANTHROPIC_API_KEY
  if (!key) {
    throw new Error(
      'Nenhuma chave da Anthropic configurada — defina ANTHROPIC_API_KEY no servidor ou adicione sua chave em Configurações.',
    )
  }
  const client = new Anthropic({ apiKey: key })

  const params: Anthropic.MessageCreateParamsNonStreaming = {
    model: MODEL,
    max_tokens: 2048,
    messages: [{ role: 'user', content: buildPrompt(topics, theme, recentTopics, jlptLevel) }],
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
  }

  const response = await runToCompletion(client, params)

  try {
    return extractJSON(response)
  } catch (err) {
    // The model occasionally ignores the "JSON only" instruction (e.g. it
    // apologizes in prose when the search comes back thin). Give it one
    // more chance, explicitly pointing out the mistake, before giving up.
    console.error(
      'generateReading: first attempt did not return valid JSON, retrying. Raw text:',
      messageText(response).slice(0, 500),
    )
    const retryResponse = await runToCompletion(client, {
      ...params,
      messages: [
        ...params.messages,
        { role: 'assistant', content: response.content },
        {
          role: 'user',
          content:
            'Sua resposta anterior não seguiu o formato pedido. Responda agora APENAS com o JSON válido no formato exato especificado antes, sem nenhum texto, explicação ou markdown adicional.',
        },
      ],
    })
    try {
      return extractJSON(retryResponse)
    } catch {
      console.error(
        'generateReading: retry also failed. Raw text:',
        messageText(retryResponse).slice(0, 500),
      )
      throw err
    }
  }
}
