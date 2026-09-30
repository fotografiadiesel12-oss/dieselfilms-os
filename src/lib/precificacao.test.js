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
} from "./precificacao.js";

const perto = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);

test("bate com os valores da planilha Calculadora Orçafácil Pro", () => {
  const p = {
    ...seedPrecificacao(),
    custosPessoais: [{ valorMensal: 1300 }, { valorMensal: 1470 }],
    custosEmpresa: [{ valorMensal: 120 }, { valorMensal: 150 }, { valorMensal: 100 }],
    equipamentos: [
      { valorTotal: 7500, paybackMeses: 12 },
      { valorTotal: 200, paybackMeses: 12 },
      { valorTotal: 90, paybackMeses: 12 },
      { valorTotal: 750, paybackMeses: 12 },
    ],
    assinaturas: [{ valorMensal: 40 }, { valorMensal: 120 }],
    metaLucroMensal: 10000,
  };
  const r = calcularValorHora(p);
  perto(r.salarioHora + r.empresaHora, 19.625);   // I22
  perto(r.equipamentosHora, 4.447916667);         // N22
  perto(r.assinaturasHora, 1);                    // D41
  perto(r.lucroHora, 62.5);                       // L29
  perto(r.base, 87.57291667);                     // L31
  perto(r.final, 96.33020833);                    // L33
  assert.equal(r.arredondado, 97);
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
