import { z } from "zod";
import { REGIONS } from "./types.ts";

const titleType = z.enum(["movie", "series"]);
const yearMode = z.enum(["release", "added"]);

export const titleSchema = z.object({
  id: z.string().min(1),
  type: titleType,
  releaseYear: z.number().int(),
  addedYear: z.number().int().nullable(),
  countries: z.array(z.string().length(3)),
  genres: z.array(z.string()),
  directors: z.array(z.string()),
  duration: z.number().int().nonnegative().nullable(),
  durationUnit: z.enum(["min", "season"]).nullable(),
  rating: z.string().nullable(),
});

export const titlesSchema = z.array(titleSchema);

const regionName = z.enum(REGIONS);

export const metaSchema = z.object({
  schemaVersion: z.number().int().positive(),
  generatedAt: z.string(),
  source: z.object({
    file: z.string(),
    sha256: z.string(),
    rows: z.number().int().positive(),
    license: z.string(),
  }),
  defaultYearMode: yearMode,
  totals: z.object({
    titles: z.number().int(),
    movies: z.number().int(),
    series: z.number().int(),
    withCountry: z.number().int(),
    withoutCountry: z.number().int(),
    withDirector: z.number().int(),
    withoutDirector: z.number().int(),
    countryLabels: z.number().int(),
    countries: z.number().int(),
    multiCountryTitles: z.number().int(),
    countryOccurrences: z.number().int(),
    canonicalCountryPairs: z.number().int(),
    genres: z.number().int(),
  }),
  bases: z.object({
    country: z.number().int(),
    director: z.number().int(),
    genre: z.string(),
    region: z.string(),
  }),
  regions: z.array(z.object({ name: regionName, order: z.number().int() })),
  countries: z.array(
    z.object({
      name: z.string(),
      iso3: z.string().length(3),
      isoNumeric: z.string().length(3),
      region: regionName,
      aliases: z.array(z.string()).optional(),
    }),
  ),
  notes: z.array(z.string()),
});
