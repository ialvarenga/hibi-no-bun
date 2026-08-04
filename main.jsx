import { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  Loader2,
  ExternalLink,
  Settings2,
  Eye,
  EyeOff,
  Plus,
  X,
  Check,
} from "lucide-react";

// ---------- design tokens ----------
const COLORS = {
  paper: "#EFE9DC", // washi cream
  paperLine: "#D9D0BC",
  ink: "#1C1C1C",
  inkSoft: "#5B5648",
  indigo: "#223A5E",
  indigoSoft: "#3E5878",
  vermillion: "#C1432E",
  moss: "#6B7A5E",
  cardBg: "#FBF8F1",
};

const DISPLAY_FONT = "'Shippori Mincho', serif";
const BODY_FONT = "'Zen Kaku Gothic New', 'Noto Sans JP', sans-serif";

const DEFAULT_TOPICS = [
  { id: "passive", jp: "受け身", pt: "Voz passiva" },
  { id: "causative", jp: "使役形", pt: "Causativo" },
  { id: "causative_passive", jp: "使役受身", pt: "Causativo-passivo" },
  { id: "keigo_sonkei", jp: "尊敬語", pt: "Honorífico (respeito)" },
  { id: "keigo_kenjou", jp: "謙譲語", pt: "Honorífico (humilde)" },
  { id: "potential", jp: "可能形", pt: "Forma potencial" },
  { id: "volitional", jp: "意向形", pt: "Volitivo" },
  { id: "conditional_ba", jp: "〜ば", pt: "Condicional (ば)" },
  { id: "conditional_tara", jp: "〜たら", pt: "Condicional (たら)" },
  { id: "te_form", jp: "て形", pt: "Forma て" },
  { id: "comparison", jp: "比較", pt: "Comparação" },
  { id: "giving_receiving", jp: "やりもらい", pt: "Dar e receber" },
];

const DEFAULT_THEMES = [
  "Tecnologia",
  "Culinária",
  "Viagem",
  "Notícias",
  "Cultura pop",
  "Esportes",
  "Natureza",
  "Negócios",
  "Games",
  "Anime",
];

const STORAGE_KEY = "jp-daily-reading-data";
const MODEL = "claude-sonnet-4-6";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function callClaude(prompt) {
  return fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
      tools: [{ type: "web_search_20250305", name: "web_search" }],
    }),
  }).then((r) => r.json());
}

function extractJSON(data) {
  const text = (data?.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Resposta sem JSON válido");
  return JSON.parse(cleaned.slice(start, end + 1));
}

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [studied, setStudied] = useState(() =>
    Object.fromEntries(DEFAULT_TOPICS.slice(0, 3).map((t) => [t.id, true]))
  );
  const [themes, setThemes] = useState(["Tecnologia", "Viagem"]);
  const [customThemeInput, setCustomThemeInput] = useState("");
  const [allThemes, setAllThemes] = useState(DEFAULT_THEMES);
  const [history, setHistory] = useState([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [showTranslation, setShowTranslation] = useState(false);

  const today = todayStr();
  const todayEntry = history.find((h) => h.date === today) || null;

  // ---- load persisted state ----
  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY, false);
        if (res?.value) {
          const data = JSON.parse(res.value);
          if (data.studied) setStudied(data.studied);
          if (data.themes) setThemes(data.themes);
          if (data.allThemes) setAllThemes(data.allThemes);
          if (data.history) setHistory(data.history);
        }
      } catch (e) {
        // no data yet, that's fine
      }
      setLoaded(true);
    })();
  }, []);

  const persist = useCallback(
    async (patch) => {
      const next = {
        studied,
        themes,
        allThemes,
        history,
        ...patch,
      };
      try {
        await window.storage.set(STORAGE_KEY, JSON.stringify(next), false);
      } catch (e) {
        console.error("storage error", e);
      }
    },
    [studied, themes, allThemes, history]
  );

  useEffect(() => {
    if (loaded) persist({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studied, themes, allThemes, history, loaded]);

  // ---- Google fonts ----
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;700&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  function toggleTopic(id) {
    setStudied((s) => ({ ...s, [id]: !s[id] }));
  }

  function toggleTheme(name) {
    setThemes((t) =>
      t.includes(name) ? t.filter((x) => x !== name) : [...t, name]
    );
  }

  function addCustomTheme() {
    const v = customThemeInput.trim();
    if (!v) return;
    if (!allThemes.includes(v)) setAllThemes((a) => [...a, v]);
    if (!themes.includes(v)) setThemes((t) => [...t, v]);
    setCustomThemeInput("");
  }

  async function generateToday() {
    setError(null);
    setShowTranslation(false);
    const studiedTopics = DEFAULT_TOPICS.filter((t) => studied[t.id]);
    if (studiedTopics.length === 0) {
      setError("Selecione ao menos um tópico gramatical que você já estudou.");
      return;
    }
    if (themes.length === 0) {
      setError("Selecione ao menos um tema de interesse.");
      return;
    }
    setGenerating(true);
    const theme = themes[Math.floor(Math.random() * themes.length)];
    const grammarList = studiedTopics.map((t) => `${t.jp} (${t.pt})`).join(", ");

    const prompt = `Você gera conteúdo de leitura diária para quem estuda japonês (nível aproximado JLPT N4-N3).

1. Use a ferramenta de busca na web para encontrar UM artigo, notícia ou post real e atualmente acessível, em japonês, sobre o tema: "${theme}".
2. Escreva um parágrafo ORIGINAL em japonês (entre 90 e 150 caracteres), inspirado/parafraseado nesse conteúdo (não copie trechos literais da fonte), incorporando naturalmente pelo menos 2 destes pontos gramaticais: ${grammarList}.
3. Responda APENAS com um JSON válido, sem markdown, sem texto antes ou depois, no formato exato:
{"paragraph_jp": "...", "translation_pt": "...", "vocab": [{"word": "...", "reading": "...", "meaning_pt": "..."}], "grammar_used": ["..."], "source_title": "...", "source_url": "..."}
O campo "vocab" deve ter entre 5 e 8 palavras relevantes do parágrafo, com leitura em hiragana/katakana e significado em português. "grammar_used" deve listar (em português) quais dos pontos gramaticais acima foram efetivamente usados. "source_url" deve ser a URL real da fonte encontrada na busca.`;

    try {
      const data = await callClaude(prompt);
      const parsed = extractJSON(data);
      const entry = {
        date: today,
        theme,
        topicsUsed: studiedTopics.map((t) => t.pt),
        ...parsed,
      };
      setHistory((h) => {
        const withoutToday = h.filter((x) => x.date !== today);
        const next = [entry, ...withoutToday].slice(0, 60);
        persist({ history: next });
        return next;
      });
    } catch (e) {
      setError(
        "Não consegui gerar o parágrafo de hoje (" +
          (e.message || "erro desconhecido") +
          "). Tente novamente."
      );
    } finally {
      setGenerating(false);
    }
  }

  const last7 = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    return { key, done: history.some((h) => h.date === key) };
  });

  const pastEntries = history.filter((h) => h.date !== today);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLORS.paper,
        fontFamily: BODY_FONT,
        color: COLORS.ink,
      }}
      className="w-full"
    >
      <div className="max-w-2xl mx-auto px-5 py-8">
        {/* Header */}
        <header className="flex items-start justify-between mb-8">
          <div>
            <h1
              style={{ fontFamily: DISPLAY_FONT, color: COLORS.indigo }}
              className="text-3xl font-bold tracking-wide"
            >
              日々の一文
            </h1>
            <p style={{ color: COLORS.inkSoft }} className="text-sm mt-1">
              Leitura diária, no seu ritmo
            </p>
          </div>
          <button
            onClick={() => setSettingsOpen((s) => !s)}
            style={{
              borderColor: COLORS.paperLine,
              color: COLORS.indigo,
              background: COLORS.cardBg,
            }}
            className="border rounded-full p-2.5 shrink-0"
            aria-label="Configurações"
          >
            <Settings2 size={18} />
          </button>
        </header>

        {/* Streak stamps */}
        <div className="flex items-center gap-2 mb-8">
          {last7.map((d) => (
            <div
              key={d.key}
              title={d.key}
              style={{
                width: 30,
                height: 30,
                borderRadius: "9999px",
                border: `2px solid ${d.done ? COLORS.vermillion : COLORS.paperLine}`,
                color: d.done ? COLORS.vermillion : COLORS.paperLine,
                background: d.done ? "rgba(193,67,46,0.08)" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: DISPLAY_FONT,
                fontWeight: 700,
                fontSize: 11,
              }}
            >
              {d.done ? "済" : ""}
            </div>
          ))}
          <span style={{ color: COLORS.inkSoft }} className="text-xs ml-2">
            últimos 7 dias
          </span>
        </div>

        {/* Settings panel */}
        {settingsOpen && (
          <div
            style={{ background: COLORS.cardBg, borderColor: COLORS.paperLine }}
            className="border rounded-2xl p-5 mb-8"
          >
            <h2
              style={{ color: COLORS.indigo }}
              className="text-sm font-bold uppercase tracking-wider mb-3"
            >
              Tópicos gramaticais estudados
            </h2>
            <div className="flex flex-wrap gap-2 mb-6">
              {DEFAULT_TOPICS.map((t) => {
                const on = !!studied[t.id];
                return (
                  <button
                    key={t.id}
                    onClick={() => toggleTopic(t.id)}
                    style={{
                      background: on ? COLORS.moss : "transparent",
                      color: on ? "#fff" : COLORS.inkSoft,
                      borderColor: on ? COLORS.moss : COLORS.paperLine,
                    }}
                    className="border rounded-full px-3 py-1.5 text-xs flex items-center gap-1.5"
                  >
                    {on && <Check size={12} />}
                    <span style={{ fontFamily: DISPLAY_FONT }}>{t.jp}</span>
                    <span className="opacity-80">· {t.pt}</span>
                  </button>
                );
              })}
            </div>

            <h2
              style={{ color: COLORS.indigo }}
              className="text-sm font-bold uppercase tracking-wider mb-3"
            >
              Temas de interesse
            </h2>
            <div className="flex flex-wrap gap-2 mb-3">
              {allThemes.map((name) => {
                const on = themes.includes(name);
                return (
                  <button
                    key={name}
                    onClick={() => toggleTheme(name)}
                    style={{
                      background: on ? COLORS.indigo : "transparent",
                      color: on ? "#fff" : COLORS.inkSoft,
                      borderColor: on ? COLORS.indigo : COLORS.paperLine,
                    }}
                    className="border rounded-full px-3 py-1.5 text-xs"
                  >
                    {name}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <input
                value={customThemeInput}
                onChange={(e) => setCustomThemeInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustomTheme()}
                placeholder="Adicionar tema..."
                style={{ borderColor: COLORS.paperLine, background: "#fff" }}
                className="border rounded-full px-3 py-1.5 text-xs flex-1 outline-none"
              />
              <button
                onClick={addCustomTheme}
                style={{ background: COLORS.indigo, color: "#fff" }}
                className="rounded-full px-3 py-1.5 text-xs flex items-center gap-1"
              >
                <Plus size={12} /> Adicionar
              </button>
            </div>
          </div>
        )}

        {/* Today's card */}
        <section
          style={{ background: COLORS.cardBg, borderColor: COLORS.paperLine }}
          className="border rounded-2xl p-6 mb-8 relative overflow-hidden"
        >
          <div
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              width: 44,
              height: 44,
              borderRadius: "9999px",
              border: `2px solid ${COLORS.vermillion}`,
              color: COLORS.vermillion,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: DISPLAY_FONT,
              fontWeight: 700,
              fontSize: 12,
              transform: "rotate(-8deg)",
              opacity: 0.85,
            }}
          >
            今日
          </div>

          {!todayEntry && (
            <div className="text-center py-6">
              <p style={{ color: COLORS.inkSoft }} className="text-sm mb-5">
                Ainda sem parágrafo hoje.
              </p>
              <button
                onClick={generateToday}
                disabled={generating}
                style={{ background: COLORS.indigo, color: "#fff" }}
                className="rounded-full px-6 py-3 text-sm font-medium inline-flex items-center gap-2 disabled:opacity-60"
              >
                {generating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Buscando e
                    escrevendo...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} /> Gerar parágrafo de hoje
                  </>
                )}
              </button>
              {error && (
                <p style={{ color: COLORS.vermillion }} className="text-xs mt-3">
                  {error}
                </p>
              )}
            </div>
          )}

          {todayEntry && (
            <div>
              <p style={{ color: COLORS.inkSoft }} className="text-xs mb-3">
                Tema: {todayEntry.theme}
              </p>
              <p
                style={{ fontFamily: DISPLAY_FONT, color: COLORS.ink }}
                className="text-xl leading-relaxed mb-4 pr-12"
              >
                {todayEntry.paragraph_jp}
              </p>

              <button
                onClick={() => setShowTranslation((s) => !s)}
                style={{ color: COLORS.indigoSoft, borderColor: COLORS.paperLine }}
                className="border rounded-full px-3 py-1.5 text-xs inline-flex items-center gap-1.5 mb-4"
              >
                {showTranslation ? <EyeOff size={13} /> : <Eye size={13} />}
                {showTranslation ? "Ocultar tradução" : "Revelar tradução"}
              </button>
              {showTranslation && (
                <p style={{ color: COLORS.inkSoft }} className="text-sm mb-5">
                  {todayEntry.translation_pt}
                </p>
              )}

              <div className="mb-4">
                <h3
                  style={{ color: COLORS.indigo }}
                  className="text-xs font-bold uppercase tracking-wider mb-2"
                >
                  Vocabulário
                </h3>
                <div className="grid gap-1.5">
                  {(todayEntry.vocab || []).map((v, i) => (
                    <div
                      key={i}
                      className="flex items-baseline gap-2 text-sm"
                      style={{ color: COLORS.ink }}
                    >
                      <span style={{ fontFamily: DISPLAY_FONT }}>{v.word}</span>
                      <span style={{ color: COLORS.inkSoft }} className="text-xs">
                        ({v.reading})
                      </span>
                      <span style={{ color: COLORS.inkSoft }} className="text-xs">
                        — {v.meaning_pt}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-4 flex flex-wrap gap-1.5">
                {(todayEntry.grammar_used || []).map((g, i) => (
                  <span
                    key={i}
                    style={{
                      background: "rgba(107,122,94,0.12)",
                      color: COLORS.moss,
                    }}
                    className="text-xs rounded-full px-2.5 py-1"
                  >
                    {g}
                  </span>
                ))}
              </div>

              {todayEntry.source_url && (
                <a
                  href={todayEntry.source_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: COLORS.indigoSoft }}
                  className="text-xs inline-flex items-center gap-1 underline underline-offset-2"
                >
                  <ExternalLink size={12} />
                  Fonte: {todayEntry.source_title || todayEntry.source_url}
                </a>
              )}
            </div>
          )}
        </section>

        {/* History */}
        {pastEntries.length > 0 && (
          <section>
            <h2
              style={{ color: COLORS.indigo }}
              className="text-sm font-bold uppercase tracking-wider mb-3"
            >
              Histórico
            </h2>
            <div className="flex flex-col gap-3">
              {pastEntries.map((h) => (
                <details
                  key={h.date}
                  style={{
                    background: COLORS.cardBg,
                    borderColor: COLORS.paperLine,
                  }}
                  className="border rounded-xl px-4 py-3"
                >
                  <summary
                    className="cursor-pointer text-sm flex items-center justify-between"
                    style={{ color: COLORS.ink }}
                  >
                    <span>
                      {h.date} · {h.theme}
                    </span>
                  </summary>
                  <p
                    style={{ fontFamily: DISPLAY_FONT, color: COLORS.ink }}
                    className="text-base mt-3 leading-relaxed"
                  >
                    {h.paragraph_jp}
                  </p>
                  <p style={{ color: COLORS.inkSoft }} className="text-xs mt-2">
                    {h.translation_pt}
                  </p>
                </details>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}