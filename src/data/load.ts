import { fixtureDataset } from "./fixture.ts";
import { metaSchema, titlesSchema } from "./schema.ts";
import type { Dataset } from "./types.ts";

const DATA_BASE = `${import.meta.env.BASE_URL}data`;

async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`No se pudo cargar ${url} (HTTP ${response.status})`);
  }
  return response.json();
}

// Carga los datos generados por el ETL o cae al fixture si aún no existen los JSON
export async function loadDataset(signal?: AbortSignal): Promise<Dataset> {
  try {
    const [rawMeta, rawTitles] = await Promise.all([
      fetchJson(`${DATA_BASE}/meta.json`, signal),
      fetchJson(`${DATA_BASE}/titles.json`, signal),
    ]);

    const meta = metaSchema.parse(rawMeta);
    const titles = titlesSchema.parse(rawTitles);

    if (meta.totals.titles !== titles.length) {
      console.warn(
        `meta.json declara ${meta.totals.titles} títulos y titles.json trae ${titles.length}.`,
      );
    }

    const countriesByIso = new Map(
      meta.countries.map((country) => [country.iso3, country]),
    );

    return {
      meta,
      titles,
      countriesByIso,
      isoByNumeric: new Map(meta.countries.map((country) => [country.isoNumeric, country])),
      genres: [...new Set(titles.flatMap((title) => title.genres))].sort((a, b) =>
        a.localeCompare(b, "es"),
      ),
      mode: "real",
    };
  } catch (error) {
    if (signal?.aborted) throw error;
    console.info(
      "Sin datos del ETL en public/data: se muestra el conjunto de ejemplo.",
      error,
    );
    return fixtureDataset;
  }
}
