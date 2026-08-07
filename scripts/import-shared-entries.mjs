// CLI manual para importar textos gerados externamente (por outra API/LLM)
// para o pool compartilhado (`shared_entries`), o mesmo banco usado por
// /api/generate (via saveSharedEntry) e servido em "Pergunta da comunidade".
//
// Uso:
//   node scripts/import-shared-entries.mjs caminho/para/textos.json
//
// Para uso manual/local; falha alto (exit 1) se alguma entrada estiver
// inválida. Para importar direto de produção sem acesso ao banco local, use
// o painel admin (/?admin → aba "Importar").
//
// O arquivo JSON deve ser um array de objetos no formato descrito em
// scripts/lib/ingest-core.mjs:validateEntry (mesmo shape de GeneratedReading,
// mais date/theme/topicsUsed/jlptLevel — veja src/lib/types.ts:ReadingEntry e
// api/_lib/generateReading.ts:GeneratedReading). Também aceita
// { "batchId": "...", "entries": [...] } — veja abaixo.
//
// Cada entrada pode incluir um campo "id" (UUID). Se ausente, o script deriva
// um id determinístico a partir de date+theme+paragraph_jp, então rodar o
// script de novo com o mesmo texto não duplica a linha — é isso que
// implementa o "checar se já está na base antes de inserir" por entrada.
//
// Opcionalmente, o JSON pode ter um "batchId" (qualquer string única sua,
// ex. o id da geração na outra API) no nível raiz:
//   { "batchId": "2026-08-08-manha", "entries": [...] }
// O script guarda os batchId já processados com sucesso (sem entradas
// inválidas) na tabela `shared_ingestions`. Rodar de novo com o MESMO
// batchId pula a importação inteira sem tocar no banco; um batchId
// DIFERENTE (ou ausente) processa normalmente. Se o lote teve alguma
// entrada inválida, o batchId não é gravado — rodar de novo com o mesmo id
// (depois de corrigir o JSON) tenta de novo.
//
// Precisa de DATABASE_URL (ou POSTGRES_URL) no ambiente ou em um `.env` na
// raiz do projeto (mesmo formato usado por `npm run dev`/Vercel).

import { runIngest } from './lib/ingest-core.mjs'

async function main() {
  const jsonPath = process.argv[2]
  if (!jsonPath) {
    console.error('Uso: node scripts/import-shared-entries.mjs caminho/para/textos.json')
    process.exit(1)
  }

  const result = await runIngest(jsonPath)
  for (const line of result.log) (line.includes('erro ') ? console.error : console.log)(line)

  if (result.batchSkipped) return

  console.log(
    `\nResumo: ${result.totalEntries} lidas · ${result.inserted} inseridas · ${result.duplicates} já existiam · ${result.invalid} inválidas`,
  )
  if (result.invalid > 0) process.exit(1)
}

main().catch((err) => {
  console.error('Falha ao importar:', err.message)
  process.exit(1)
})
