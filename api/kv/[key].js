import { kv } from "@vercel/kv";
import { requireSession } from "../_lib/session.js";

// Backend generico de chave/valor usado pelo window.storage (storagePolyfill.js)
// para os dados compartilhados do app (clientes, demandas, financeiro, contratos,
// equipe, orcamentos, precificacao) -- mesmo Upstash/KV ja conectado pro Feed.
//
// Exige uma sessao valida (token emitido por /api/login) -- sem isso, ninguem
// de fora consegue ler nem escrever esses dados.

export default async function handler(req, res) {
  if (!requireSession(req, res)) return;

  const { key } = req.query;
  if (!key) {
    res.status(400).json({ error: "key obrigatória." });
    return;
  }
  const fullKey = `df_shared:${key}`;

  if (req.method === "GET") {
    const raw = await kv.get(fullKey);
    // o cliente sempre manda uma string ja serializada (JSON.stringify) pra guardar,
    // mas o @vercel/kv reconhece automaticamente que essa string "parece JSON" e
    // devolve ela ja desserializada em vez da string original -- normaliza aqui
    // pra sempre devolver string, que é o que window.storage/useSharedState espera.
    const value = raw === null || raw === undefined ? null : (typeof raw === "string" ? raw : JSON.stringify(raw));
    res.status(200).json({ value });
    return;
  }

  if (req.method === "PUT" || req.method === "POST") {
    const { value } = req.body || {};
    await kv.set(fullKey, value);
    res.status(200).json({ value });
    return;
  }

  if (req.method === "DELETE") {
    await kv.del(fullKey);
    res.status(200).json({ deleted: true });
    return;
  }

  res.status(405).json({ error: "Método não permitido." });
}
