import { kv } from "@vercel/kv";

const KEY = "notificacoes";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const { userId } = req.query;
    const all = (await kv.get(KEY)) || [];
    const filtradas = userId ? all.filter((n) => n.userId === userId) : all;
    res.status(200).json(filtradas);
    return;
  }

  if (req.method === "POST") {
    const all = (await kv.get(KEY)) || [];
    const notificacao = {
      ...req.body,
      id: crypto.randomUUID(),
      lida: false,
      criadoEm: new Date().toISOString(),
    };
    const updated = [notificacao, ...all].slice(0, 500);
    await kv.set(KEY, updated);
    res.status(201).json(notificacao);
    return;
  }

  res.status(405).json({ error: "Método não permitido." });
}
