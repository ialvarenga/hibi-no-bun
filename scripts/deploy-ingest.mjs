// Hook de build: ingesta automaticamente o arquivo de textos do pool
// compartilhado durante o deploy da Vercel, para nunca precisar rodar o
// import manualmente contra produção. Chamado a partir de "npm run build"
// (veja package.json).
//
// Fica restrito a builds de produção na Vercel (VERCEL_ENV === 'production'
// — variável que a Vercel injeta sozinha, sem configuração) para não gravar
// no banco compartilhado a cada preview de PR, e para não rodar em
// `npm run build` local (onde VERCEL_ENV não existe).
//
// NUNCA falha o build: arquivo ausente, DB indisponível, entradas inválidas
// ou qualquer erro inesperado só geram um log e o processo termina com
// exit 0 — um problema no lote do dia não pode bloquear o deploy de um
// código não relacionado. Rode `npm run import:shared -- arquivo.json`
// manualmente se quiser ver falhas de validação de forma "alta" (exit 1).
//
// Caminho do arquivo: `entries.json` na raiz do projeto por padrão,
// sobrescrevível com a env var INGEST_FILE.

import { existsSync } from 'node:fs'
import { runIngest, loadDotEnv } from './lib/ingest-core.mjs'

async function main() {
  if (process.env.VERCEL_ENV !== 'production') {
    console.log(`[deploy-ingest] pulando (VERCEL_ENV=${process.env.VERCEL_ENV ?? '<ausente>'}, só roda em production)`)
    return
  }

  const jsonPath = process.env.INGEST_FILE || 'entries.json'
  if (!existsSync(jsonPath)) {
    console.log(`[deploy-ingest] "${jsonPath}" não existe — nada para importar neste deploy.`)
    return
  }

  loadDotEnv()
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
    console.warn('[deploy-ingest] DATABASE_URL/POSTGRES_URL ausente — pulando ingestão.')
    return
  }

  console.log(`[deploy-ingest] importando "${jsonPath}"...`)
  const result = await runIngest(jsonPath)
  for (const line of result.log) console.log(`[deploy-ingest] ${line}`)

  if (!result.batchSkipped) {
    console.log(
      `[deploy-ingest] resumo: ${result.totalEntries} lidas · ${result.inserted} inseridas · ` +
        `${result.duplicates} já existiam · ${result.invalid} inválidas`,
    )
  }
}

main().catch((err) => {
  console.error('[deploy-ingest] falhou, mas o build continua:', err.message)
})
