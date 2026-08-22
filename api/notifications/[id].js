import { kv } from "@vercel/kv";

const KEY = "notificacoes";

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === "PUT") {
    const all = (await kv.get(KEY)) || [];
    const idx = all.findIndex((n) => n.id === id);
    if (idx === -1) {
      res.status(404).json({ error: "Notificação não encontrada." });
      return;
    }
    const updated = { ...all[idx], ...req.body, id };
    const list = all.slice();
    list[idx] = updated;
    await kv.set(KEY, list);
    res.status(200).json(updated);
    return;
  }

  res.status(405).json({ error: "Método não permitido." });
}
