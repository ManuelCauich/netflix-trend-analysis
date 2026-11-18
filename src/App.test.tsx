import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App.tsx";

const topology = readFileSync(
  resolve(process.cwd(), "public/geo/countries-50m.json"),
  "utf8",
);

describe("App", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("geo/")) {
          return new Response(topology, {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        return new Response("no encontrado", { status: 404 });
      }),
    );
  });

  it("cae al conjunto de ejemplo, lo avisa y pinta las tarjetas", async () => {
    render(<App />);

    expect(await screen.findByText(/Tendencias del catálogo de Netflix/i)).toBeInTheDocument();
    expect(
      await screen.findByText(/Datos de ejemplo: ejecuta el ETL/i),
    ).toBeInTheDocument();
    expect(await screen.findByText(/Títulos por país/i)).toBeInTheDocument();
    expect(await screen.findByLabelText(/Mapa de títulos por país/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Limpiar filtros/i })).toBeDisabled();

    const countryButtons = await screen.findAllByRole("button", { name: /títulos$/ });
    expect(countryButtons.length).toBeGreaterThan(15);
    for (const button of countryButtons) {
      expect(button.getAttribute("d")?.length ?? 0).toBeGreaterThan(10);
    }
  });
});
