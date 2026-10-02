import crypto from "crypto";
import { kv } from "@vercel/kv";
import { put } from "@vercel/blob";
import { notificar, carregarEquipe } from "./_lib/notificar.js";

// Dieselzinho -- o bot que posta as novidades do sistema no Feed.
// Não é uma pessoa da equipe e não tem login: só posta quem tiver a chave
// BOT_SECRET (configurada no painel da Vercel), usada pelo script
// scripts/postar-no-feed.mjs.

const KEY = "feed_posts";
export const BOT = { id: "bot-dieselzinho", nome: "Dieselzinho" };
const MAX_HTML = 3 * 1024 * 1024; // a Vercel recebe no máximo ~4,5 MB por pedido

function chaveCerta(req) {
  const segredo = process.env.BOT_SECRET || "";
  const auth = req.headers.authorization || "";
  const enviada = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (segredo.length < 32 || enviada.length !== segredo.length) return false;
  return crypto.timingSafeEqual(Buffer.from(enviada), Buffer.from(segredo));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }
  if (!process.env.BOT_SECRET) {
    res.status(503).json({ error: "Bot ainda não configurado (falta BOT_SECRET na Vercel)." });
    return;
  }
  if (!chaveCerta(req)) {
    res.status(401).json({ error: "Chave do bot inválida." });
    return;
  }

  const body = req.body || {};
  // toda novidade do bot vai com @Todos (avisa a equipe inteira), a não ser
  // que o script mande todos: false
  const paraTodos = body.todos !== false;
  let texto = typeof body.texto === "string" ? body.texto.slice(0, 5000).trim() : "";
  if (paraTodos && !texto.includes("@Todos")) texto = texto ? `@Todos ${texto}` : "@Todos";
  const html = body.html && typeof body.html.conteudo === "string" ? body.html : null;
  if (!texto && !html) {
    res.status(400).json({ error: "Mande um texto ou um arquivo .html." });
    return;
  }
  if (html && html.conteudo.length > MAX_HTML) {
    res.status(413).json({ error: "Arquivo .html muito grande (máximo 3 MB)." });
    return;
  }

  const midias = [];
  if (html) {
    const nome = (typeof html.nome === "string" && html.nome.trim() ? html.nome.trim() : "pagina.html")
      .replace(/[^\w.-]+/g, "-").slice(0, 120);
    const blob = await put(`bot/${/\.html?$/i.test(nome) ? nome : `${nome}.html`}`, html.conteudo, {
      access: "public",
      contentType: "text/html",
      addRandomSuffix: true,
    });
    midias.push({ url: blob.url, tipo: "html", nome });
  }

  const post = {
    id: crypto.randomUUID(),
    tipo: "post",
    autorId: BOT.id,
    autorNome: BOT.nome,
    texto,
    autoria: "",
    fotoUrl: "",
    descricao: "",
    midias,
    criadoEm: new Date().toISOString(),
    reacoes: { curtir: [], amei: [], visto: [], trabalhando: [] },
    comentarios: [],
  };
  const posts = (await kv.get(KEY)) || [];
  await kv.set(KEY, [post, ...posts]);
  if (paraTodos) {
    try {
      const equipe = await carregarEquipe(kv);
      await notificar(kv, equipe.map((u) => u.id), { tipo: "todos", autorNome: BOT.nome, trecho: texto.replace("@Todos", "").trim() || "Nova atualização no Feed" });
    } catch (err) {
      console.error("Falha ao avisar a equipe:", err);
    }
  }
  res.status(201).json(post);
}
