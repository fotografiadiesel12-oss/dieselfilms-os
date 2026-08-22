import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

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
