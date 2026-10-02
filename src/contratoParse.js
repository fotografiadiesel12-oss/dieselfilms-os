// Lê o HTML da prévia do contrato (que pode ter sido editado à mão) e
// transforma em parágrafos, usado pra gerar o PDF e o Word.
export const PX = 0.2646; // 1px da prévia em mm (14px da prévia = 10,5pt)
export const FONTE = 10.5;

export const nomeArquivo = (titulo, ext) => `${(titulo || "contrato").trim().replace(/[^\w\-]+/g, "_") || "contrato"}.${ext}`;

const BLOCOS = new Set(["P", "DIV", "H1", "H2", "H3", "H4", "LI", "UL", "OL", "BLOCKQUOTE"]);

export const lerParagrafos = (html) => {
  const raiz = document.createElement("div");
  raiz.innerHTML = html;
  const paragrafos = [];

  const novo = (el) => {
    const s = el?.style || {};
    const px = (v) => parseFloat(v) || 0;
    const alinhamento = s.textAlign === "center" ? "center" : s.textAlign === "right" ? "right" : s.textAlign === "justify" ? "justify" : "left";
    const negrito = el && (/^H\d$/.test(el.tagName) || px(s.fontWeight) >= 600 || s.fontWeight === "bold");
    return {
      runs: [], alinhamento, negrito,
      tamanho: px(s.fontSize) ? px(s.fontSize) * 0.75 : FONTE,
      recuo: px(s.marginLeft) * PX,
      antes: px(s.marginTop) * PX,
      depois: px(s.marginBottom) * PX,
    };
  };

  const coletar = (no, p, emNegrito) => {
    if (no.nodeType === 3) { p.runs.push({ texto: no.textContent, negrito: emNegrito }); return; }
    if (no.nodeType !== 1) return;
    if (no.tagName === "BR") { p.runs.push({ quebra: true }); return; }
    const fw = no.style?.fontWeight;
    const negrito = emNegrito || no.tagName === "B" || no.tagName === "STRONG" || fw === "bold" || parseFloat(fw) >= 600;
    no.childNodes.forEach((f) => coletar(f, p, negrito));
  };

  const temBlocoDentro = (el) => Array.from(el.children).some((c) => BLOCOS.has(c.tagName));

  const visitar = (el) => {
    let solto = null; // texto fora de bloco
    el.childNodes.forEach((no) => {
      if (no.nodeType === 1 && BLOCOS.has(no.tagName)) {
        solto = null;
        if (temBlocoDentro(no)) { visitar(no); return; }
        const p = novo(no);
        coletar(no, p, p.negrito);
        paragrafos.push(p);
      } else {
        if (!solto) { solto = novo(null); paragrafos.push(solto); }
        coletar(no, solto, false);
      }
    });
  };
  visitar(raiz);
  return paragrafos;
};
