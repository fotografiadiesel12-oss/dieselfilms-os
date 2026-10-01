// Mostra um arquivo .html postado no Feed.
//
// O Vercel Blob não deixa abrir HTML direto (força download e bloqueia iframe),
// então esta rota busca o arquivo e devolve a página com um CSP "sandbox": o
// navegador trata a página como de outra origem, sem acesso ao login (token no
// localStorage) nem aos dados do sistema -- mesmo se alguém abrir o link direto.
// Os scripts da página rodam normalmente, só que isolados.

const MAX_BYTES = 5 * 1024 * 1024;

// id da loja do Blob vem no próprio token (vercel_blob_rw_<id>_<segredo>); com
// ele dá pra aceitar só arquivos da nossa loja, e não de qualquer uma.
function hostPermitido(host) {
  if (!host.endsWith(".public.blob.vercel-storage.com")) return false;
  const storeId = (process.env.BLOB_READ_WRITE_TOKEN || "").split("_")[3];
  return !storeId || host === `${storeId.toLowerCase()}.public.blob.vercel-storage.com`;
}

export function urlValida(raw) {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && hostPermitido(u.hostname) && /\.html?$/i.test(u.pathname) ? u : null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  const alvo = urlValida(typeof req.query?.u === "string" ? req.query.u : "");
  if (!alvo) {
    res.status(400).send("Arquivo inválido.");
    return;
  }

  let html;
  try {
    const r = await fetch(alvo);
    if (!r.ok) throw new Error(String(r.status));
    if (Number(r.headers.get("content-length")) > MAX_BYTES) throw new Error("grande");
    html = await r.text();
    if (html.length > MAX_BYTES) throw new Error("grande");
  } catch {
    res.status(404).send("Não deu pra abrir esse arquivo.");
    return;
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader(
    "Content-Security-Policy",
    "sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms allow-modals; " +
      "default-src * data: blob: 'unsafe-inline' 'unsafe-eval'; frame-ancestors 'self'"
  );
  // arquivo do Blob tem nome único e nunca muda, então pode guardar em cache
  res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400");
  res.status(200).send(html);
}
