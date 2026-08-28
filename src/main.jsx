import "./storagePolyfill.js";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import OrcamentoPublico from "./OrcamentoPublico.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import "./index.css";

const orcamentoMatch = window.location.pathname.match(/^\/orcamento\/([^/]+)\/?$/);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      {orcamentoMatch ? <OrcamentoPublico id={orcamentoMatch[1]} /> : <App />}
    </ErrorBoundary>
  </React.StrictMode>
);
