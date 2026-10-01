import { test } from "node:test";
import assert from "node:assert/strict";
import {
  seedPrecificacao,
  normalizarPrecificacao,
  calcularValorHora,
  calcularValorHoraFinal,
  calcularItemTotal,
  calcularTotalLiquido,
  calcularInvestimentoTotal,
  calcularResumoOrcamento,
  valorDoItemDaTabela,
  precificacaoDaPlanilha,
} from "./precificacao.js";

const perto = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);

test("calcularValorHora segue as fórmulas da planilha Orçafácil (valores de exemplo)", () => {
  const p = {
    ...seedPrecificacao(),
    custosPessoais: [{ valorMensal: 2000 }, { valorMensal: 1200 }],
    custosEmpresa: [{ valorMensal: 300 }, { valorMensal: 100 }],
    equipamentos: [{ valorTotal: 7680, paybackMeses: 12 }, { valorTotal: 1920, paybackMeses: 12 }],
    assinaturas: [{ valorMensal: 160 }],
    metaLucroMensal: 8000,
  };
  const r = calcularValorHora(p);
  perto(r.salarioHora + r.empresaHora, 22.5); // (3200 + 400) / 160
  perto(r.equipamentosHora, 5);               // 9600 / (12 * 160)
  perto(r.assinaturasHora, 1);
  perto(r.lucroHora, 50);
  perto(r.base, 78.5);
  perto(r.final, 86.35);                      // + 10% de margem
  assert.equal(r.arredondado, 87);
  perto(calcularValorHoraFinal(p), r.final);
});

test("calcularValorHora usa 160 horas quando o campo está vazio", () => {
  const r = calcularValorHora({ ...seedPrecificacao(), horasPorMes: "", custosPessoais: [{ valorMensal: 1600 }], margemSeguranca: 0 });
  assert.equal(r.horas, 160);
  assert.equal(r.final, 10);
});

test("normalizarPrecificacao completa dados antigos sem tabela de preços", () => {
  const p = normalizarPrecificacao({ custosPessoais: [{ valorMensal: 1 }], metaLucroMensal: 5 });
  assert.equal(p.tabelaPrecos.length, 5);
  assert.equal(p.metaLucroMensal, 5);
  assert.deepEqual(p.equipamentos, []);
});

test("valorDoItemDaTabela usa o valor-hora quando marcado", () => {
  assert.equal(valorDoItemDaTabela({ valor: 49, usarValorHora: false }, 97), 49);
  assert.equal(valorDoItemDaTabela({ valor: 49, usarValorHora: true }, 97), 97);
});

test("calcularItemTotal multiplica horas, diárias e valor individual", () => {
  assert.equal(calcularItemTotal({ horas: 2, diarias: 3, valorIndividual: 100 }), 600);
});

test("calcularItemTotal usa 1 para campos vazios mas respeita zero digitado", () => {
  assert.equal(calcularItemTotal({ valorIndividual: 250 }), 250);
  assert.equal(calcularItemTotal({ horas: "", diarias: "", valorIndividual: 250 }), 250);
  assert.equal(calcularItemTotal({ horas: 0, diarias: 1, valorIndividual: 250 }), 0);
});

test("calcularTotalLiquido soma o total de todos os itens", () => {
  const itens = [
    { horas: 1, diarias: 1, valorIndividual: 100 },
    { horas: 2, diarias: 1, valorIndividual: 50 },
  ];
  assert.equal(calcularTotalLiquido(itens), 200);
});

test("calcularInvestimentoTotal engorda o total líquido pela taxa de cartão e imposto", () => {
  const itens = [{ horas: 1, diarias: 1, valorIndividual: 95 }];
  const total = calcularInvestimentoTotal(itens, { taxaCartao: 0.05, impostoSimples: 0 });
  assert.equal(Math.round(total * 100) / 100, 100);
});

test("calcularInvestimentoTotal nunca divide por uma taxa total >= 100%", () => {
  const itens = [{ horas: 1, diarias: 1, valorIndividual: 100 }];
  const total = calcularInvestimentoTotal(itens, { taxaCartao: 0.8, impostoSimples: 0.5 });
  assert.ok(Number.isFinite(total));
  assert.equal(Math.round(total * 100) / 100, 2000);
});

test("calcularResumoOrcamento separa taxa, imposto e fatia de cada item", () => {
  const itens = [
    { horas: 8, diarias: 1, valorIndividual: 49 },   // 392
    { horas: 8, diarias: 1, valorIndividual: 98 },   // 784
  ];
  const r = calcularResumoOrcamento(itens, { taxaCartao: 0.0499, impostoSimples: 0.06 });
  assert.equal(r.liquido, 1176);
  perto(r.total, 1176 / (1 - 0.1099));
  perto(r.liquido + r.taxaValor + r.impostoValor, r.total);
  perto(r.fatias[0] + r.fatias[1], 1);
  perto(r.fatias[1], 784 / 1176);
});

test("precificacaoDaPlanilha lê as posições da planilha Orçafácil", () => {
  const abas = {
    "Orça Fácil": {
      F6: "CUSTOS DA SUA EMPRESA",
      A10: "MERCADO", B10: 1000, C10: 100,
      A11: "[PREENCHA SEUS GASTOS]", B11: 200,
      A12: "[PREENCHA SEUS GASTOS]", B12: 0,
      F10: "O SALÁRIO QUE PRECISA GANHAR", G10: 1200,
      F11: "INTERNET", G11: 100,
      K10: "Câmera", L10: 2400, M10: 1200,
      A29: "Adobe", B29: 50,
      G28: 3000, L31: 50, L33: 60,
    },
    Projetos: {
      A4: "CAPTAÇÃO", D4: 40, A5: "EDIÇÃO", D5: 80, A9: "OUTROS", D9: 0,
      F14: 0.03, F15: 0.05,
    },
  };
  const p = precificacaoDaPlanilha(abas);
  assert.equal(p.horasPorMes, 100);
  assert.deepEqual(p.custosPessoais.map((c) => [c.descricao, c.valorMensal]), [["Mercado", 1000], ["Outros gastos", 200]]);
  assert.deepEqual(p.custosEmpresa.map((c) => [c.descricao, c.valorMensal]), [["Internet", 100]]);
  assert.equal(p.equipamentos[0].paybackMeses, 12);
  assert.equal(p.assinaturas[0].valorMensal, 50);
  assert.equal(p.metaLucroMensal, 3000);
  perto(p.margemSeguranca, 0.2);
  assert.deepEqual(p.tabelaPrecos.map((t) => [t.descricao, t.valor]), [["Captação", 40], ["Edição", 80]]);
  assert.equal(p.taxaCartao, 0.03);
  assert.equal(p.impostoSimples, 0.05);
});

test("precificacaoDaPlanilha recusa planilha em outro formato", () => {
  assert.throws(() => precificacaoDaPlanilha({ Plan1: { A1: "qualquer coisa" } }), /formato/);
});
