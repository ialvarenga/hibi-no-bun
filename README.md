# 日々の一文 — Leitura diária de japonês

PWA instalável que gera diariamente um parágrafo original em japonês, ancorado em uma fonte
real da web, adaptado aos tópicos gramaticais que você já estudou e a temas do seu interesse.

## Stack

- **Frontend:** Vite + React + TypeScript + Tailwind CSS
- **Backend:** função serverless (`api/generate.ts`, compatível com Vercel Functions) que
  chama a API da Anthropic server-side — a `ANTHROPIC_API_KEY` nunca é exposta ao navegador
- **Persistência:** IndexedDB no navegador (via [`idb`](https://github.com/jakearchibald/idb)) —
  perfil, histórico de parágrafos e streak vivem só no dispositivo do usuário
- **PWA:** `vite-plugin-pwa` (manifest + service worker, instalável no celular)

## Rodando localmente

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Copie `.env.example` para `.env` e preencha sua chave da Anthropic:

   ```bash
   cp .env.example .env
   ```

   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```

3. Suba o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

   O Vite serve o frontend **e** um middleware de dev que expõe `POST /api/generate`
   localmente com a mesma lógica da função de produção — não precisa rodar `vercel dev`
   nem um processo separado.

## Deploy (Vercel)

1. Importe o repositório na Vercel.
2. Configure a env var `ANTHROPIC_API_KEY` no projeto (Settings → Environment Variables).
3. Build command: `npm run build` · Output directory: `dist` (detectado automaticamente
   pelo preset Vite da Vercel). A pasta `api/` é publicada como Vercel Functions
   automaticamente.

Para outro provedor serverless, adapte `api/generate.ts` — a lógica de geração está isolada
em `api/_lib/generateReading.ts` e não depende de tipos específicos da Vercel.

## Estrutura

```
api/
  generate.ts              # handler POST /api/generate (Vercel Function)
  _lib/generateReading.ts  # prompt, chamada à Anthropic, parsing do JSON
src/
  components/              # Header, StreakStamps, SettingsPanel, TodayCard, HistoryList
  lib/
    db.ts                  # camada de persistência IndexedDB (perfil + histórico)
    api.ts                 # cliente fetch para /api/generate
    notifications.ts       # lembrete diário local (Notifications API)
    export.ts              # exportação do histórico em JSON
    constants.ts           # tópicos gramaticais e temas padrão
  App.tsx
```

## Notificação diária

Como PWAs não têm garantia de execução em segundo plano sem um servidor de push, o lembrete
é local e pragmático: com permissão concedida, o app verifica — enquanto aberto ou logo ao
abrir — se o parágrafo do dia ainda não foi gerado e, a partir das 19h no horário local,
mostra uma notificação (no máximo uma por dia). Ative em **Configurações → Lembrete diário**.

## Exportar histórico

Como os dados vivem só no navegador (IndexedDB), use o botão de exportação no cabeçalho para
baixar um `.json` com perfil e histórico completo — útil como backup antes de limpar dados do
navegador ou trocar de dispositivo.
