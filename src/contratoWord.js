// Gera o contrato em Word (.docx) com o mesmo visual da pré-visualização:
// faixa dourada, logo e nome da empresa no topo de toda página, logo em
// marca d'água e número de página.
import {
  AlignmentType, BorderStyle, Document, Footer, Header, HorizontalPositionRelativeFrom,
  ImageRun, Packer, PageNumber, Paragraph, Table, TableCell, TableRow, TextRun,
  VerticalAlign, VerticalPositionRelativeFrom, WidthType,
} from "docx";
import { lerParagrafos, FONTE, nomeArquivo } from "./contratoParse.js";

const MM = 56.7; // twips por mm
const tw = (mm) => Math.round(mm * MM); // o Word só aceita número inteiro
const EMU = 36000; // EMU por mm
const PXMM = 3.78; // px (96 dpi) por mm
const PAGE_W = 210;
const PAGE_H = 297;
const MARGEM = 20;
const DOURADO = ["#8A6A12", "#E8C158", "#C9A227", "#8A6A12"];

const carregarImagem = (src) => new Promise((ok, erro) => {
  const img = new Image();
  img.onload = () => ok(img);
  img.onerror = erro;
  img.src = src;
});

const canvasParaPng = (canvas) => new Promise((ok) => canvas.toBlob((b) => b.arrayBuffer().then((buf) => ok(new Uint8Array(buf))), "image/png"));

// Word não deixa a imagem transparente, então a marca d'água já sai clarinha
const logoClarinho = async (img) => {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const ctx = c.getContext("2d");
  ctx.globalAlpha = 0.08;
  ctx.drawImage(img, 0, 0);
  return canvasParaPng(c);
};

const faixaDourada = async () => {
  const c = document.createElement("canvas");
  c.width = 800; c.height = 8;
  const ctx = c.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, c.width, 0);
  DOURADO.forEach((cor, i) => g.addColorStop(i / (DOURADO.length - 1), cor));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, c.width, c.height);
  return canvasParaPng(c);
};

const imagemSolta = (data, wMm, hMm, xMm, yMm) => new ImageRun({
  type: "png", data,
  transformation: { width: Math.round(wMm * PXMM), height: Math.round(hMm * PXMM) },
  floating: {
    horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, offset: Math.round(xMm * EMU) },
    verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, offset: Math.round(yMm * EMU) },
    behindDocument: true, allowOverlap: true,
  },
});

export async function baixarContratoWord({ titulo, html, logo, empresa = {} }) {
  const img = await carregarImagem(logo);
  const proporcao = img.naturalWidth / img.naturalHeight;
  const logoPng = new Uint8Array(await (await fetch(logo)).arrayBuffer());
  const [logoWm, faixa] = await Promise.all([logoClarinho(img), faixaDourada()]);

  const wmW = 100;
  const wmH = wmW / proporcao;
  const logoH = 12;

  const nome = (empresa.razaoSocial || "DieselFilms").toUpperCase();
  const larguraTexto = tw(PAGE_W - MARGEM * 2);

  const semBorda = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const celula = (children, largura) => new TableCell({
    children, width: { size: largura, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    borders: { top: semBorda, left: semBorda, right: semBorda, bottom: { style: BorderStyle.SINGLE, size: 4, color: "EFE7D2" } },
    margins: { bottom: tw(4) },
  });
  const meia = Math.round(larguraTexto / 2);

  const header = new Header({
    children: [
      new Paragraph({
        spacing: { after: 0 },
        children: [
          imagemSolta(faixa, PAGE_W, 1.6, 0, 0),
          imagemSolta(logoWm, wmW, wmH, (PAGE_W - wmW) / 2, (PAGE_H - wmH) / 2 + 10),
        ],
      }),
      new Table({
        width: { size: larguraTexto, type: WidthType.DXA },
        columnWidths: [meia, meia],
        borders: { top: semBorda, left: semBorda, right: semBorda, bottom: semBorda, insideHorizontal: semBorda, insideVertical: semBorda },
        rows: [new TableRow({
          children: [
            celula([new Paragraph({ children: [new ImageRun({ type: "png", data: logoPng, transformation: { width: Math.round(logoH * proporcao * PXMM), height: Math.round(logoH * PXMM) } })] })], meia),
            celula([
              new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: nome, bold: true, size: 15, color: "8A6A12", characterSpacing: 40, font: "Arial" })] }),
              ...(empresa.cnpj ? [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `CNPJ ${empresa.cnpj}`, size: 15, color: "8C8577", font: "Arial" })] })] : []),
            ], meia),
          ],
        })],
      }),
    ],
  });

  const footer = new Footer({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        imagemSolta(faixa, PAGE_W, 1.1, 0, PAGE_H - 1.1),
        new TextRun({ children: ["Página ", PageNumber.CURRENT, " de ", PageNumber.TOTAL_PAGES], size: 16, color: "8C8577", font: "Arial" }),
      ],
    })],
  });

  const alinhamentos = { center: AlignmentType.CENTER, right: AlignmentType.RIGHT, justify: AlignmentType.JUSTIFIED, left: AlignmentType.LEFT };

  const corpo = lerParagrafos(html).map((p) => {
    const tamanho = Math.round(p.tamanho * 2);
    const vazio = !p.runs.some((r) => r.texto && r.texto.replace(/[\s ]/g, ""));
    if (vazio) return new Paragraph({ spacing: { after: 0, line: 160 }, children: [new TextRun({ text: "", size: Math.round(FONTE) })] });
    const runs = [];
    p.runs.forEach((r) => {
      if (r.quebra) { runs.push(new TextRun({ break: 1 })); return; }
      runs.push(new TextRun({ text: r.texto.replace(/\s+/g, " "), bold: r.negrito, size: tamanho, color: "1F1D19", font: "Arial" }));
    });
    return new Paragraph({
      alignment: alinhamentos[p.alinhamento],
      indent: p.recuo ? { left: tw(p.recuo) } : undefined,
      keepNext: p.negrito || undefined,
      spacing: { before: tw(p.antes), after: tw(p.depois), line: 360 },
      children: runs,
    });
  });

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: tw(PAGE_W), height: tw(PAGE_H) },
          margin: { top: tw(36), bottom: tw(22), left: tw(MARGEM), right: tw(MARGEM), header: tw(9), footer: tw(8) },
        },
      },
      headers: { default: header },
      footers: { default: footer },
      children: corpo,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo(titulo, "docx");
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
