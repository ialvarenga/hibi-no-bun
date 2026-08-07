import { useEffect, useState } from "react";
import {
  Loader2,
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { listSharedEntries, deleteSharedEntry, NOT_AUTHED } from "../lib/api";
import { JLPT_LEVELS } from "../lib/constants";
import type { SharedEntryAdminRow } from "../lib/types";

const PAGE_SIZE = 20;

// Owner-only browser for the community pool (shared_entries table), shown as
// a tab inside FeedbackDashboard. Separate from the feedback list: this is
// "what's in the pool" rather than "what users reported about it".
export default function SharedPoolPanel({
  onAuthExpired,
}: {
  onAuthExpired: () => void;
}) {
  const [rows, setRows] = useState<SharedEntryAdminRow[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  async function load(reset: boolean) {
    setLoading(true);
    setError(null);
    try {
      const offset = reset ? 0 : rows.length;
      const data = await listSharedEntries(
        offset,
        PAGE_SIZE,
        level ? [level] : [],
      );
      setRows((rs) => (reset ? data.rows : [...rs, ...data.rows]));
      setTotal(data.total);
    } catch (err) {
      if (err instanceof Error && err.message === NOT_AUTHED) {
        onAuthExpired();
      } else {
        setError(err instanceof Error ? err.message : "Erro ao carregar");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  async function handleDelete(id: string) {
    if (
      !window.confirm(
        "Remover este texto do pool da comunidade? Ele deixará de ser servido para outros usuários.",
      )
    )
      return;
    const prevRows = rows;
    const prevTotal = total;
    setRows((rs) => rs.filter((r) => r.id !== id));
    setTotal((t) => (t !== null ? Math.max(0, t - 1) : t));
    try {
      await deleteSharedEntry(id);
    } catch (err) {
      setRows(prevRows);
      setTotal(prevTotal);
      setError(err instanceof Error ? err.message : "Erro ao remover do pool");
    }
  }

  function toggleExpanded(id: string) {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h2 className="text-sm text-ink-soft">
          {total === null
            ? "Carregando…"
            : `${total} ${total === 1 ? "texto" : "textos"} no pool`}
        </h2>
        <div className="flex items-center gap-2">
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="border border-paper-line bg-card rounded-full px-3 py-1.5 text-xs text-ink focus:outline-none focus:border-indigo-soft"
          >
            <option value="">Todos os níveis</option>
            {JLPT_LEVELS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => void load(true)}
            disabled={loading}
            className="border border-paper-line rounded-full px-3 py-1.5 text-xs inline-flex items-center gap-1.5 text-ink-soft disabled:opacity-60"
          >
            <RefreshCw
              size={13}
              className={loading ? "animate-spin" : undefined}
            />{" "}
            Atualizar
          </button>
        </div>
      </div>

      {error && <p className="text-xs mb-4 text-vermillion">{error}</p>}

      {rows.length === 0 && !loading ? (
        <p className="text-sm text-ink-soft">Nenhum texto no pool ainda.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((r) => {
            const isOpen = expanded.has(r.id);
            return (
              <div
                key={r.id}
                className="border border-paper-line rounded-xl px-4 py-3 bg-card"
              >
                <button
                  onClick={() => toggleExpanded(r.id)}
                  className="w-full flex items-center justify-between gap-2 text-left"
                >
                  <span className="text-xs text-ink-soft">
                    {r.date}
                    {r.jlpt_level ? ` · ${r.jlpt_level}` : ""} · {r.theme}
                  </span>
                  {isOpen ? (
                    <ChevronUp size={14} className="text-ink-soft shrink-0" />
                  ) : (
                    <ChevronDown size={14} className="text-ink-soft shrink-0" />
                  )}
                </button>
                <p
                  className={`font-display text-sm leading-loose text-ink mt-2 ${
                    isOpen ? "" : "line-clamp-2"
                  }`}
                >
                  {r.paragraph_jp}
                </p>
                {isOpen && (
                  <>
                    {r.translation_pt && (
                      <p className="text-xs text-ink-soft mt-2">
                        {r.translation_pt}
                      </p>
                    )}
                    <p className="text-[11px] text-ink-soft mt-2">
                      {r.vocab.length} palavras ·{" "}
                      {r.grammar_used.join(", ") || "sem gramática marcada"}
                    </p>
                  </>
                )}
                <div className="flex items-center justify-between gap-2 mt-2">
                  <span className="text-[11px] text-ink-soft">
                    {new Date(r.created_at).toLocaleString("pt-BR")}
                  </span>
                  <button
                    onClick={() => void handleDelete(r.id)}
                    className="border border-paper-line rounded-full px-3 py-1 text-xs inline-flex items-center gap-1.5 text-vermillion"
                  >
                    <Trash2 size={12} /> Remover
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {total !== null && rows.length < total && (
        <button
          onClick={() => void load(false)}
          disabled={loading}
          className="mt-4 w-full border border-paper-line rounded-full px-3 py-2 text-xs text-ink-soft inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
        >
          {loading && <Loader2 size={13} className="animate-spin" />}
          Carregar mais
        </button>
      )}
    </>
  );
}
