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

// Os números que estavam preenchidos na planilha, pra não precisar redigitar.
export const valoresDaPlanilha = () => ({
  ...seedPrecificacao(),
  custosPessoais: [
    { id: "pl-aluguel", descricao: "Aluguel de casa", valorMensal: 1300 },
    { id: "pl-conta", descricao: "Conta de casa", valorMensal: 1470 },
  ],
  custosEmpresa: [
    { id: "pl-internet", descricao: "Internet", valorMensal: 120 },
    { id: "pl-luz", descricao: "Luz", valorMensal: 150 },
    { id: "pl-outros", descricao: "Outros custos", valorMensal: 100 },
  ],
  equipamentos: [
    { id: "pl-celular", descricao: "Celular", valorTotal: 7500, paybackMeses: 12 },
    { id: "pl-tripe", descricao: "Tripé", valorTotal: 200, paybackMeses: 12 },
    { id: "pl-microfone", descricao: "Microfone", valorTotal: 90, paybackMeses: 12 },
    { id: "pl-geral", descricao: "Geral", valorTotal: 750, paybackMeses: 12 },
  ],
  assinaturas: [
    { id: "pl-capcut", descricao: "CapCut Pro", valorMensal: 40 },
    { id: "pl-claude", descricao: "Claude", valorMensal: 120 },
  ],
  metaLucroMensal: 10000,
});
