import type { VercelRequest, VercelResponse } from "@vercel/node";
import { importSharedEntries } from "../_lib/sharedDb";
import { isAuthed } from "../_lib/adminAuth";

// Owner-only: bulk import for the admin panel's "Importar" tab. Body:
// { batchId?: string, entries: RawSharedEntry[] }.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!isAuthed(req.headers.cookie)) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  const body = (req.body ?? {}) as { batchId?: unknown; entries?: unknown };
  const entries = Array.isArray(body.entries) ? body.entries : null;
  if (!entries) {
    res.status(400).json({ error: 'Corpo inválido: esperado { entries: [...] }' });
    return;
  }
  const batchId = typeof body.batchId === "string" && body.batchId.trim() ? body.batchId.trim() : undefined;

  try {
    const result = await importSharedEntries(entries, batchId);
    res.status(200).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("shared import error:", err);
    res.status(500).json({ error: message });
  }
}
