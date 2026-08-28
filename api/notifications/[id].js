import { kv } from "@vercel/kv";
import { requireSession } from "../_lib/session.js";

const KEY = "notificacoes";

export default async function handler(req, res) {
  const session = requireSession(req, res);
  if (!session) return;

  const { id } = req.query;

  if (req.method === "PUT") {
    const all = (await kv.get(KEY)) || [];
    const idx = all.findIndex((n) => n.id === id);
    if (idx === -1) {
      res.status(404).json({ error: "Notificação não encontrada." });
      return;
    }
    if (all[idx].userId !== session.uid) {
      res.status(403).json({ error: "Sem permissão para alterar esta notificação." });
      return;
    }
    // so existe uma acao possivel aqui: marcar como lida.
    const updated = { ...all[idx], lida: !!(req.body || {}).lida };
    const list = all.slice();
    list[idx] = updated;
    await kv.set(KEY, list);
    res.status(200).json(updated);
    return;
  }

  res.status(405).json({ error: "Método não permitido." });
}
