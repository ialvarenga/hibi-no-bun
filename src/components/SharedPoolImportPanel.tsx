import { useRef, useState } from "react";
import { Upload, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { importSharedEntries, NOT_AUTHED } from "../lib/api";
import type { ImportResult } from "../lib/types";

// Owner-only bulk import for the community pool, shown as a tab inside
// FeedbackDashboard. Accepts either a bare JSON array of entries or
// { batchId?, entries: [...] } — same shapes scripts/import-shared-entries.mjs
// reads from a file, pasted/uploaded here instead since running that script
// against production directly wasn't a good fit for this project's deploy.
export default function SharedPoolImportPanel({
  onAuthExpired,
}: {
  onAuthExpired: () => void;
}) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setError(null);
    setResult(null);
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result ?? ""));
    reader.onerror = () => setError("Não consegui ler o arquivo.");
    reader.readAsText(file);
  }

  async function handleImport() {
    setError(null);
    setResult(null);

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      setError("JSON inválido — confira a formatação antes de importar.");
      return;
    }

    const entries = Array.isArray(parsed)
      ? parsed
      : (parsed as { entries?: unknown })?.entries;
    const batchId =
      !Array.isArray(parsed) && typeof (parsed as { batchId?: unknown })?.batchId === "string"
        ? ((parsed as { batchId: string }).batchId.trim() || undefined)
        : undefined;

    if (!Array.isArray(entries)) {
      setError('O JSON deve ser um array de entradas (ou um objeto { "entries": [...] }).');
      return;
    }

    setSubmitting(true);
    try {
      const res = await importSharedEntries(entries, batchId);
      setResult(res);
    } catch (err) {
      if (err instanceof Error && err.message === NOT_AUTHED) {
        onAuthExpired();
      } else {
        setError(err instanceof Error ? err.message : "Erro ao importar");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <p className="text-sm text-ink-soft mb-4">
        Cole o JSON gerado (array de entradas, ou{" "}
        <code className="text-xs">{'{ "batchId", "entries": [...] }'}</code>) ou carregue um
        arquivo. Entradas com o mesmo id (explícito ou derivado do conteúdo) já existentes no
        pool são puladas automaticamente.
      </p>

      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="border border-paper-line rounded-full px-3 py-1.5 text-xs inline-flex items-center gap-1.5 text-ink-soft"
        >
          <Upload size={13} /> Carregar arquivo .json
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
      </div>

      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setResult(null);
          setError(null);
        }}
        placeholder='[{ "date": "2026-08-08", "theme": "Tecnologia", ... }]'
        rows={12}
        spellCheck={false}
        className="w-full border border-paper-line bg-card rounded-xl px-3 py-2 text-xs font-mono text-ink placeholder:text-ink-soft focus:outline-none focus:border-indigo-soft mb-3"
      />

      {error && <p className="text-xs mb-3 text-vermillion">{error}</p>}

      <button
        onClick={() => void handleImport()}
        disabled={!text.trim() || submitting}
        className="bg-indigo text-white rounded-full px-5 py-2 text-sm font-medium inline-flex items-center gap-2 disabled:opacity-60"
      >
        {submitting && <Loader2 size={14} className="animate-spin" />}
        Importar
      </button>

      {result && (
        <div className="mt-5 border border-paper-line rounded-xl px-4 py-3 bg-card">
          {result.batchSkipped ? (
            <p className="text-sm text-ink-soft inline-flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-moss" /> Lote "{result.batchId}" já tinha
              sido importado antes — nada a fazer.
            </p>
          ) : (
            <>
              <p className="text-sm text-ink mb-2 inline-flex items-center gap-1.5">
                {result.invalid > 0 ? (
                  <AlertTriangle size={14} className="text-vermillion" />
                ) : (
                  <CheckCircle2 size={14} className="text-moss" />
                )}
                {result.totalEntries} lidas · {result.inserted} inseridas ·{" "}
                {result.duplicates} já existiam · {result.invalid} inválidas
              </p>
              {result.messages.length > 0 && (
                <ul className="text-[11px] font-mono flex flex-col gap-0.5 max-h-64 overflow-y-auto">
                  {result.messages.map((m, i) => (
                    <li
                      key={i}
                      className={
                        m.startsWith("erro ")
                          ? "text-vermillion"
                          : m.startsWith("aviso ")
                            ? "text-ink-soft"
                            : "text-ink"
                      }
                    >
                      {m}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
