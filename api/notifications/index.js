import { kv } from "@vercel/kv";
import { requireSession } from "../_lib/session.js";
import { notificar } from "../_lib/notificar.js";

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
    const [notificacao] = await notificar(kv, [body.userId], {
      tipo: body.tipo,
      autorNome: str(body.autorNome, 200),
      trecho: str(body.trecho, 300),
    });
    res.status(201).json(notificacao);
    return;
  }

  res.status(405).json({ error: "Método não permitido." });
}
