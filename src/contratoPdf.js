// Gera o PDF do contrato com o mesmo visual da pré-visualização:
// faixa dourada, logo e nome da empresa no topo, logo em marca d'água e
// número de página. O texto continua sendo texto (dá pra copiar/pesquisar).
import { jsPDF } from "jspdf";
import { lerParagrafos, PX, FONTE, nomeArquivo } from "./contratoParse.js";

const PAGE_W = 210;
const PAGE_H = 297;
const MARGEM_X = 20;
const TOPO_TEXTO = 38;
const FIM_TEXTO = PAGE_H - 20;
const LARGURA = PAGE_W - MARGEM_X * 2;
const ALTURA_LINHA = (FONTE * 0.3528) * 1.6;
const DOURADO = [[138, 106, 18], [232, 193, 88], [201, 162, 39], [138, 106, 18]];

// largura sem "kerning": o jsPDF desconta pares como "TA" na medida mas não
// no desenho, e palavras em maiúsculas acabavam grudando na seguinte
const medir = (doc, t) => Array.from(t).reduce((s, ch) => s + doc.getTextWidth(ch), 0);

const faixaDourada = (doc, y, h) => {
  const partes = 90;
  const w = PAGE_W / partes;
  for (let i = 0; i < partes; i++) {
    const t = (i / (partes - 1)) * (DOURADO.length - 1);
    const k = Math.min(DOURADO.length - 2, Math.floor(t));
    const f = t - k;
    const cor = DOURADO[k].map((v, c) => Math.round(v + (DOURADO[k + 1][c] - v) * f));
    doc.setFillColor(...cor);
    doc.rect(i * w, y, w + 0.2, h, "F");
  }
};

const desenharFolha = (doc, logo, empresa) => {
  faixaDourada(doc, 0, 1.6);
  faixaDourada(doc, PAGE_H - 1.1, 1.1);

  const props = doc.getImageProperties(logo);
  const proporcao = props.width / props.height;

  // marca d'água no meio da página
  const wmW = 100;
  const wmH = wmW / proporcao;
  doc.saveGraphicsState();
  doc.setGState(new doc.GState({ opacity: 0.08 }));
  doc.addImage(logo, "PNG", (PAGE_W - wmW) / 2, (PAGE_H - wmH) / 2 + 10, wmW, wmH, "logo-wm", "FAST");
  doc.restoreGraphicsState();

  // cabeçalho
  const logoH = 12;
  doc.addImage(logo, "PNG", MARGEM_X, 9, logoH * proporcao, logoH, "logo", "FAST");
  const nome = (empresa.razaoSocial || "DieselFilms").toUpperCase();
  const espaco = 0.7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(138, 106, 18);
  const wNome = medir(doc, nome) + espaco * (nome.length - 1);
  doc.text(nome, PAGE_W - MARGEM_X - wNome, empresa.cnpj ? 14 : 16, { charSpace: espaco });
  if (empresa.cnpj) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(140, 133, 119);
    doc.text(`CNPJ ${empresa.cnpj}`, PAGE_W - MARGEM_X, 18.5, { align: "right" });
  }
  doc.setDrawColor(239, 231, 210);
  doc.setLineWidth(0.3);
  doc.line(MARGEM_X, 26, PAGE_W - MARGEM_X, 26);
};

// Quebra o parágrafo em linhas de palavras (cada palavra sabe se é negrito).
const montarLinhas = (doc, p, largura) => {
  const linhas = [];
  let atual = [];
  let w = 0;
  const espaco = () => { doc.setFont("helvetica", "normal"); return doc.getTextWidth(" "); };
  const fechar = (ultima) => { linhas.push({ palavras: atual, largura: w, ultima }); atual = []; w = 0; };

  doc.setFontSize(p.tamanho);
  const sp = espaco();
  const tokens = [];
  p.runs.forEach((r) => {
    if (r.quebra) { tokens.push({ quebra: true }); return; }
    const partes = r.texto.replace(/ /g, " ").split(/(\s+)/);
    partes.forEach((t) => {
      if (!t) return;
      if (/^\s+$/.test(t)) tokens.push({ espaco: true });
      else tokens.push({ texto: t, negrito: r.negrito });
    });
  });

  // junta pedaços colados (ex.: "<b>1.1.</b>" seguido de texto sem espaço)
  const palavras = [];
  let colar = false;
  tokens.forEach((t) => {
    if (t.quebra) { palavras.push(t); colar = false; return; }
    if (t.espaco) { colar = false; return; }
    if (colar && palavras.length && !palavras[palavras.length - 1].quebra) palavras[palavras.length - 1].partes.push(t);
    else palavras.push({ partes: [t] });
    colar = true;
  });

  palavras.forEach((pal) => {
    if (pal.quebra) { fechar(true); return; }
    pal.largura = pal.partes.reduce((s, t) => {
      doc.setFont("helvetica", t.negrito ? "bold" : "normal");
      return s + medir(doc, t.texto);
    }, 0);
    const extra = atual.length ? sp : 0;
    if (atual.length && w + extra + pal.largura > largura) fechar(false);
    w += (atual.length ? sp : 0) + pal.largura;
    atual.push(pal);
  });
  if (atual.length || !linhas.length) fechar(true);
  return { linhas, sp };
};

export function gerarContratoPdf({ titulo, html, logo, empresa = {} }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  desenharFolha(doc, logo, empresa);
  let y = TOPO_TEXTO;

  const novaPagina = () => { doc.addPage(); desenharFolha(doc, logo, empresa); y = TOPO_TEXTO; };

  lerParagrafos(html).forEach((p) => {
    const vazio = !p.runs.some((r) => r.texto && r.texto.replace(/[\s ]/g, ""));
    const altLinha = ALTURA_LINHA * (p.tamanho / FONTE);
    if (vazio) { y += altLinha * 0.45 + p.depois * 0.5; return; }

    if (y > TOPO_TEXTO) y += p.antes;
    const largura = LARGURA - p.recuo;
    const { linhas, sp } = montarLinhas(doc, p, largura);
    // título de cláusula não fica sozinho no pé da página
    if (p.negrito && y + altLinha * 3 > FIM_TEXTO) novaPagina();

    linhas.forEach((ln) => {
      if (y + altLinha > FIM_TEXTO) novaPagina();
      const base = y + altLinha * 0.72;
      let x = MARGEM_X + p.recuo;
      let gap = sp;
      if (p.alinhamento === "center") x += (largura - ln.largura) / 2;
      else if (p.alinhamento === "right") x += largura - ln.largura;
      else if (p.alinhamento === "justify" && !ln.ultima && ln.palavras.length > 1) {
        gap = sp + (largura - ln.largura) / (ln.palavras.length - 1);
      }
      doc.setFontSize(p.tamanho);
      doc.setTextColor(31, 29, 25);
      ln.palavras.forEach((pal) => {
        pal.partes.forEach((t) => {
          doc.setFont("helvetica", t.negrito ? "bold" : "normal");
          doc.text(t.texto, x, base);
          x += medir(doc, t.texto);
        });
        x += gap;
      });
      y += altLinha;
    });
    y += p.depois;
  });

  // número de página no rodapé
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(140, 133, 119);
    doc.text(`Página ${i} de ${total}`, PAGE_W / 2, PAGE_H - 9, { align: "center" });
  }

  const nome = nomeArquivo(titulo, "pdf");
  return { doc, nome, arquivo: new File([doc.output("blob")], nome, { type: "application/pdf" }) };
}

export function baixarContratoPdf(dados) {
  const { doc, nome } = gerarContratoPdf(dados);
  doc.save(nome);
}
