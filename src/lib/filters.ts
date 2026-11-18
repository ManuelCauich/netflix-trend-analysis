import type { CountryMeta, Title, TitleType, YearMode } from "../data/types.ts";

export interface Filters {
  type: "all" | TitleType;
  yearMode: YearMode;
  yearRange: [number, number];
  region: string | null;
  genre: string | null;
  country: string | null;
}

/** Dimensión que un gráfico ignora para no anularse a sí mismo. */
export type Dimension = "type" | "year" | "region" | "genre" | "country";

export type ActiveChip = {
  key: string;
  label: string;
  dimension: Dimension;
};

export function yearDomain(titles: Title[], mode: YearMode): [number, number] {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (const title of titles) {
    const year = mode === "release" ? title.releaseYear : title.addedYear;
    if (year === null) continue;
    if (year < min) min = year;
    if (year > max) max = year;
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return mode === "release" ? [1990, 2021] : [2008, 2021];
  }
  return [min, max];
}

export function createFilters(titles: Title[], mode: YearMode = "release"): Filters {
  return {
    type: "all",
    yearMode: mode,
    yearRange: yearDomain(titles, mode),
    region: null,
    genre: null,
    country: null,
  };
}

export function applyFilters(
  titles: Title[],
  filters: Filters,
  countriesByIso: Map<string, CountryMeta>,
  exclude?: Dimension | Dimension[],
): Title[] {
  const ignored = new Set<Dimension>(exclude === undefined ? [] : Array.isArray(exclude) ? exclude : [exclude]);
  const [from, to] = filters.yearRange;
  const region = ignored.has("region") ? null : filters.region;
  const genre = ignored.has("genre") ? null : filters.genre;
  const country = ignored.has("country") ? null : filters.country;
  const type = ignored.has("type") ? "all" : filters.type;
  const checkYear = !ignored.has("year");

  return titles.filter((title) => {
    if (type !== "all" && title.type !== type) return false;

    if (checkYear) {
      const year = filters.yearMode === "release" ? title.releaseYear : title.addedYear;
      if (year === null || year < from || year > to) return false;
    }

    if (country !== null && !title.countries.includes(country)) return false;

    if (region !== null) {
      const inRegion = title.countries.some(
        (iso) => countriesByIso.get(iso)?.region === region,
      );
      if (!inRegion) return false;
    }

    if (genre !== null && !title.genres.includes(genre)) return false;

    return true;
  });
}

export function activeChips(
  filters: Filters,
  defaults: Filters,
  countriesByIso: Map<string, CountryMeta>,
): ActiveChip[] {
  const chips: ActiveChip[] = [];

  if (filters.type !== "all") {
    chips.push({
      key: "type",
      dimension: "type",
      label: filters.type === "movie" ? "Películas" : "Series",
    });
  }

  if (filters.region !== null) {
    chips.push({ key: "region", dimension: "region", label: filters.region });
  }

  if (filters.genre !== null) {
    chips.push({ key: "genre", dimension: "genre", label: filters.genre });
  }

  if (filters.country !== null) {
    const country = countriesByIso.get(filters.country);
    chips.push({
      key: "country",
      dimension: "country",
      label: country?.name ?? filters.country,
    });
  }

  const [from, to] = filters.yearRange;
  const [defaultFrom, defaultTo] = defaults.yearRange;
  if (from !== defaultFrom || to !== defaultTo) {
    chips.push({ key: "year", dimension: "year", label: `${from}–${to}` });
  }

  return chips;
}

export function resetFilter(filters: Filters, dimension: Dimension, defaults: Filters): Filters {
  switch (dimension) {
    case "type":
      return { ...filters, type: "all" };
    case "region":
      return { ...filters, region: null };
    case "genre":
      return { ...filters, genre: null };
    case "country":
      return { ...filters, country: null };
    case "year":
      return { ...filters, yearRange: defaults.yearRange };
  }
}
