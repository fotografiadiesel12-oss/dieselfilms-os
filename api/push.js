import { kv } from "@vercel/kv";
import { requireSession } from "./_lib/session.js";
import { PUSH_KEY, pushConfigurado } from "./_lib/notificar.js";

// Guarda em quais aparelhos cada pessoa ativou os avisos (notificação no
// celular/PC mesmo com o CRM fechado).
//   GET    -> chave pública pro navegador se inscrever
//   POST   -> { subscription } liga os avisos neste aparelho
//   DELETE -> { endpoint } desliga os avisos neste aparelho

const MAX_POR_PESSOA = 10;

function inscricaoValida(s) {
  return s && typeof s.endpoint === "string" && /^https:\/\//.test(s.endpoint) && s.endpoint.length < 1000
    && s.keys && typeof s.keys.p256dh === "string" && typeof s.keys.auth === "string"
    && s.keys.p256dh.length < 200 && s.keys.auth.length < 100;
}

export default async function handler(req, res) {
  const session = requireSession(req, res);
  if (!session) return;

  if (req.method === "GET") {
    if (!pushConfigurado()) {
      res.status(503).json({ error: "Avisos no aparelho ainda não configurados." });
      return;
    }
    res.status(200).json({ publicKey: process.env.VAPID_PUBLIC_KEY });
    return;
  }

  if (req.method === "POST") {
    const s = (req.body || {}).subscription;
    if (!inscricaoValida(s)) {
      res.status(400).json({ error: "Inscrição inválida." });
      return;
    }
    const subscription = { endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } };
    const todas = ((await kv.get(PUSH_KEY)) || []).filter((i) => i.subscription.endpoint !== s.endpoint);
    const minhas = todas.filter((i) => i.userId === session.uid);
    const outras = todas.filter((i) => i.userId !== session.uid);
    const nova = { userId: session.uid, subscription, criadoEm: new Date().toISOString() };
    await kv.set(PUSH_KEY, [...outras, ...minhas.slice(-(MAX_POR_PESSOA - 1)), nova]);
    res.status(201).json({ ok: true });
    return;
  }

  if (req.method === "DELETE") {
    const endpoint = (req.body || {}).endpoint;
    const todas = (await kv.get(PUSH_KEY)) || [];
    await kv.set(PUSH_KEY, todas.filter((i) => !(i.userId === session.uid && i.subscription.endpoint === endpoint)));
    res.status(204).end();
    return;
  }

  res.status(405).json({ error: "Método não permitido." });
}
