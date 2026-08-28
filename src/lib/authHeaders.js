// Cabeçalho de autenticação (Bearer token) compartilhado por todo cliente que
// fala com uma rota /api protegida por requireSession (api/_lib/session.js).

export function authHeaders() {
  const token = window.localStorage.getItem("dieselfilms-os:df_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}
