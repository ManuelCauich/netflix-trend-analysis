import type { CountryMeta, Dataset, Meta, Title, TitleType } from "./types.ts";
import { REGIONS } from "./types.ts";

/**
 * Conjunto de ejemplo, generado con una semilla fija.
 *
 * No son cifras del catálogo: sirven para montar y probar la interfaz antes de
 * ejecutar el ETL. La aplicación muestra un aviso visible mientras se use este
 * conjunto, y lo sustituye por `public/data/*.json` en cuanto existen.
 */

const COUNTRIES: Array<Pick<CountryMeta, "name" | "iso3" | "isoNumeric" | "region"> & { weight: number }> = [
  { name: "United States", iso3: "USA", isoNumeric: "840", region: "Norteamérica", weight: 40 },
  { name: "India", iso3: "IND", isoNumeric: "356", region: "Asia", weight: 13 },
  { name: "United Kingdom", iso3: "GBR", isoNumeric: "826", region: "Europa", weight: 10 },
  { name: "Canada", iso3: "CAN", isoNumeric: "124", region: "Norteamérica", weight: 6 },
  { name: "France", iso3: "FRA", isoNumeric: "250", region: "Europa", weight: 6 },
  { name: "Japan", iso3: "JPN", isoNumeric: "392", region: "Asia", weight: 5 },
  { name: "Germany", iso3: "DEU", isoNumeric: "276", region: "Europa", weight: 4 },
  { name: "Spain", iso3: "ESP", isoNumeric: "724", region: "Europa", weight: 4 },
  { name: "Mexico", iso3: "MEX", isoNumeric: "484", region: "Latinoamérica y Caribe", weight: 4 },
  { name: "South Korea", iso3: "KOR", isoNumeric: "410", region: "Asia", weight: 3 },
  { name: "Brazil", iso3: "BRA", isoNumeric: "076", region: "Latinoamérica y Caribe", weight: 3 },
  { name: "Australia", iso3: "AUS", isoNumeric: "036", region: "Oceanía", weight: 3 },
  { name: "Italy", iso3: "ITA", isoNumeric: "380", region: "Europa", weight: 2 },
  { name: "Argentina", iso3: "ARG", isoNumeric: "032", region: "Latinoamérica y Caribe", weight: 2 },
  { name: "Nigeria", iso3: "NGA", isoNumeric: "566", region: "África", weight: 2 },
  { name: "South Africa", iso3: "ZAF", isoNumeric: "710", region: "África", weight: 2 },
  { name: "Turkey", iso3: "TUR", isoNumeric: "792", region: "Medio Oriente", weight: 2 },
  { name: "Israel", iso3: "ISR", isoNumeric: "376", region: "Medio Oriente", weight: 1 },
  { name: "Egypt", iso3: "EGY", isoNumeric: "818", region: "África", weight: 1 },
  { name: "China", iso3: "CHN", isoNumeric: "156", region: "Asia", weight: 1 },
  { name: "Colombia", iso3: "COL", isoNumeric: "170", region: "Latinoamérica y Caribe", weight: 1 },
  { name: "Sweden", iso3: "SWE", isoNumeric: "752", region: "Europa", weight: 1 },
  { name: "New Zealand", iso3: "NZL", isoNumeric: "554", region: "Oceanía", weight: 1 },
];

const GENRES = [
  "International Movies",
  "Dramas",
  "Comedies",
  "Documentaries",
  "Action & Adventure",
  "Romantic Movies",
  "Thrillers",
  "International TV Shows",
  "TV Dramas",
  "Kids' TV",
  "Stand-Up Comedy",
  "Horror Movies",
];

const DIRECTORS = [
  "Directora A",
  "Director B",
  "Directora C",
  "Director D",
  "Directora E",
  "Director F",
  "Director G",
  "Directora H",
];

const RATINGS = ["TV-MA", "TV-14", "R", "PG-13", "PG", "TV-PG", "TV-Y7", "NR"];

const FIRST_YEAR = 1990;
const LAST_YEAR = 2021;
const ADDED_FIRST_YEAR = 2008;
const ADDED_LAST_YEAR = 2021;
const TITLE_COUNT = 260;

function makeRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const random = makeRandom(20211125);

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(random() * items.length)]!;
}

function pickWeighted(): CountryMeta["iso3"] {
  const total = COUNTRIES.reduce((sum, country) => sum + country.weight, 0);
  let target = random() * total;
  for (const country of COUNTRIES) {
    target -= country.weight;
    if (target <= 0) return country.iso3;
  }
  return COUNTRIES[0]!.iso3;
}

/** Años recientes con más peso, como en el catálogo real. */
function pickReleaseYear(): number {
  const biased = Math.pow(random(), 0.45);
  const year = FIRST_YEAR + Math.floor(biased * (LAST_YEAR - FIRST_YEAR + 1));
  return Math.min(year, LAST_YEAR);
}

function makeTitle(index: number): Title {
  const type: TitleType = random() < 0.68 ? "movie" : "series";
  const countryCount = random() < 0.82 ? 1 : random() < 0.85 ? 2 : 3;
  const countries = Array.from(new Set(Array.from({ length: countryCount }, pickWeighted)));

  const genreCount = 1 + Math.floor(random() * 3);
  const genres = Array.from(new Set(Array.from({ length: genreCount }, () => pick(GENRES))));

  const hasDirector = random() < 0.7;
  const directors = hasDirector ? [pick(DIRECTORS)] : [];

  return {
    id: `fixture-${index + 1}`,
    type,
    releaseYear: pickReleaseYear(),
    addedYear:
      random() < 0.01
        ? null
        : ADDED_FIRST_YEAR +
          Math.floor(random() * (ADDED_LAST_YEAR - ADDED_FIRST_YEAR + 1)),
    countries,
    genres,
    directors,
    duration: type === "movie" ? 78 + Math.floor(random() * 70) : 1 + Math.floor(random() * 4),
    durationUnit: type === "movie" ? "min" : "season",
    rating: pick(RATINGS),
  };
}

const titles: Title[] = Array.from({ length: TITLE_COUNT }, (_, index) => makeTitle(index));

const countries: CountryMeta[] = COUNTRIES.map(({ name, iso3, isoNumeric, region }) => ({
  name,
  iso3,
  isoNumeric,
  region,
}));

const meta: Meta = {
  schemaVersion: 1,
  generatedAt: "1970-01-01T00:00:00.000Z",
  source: {
    file: "fixture",
    sha256: "0".repeat(64),
    rows: titles.length,
    license: "CC0",
  },
  defaultYearMode: "release",
  totals: {
    titles: titles.length,
    movies: titles.filter((title) => title.type === "movie").length,
    series: titles.filter((title) => title.type === "series").length,
    withCountry: titles.filter((title) => title.countries.length > 0).length,
    withoutCountry: titles.filter((title) => title.countries.length === 0).length,
    withDirector: titles.filter((title) => title.directors.length > 0).length,
    withoutDirector: titles.filter((title) => title.directors.length === 0).length,
    countryLabels: countries.length,
    countries: countries.length,
    multiCountryTitles: titles.filter((title) => title.countries.length > 1).length,
    countryOccurrences: titles.reduce((sum, title) => sum + title.countries.length, 0),
    canonicalCountryPairs: titles.reduce((sum, title) => sum + title.countries.length, 0),
    genres: GENRES.length,
  },
  bases: {
    country: titles.filter((title) => title.countries.length > 0).length,
    director: titles.filter((title) => title.directors.length > 0).length,
    genre: "títulos; un título puede tener hasta 3 géneros",
    region: "títulos con al menos un país de la región",
  },
  regions: REGIONS.map((name, index) => ({ name, order: index + 1 })),
  countries,
  notes: [
    "Datos de ejemplo generados en el navegador: no son cifras del catálogo.",
    "Ejecuta el ETL para cargar los JSON reales en public/data/.",
  ],
};

export const fixtureDataset: Dataset = {
  meta,
  titles,
  countriesByIso: new Map(countries.map((country) => [country.iso3, country])),
  isoByNumeric: new Map(countries.map((country) => [country.isoNumeric, country])),
  genres: [...GENRES].sort((a, b) => a.localeCompare(b, "es")),
  mode: "fixture",
};
