import { describe, expect, it } from "vitest";
import type { CountryMeta, Title } from "../data/types.ts";
import {
  activeChips,
  applyFilters,
  createFilters,
  resetFilter,
  yearDomain,
  type Filters,
} from "./filters.ts";
import { countryCounts, topDirectors, topGenres, yearlySeries } from "./aggregate.ts";

const countries: CountryMeta[] = [
  { name: "United States", iso3: "USA", isoNumeric: "840", region: "Norteamérica" },
  { name: "Canada", iso3: "CAN", isoNumeric: "124", region: "Norteamérica" },
  { name: "Mexico", iso3: "MEX", isoNumeric: "484", region: "Latinoamérica y Caribe" },
  { name: "Spain", iso3: "ESP", isoNumeric: "724", region: "Europa" },
];

const countriesByIso = new Map(countries.map((country) => [country.iso3, country]));

function title(overrides: Partial<Title> & Pick<Title, "id">): Title {
  return {
    type: "movie",
    releaseYear: 2010,
    addedYear: 2015,
    countries: ["USA"],
    genres: ["Dramas"],
    directors: ["Directora A"],
    duration: 100,
    durationUnit: "min",
    rating: "TV-MA",
    ...overrides,
  };
}

const titles: Title[] = [
  title({ id: "a", countries: ["USA"], genres: ["Dramas"], releaseYear: 2010 }),
  title({ id: "b", countries: ["MEX", "ESP"], genres: ["Comedies"], releaseYear: 2020, addedYear: 2021 }),
  title({ id: "c", type: "series", countries: [], genres: [], releaseYear: 2021, directors: [] }),
  title({ id: "d", countries: ["MEX"], genres: ["Dramas"], releaseYear: 1995, addedYear: null }),
];

describe("filtros", () => {
  const defaults = createFilters(titles, "release");

  it("crea el rango con el dominio completo del modo", () => {
    expect(defaults.yearRange).toEqual([1995, 2021]);
    expect(yearDomain(titles, "release")).toEqual([1995, 2021]);
    expect(yearDomain(titles, "added")).toEqual([2015, 2021]);
  });

  it("aplica el tipo y deja fuera los títulos sin país cuando se filtra por país", () => {
    const filters: Filters = { ...defaults, type: "series" };
    expect(applyFilters(titles, filters, countriesByIso).map((item) => item.id)).toEqual(["c"]);

    const byCountry: Filters = { ...defaults, country: "MEX" };
    expect(applyFilters(titles, byCountry, countriesByIso).map((item) => item.id)).toEqual([
      "b",
      "d",
    ]);
  });

  it("una región incluye los títulos con al menos un país de esa región", () => {
    const filters: Filters = { ...defaults, region: "Europa" };
    expect(applyFilters(titles, filters, countriesByIso).map((item) => item.id)).toEqual(["b"]);
  });

  it("en modo Ingreso excluye los títulos sin fecha de ingreso", () => {
    const filters: Filters = { ...defaults, yearMode: "added", yearRange: [1995, 2021] };
    expect(applyFilters(titles, filters, countriesByIso).map((item) => item.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("excluye su propia dimensión para que un gráfico no se anule", () => {
    const filters: Filters = { ...defaults, type: "series" };
    const forDonut = applyFilters(titles, filters, countriesByIso, "type");
    expect(forDonut).toHaveLength(4);

    const forMap = applyFilters(titles, filters, countriesByIso, ["country", "region"]);
    expect(forMap).toHaveLength(1);
  });

  it("resume y quita filtros activos", () => {
    const filters: Filters = { ...defaults, type: "movie", region: "Europa", country: "ESP" };
    const chips = activeChips(filters, defaults, countriesByIso);
    expect(chips.map((chip) => chip.key)).toEqual(["type", "region", "country"]);

    const withoutRegion = resetFilter(filters, "region", defaults);
    expect(withoutRegion.region).toBeNull();
    expect(withoutRegion.type).toBe("movie");
  });
});

describe("agregaciones", () => {
  it("cuenta un título multipaís una vez por país y ordena por valor", () => {
    const counts = countryCounts(titles, countriesByIso);
    expect(counts[0]).toMatchObject({ iso3: "MEX", value: 2 });
    expect(counts.find((item) => item.iso3 === "ESP")?.value).toBe(1);
    expect(counts.reduce((sum, item) => sum + item.value, 0)).toBe(4);
  });

  it("completa los años sin títulos con cero", () => {
    const series = yearlySeries(titles, "release", [1995, 1997]);
    expect(series).toEqual([
      { year: 1995, value: 1 },
      { year: 1996, value: 0 },
      { year: 1997, value: 0 },
    ]);
  });

  it("excluye a los desconocidos de los rankings", () => {
    expect(topGenres(titles)).toEqual([
      { name: "Dramas", value: 2 },
      { name: "Comedies", value: 1 },
    ]);
    expect(topDirectors(titles)).toEqual([{ name: "Directora A", value: 3 }]);
  });
});
