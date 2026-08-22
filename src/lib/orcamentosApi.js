// Cliente fino para a API serverless de orçamentos (api/orcamentos/*).
// Usado só pelo que precisa do link público/compartilhável entre aparelhos —
// a lista interna continua vivendo em useSharedState (localStorage), igual
// aos outros módulos. Se o backend ainda não estiver configurado na Vercel
// (sem KV conectado), essas chamadas rejeitam e quem chamar deve tratar
// o erro sem travar o restante do módulo.

async function request(path, options) {
  const res = await fetch(path, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erro ${res.status} ao falar com o servidor de orçamentos.`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export function createOrcamento(data) {
  return request("/api/orcamentos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function getOrcamento(id) {
  return request(`/api/orcamentos/${encodeURIComponent(id)}`);
}

export function updateOrcamento(id, data) {
  return request(`/api/orcamentos/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function deleteOrcamento(id) {
  return request(`/api/orcamentos/${encodeURIComponent(id)}`, { method: "DELETE" });
}
