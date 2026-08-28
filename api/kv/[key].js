import { kv } from "@vercel/kv";
import { requireSession, loadEquipeMember, CARGOS_GESTAO } from "../_lib/session.js";

// Backend generico de chave/valor usado pelo window.storage (storagePolyfill.js)
// para os dados compartilhados do app (clientes, demandas, financeiro, contratos,
// equipe, orcamentos, precificacao) -- mesmo Upstash/KV ja conectado pro Feed.
//
// Exige uma sessao valida (token emitido por /api/login) -- sem isso, ninguem
// de fora consegue ler nem escrever esses dados.
//
// Leitura fica aberta pra qualquer pessoa logada de proposito: o Painel soma
// financeiro/clientes/demandas de todo mundo, e os formularios de Demandas,
// Contratos e Leads usam a lista de clientes num dropdown -- mesmo quem nao
// tem aquele modulo na barra lateral depende de ler esses dados por baixo
// dos panos. Escrita, por outro lado, so quem tem o modulo liberado (mesma
// regra que decide os botoes de editar na tela) -- sem essa checagem aqui,
// alguem com acesso restrito conseguiria alterar qualquer modulo so chamando
// a API direto pelo navegador, mesmo sem o botao aparecer pra ela.

const KEY_MODULE = {
  df_clientes: "clientes",
  df_leads: "leads",
  df_demandas: "demandas",
  df_financeiro: "financeiro",
  df_contratos: "contratos",
  df_orcamentos: "orcamentos",
  df_precificacao: "orcamentos",
  // df_equipe tem regra propria (ver abaixo) e df_activity fica liberado pra
  // qualquer pessoa logada -- e o log cruzado de acao de todo mundo em todo
  // modulo, precisa poder ser escrito por quem faz qualquer acao no sistema.
};

function podeAcessar(member, key) {
  if (!member) return false;
  if (CARGOS_GESTAO.includes(member.papel)) return true;
  if (key === "df_activity") return true;
  const modulo = KEY_MODULE[key];
  if (!modulo) return false; // chave desconhecida -- nega por padrao
  return (member.modulos || []).includes(modulo);
}

export default async function handler(req, res) {
  const session = requireSession(req, res);
  if (!session) return;

  const { key } = req.query;
  if (!key) {
    res.status(400).json({ error: "key obrigatória." });
    return;
  }
  const fullKey = `df_shared:${key}`;

  const member = await loadEquipeMember(kv, session.uid);
  if (!member) {
    res.status(403).json({ error: "Conta não encontrada na equipe." });
    return;
  }

  // df_equipe tem regra propria: leitura liberada pra qualquer pessoa logada
  // (o app inteiro depende de ler nomes/avatares da equipe), escrita só pra
  // quem gerencia -- as outras chaves seguem podeAcessar (cargo de gestão
  // ou o módulo liberado pra essa pessoa).
  const isEquipe = key === "df_equipe";
  const podeEscrever = isEquipe ? CARGOS_GESTAO.includes(member.papel) : podeAcessar(member, key);

  if (req.method === "GET") {
    let raw = await kv.get(fullKey);
    // equipe nunca deve sair do servidor com a senha de ninguem (hash/sal, ou
    // texto puro nas contas antigas que ainda nao logaram desde a migracao) --
    // ninguem no front-end precisa disso pra nada, so serve pra proteger.
    if (isEquipe && raw) {
      const lista = typeof raw === "string" ? JSON.parse(raw) : raw;
      raw = lista.map(({ senha, senhaHash, senhaSalt, ...resto }) => resto);
    }
    // o cliente sempre manda uma string ja serializada (JSON.stringify) pra guardar,
    // mas o @vercel/kv reconhece automaticamente que essa string "parece JSON" e
    // devolve ela ja desserializada em vez da string original -- normaliza aqui
    // pra sempre devolver string, que é o que window.storage/useSharedState espera.
    const value = raw === null || raw === undefined ? null : (typeof raw === "string" ? raw : JSON.stringify(raw));
    res.status(200).json({ value });
    return;
  }

  if (req.method === "PUT" || req.method === "POST") {
    if (!podeEscrever) {
      res.status(403).json({ error: "Sem permissão pra alterar esse módulo." });
      return;
    }
    const { value } = req.body || {};
    // como o GET acima nunca devolve a senha de ninguem pro front-end, uma
    // edicao que nao mexe na senha (ex: trocar email) chega aqui sem esses
    // campos -- reaproveita o que ja tava salvo pra nao apagar o acesso da
    // pessoa sem querer. So substitui quando o cliente manda um hash novo de
    // verdade (ou seja, a pessoa realmente trocou a senha agora).
    if (isEquipe && typeof value === "string") {
      try {
        const incoming = JSON.parse(value);
        const existingRaw = await kv.get(fullKey);
        const existing = existingRaw ? (typeof existingRaw === "string" ? JSON.parse(existingRaw) : existingRaw) : [];
        const merged = incoming.map((m) => {
          if (m.senhaHash && m.senhaSalt) return m;
          const prev = existing.find((e) => e.id === m.id);
          if (!prev) return m;
          const cred = prev.senhaHash && prev.senhaSalt
            ? { senhaHash: prev.senhaHash, senhaSalt: prev.senhaSalt }
            : (prev.senha ? { senha: prev.senha } : {});
          return { ...m, ...cred };
        });
        const mergedValue = JSON.stringify(merged);
        await kv.set(fullKey, mergedValue);
        res.status(200).json({ value: mergedValue });
        return;
      } catch {
        // payload inesperado -- segue pro caminho padrao abaixo em vez de travar a escrita
      }
    }
    await kv.set(fullKey, value);
    res.status(200).json({ value });
    return;
  }

  if (req.method === "DELETE") {
    if (!podeEscrever) {
      res.status(403).json({ error: "Sem permissão pra alterar esse módulo." });
      return;
    }
    await kv.del(fullKey);
    res.status(200).json({ deleted: true });
    return;
  }

  res.status(405).json({ error: "Método não permitido." });
}
