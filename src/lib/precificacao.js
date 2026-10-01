// Replica a lógica da planilha "Calculadora Orçafácil Pro":
// 1) valor-hora = (salário necessário [= soma dos gastos pessoais] + custos
//    da empresa + depreciação dos equipamentos + assinaturas + meta de lucro)
//    / horas trabalhadas no mês, mais a margem de segurança.
// 2) cada item do orçamento = horas * diárias * valor individual.
// 3) investimento total do cliente = total líquido / (1 - (taxa + imposto)),
//    pra que depois de pagar a taxa de cobrança e o imposto sobre o total
//    ainda sobre o valor líquido inteiro.

// Tabela de preços da aba "Projetos" da planilha.
export const tabelaPrecosPadrao = () => ([
  { id: "captacao", descricao: "Captação", valor: 49, usarValorHora: false },
  { id: "edicao", descricao: "Edição", valor: 98, usarValorHora: false },
  { id: "transporte", descricao: "Transporte", valor: 50, usarValorHora: false },
  { id: "alimentacao", descricao: "Alimentação", valor: 0, usarValorHora: false },
  { id: "gastos-extras", descricao: "Gastos extras", valor: 120, usarValorHora: false },
]);

export const seedPrecificacao = () => ({
  custosPessoais: [],
  custosEmpresa: [],
  equipamentos: [],
  assinaturas: [],
  metaLucroMensal: 0,
  horasPorMes: 160,
  margemSeguranca: 0.10,
  taxaCartao: 0.0499,
  impostoSimples: 0.06,
  tabelaPrecos: tabelaPrecosPadrao(),
});

// Dados salvos antes da tabela de preços existir não têm todos os campos.
export function normalizarPrecificacao(p) {
  const seed = seedPrecificacao();
  const base = { ...seed, ...(p || {}) };
  for (const k of ["custosPessoais", "custosEmpresa", "equipamentos", "assinaturas", "tabelaPrecos"]) {
    if (!Array.isArray(base[k])) base[k] = seed[k];
  }
  return base;
}

// Campo vazio conta como o padrão; zero digitado conta como zero.
const num = (v, padrao = 0) => {
  if (v === "" || v === null || v === undefined) return padrao;
  const n = Number(v);
  return Number.isFinite(n) ? n : padrao;
};

const sum = (arr, key) => (arr || []).reduce((s, item) => s + num(item[key]), 0);

export function horasDoMes(p) {
  return num(p.horasPorMes, 160) > 0 ? num(p.horasPorMes, 160) : 160;
}

export function equipamentoPorHora(e, horasPorMes) {
  const payback = num(e.paybackMeses, 12) > 0 ? num(e.paybackMeses, 12) : 12;
  return num(e.valorTotal) / (payback * horasPorMes);
}

// Tudo que a planilha mostra no bloco da direita, linha por linha.
export function calcularValorHora(p) {
  const horas = horasDoMes(p);
  const salarioMes = sum(p.custosPessoais, "valorMensal");
  const empresaMes = sum(p.custosEmpresa, "valorMensal");
  const assinaturasMes = sum(p.assinaturas, "valorMensal");
  const lucroMes = num(p.metaLucroMensal);
  const equipamentosInvestido = sum(p.equipamentos, "valorTotal");
  const equipamentosHora = (p.equipamentos || []).reduce((s, e) => s + equipamentoPorHora(e, horas), 0);

  const salarioHora = salarioMes / horas;
  const empresaHora = empresaMes / horas;
  const assinaturasHora = assinaturasMes / horas;
  const lucroHora = lucroMes / horas;

  const base = salarioHora + empresaHora + equipamentosHora + assinaturasHora + lucroHora;
  const margem = num(p.margemSeguranca);
  const final = base * (1 + margem);

  return {
    horas,
    salarioMes, salarioHora,
    empresaMes, empresaHora,
    equipamentosInvestido, equipamentosHora,
    assinaturasMes, assinaturasHora,
    lucroMes, lucroHora,
    base,
    margemValor: base * margem,
    final,
    arredondado: Math.ceil(final),
    faturamentoMensal: final * horas,
  };
}

export function calcularValorHoraFinal(p) {
  return calcularValorHora(p).final;
}

export function valorDoItemDaTabela(itemTabela, valorHora) {
  return itemTabela.usarValorHora ? valorHora : num(itemTabela.valor);
}

export function calcularItemTotal(item) {
  return num(item.horas, 1) * num(item.diarias, 1) * num(item.valorIndividual);
}

export function calcularTotalLiquido(itens) {
  return (itens || []).reduce((s, item) => s + calcularItemTotal(item), 0);
}

const taxaTotalDe = ({ taxaCartao, impostoSimples } = {}) =>
  Math.min(0.95, Math.max(0, num(taxaCartao) + num(impostoSimples)));

export function calcularInvestimentoTotal(itens, taxas) {
  return calcularTotalLiquido(itens) / (1 - taxaTotalDe(taxas));
}

// Rodapé da aba "Projetos": total líquido, quanto vai de taxa e de imposto,
// investimento total e a fatia de cada item no total.
export function calcularResumoOrcamento(itens, taxas = {}) {
  const liquido = calcularTotalLiquido(itens);
  const total = liquido / (1 - taxaTotalDe(taxas));
  return {
    liquido,
    taxaValor: total * num(taxas.taxaCartao),
    impostoValor: total * num(taxas.impostoSimples),
    total,
    fatias: (itens || []).map((it) => (liquido > 0 ? calcularItemTotal(it) / liquido : 0)),
  };
}

// Converte as células da planilha "Calculadora Orçafácil Pro" (já lidas por
// lerXlsx) pro formato da calculadora. Segue as posições fixas da planilha:
// aba "Orça Fácil" (custos, equipamentos, assinaturas, lucro) e aba
// "Projetos" (tabela de preços, taxa e imposto).
const semAcento = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const ehPlaceholder = (s) => !String(s || "").trim() || /^\[?\s*preencha/.test(semAcento(s));
const capitalizar = (s) => {
  const t = String(s || "").trim();
  return t === t.toUpperCase() ? t.charAt(0) + t.slice(1).toLowerCase() : t;
};

export function precificacaoDaPlanilha(abas) {
  const nomes = Object.keys(abas || {});
  const achar = (alvo) => nomes.find((n) => semAcento(n) === alvo) ?? nomes.find((n) => semAcento(n).includes(alvo));
  const orca = abas[achar("orca facil")];
  const projetos = abas[achar("projetos")];
  if (!orca || typeof orca.F6 !== "string" || !semAcento(orca.F6).includes("custos")) {
    throw new Error("Essa planilha não está no formato da Calculadora Orçafácil Pro.");
  }

  const n = (aba, ref) => (typeof aba?.[ref] === "number" && Number.isFinite(aba[ref]) ? aba[ref] : 0);
  const horas = n(orca, "C10") > 0 ? n(orca, "C10") : 160;

  const linhas = (colNome, colValor, de, ate, padrao, prefixo) => {
    const out = [];
    for (let r = de; r <= ate; r++) {
      const valor = n(orca, colValor + r);
      const nome = orca[colNome + r];
      if (!valor) continue;
      out.push({ id: `${prefixo}-${r}`, descricao: ehPlaceholder(nome) ? padrao : capitalizar(nome), valor, linha: r });
    }
    return out;
  };

  const custosPessoais = linhas("A", "B", 10, 21, "Outros gastos", "pes").map(({ id, descricao, valor }) => ({ id, descricao, valorMensal: valor }));
  // linha 10 da empresa é o "salário" (= soma dos gastos pessoais), que a calculadora já soma sozinha
  const custosEmpresa = linhas("F", "G", 11, 21, "Outros custos", "emp").map(({ id, descricao, valor }) => ({ id, descricao, valorMensal: valor }));
  const assinaturas = linhas("A", "B", 29, 40, "Outro programa", "ass").map(({ id, descricao, valor }) => ({ id, descricao, valorMensal: valor }));
  const equipamentos = linhas("K", "L", 10, 21, "Outro equipamento", "eqp").map(({ id, descricao, valor, linha }) => {
    // a coluna de payback da planilha está em horas (160 * 12) -- converte pra meses
    const meses = Math.round(n(orca, "M" + linha) / horas);
    return { id, descricao, valorTotal: valor, paybackMeses: meses > 0 ? meses : 12 };
  });

  const base = n(orca, "L31");
  const comMargem = n(orca, "L33");
  const margemSeguranca = base > 0 && comMargem > 0 ? Math.round((comMargem / base - 1) * 10000) / 10000 : 0.10;

  const resultado = {
    ...seedPrecificacao(),
    horasPorMes: horas,
    custosPessoais,
    custosEmpresa,
    equipamentos,
    assinaturas,
    metaLucroMensal: n(orca, "G28"),
    margemSeguranca,
  };

  if (projetos) {
    const tabela = [];
    for (let r = 4; r <= 12; r++) {
      const nome = projetos["A" + r];
      const valor = n(projetos, "D" + r);
      if (!String(nome || "").trim() || (semAcento(nome) === "outros" && !valor)) continue;
      tabela.push({ id: `srv-${r}`, descricao: capitalizar(nome), valor, usarValorHora: false });
    }
    if (tabela.length) resultado.tabelaPrecos = tabela;
    if (typeof projetos.F14 === "number") resultado.taxaCartao = projetos.F14;
    if (typeof projetos.F15 === "number") resultado.impostoSimples = projetos.F15;
  }

  return resultado;
}
