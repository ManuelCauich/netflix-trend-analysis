import type { CountryMeta, Title, YearMode } from "../data/types.ts";

export interface CountryDatum {
  iso3: string;
  name: string;
  region: string;
  value: number;
}

export interface RankedDatum {
  name: string;
  value: number;
}

export interface YearDatum {
  year: number;
  value: number;
}

// Agrupa títulos por país canónico (los multipaís cuentan una vez en cada país)
export function countryCounts(
  titles: Title[],
  countriesByIso: Map<string, CountryMeta>,
): CountryDatum[] {
  const counts = new Map<string, number>();

  for (const title of titles) {
    for (const iso of title.countries) {
      counts.set(iso, (counts.get(iso) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([iso3, value]) => {
      const country = countriesByIso.get(iso3);
      return {
        iso3,
        name: country?.name ?? iso3,
        region: country?.region ?? "Sin región",
        value,
      };
    })
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, "es"));
}

// Serie anual completa rellenando con 0 los años intermedios vacíos
export function yearlySeries(
  titles: Title[],
  mode: YearMode,
  domain: [number, number],
): YearDatum[] {
  const counts = new Map<number, number>();

  for (const title of titles) {
    const year = mode === "release" ? title.releaseYear : title.addedYear;
    if (year === null) continue;
    counts.set(year, (counts.get(year) ?? 0) + 1);
  }

  const series: YearDatum[] = [];
  for (let year = domain[0]; year <= domain[1]; year += 1) {
    series.push({ year, value: counts.get(year) ?? 0 });
  }
  return series;
}

export function peakYear(series: YearDatum[]): YearDatum | null {
  return series.reduce<YearDatum | null>(
    (best, item) => (best === null || item.value > best.value ? item : best),
    null,
  );
}

export function topGenres(titles: Title[], limit = 5): RankedDatum[] {
  const counts = new Map<string, number>();
  for (const title of titles) {
    for (const genre of new Set(title.genres)) {
      counts.set(genre, (counts.get(genre) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, "es"))
    .slice(0, limit);
}

export function allGenres(titles: Title[]): RankedDatum[] {
  const counts = new Map<string, number>();
  for (const title of titles) {
    for (const genre of new Set(title.genres)) {
      counts.set(genre, (counts.get(genre) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, "es"));
}

// Excluye títulos sin director del ranking
export function topDirectors(titles: Title[], limit = 5): RankedDatum[] {
  const counts = new Map<string, number>();
  for (const title of titles) {
    for (const director of new Set(title.directors)) {
      counts.set(director, (counts.get(director) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, "es"))
    .slice(0, limit);
}

export function typeSplit(titles: Title[]): { movies: number; series: number } {
  let movies = 0;
  let series = 0;
  for (const title of titles) {
    if (title.type === "movie") movies += 1;
    else series += 1;
  }
  return { movies, series };
}

export function distinctCountries(titles: Title[]): number {
  const set = new Set<string>();
  for (const title of titles) {
    for (const iso of title.countries) set.add(iso);
  }
  return set.size;
}

export function withoutCountry(titles: Title[]): number {
  return titles.filter((title) => title.countries.length === 0).length;
}

export function withoutAddedYear(titles: Title[]): number {
  return titles.filter((title) => title.addedYear === null).length;
}
