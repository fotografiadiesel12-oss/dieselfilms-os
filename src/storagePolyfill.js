// Polyfill do window.storage (API exclusiva dos artifacts do Claude),
// para que o app funcione fora do claude.ai.
// Mesma assinatura: get/set/delete/list(prefix?, shared?)
//
// shared=true  -> vai para o backend real (api/kv/[key].js, mesmo Upstash/KV
//                 do Feed), sincronizado entre todos os dispositivos e pessoas.
// shared=false -> fica só no navegador de cada aparelho (localStorage), usado
//                 para coisas como sessão de login e "lembrar meu login".

function fullKey(key) {
  return `dieselfilms-os:${key}`;
}

async function kvGet(key) {
  const res = await fetch(`/api/kv/${encodeURIComponent(key)}`);
  if (!res.ok) throw new Error(`kv get falhou (${res.status})`);
  const data = await res.json();
  return data.value ?? null;
}

async function kvSet(key, value) {
  const res = await fetch(`/api/kv/${encodeURIComponent(key)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });
  if (!res.ok) throw new Error(`kv set falhou (${res.status})`);
}

async function kvDelete(key) {
  const res = await fetch(`/api/kv/${encodeURIComponent(key)}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`kv delete falhou (${res.status})`);
}

window.storage = {
  async get(key, shared) {
    if (shared) {
      const value = await kvGet(key);
      if (value !== null && value !== undefined) return { key, value, shared: true };
      // migração: dado ainda não existe no backend compartilhado -- se tiver algo
      // salvo localmente de antes da sincronização real existir, sobe pra lá agora
      // pra não perder o que já tinha sido cadastrado neste aparelho.
      const legacyRaw = window.localStorage.getItem(fullKey(key));
      if (legacyRaw === null) return null;
      try { await kvSet(key, legacyRaw); } catch { /* segue usando o valor local mesmo assim */ }
      return { key, value: legacyRaw, shared: true };
    }
    const raw = window.localStorage.getItem(fullKey(key));
    if (raw === null) return null;
    return { key, value: raw, shared: false };
  },
  async set(key, value, shared) {
    if (shared) {
      await kvSet(key, value);
      return { key, value, shared: true };
    }
    window.localStorage.setItem(fullKey(key), value);
    return { key, value, shared: false };
  },
  async delete(key, shared) {
    if (shared) {
      await kvDelete(key);
      return { key, deleted: true, shared: true };
    }
    window.localStorage.removeItem(fullKey(key));
    return { key, deleted: true, shared: false };
  },
  async list(prefix = "") {
    const p = fullKey(prefix);
    const keys = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(p)) keys.push(k.replace("dieselfilms-os:", ""));
    }
    return { keys, prefix, shared: false };
  },
};
