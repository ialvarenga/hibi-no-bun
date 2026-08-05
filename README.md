# 日々の一文 — Leitura diária de japonês

PWA instalável que gera diariamente um parágrafo original em japonês, ancorado em uma fonte
real da web, adaptado aos tópicos gramaticais que você já estudou e a temas do seu interesse.

## Stack

- **Frontend:** Vite + React + TypeScript + Tailwind CSS
- **Backend:** funções serverless (`api/generate.ts`, `api/shared/`, compatíveis com Vercel
  Functions) que chamam a API da Anthropic e o banco server-side — a `ANTHROPIC_API_KEY` e a
  `DATABASE_URL` nunca são expostas ao navegador
- **Persistência local:** IndexedDB no navegador (via [`idb`](https://github.com/jakearchibald/idb)) —
  perfil, histórico de parágrafos e streak vivem só no dispositivo do usuário
- **Persistência compartilhada:** Postgres (Docker localmente, Vercel Postgres/Neon em produção
  — acesso via [`pg`](https://node-postgres.com), o driver padrão, então o mesmo código funciona
  nos dois ambientes) — quando "Compartilhar meus parágrafos gerados" está ativado em
  Configurações, cada parágrafo gerado também é salvo em um banco compartilhado, de onde
  qualquer usuário pode puxar uma pergunta aleatória em "Pergunta da comunidade"
- **PWA:** `vite-plugin-pwa` (manifest + service worker, instalável no celular)

## Rodando localmente

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Copie `.env.example` para `.env` e preencha sua chave da Anthropic. O `DATABASE_URL` de
   exemplo já aponta para o banco local do passo 3 abaixo — só copie como está:

   ```bash
   cp .env.example .env
   ```

   ```
   ANTHROPIC_API_KEY=sk-ant-...
   DATABASE_URL=postgres://hibi:hibi@localhost:5432/hibi_no_ichibun
   ```

3. Suba um Postgres local via Docker (dados persistem entre reinícios em um volume nomeado):

   ```bash
   npm run db:up
   ```

   Outros comandos úteis: `npm run db:logs` (acompanhar logs), `npm run db:down` (parar,
   mantendo os dados), `npm run db:reset` (parar e apagar todos os dados). A tabela
   `shared_entries` é criada automaticamente (`CREATE TABLE IF NOT EXISTS`) na primeira geração
   compartilhada — não há passo de migração manual. Sem esse passo, o app funciona normalmente;
   só o botão "Pergunta da comunidade" e a opção "Compartilhar" retornam erro.

4. Suba o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

   O Vite serve o frontend **e** um middleware de dev que expõe `POST /api/generate`,
   `GET /api/shared`, `/api/feedback` e `/api/admin-session` localmente com a mesma lógica das
   funções de produção — não precisa rodar `vercel dev` nem um processo separado.

## Feedback dos textos gerados

Como os textos são gerados por IA, cada texto (o de hoje, os do histórico e os da comunidade)
tem um botão **"Reportar erro"**: o usuário escolhe qual parte está errada (japonês, furigana,
tradução, vocabulário, gramática, pergunta de compreensão ou outro) e pode deixar um comentário.
Como as leituras próprias vivem só no IndexedDB (sem id no servidor), o report guarda um
**snapshot** do texto; reports da comunidade também guardam o `shared_entry_id`.

- **Notificação:** a cada report, um e-mail é enviado para `FEEDBACK_EMAIL_TO` via Resend. Sem
  `RESEND_API_KEY`, o envio do report continua funcionando e apenas registra um aviso.
- **Painel do dono:** abra `/?admin` para ver os reports (mais recentes primeiro), filtrar por
  não resolvidos, marcar como resolvido e excluir spam. Reports de textos da comunidade também
  têm **"Remover do pool"**, que apaga aquele texto de `shared_entries` (via `DELETE
  /api/shared/:id`, autenticado) para que ele pare de ser servido a outros usuários — a correção
  vale para buscas futuras (quem já puxou o texto tem uma cópia local). Textos próprios não têm
  essa opção, pois vivem só no dispositivo de quem gerou; use esses reports como sinal para
  ajustar o prompt em `api/_lib/generateReading.ts`. O acesso é protegido por **login com senha** — a
  `ADMIN_PASSWORD` é trocada por um cookie de sessão assinado (HttpOnly, não fica na URL nem em
  logs, não é legível por JS). Configure `ADMIN_PASSWORD` e `SESSION_SECRET` (veja
  `.env.example`). A tabela `feedback` é criada automaticamente no primeiro report.

## Deploy (Vercel)

1. Importe o repositório na Vercel.
2. Configure a env var `ANTHROPIC_API_KEY` no projeto (Settings → Environment Variables).
3. Storage → Create Database → Postgres (Neon) → linke ao projeto. Isso injeta `DATABASE_URL`/
   `POSTGRES_URL` automaticamente nos ambientes de Preview/Production; rode `vercel env pull`
   para trazer o valor para o `.env` local (substituindo o `DATABASE_URL` local do Docker, se
   quiser testar contra o banco de produção). A tabela `shared_entries` é criada
   automaticamente (`CREATE TABLE IF NOT EXISTS`) na primeira geração compartilhada — não há
   passo de migração manual.
4. Build command: `npm run build` · Output directory: `dist` (detectado automaticamente
   pelo preset Vite da Vercel). A pasta `api/` é publicada como Vercel Functions
   automaticamente.

Para outro provedor serverless, adapte `api/generate.ts`/`api/shared/` — a lógica de geração
está isolada em `api/_lib/generateReading.ts` e a de persistência compartilhada em
`api/_lib/sharedDb.ts` (acesso via `pg`, sem nada específico da Vercel), exceto o uso de
`waitUntil` de `@vercel/functions` em `api/generate.ts`, para salvar em segundo plano depois de
responder ao cliente.

## Estrutura

```
docker-compose.yml        # Postgres local para desenvolvimento (npm run db:up)
api/
  generate.ts              # handler POST /api/generate (Vercel Function)
  shared/
    index.ts               # handler GET /api/shared (pergunta aleatória)
    [id].ts                # handler GET /api/shared/:id (busca direta por id)
  _lib/
    generateReading.ts     # prompt, chamada à Anthropic, parsing do JSON
    sharedDb.ts             # schema + queries do banco compartilhado (Postgres/Neon)
src/
  components/              # Header, StreakStamps, SettingsPanel, TodayCard, HistoryList,
                            # SharedCard
  lib/
    db.ts                  # camada de persistência IndexedDB (perfil + histórico + shared)
    api.ts                 # cliente fetch para /api/generate e /api/shared
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
