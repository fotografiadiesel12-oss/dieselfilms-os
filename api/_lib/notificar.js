import crypto from "crypto";
import webpush from "web-push";

// Cria as notificações do sininho e manda o aviso pro celular/PC de quem
// ativou as notificações (chega mesmo com o CRM fechado).
//
// O aviso no aparelho precisa das chaves VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY
// na Vercel. Sem elas, só o sininho funciona -- nada quebra.

const KEY = "notificacoes";
export const PUSH_KEY = "push_inscricoes";

export const pushConfigurado = () => !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

const curto = (t, max = 80) => (t && t.length > max ? `${t.slice(0, max)}…` : t || "");

const EMOJI_REACAO = { curtir: "👍", amei: "❤️", visto: "👀", trabalhando: "🧑‍💻" };

function mensagem({ tipo, autorNome, trecho, reacao }) {
  const quem = autorNome || "Alguém";
  if (tipo === "tarefa") return { title: "Nova tarefa pra você", body: trecho };
  if (tipo === "comentario") return { title: `${quem} comentou no seu post`, body: trecho };
  if (tipo === "reacao") return { title: `${quem} reagiu${EMOJI_REACAO[reacao] ? ` ${EMOJI_REACAO[reacao]}` : ""} ao seu post`, body: trecho };
  if (tipo === "todos") return { title: `${quem} postou pra todos`, body: trecho };
  return { title: `${quem} te marcou`, body: trecho };
}

// manda só o aviso pro aparelho (sem criar notificação no sininho).
// aviso: { title, body, tag?, url? }
export async function avisarNoAparelho(kv, userIds, aviso) {
  if (!pushConfigurado() || !userIds.length) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "https://dieselfilms-os.vercel.app",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
  const inscricoes = (await kv.get(PUSH_KEY)) || [];
  const alvo = inscricoes.filter((i) => userIds.includes(i.userId));
  if (!alvo.length) return;
  const payload = JSON.stringify({ url: "/", ...aviso });
  // prioridade alta (chat): o celular entrega na hora, mesmo economizando bateria
  const opcoes = { TTL: 60 * 60 * 24, urgency: aviso.prioridade === "alta" ? "high" : "normal" };
  const vencidas = [];
  await Promise.allSettled(alvo.map((i) => webpush.sendNotification(i.subscription, payload, opcoes)
    .catch((err) => {
      // 404/410: o aparelho desativou ou a inscrição expirou
      if (err && (err.statusCode === 404 || err.statusCode === 410)) vencidas.push(i.subscription.endpoint);
    })));
  if (vencidas.length) {
    const atual = (await kv.get(PUSH_KEY)) || [];
    await kv.set(PUSH_KEY, atual.filter((i) => !vencidas.includes(i.subscription.endpoint)));
  }
}

// destinos: lista de ids da equipe. dados: { tipo, autorNome, trecho, reacao? }
export async function notificar(kv, destinos, dados) {
  const ids = [...new Set(destinos)].filter((id) => typeof id === "string" && id);
  if (!ids.length) return [];
  const agora = new Date().toISOString();
  const novas = ids.map((userId) => ({
    id: crypto.randomUUID(),
    userId,
    tipo: dados.tipo,
    autorNome: curto(dados.autorNome, 200),
    trecho: curto(dados.trecho, 300),
    ...(dados.reacao ? { reacao: dados.reacao } : {}),
    lida: false,
    criadoEm: agora,
  }));
  const todas = (await kv.get(KEY)) || [];
  await kv.set(KEY, [...novas, ...todas].slice(0, 1000));
  try {
    await avisarNoAparelho(kv, ids, mensagem({ ...dados, trecho: curto(dados.trecho) }));
  } catch (err) {
    console.error("Falha ao enviar aviso pro aparelho:", err);
  }
  return novas;
}

export async function carregarEquipe(kv) {
  const raw = await kv.get("df_shared:df_equipe");
  return raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : [];
}
