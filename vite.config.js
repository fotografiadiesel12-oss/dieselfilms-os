import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        app: resolve("index.html"),
        orcamento: resolve("orcamento.html"),
      },
    },
  },
  server: {
    port: Number(process.env.PORT) || 5173,
  },
});
