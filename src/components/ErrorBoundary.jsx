import React from "react";

// Tela de fallback pra qualquer erro de render nao tratado -- sem isso, um erro
// em qualquer parte do app derruba a tela inteira (fica branca, sem explicacao).
// Fica independente do resto do app de proposito (paleta propria, sem imports
// do App.jsx) pra continuar funcionando mesmo se o problema for la.

const palette = {
  bg: "#0A0A09",
  surface: "#161513",
  border: "#2A2723",
  gold: "#C9A227",
  text: "#F3EFE4",
  textDim: "#A69F8E",
  red: "#D2685B",
};

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("Erro nao tratado:", error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div
        style={{
          minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
          background: palette.bg, padding: 24, fontFamily: "system-ui, sans-serif",
        }}>
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <div style={{ color: palette.red, fontSize: 13, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 10 }}>
            Algo deu errado
          </div>
          <div style={{ color: palette.text, fontSize: 17, marginBottom: 10 }}>
            Essa tela travou por um erro inesperado.
          </div>
          <div style={{ color: palette.textDim, fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
            Seus dados não foram perdidos — eles ficam salvos no servidor, não nesta tela.
            Recarregue a página pra continuar.
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: palette.gold, color: "#141209", border: "none", borderRadius: 8,
              padding: "10px 22px", fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}>
            Recarregar página
          </button>
        </div>
      </div>
    );
  }
}
