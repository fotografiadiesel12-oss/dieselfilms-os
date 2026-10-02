// Várias rotas pequenas numa função só: o plano da Vercel aceita no máximo
// 12 funções no projeto. Cada rota fica em api/_lib/rotas/.
//   /api/activity     histórico de quem mudou o quê
//   /api/feed-upload  envio de fotos/vídeos pro Vercel Blob
//   /api/push         ligar/desligar avisos no aparelho
//   /api/chat         chat da equipe
import activity from "./_lib/rotas/activity.js";
import feedUpload from "./_lib/rotas/feed-upload.js";
import push from "./_lib/rotas/push.js";
import chat from "./_lib/rotas/chat.js";

const ROTAS = { activity, "feed-upload": feedUpload, push, chat };

export default async function handler(req, res) {
  const rota = ROTAS[req.query.recurso];
  if (!rota) {
    res.status(404).json({ error: "Rota não encontrada." });
    return;
  }
  return rota(req, res);
}
