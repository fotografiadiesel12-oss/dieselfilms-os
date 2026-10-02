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

export const listarConversas = () => request("/api/chat", { headers: authHeaders() });
export const listarMensagens = (conversa) => request(`/api/chat?conversa=${encodeURIComponent(conversa)}`, { headers: authHeaders() });
export const enviarMensagem = (conversa, texto) => post({ conversa, texto });
export const marcarLida = (conversa) => post({ conversa, lida: true });
