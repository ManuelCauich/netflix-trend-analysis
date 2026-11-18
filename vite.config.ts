import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * GitHub Pages sirve el sitio bajo `/<repositorio>/`.
 *
 * En GitHub Actions, `GITHUB_REPOSITORY` vale `propietario/repositorio`, así que
 * `base` se calcula solo y un cambio de nombre no rompe el despliegue. En local
 * el sitio se sirve en la raíz; para probar la ruta de Pages se puede forzar con
 * `VITE_BASE=/nombre-del-repositorio/ npm run build && npm run preview`.
 */
function resolveBase(): string {
  if (process.env.VITE_BASE) return process.env.VITE_BASE;
  const repository = process.env.GITHUB_REPOSITORY?.split("/")[1];
  return repository ? `/${repository}/` : "/";
}

export default defineConfig(({ command }) => ({
  base: command === "build" ? resolveBase() : "/",
  plugins: [react()],
}));
