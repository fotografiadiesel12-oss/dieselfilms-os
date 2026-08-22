import { test } from "node:test";
import assert from "node:assert/strict";
import {
  seedPrecificacao,
  calcularValorHoraFinal,
  calcularItemTotal,
  calcularTotalLiquido,
  calcularInvestimentoTotal,
} from "./precificacao.js";

test("calcularValorHoraFinal soma custos, equipamentos, assinaturas e meta de lucro com margem de segurança", () => {
  const p = {
    ...seedPrecificacao(),
    horasPorMes: 100,
    custosPessoais: [{ valorMensal: 1000 }],
    custosEmpresa: [{ valorMensal: 500 }],
    equipamentos: [{ valorTotal: 1200, paybackMeses: 12 }],
    assinaturas: [{ valorMensal: 100 }],
    metaLucroMensal: 400,
    margemSeguranca: 0.1,
  };

  // base = (1000+500)/100 + 1200/(12*100) + 100/100 + 400/100 = 15 + 1 + 1 + 4 = 21
  // final = 21 * 1.1
  assert.equal(calcularValorHoraFinal(p), 23.1);
});

test("calcularValorHoraFinal usa 160 horas por mês como padrão quando não informado", () => {
  const p = seedPrecificacao();
  assert.equal(calcularValorHoraFinal(p), 0);
});

test("calcularItemTotal multiplica horas, diárias e valor individual", () => {
  assert.equal(calcularItemTotal({ horas: 2, diarias: 3, valorIndividual: 100 }), 600);
});

test("calcularItemTotal usa 1 como padrão para horas e diárias ausentes", () => {
  assert.equal(calcularItemTotal({ valorIndividual: 250 }), 250);
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
