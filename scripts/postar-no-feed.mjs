// Posta no Feed do CRM como o Dieselzinho (bot da DieselFilms).
//
// Uso:
//   node scripts/postar-no-feed.mjs --texto "Fique por dentro..." [--html relatorio-crm.html]
//
// Precisa da chave BOT_SECRET no arquivo .env (fora do GitHub) -- a mesma que
// está configurada no painel da Vercel.

import { readFileSync, existsSync } from "node:fs";
import { basename } from "node:path";

const SITE = process.env.SITE_URL || "https://dieselfilms-os.vercel.app";

function arg(nome) {
  const i = process.argv.indexOf(`--${nome}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

if (existsSync(".env")) process.loadEnvFile(".env");
const segredo = process.env.BOT_SECRET;
if (!segredo) {
  console.error("Falta BOT_SECRET no arquivo .env");
  process.exit(1);
}

const texto = arg("texto") || "";
const htmlPath = arg("html");
if (!texto && !htmlPath) {
  console.error('Uso: node scripts/postar-no-feed.mjs --texto "..." [--html arquivo.html]');
  process.exit(1);
}

const body = { texto };
if (htmlPath) body.html = { nome: basename(htmlPath), conteudo: readFileSync(htmlPath, "utf8") };

const res = await fetch(`${SITE}/api/bot-post`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${segredo}` },
  body: JSON.stringify(body),
});
const data = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error(`Erro ${res.status}: ${data.error || "sem detalhes"}`);
  process.exit(1);
}
console.log(`Publicado pelo Dieselzinho! (post ${data.id})`);
