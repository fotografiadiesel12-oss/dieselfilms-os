import { kv } from "@vercel/kv";

const KEY = "feed_posts";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const posts = (await kv.get(KEY)) || [];
    res.status(200).json(posts);
    return;
  }

  if (req.method === "POST") {
    const posts = (await kv.get(KEY)) || [];
    const now = new Date().toISOString();
    const post = {
      ...req.body,
      id: crypto.randomUUID(),
      criadoEm: now,
      reacoes: { visto: [], trabalhando: [] },
      comentarios: [],
    };
    const updated = [post, ...posts];
    await kv.set(KEY, updated);
    res.status(201).json(post);
    return;
  }

  res.status(405).json({ error: "Método não permitido." });
}
