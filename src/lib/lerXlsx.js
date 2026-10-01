// Leitor mínimo de .xlsx (só os valores das células), sem dependência:
// um .xlsx é um zip com XMLs dentro -- lê o zip na mão e descompacta com o
// DecompressionStream nativo do navegador (e do Node 18+).

const decoder = new TextDecoder();

async function inflateRaw(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function lerZip(buffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("Esse arquivo não parece ser uma planilha .xlsx.");

  const total = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const arquivos = {};
  for (let n = 0; n < total; n++) {
    if (view.getUint32(p, true) !== 0x02014b50) break;
    const metodo = view.getUint16(p + 10, true);
    const tamanho = view.getUint32(p + 20, true);
    const nomeLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const comentLen = view.getUint16(p + 32, true);
    const local = view.getUint32(p + 42, true);
    const nome = decoder.decode(bytes.subarray(p + 46, p + 46 + nomeLen));
    arquivos[nome] = { metodo, tamanho, local };
    p += 46 + nomeLen + extraLen + comentLen;
  }

  return async (nome) => {
    const a = arquivos[nome];
    if (!a) return null;
    const inicio = a.local + 30 + view.getUint16(a.local + 26, true) + view.getUint16(a.local + 28, true);
    const dados = bytes.subarray(inicio, inicio + a.tamanho);
    return decoder.decode(a.metodo === 8 ? await inflateRaw(dados) : dados);
  };
}

const desescapar = (s) => s
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&amp;/g, "&");

const textos = (xml) => [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => desescapar(m[1])).join("");

// Devolve { "Nome da aba": { A1: valor, B2: valor, ... } } com números como
// number e o resto como string (fórmulas vêm com o último valor calculado).
export async function lerXlsx(buffer) {
  const ler = await lerZip(buffer);
  const workbook = await ler("xl/workbook.xml");
  const rels = await ler("xl/_rels/workbook.xml.rels");
  if (!workbook || !rels) throw new Error("Esse arquivo não parece ser uma planilha .xlsx.");

  const sharedXml = (await ler("xl/sharedStrings.xml")) || "";
  const shared = [...sharedXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textos(m[1]));

  const alvos = {};
  for (const m of rels.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = m[0].match(/\bId="([^"]+)"/)?.[1];
    const target = m[0].match(/\bTarget="([^"]+)"/)?.[1];
    if (id && target) alvos[id] = target.replace(/^\/?xl\//, "").replace(/^\//, "");
  }

  const abas = {};
  for (const m of workbook.matchAll(/<sheet\b[^>]*>/g)) {
    const nome = desescapar(m[0].match(/\bname="([^"]*)"/)?.[1] || "");
    const rid = m[0].match(/\br:id="([^"]+)"/)?.[1];
    const xml = rid && alvos[rid] ? await ler(`xl/${alvos[rid]}`) : null;
    if (!xml) continue;
    const celulas = {};
    for (const c of xml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = c[1].match(/\br="([A-Z]+\d+)"/)?.[1];
      if (!ref || !c[2]) continue;
      const tipo = c[1].match(/\bt="([^"]+)"/)?.[1];
      const v = c[2].match(/<v>([\s\S]*?)<\/v>/)?.[1];
      if (tipo === "s") celulas[ref] = shared[Number(v)] ?? "";
      else if (tipo === "inlineStr") celulas[ref] = textos(c[2]);
      else if (tipo === "str" || tipo === "e") celulas[ref] = v !== undefined ? desescapar(v) : "";
      else if (tipo === "b") celulas[ref] = v === "1";
      else if (v !== undefined) celulas[ref] = Number(v);
    }
    abas[nome] = celulas;
  }
  return abas;
}
