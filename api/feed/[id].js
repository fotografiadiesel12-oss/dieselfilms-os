import { kv } from "@vercel/kv";
import { requireSession, loadEquipeMember, CARGOS_GESTAO } from "../_lib/session.js";

const KEY = "feed_posts";

export default async function handler(req, res) {
  const session = requireSession(req, res);
  if (!session) return;

  const { id } = req.query;

  if (req.method === "PUT") {
    const posts = (await kv.get(KEY)) || [];
    const idx = posts.findIndex((p) => p.id === id);
    if (idx === -1) {
      res.status(404).json({ error: "Post não encontrado." });
      return;
    }
    const body = req.body || {};
    // PUT so serve pra reagir ou comentar -- nunca pra reescrever o post de
    // outra pessoa (autor, texto, tipo etc ficam de fora de propósito).
    const patch = {};
    if (body.reacoes && typeof body.reacoes === "object") patch.reacoes = body.reacoes;
    if (Array.isArray(body.comentarios)) patch.comentarios = body.comentarios;
    const updated = { ...posts[idx], ...patch, id };
    const list = posts.slice();
    list[idx] = updated;
    await kv.set(KEY, list);
    res.status(200).json(updated);
    return;
  }

  if (req.method === "DELETE") {
    const posts = (await kv.get(KEY)) || [];
    const post = posts.find((p) => p.id === id);
    if (!post) {
      res.status(204).end();
      return;
    }
    if (post.autorId !== session.uid) {
      const requester = await loadEquipeMember(kv, session.uid);
      if (!requester || !CARGOS_GESTAO.includes(requester.papel)) {
        res.status(403).json({ error: "Sem permissão para excluir este post." });
        return;
      }
    }
    const list = posts.filter((p) => p.id !== id);
    await kv.set(KEY, list);
    res.status(204).end();
    return;
  }

  res.status(405).json({ error: "Método não permitido." });
}
