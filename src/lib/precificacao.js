// Replica a lógica da planilha "Calculadora Orçafácil Pro" do cliente:
// 1) valor-hora do estúdio = (custos da empresa incl. "salário" + depreciação
//    de equipamento + assinaturas + meta de lucro) / horas por mês, com
//    margem de segurança.
// 2) cada item de orçamento = horas * diárias * valor da hora.
// 3) preço final cobrado do cliente = total líquido "engordado" pela taxa de
//    cartão + imposto, para que o que sobra depois de pagar as duas ainda
//    cubra o custo real.

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
});

const sum = (arr, key) => (arr || []).reduce((s, item) => s + (Number(item[key]) || 0), 0);

export function calcularValorHoraFinal(p) {
  const horasPorMes = Number(p.horasPorMes) || 160;
  const custosPessoaisTotal = sum(p.custosPessoais, "valorMensal");
  const custosEmpresaTotalComSalario = custosPessoaisTotal + sum(p.custosEmpresa, "valorMensal");
  const custosEmpresaHora = custosEmpresaTotalComSalario / horasPorMes;

  const equipamentosHora = (p.equipamentos || []).reduce((s, e) => {
    const paybackMeses = Number(e.paybackMeses) || 12;
    return s + (Number(e.valorTotal) || 0) / (paybackMeses * horasPorMes);
  }, 0);

  const assinaturasHora = sum(p.assinaturas, "valorMensal") / horasPorMes;
  const metaLucroHora = (Number(p.metaLucroMensal) || 0) / horasPorMes;

  const base = custosEmpresaHora + equipamentosHora + assinaturasHora + metaLucroHora;
  return base * (1 + (Number(p.margemSeguranca) || 0));
}

export function calcularItemTotal(item) {
  const horas = Number(item.horas) || 1;
  const diarias = Number(item.diarias) || 1;
  const valorIndividual = Number(item.valorIndividual) || 0;
  return horas * diarias * valorIndividual;
}

export function calcularTotalLiquido(itens) {
  return (itens || []).reduce((s, item) => s + calcularItemTotal(item), 0);
}

export function calcularInvestimentoTotal(itens, { taxaCartao, impostoSimples } = {}) {
  const totalLiquido = calcularTotalLiquido(itens);
  const taxaTotal = Math.min(0.95, Math.max(0, (Number(taxaCartao) || 0) + (Number(impostoSimples) || 0)));
  return totalLiquido / (1 - taxaTotal);
}
