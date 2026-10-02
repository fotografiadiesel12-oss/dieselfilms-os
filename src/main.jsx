import "./storagePolyfill.js";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import OrcamentoPublico from "./OrcamentoPublico.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import "./index.css";
import { registrarAjudante } from "./lib/pushApi.js";

const orcamentoMatch = window.location.pathname.match(/^\/orcamento\/([^/]+)\/?$/);
if (!orcamentoMatch) registrarAjudante();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      {orcamentoMatch ? <OrcamentoPublico id={orcamentoMatch[1]} /> : <App />}
    </ErrorBoundary>
  </React.StrictMode>
);
