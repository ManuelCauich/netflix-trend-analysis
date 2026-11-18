import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { metaSchema, titlesSchema } from "./schema.ts";

const META_PATH = resolve(process.cwd(), "public/data/meta.json");
const TITLES_PATH = resolve(process.cwd(), "public/data/titles.json");
const GEO_PATH = resolve(process.cwd(), "public/geo/countries-50m.json");

const hasData = existsSync(META_PATH) && existsSync(TITLES_PATH);

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
}

/**
 * Contrato real entre el ETL y la aplicación.
 *
 * `meta.json` y `titles.json` se versionan, así que estas pruebas corren en un
 * clon limpio. Si alguien borra los JSON (por ejemplo, tras un `git clean`),
 * se saltan en lugar de fallar: el ETL es quien debe regenerarlos.
 */
describe.skipIf(!hasData)("datos exportados por el ETL", () => {
  const meta = hasData ? metaSchema.parse(readJson(META_PATH)) : null;
  const titles = hasData ? titlesSchema.parse(readJson(TITLES_PATH)) : [];

  it("cumple el esquema zod y los totales declarados", () => {
    expect(meta).not.toBeNull();
    if (!meta) return;

    expect(titles).toHaveLength(meta.totals.titles);
    expect(meta.totals.titles).toBe(8807);
    expect(meta.totals.movies).toBe(6131);
    expect(meta.totals.series).toBe(2676);
    expect(meta.totals.countries).toBe(119);
    expect(meta.defaultYearMode).toBe("release");

    expect(titles.filter((title) => title.type === "movie")).toHaveLength(6131);
    expect(titles.filter((title) => title.type === "series")).toHaveLength(2676);
    expect(titles.filter((title) => title.countries.length === 0)).toHaveLength(831);
    expect(titles.filter((title) => title.directors.length === 0)).toHaveLength(2634);
    expect(titles.filter((title) => title.addedYear === null)).toHaveLength(10);
    expect(titles.reduce((sum, title) => sum + title.countries.length, 0)).toBe(
      meta.totals.canonicalCountryPairs,
    );
  });

  it("resuelve los alias históricos y el mapa une los 119 países", () => {
    if (!meta) return;

    const byIso = new Map(meta.countries.map((country) => [country.iso3, country]));
    const count = (iso3: string) =>
      titles.filter((title) => title.countries.includes(iso3)).length;

    expect(byIso.get("DEU")?.aliases).toEqual(["East Germany", "West Germany"]);
    expect(byIso.get("RUS")?.aliases).toEqual(["Soviet Union"]);
    expect(count("USA")).toBe(3690);
    expect(count("ESP")).toBe(232);
    expect(count("DEU")).toBe(231);
    expect(count("RUS")).toBe(30);

    for (const title of titles) {
      for (const iso3 of title.countries) {
        expect(byIso.has(iso3)).toBe(true);
      }
    }
  });

  it("tiene geometría para cada país canónico", () => {
    if (!meta || !existsSync(GEO_PATH)) return;

    const topology = readJson(GEO_PATH) as {
      objects: { countries: { geometries: Array<{ id?: string | number }> } };
    };
    const ids = new Set(
      topology.objects.countries.geometries
        .map((geometry) => geometry.id)
        .filter((id) => id !== undefined && id !== null)
        .map((id) => String(id).padStart(3, "0")),
    );

    const missing = meta.countries.filter((country) => !ids.has(country.isoNumeric));
    expect(missing).toEqual([]);
  });
});
