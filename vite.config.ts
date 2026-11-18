import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// En GitHub Pages la ruta base es el nombre del repositorio; en local corre en la raíz.
function resolveBase(): string {
  if (process.env.VITE_BASE) return process.env.VITE_BASE;
  const repository = process.env.GITHUB_REPOSITORY?.split("/")[1];
  return repository ? `/${repository}/` : "/";
}

export default defineConfig(({ command }) => ({
  base: command === "build" ? resolveBase() : "/",
  plugins: [react()],
}));
