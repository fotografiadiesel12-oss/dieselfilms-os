import { kv } from "@vercel/kv";
import { requireSession } from "../_lib/session.js";

export default async function handler(req, res) {
  const { id } = req.query;
  const key = `orcamento:${id}`;

  if (req.method === "GET") {
    // fica público de propósito -- é o link que vai pro cliente ver o orçamento.
    const orcamento = await kv.get(key);
    if (!orcamento) {
      res.status(404).json({ error: "Orçamento não encontrado." });
      return;
    }
    res.status(200).json(orcamento);
    return;
  }

  // editar/excluir só a equipe -- exige sessão.
  if (!requireSession(req, res)) return;

  if (req.method === "PUT") {
    const existing = await kv.get(key);
    if (!existing) {
      res.status(404).json({ error: "Orçamento não encontrado." });
      return;
    }
    const updated = { ...existing, ...req.body, id, updatedAt: new Date().toISOString() };
    await kv.set(key, updated);
    res.status(200).json(updated);
    return;
  }

  if (req.method === "DELETE") {
    await kv.del(key);
    res.status(204).end();
    return;
  }

  res.status(405).json({ error: "Método não permitido." });
}
