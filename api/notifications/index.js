import { kv } from "@vercel/kv";
import { requireSession } from "../_lib/session.js";

const KEY = "notificacoes";
const TIPOS = ["tarefa", "mencao"];

function str(v, max) {
  return typeof v === "string" ? v.slice(0, max) : "";
}

export default async function handler(req, res) {
  const session = requireSession(req, res);
  if (!session) return;

  if (req.method === "GET") {
    // ignora o userId que vier na query -- so mostra as notificacoes de quem
    // esta de fato logado, pra ninguem ler a notificacao de outra pessoa.
    const all = (await kv.get(KEY)) || [];
    const filtradas = all.filter((n) => n.userId === session.uid);
    res.status(200).json(filtradas);
    return;
  }

  if (req.method === "POST") {
    const body = req.body || {};
    if (typeof body.userId !== "string" || !body.userId) {
      res.status(400).json({ error: "userId obrigatório." });
      return;
    }
    if (!TIPOS.includes(body.tipo)) {
      res.status(400).json({ error: "Tipo de notificação inválido." });
      return;
    }
    const all = (await kv.get(KEY)) || [];
    const notificacao = {
      id: crypto.randomUUID(),
      userId: body.userId,
      tipo: body.tipo,
      autorNome: str(body.autorNome, 200),
      trecho: str(body.trecho, 300),
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
