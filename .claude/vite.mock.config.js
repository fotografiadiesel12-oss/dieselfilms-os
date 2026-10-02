// Vite com API de mentira, só pra ver o CRM no navegador sem o servidor real
// (o login aceita qualquer e-mail/senha). Rodar da raiz do projeto:
//   npx vite --config .claude/vite.mock.config.js
// e abrir http://localhost:5199
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const ALL = ["feed", "dashboard", "leads", "demandas", "financeiro", "orcamentos", "contratos", "clientes", "equipe"];
const store = {
  df_equipe: JSON.stringify([
    { id: "u1", nome: "Yuri Diesel", email: "teste@teste.test", papel: "Dono", modulos: ALL },
    { id: "u2", nome: "Luís Antônio", email: "luis@teste.test", papel: "Sócio", modulos: ALL },
  ]),
  df_financeiro: JSON.stringify({
    metaMes: 10000,
    entradas: [{ id: "e1", desc: "Fotografia Apartamento", client: "Midiã (DabraHouse)", date: "29/08", value: 170, category: "", notaEmitida: true }],
    saidas: [{ id: "s1", desc: "Fotografia Apartamento", category: "Pagamento - Luis", date: "28/08/2026", value: 85 }],
  }),
};
const ontem = new Date(Date.now() - 864e5).toISOString();
const chat = {
  equipe: [
    { id: "c1", autorId: "u2", autorNome: "Luís Antônio", texto: "Bom dia, equipe! Amanhã tem gravação às 8h 🎬", criadoEm: ontem },
    { id: "c2", autorId: "u1", autorNome: "Yuri Diesel", texto: "Fechado, levo o drone", criadoEm: ontem },
    { id: "c3", autorId: "u2", autorNome: "Luís Antônio", texto: "Show! Não esquece as baterias extras", criadoEm: new Date().toISOString() },
  ],
};
const lidas = {};
const json = (res, code, obj) => { res.statusCode = code; res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(obj)); };
const body = (req) => new Promise((r) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => { try { r(JSON.parse(b || "{}")); } catch { r({}); } }); });

export default defineConfig({
  root: fileURLToPath(new URL("..", import.meta.url)),
  plugins: [react(), {
    name: "mock-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, "http://x");
        if (!url.pathname.startsWith("/api/")) return next();
        const p = url.pathname.slice(5);
        if (p === "login") return json(res, 200, { user: JSON.parse(store.df_equipe)[0], token: "mock" });
        if (p.startsWith("kv/")) {
          const k = decodeURIComponent(p.slice(3));
          if (req.method === "GET") return json(res, 200, { value: store[k] ?? null });
          if (req.method === "PUT") { store[k] = (await body(req)).value; return json(res, 200, { ok: true }); }
          delete store[k]; return json(res, 200, { ok: true });
        }
        if (p === "feed") return json(res, 200, []);
        if (p.startsWith("notifications")) {
          const t = new Date().toISOString();
          return json(res, 200, req.method !== "GET" ? {} : [
            { id: "n1", userId: "u1", tipo: "todos", autorNome: "Dieselzinho", trecho: "🎬 Novidade em Contratos!", lida: false, criadoEm: t },
            { id: "n2", userId: "u1", tipo: "comentario", autorNome: "Luís Antônio", trecho: "Ficou top!", lida: false, criadoEm: t },
            { id: "n3", userId: "u1", tipo: "reacao", reacao: "amei", autorNome: "Luís Antônio", trecho: "Fotos do ensaio", lida: false, criadoEm: t },
            { id: "n4", userId: "u1", tipo: "mencao", autorNome: "Luís Antônio", trecho: "@Yuri Diesel olha isso", lida: true, criadoEm: t },
          ]);
        }
        if (p === "push") return json(res, 503, { error: "Avisos no aparelho ainda não configurados." });
        if (p === "chat") {
          const conv = url.searchParams.get("conversa");
          if (req.method === "GET" && !conv) {
            const r = {};
            Object.entries(chat).forEach(([id, l]) => { if (l.length) r[id] = { ultima: l[l.length - 1], naoLida: l[l.length - 1].autorId !== "u1" && !lidas[id] }; });
            return json(res, 200, r);
          }
          if (req.method === "GET") return json(res, 200, chat[conv] || []);
          const b = await body(req);
          if (b.lida) { lidas[b.conversa] = true; return json(res, 200, { ok: true }); }
          // _comoLuis: simula mensagem chegando de outra pessoa (pra testar avisos)
          const m = { id: String(Date.now()), autorId: b._comoLuis ? "u2" : "u1", autorNome: b._comoLuis ? "Luís Antônio" : "Yuri Diesel", texto: b.texto || "", ...(b.imagem ? { imagem: b.imagem } : {}), criadoEm: new Date().toISOString() };
          if (b._comoLuis) delete lidas[b.conversa];
          chat[b.conversa] = [...(chat[b.conversa] || []), m];
          return json(res, 201, m);
        }
        return json(res, 200, req.method === "GET" ? [] : {});
      });
    },
  }],
  server: { port: 5199 },
});
