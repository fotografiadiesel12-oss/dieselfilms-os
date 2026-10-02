import { authHeaders } from "./authHeaders.js";

async function request(path, options) {
  const res = await fetch(path, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erro ${res.status} ao falar com o chat.`);
  }
  return res.json();
}

const post = (data) => request("/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json", ...authHeaders() },
  body: JSON.stringify(data),
});

// presenca: avisa que esta pessoa está online (o chat manda uma vez por minuto)
export const listarConversas = (presenca) => request(`/api/chat${presenca ? "?presenca=1" : ""}`, { headers: authHeaders() });
export const listarMensagens = (conversa) => request(`/api/chat?conversa=${encodeURIComponent(conversa)}`, { headers: authHeaders() });
export const enviarMensagem = (conversa, texto, imagem) => post({ conversa, texto, ...(imagem ? { imagem } : {}) });
export const marcarLida = (conversa) => post({ conversa, lida: true });
