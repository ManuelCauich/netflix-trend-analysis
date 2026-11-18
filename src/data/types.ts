export const REGIONS = [
  "Norteamérica",
  "Latinoamérica y Caribe",
  "Europa",
  "África",
  "Medio Oriente",
  "Asia",
  "Oceanía",
] as const;

export type RegionName = (typeof REGIONS)[number];

export type TitleType = "movie" | "series";

export type YearMode = "release" | "added";

export interface Title {
  id: string;
  type: TitleType;
  releaseYear: number;
  addedYear: number | null;
  countries: string[];
  genres: string[];
  directors: string[];
  duration: number | null;
  durationUnit: "min" | "season" | null;
  rating: string | null;
}

export interface CountryMeta {
  name: string;
  iso3: string;
  isoNumeric: string;
  region: RegionName;
  aliases?: string[];
}

export interface Meta {
  schemaVersion: number;
  generatedAt: string;
  source: {
    file: string;
    sha256: string;
    rows: number;
    license: string;
  };
  defaultYearMode: YearMode;
  totals: {
    titles: number;
    movies: number;
    series: number;
    withCountry: number;
    withoutCountry: number;
    withDirector: number;
    withoutDirector: number;
    countryLabels: number;
    countries: number;
    multiCountryTitles: number;
    countryOccurrences: number;
    canonicalCountryPairs: number;
    genres: number;
  };
  bases: {
    country: number;
    director: number;
    genre: string;
    region: string;
  };
  regions: Array<{ name: RegionName; order: number }>;
  countries: CountryMeta[];
  notes: string[];
}

export type DataMode = "real" | "fixture";

export interface Dataset {
  meta: Meta;
  titles: Title[];
  countriesByIso: Map<string, CountryMeta>;
  isoByNumeric: Map<string, CountryMeta>;
  genres: string[];
  mode: DataMode;
}
