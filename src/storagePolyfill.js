// Polyfill do window.storage (API exclusiva dos artifacts do Claude),
// para que o app funcione fora do claude.ai usando o localStorage do navegador.
// Mesma assinatura: get/set/delete/list(prefix?, shared?)
// "shared" é ignorado aqui (tudo fica local ao navegador de cada pessoa).

function fullKey(key) {
  return `dieselfilms-os:${key}`;
}

window.storage = {
  async get(key) {
    const raw = window.localStorage.getItem(fullKey(key));
    if (raw === null) return null;
    return { key, value: raw, shared: false };
  },
  async set(key, value) {
    window.localStorage.setItem(fullKey(key), value);
    return { key, value, shared: false };
  },
  async delete(key) {
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
