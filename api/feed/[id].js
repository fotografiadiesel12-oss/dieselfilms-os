import { kv } from "@vercel/kv";

const KEY = "feed_posts";

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === "PUT") {
    const posts = (await kv.get(KEY)) || [];
    const idx = posts.findIndex((p) => p.id === id);
    if (idx === -1) {
      res.status(404).json({ error: "Post não encontrado." });
      return;
    }
    const updated = { ...posts[idx], ...req.body, id };
    const list = posts.slice();
    list[idx] = updated;
    await kv.set(KEY, list);
    res.status(200).json(updated);
    return;
  }

  if (req.method === "DELETE") {
    const posts = (await kv.get(KEY)) || [];
    const list = posts.filter((p) => p.id !== id);
    await kv.set(KEY, list);
    res.status(204).end();
    return;
  }

  res.status(405).json({ error: "Método não permitido." });
}
