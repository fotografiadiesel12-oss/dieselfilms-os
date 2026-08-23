import { kv } from "@vercel/kv";
import { signSession, pbkdf2Hex, randomSaltHex } from "./_lib/session.js";

const EQUIPE_KEY = "df_shared:df_equipe";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  const { email, senha } = req.body || {};
  if (!email || !senha) {
    res.status(400).json({ error: "Informe e-mail e senha." });
    return;
  }

  const raw = await kv.get(EQUIPE_KEY);
  const lista = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : [];
  const user = lista.find((u) => (u.email || "").toLowerCase() === String(email).trim().toLowerCase());

  if (!user) {
    res.status(401).json({ error: "E-mail ou senha incorretos." });
    return;
  }

  let ok = false;

  if (user.senhaHash && user.senhaSalt) {
    ok = pbkdf2Hex(senha, user.senhaSalt) === user.senhaHash;
  } else if (user.senha) {
    // conta antiga, ainda com senha em texto puro -- se bater, migra pro hash agora
    ok = user.senha === senha;
    if (ok) {
      const salt = randomSaltHex();
      const hash = pbkdf2Hex(senha, salt);
      const atualizada = lista.map((u) => {
        if (u.id !== user.id) return u;
        const { senha: _senha, ...resto } = u;
        return { ...resto, senhaHash: hash, senhaSalt: salt };
      });
      await kv.set(EQUIPE_KEY, JSON.stringify(atualizada));
    }
  }

  if (!ok) {
    res.status(401).json({ error: "E-mail ou senha incorretos." });
    return;
  }

  const token = signSession({ uid: user.id });
  const { senha: _s, senhaHash: _h, senhaSalt: _salt, ...safeUser } = user;
  res.status(200).json({ user: safeUser, token });
}
