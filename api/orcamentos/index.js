import { kv } from "@vercel/kv";
import { requireModule } from "../_lib/session.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  // só quem tem o módulo Orçamentos liberado cria orçamento -- o link
  // público (GET por id) é só leitura.
  if (!(await requireModule(req, res, kv, "orcamentos"))) return;

  const body = req.body || {};
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const orcamento = {
    ...body,
    id,
    status: body.status || "Rascunho",
    createdAt: now,
    updatedAt: now,
  };

  await kv.set(`orcamento:${id}`, orcamento);
  res.status(201).json(orcamento);
}
