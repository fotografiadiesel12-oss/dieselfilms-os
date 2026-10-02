import crypto from "crypto";
import { kv } from "@vercel/kv";
import { requireSession, loadEquipeMember } from "./_lib/session.js";
import { avisarNoAparelho } from "./_lib/notificar.js";

// Chat da equipe: uma conversa com todo mundo ("equipe") e conversas a dois
// ("dm:<id>:<id>", com os ids em ordem alfabética).
//   GET                      -> resumo das conversas (última mensagem e se tem não lida)
//   GET ?conversa=<id>       -> mensagens da conversa
//   POST { conversa, texto } -> envia mensagem
//   POST { conversa, lida: true } -> marca a conversa como lida

const MAX_MENSAGENS = 500;
const MAX_TEXTO = 2000;
const RESUMO = "chat_resumo"; // { conversa: última mensagem }
const chaveConversa = (id) => `chat:${id}`;
const chaveLidas = (uid) => `chat_lidas:${uid}`;

function participantes(conversa, equipe) {
  if (conversa === "equipe") return equipe.map((u) => u.id);
  const m = /^dm:([^:]+):([^:]+)$/.exec(conversa || "");
  if (!m || m[1] >= m[2]) return null;
  const ids = equipe.map((u) => u.id);
  return ids.includes(m[1]) && ids.includes(m[2]) ? [m[1], m[2]] : null;
}

async function carregarEquipe() {
  const raw = await kv.get("df_shared:df_equipe");
  return raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : [];
}

export default async function handler(req, res) {
  const session = requireSession(req, res);
  if (!session) return;
  const equipe = await carregarEquipe();
  if (!equipe.some((u) => u.id === session.uid)) {
    res.status(403).json({ error: "Conta não encontrada na equipe." });
    return;
  }
  const conversa = req.method === "GET" ? req.query.conversa : (req.body || {}).conversa;

  if (req.method === "GET" && !conversa) {
    const resumo = (await kv.get(RESUMO)) || {};
    const lidas = (await kv.get(chaveLidas(session.uid))) || {};
    const minhas = {};
    Object.entries(resumo).forEach(([id, ultima]) => {
      const quem = participantes(id, equipe);
      if (!quem || !quem.includes(session.uid)) return;
      minhas[id] = { ultima, naoLida: ultima.autorId !== session.uid && (!lidas[id] || lidas[id] < ultima.criadoEm) };
    });
    res.status(200).json(minhas);
    return;
  }

  const quem = participantes(conversa, equipe);
  if (!quem || !quem.includes(session.uid)) {
    res.status(403).json({ error: "Você não participa dessa conversa." });
    return;
  }

  if (req.method === "GET") {
    const mensagens = (await kv.get(chaveConversa(conversa))) || [];
    res.status(200).json(mensagens);
    return;
  }

  if (req.method === "POST") {
    const body = req.body || {};
    if (body.lida) {
      const lidas = (await kv.get(chaveLidas(session.uid))) || {};
      await kv.set(chaveLidas(session.uid), { ...lidas, [conversa]: new Date().toISOString() });
      res.status(200).json({ ok: true });
      return;
    }
    const texto = typeof body.texto === "string" ? body.texto.slice(0, MAX_TEXTO).trim() : "";
    if (!texto) {
      res.status(400).json({ error: "Escreva uma mensagem." });
      return;
    }
    const autor = await loadEquipeMember(kv, session.uid);
    const mensagem = {
      id: crypto.randomUUID(),
      autorId: session.uid,
      autorNome: autor.nome,
      texto,
      criadoEm: new Date().toISOString(),
    };
    const lista = (await kv.get(chaveConversa(conversa))) || [];
    await kv.set(chaveConversa(conversa), [...lista, mensagem].slice(-MAX_MENSAGENS));
    const resumo = (await kv.get(RESUMO)) || {};
    await kv.set(RESUMO, { ...resumo, [conversa]: mensagem });
    // quem mandou já leu
    const lidas = (await kv.get(chaveLidas(session.uid))) || {};
    await kv.set(chaveLidas(session.uid), { ...lidas, [conversa]: mensagem.criadoEm });

    try {
      await avisarNoAparelho(kv, quem.filter((id) => id !== session.uid), {
        title: conversa === "equipe" ? `${autor.nome} · Chat da equipe` : autor.nome,
        body: texto.length > 120 ? `${texto.slice(0, 120)}…` : texto,
        tag: `chat-${conversa}`,
        url: `/?chat=${encodeURIComponent(conversa)}`,
      });
    } catch (err) {
      console.error("Falha ao avisar do chat:", err);
    }
    res.status(201).json(mensagem);
    return;
  }

  res.status(405).json({ error: "Método não permitido." });
}
