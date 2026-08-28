import crypto from "crypto";

// Segredo usado pra assinar os tokens de sessão. Prefere uma variável dedicada
// (SESSION_SECRET, configurável no painel da Vercel) e cai pra um dos segredos
// que a integração do Vercel KV já injeta no projeto, pra funcionar sem exigir
// nenhuma configuração extra logo de cara.
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  process.env.KV_REST_API_TOKEN ||
  process.env.REDIS_URL ||
  process.env.KV_URL ||
  "dieselfilms-os-fallback-secret-troque-isso";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 90; // 90 dias

function base64url(input) {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(input) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64").toString();
}

function hmac(body) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(body).digest("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function signSession(payload) {
  const body = base64url(JSON.stringify({ ...payload, exp: Date.now() + SESSION_TTL_MS }));
  return `${body}.${hmac(body)}`;
}

export function verifySession(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig || hmac(body) !== sig) return null;
  try {
    const payload = JSON.parse(base64urlDecode(body));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function requireSession(req, res) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const session = verifySession(token);
  if (!session) {
    res.status(401).json({ error: "Não autenticado." });
    return null;
  }
  return session;
}

export function pbkdf2Hex(senha, saltHex) {
  return crypto.pbkdf2Sync(senha, Buffer.from(saltHex, "hex"), 100000, 32, "sha256").toString("hex");
}

export function randomSaltHex() {
  return crypto.randomBytes(16).toString("hex");
}

export const CARGOS_GESTAO = ["Dono", "Sócio", "Admin"];

// Busca o registro da equipe correspondente à sessão -- usado pelas rotas que
// precisam saber o cargo (ex: só quem gerencia pode excluir o post de outra
// pessoa) ou o nome de quem fez a ação, sem confiar no que o cliente mandou.
export async function loadEquipeMember(kv, uid) {
  const raw = await kv.get("df_shared:df_equipe");
  const lista = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : [];
  return lista.find((u) => u.id === uid) || null;
}

// Exige sessão válida E que a pessoa tenha o módulo liberado (ou cargo de
// gestão, que sempre tem acesso a tudo) -- mesma regra que decide o que
// aparece na barra lateral do app, aplicada de novo no servidor pra ninguém
// alterar um módulo que não devia só chamando a API direto.
export async function requireModule(req, res, kv, modulo) {
  const session = requireSession(req, res);
  if (!session) return null;
  const member = await loadEquipeMember(kv, session.uid);
  if (!member) {
    res.status(403).json({ error: "Conta não encontrada na equipe." });
    return null;
  }
  if (!CARGOS_GESTAO.includes(member.papel) && !(member.modulos || []).includes(modulo)) {
    res.status(403).json({ error: "Sem permissão pra alterar esse módulo." });
    return null;
  }
  return session;
}
