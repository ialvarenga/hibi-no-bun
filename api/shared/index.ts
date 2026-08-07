import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getRandomShared, listSharedEntries } from "../_lib/sharedDb";
import { ALLOWED_JLPT_LEVELS } from "../_lib/constants";
import { isAuthed } from "../_lib/adminAuth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const jlptLevelParam = req.query.jlptLevel;
  const jlptLevels = (
    Array.isArray(jlptLevelParam)
      ? jlptLevelParam.join(",")
      : (jlptLevelParam ?? "")
  )
    .split(",")
    .map((l) => l.trim())
    .filter((l) => ALLOWED_JLPT_LEVELS.includes(l));

  // Owner-only: paginated browse of the whole pool for the admin dashboard.
  if (req.query.list !== undefined) {
    if (!isAuthed(req.headers.cookie)) {
      res.status(401).json({ error: "Não autenticado" });
      return;
    }
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    try {
      const result = await listSharedEntries(offset, limit, jlptLevels);
      res.status(200).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      console.error("shared list error:", err);
      res.status(500).json({ error: message });
    }
    return;
  }

  const excludeParam = req.query.exclude;
  const excludeIds = (
    Array.isArray(excludeParam) ? excludeParam.join(",") : (excludeParam ?? "")
  )
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  try {
    const entry = await getRandomShared(excludeIds, jlptLevels);
    if (!entry) {
      res
        .status(404)
        .json({ error: "Nenhuma pergunta compartilhada disponível ainda." });
      return;
    }
    res.status(200).json(entry);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("shared random error:", err);
    res.status(500).json({ error: message });
  }
}
