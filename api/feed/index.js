import { kv } from "@vercel/kv";
import { requireSession, loadEquipeMember } from "../_lib/session.js";

const KEY = "feed_posts";
const TIPOS = ["tarefa", "frase", "foto"];

function str(v, max) {
  return typeof v === "string" ? v.slice(0, max) : "";
}

export default async function handler(req, res) {
  const session = requireSession(req, res);
  if (!session) return;

  if (req.method === "GET") {
    const posts = (await kv.get(KEY)) || [];
    res.status(200).json(posts);
    return;
  }

  if (req.method === "POST") {
    const body = req.body || {};
    if (!TIPOS.includes(body.tipo)) {
      res.status(400).json({ error: "Tipo de post inválido." });
      return;
    }
    const autor = await loadEquipeMember(kv, session.uid);
    if (!autor) {
      res.status(401).json({ error: "Não autenticado." });
      return;
    }
    const posts = (await kv.get(KEY)) || [];
    const now = new Date().toISOString();
    // so aceita os campos que o composer realmente manda -- autor vem sempre
    // da sessao, nunca do que o cliente mandar no corpo (evita alguem postar
    // em nome de outra pessoa).
    const post = {
      id: crypto.randomUUID(),
      tipo: body.tipo,
      autorId: autor.id,
      autorNome: autor.nome,
      texto: str(body.texto, 5000),
      autoria: str(body.autoria, 200),
      fotoUrl: str(body.fotoUrl, 2000),
      descricao: str(body.descricao, 1000),
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
