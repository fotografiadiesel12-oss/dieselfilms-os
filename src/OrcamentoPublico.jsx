import React, { useEffect, useState } from "react";
import { getOrcamento } from "./lib/orcamentosApi.js";
import { calcularInvestimentoTotal } from "./lib/precificacao.js";
import ReelsCard from "./components/ReelsCard.jsx";
import DirectVideoCard from "./components/DirectVideoCard.jsx";

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,500&family=Jost:wght@300;400;500;600;700&display=swap');
`;

const PRINT_CSS = `
@media print {
  body * { visibility: hidden; }
  #orcamento-print-area, #orcamento-print-area * { visibility: visible; }
  #orcamento-print-area { position: absolute; top: 0; left: 0; width: 100%; }
  .no-print { display: none !important; }
}
`;

const brl = (n) => (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const T = {
  bg: "#0a0806",
  panel: "#141009",
  panelLine: "rgba(198,151,62,0.22)",
  gold1: "#e8c467",
  gold2: "#c9962e",
  gold3: "#f6e6ae",
  text: "#f2ead9",
  textDim: "#b9ae97",
  textFaint: "#7d735e",
};

function Sprockets() {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 10, opacity: 0.5, margin: "28px 0" }}>
      {Array.from({ length: 10 }).map((_, i) => (
        <span key={i} style={{ width: 6, height: 6, borderRadius: 1, background: T.gold2 }} />
      ))}
    </div>
  );
}

function Shell({ children }) {
  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'Jost', sans-serif" }}>
      <style>{FONTS}{PRINT_CSS}</style>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "56px 24px 80px" }}>{children}</div>
    </div>
  );
}

export default function OrcamentoPublico({ id }) {
  const [state, setState] = useState({ loading: true, error: null, data: null });

  useEffect(() => {
    let cancelled = false;
    getOrcamento(id)
      .then((data) => { if (!cancelled) setState({ loading: false, error: null, data }); })
      .catch((err) => { if (!cancelled) setState({ loading: false, error: err.message, data: null }); });
    return () => { cancelled = true; };
  }, [id]);

  if (state.loading) {
    return (
      <Shell>
        <div style={{ textAlign: "center", color: T.textDim, paddingTop: 120 }}>Carregando orçamento...</div>
      </Shell>
    );
  }

  if (state.error || !state.data) {
    return (
      <Shell>
        <div style={{ textAlign: "center", paddingTop: 120 }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, marginBottom: 12 }}>Orçamento não encontrado</h1>
          <p style={{ color: T.textDim }}>O link pode estar incorreto ou o orçamento foi removido.</p>
        </div>
      </Shell>
    );
  }

  const orc = state.data;
  const precos = { taxaCartao: orc.taxaCartao, impostoSimples: orc.impostoSimples };
  const total = calcularInvestimentoTotal(orc.itens, precos);

  return (
    <Shell>
      <div id="orcamento-print-area">
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.32em", textTransform: "uppercase", color: T.gold1, fontWeight: 500 }}>
            Diesel Films
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: 34, margin: "14px 0 6px" }}>
            {orc.titulo}
          </h1>
          <div style={{ color: T.textDim, fontSize: 14 }}>Preparado para {orc.cliente?.nome}</div>
        </div>

        <Sprockets />

        <div style={{ background: T.panel, border: `1px solid ${T.panelLine}`, borderRadius: 14, padding: "28px 26px", marginBottom: 28 }}>
          {(orc.itens || []).map((it) => (
            <div key={it.id} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "14px 0", borderBottom: `1px solid ${T.panelLine}` }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 500 }}>{it.descricao}</div>
                {it.detalhes && <div style={{ fontSize: 13, color: T.textDim, marginTop: 4, maxWidth: 440 }}>{it.detalhes}</div>}
              </div>
              <div style={{ fontSize: 15, whiteSpace: "nowrap", color: T.gold3 }}>
                {brl(calcularInvestimentoTotal([it], precos))}
              </div>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 18 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20 }}>Investimento total</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: T.gold1 }}>{brl(total)}</div>
          </div>
        </div>

        {orc.observacoes && (
          <div style={{ marginBottom: 28, fontSize: 14, color: T.textDim, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
            {orc.observacoes}
          </div>
        )}

        {(orc.videos || []).length > 0 && (
          <div className="no-print" style={{ marginBottom: 28 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, marginBottom: 16, textAlign: "center" }}>
              Referências em vídeo
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 18, justifyContent: "center" }}>
              {orc.videos.map((v) => (
                <div key={v.id}>
                  {v.tipo === "social"
                    ? <ReelsCard thumbnailUrl={v.thumbnailUrl} handle={v.handle} link={v.link} titulo={v.titulo} />
                    : <DirectVideoCard link={v.link} titulo={v.titulo} />}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="no-print" style={{ textAlign: "center", marginTop: 36 }}>
          <button
            onClick={() => window.print()}
            style={{
              background: `linear-gradient(115deg, ${T.gold2}, ${T.gold1})`,
              color: "#141209", border: "none", borderRadius: 10, padding: "12px 28px",
              fontFamily: "'Jost', sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer",
            }}>
            Baixar / Imprimir
          </button>
        </div>
      </div>
    </Shell>
  );
}
