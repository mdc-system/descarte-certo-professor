import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// Três páginas (início, minha área e aviso de privacidade). "base: ./" deixa os caminhos relativos,
// então o mesmo build funciona em https://technologyhm.com.br/descarte-certo/ e em http://localhost.
// Em desenvolvimento (npm run dev), as chamadas para /api vão para o servidor.js na porta 5173.
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        inicio: resolve(__dirname, "index.html"),
        conta: resolve(__dirname, "conta.html"),
        privacidade: resolve(__dirname, "privacidade.html"),
      },
    },
  },
  server: { proxy: { "/api": "http://localhost:5173" } },
});
