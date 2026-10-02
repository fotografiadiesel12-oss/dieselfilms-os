import { kv } from "@vercel/kv";
import { requireSession, loadEquipeMember } from "../session.js";

// Histórico de quem mudou o quê (auditoria). Qualquer pessoa logada registra
// as próprias ações, mas só os donos (Dono e Sócio) conseguem ler a lista.
// Usa a mesma chave que o histórico já usava, então nada do passado se perde.
const KEY = "df_shared:df_activity";
const MAX = 500;
export const CARGOS_DONO = ["Dono", "Sócio"];

function str(v, max) {
  return typeof v === "string" ? v.slice(0, max) : "";
}

async function lerLista() {
  const raw = await kv.get(KEY);
  if (!raw) return [];
  const lista = typeof raw === "string" ? JSON.parse(raw) : raw;
  return Array.isArray(lista) ? lista : [];
}

export default async function handler(req, res) {
  const session = requireSession(req, res);
  if (!session) return;
  const membro = await loadEquipeMember(kv, session.uid);
  if (!membro) {
    res.status(403).json({ error: "Conta não encontrada na equipe." });
    return;
  }

  if (req.method === "GET") {
    if (!CARGOS_DONO.includes(membro.papel)) {
      res.status(403).json({ error: "Só os donos veem o histórico." });
      return;
    }
    res.status(200).json(await lerLista());
    return;
  }

  if (req.method === "POST") {
    const body = req.body || {};
    // quem fez a ação vem sempre da sessão, nunca do corpo do pedido
    const item = {
      id: crypto.randomUUID(),
      ts: new Date().toISOString(),
      userId: membro.id,
      userNome: membro.nome,
      modulo: str(body.modulo, 60),
      acao: str(body.acao, 60),
      alvo: str(body.alvo, 200),
    };
    if (!item.modulo || !item.acao) {
      res.status(400).json({ error: "Ação inválida." });
      return;
    }
    const lista = await lerLista();
    await kv.set(KEY, JSON.stringify([item, ...lista].slice(0, MAX)));
    res.status(201).json(item);
    return;
  }

  res.status(405).json({ error: "Método não permitido." });
}
