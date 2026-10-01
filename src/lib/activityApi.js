import { authHeaders } from "./authHeaders.js";

// Histórico de ações (auditoria): todo mundo registra, só os donos leem.
export async function listarAtividade() {
  const res = await fetch("/api/activity", { headers: authHeaders() });
  if (!res.ok) throw new Error(`Erro ${res.status} ao carregar o histórico.`);
  return res.json();
}

export function registrarAtividade(modulo, acao, alvo) {
  return fetch("/api/activity", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ modulo, acao, alvo }),
  }).then((res) => (res.ok ? res.json() : null)).catch(() => null);
}
