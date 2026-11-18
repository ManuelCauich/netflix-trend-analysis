-- Esquema de netflix_dashboard.
--
-- Lo ejecuta etl/run.py en cada corrida, después de borrar el esquema:
-- la base siempre se reconstruye desde el CSV, sin migraciones ni estado
-- acumulado. No lo ejecutes a mano sobre una base con datos que quieras
-- conservar: la primera línea borra todo.

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- Catálogos

CREATE TABLE regions (
  region_id  smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       text NOT NULL UNIQUE,
  sort_order smallint NOT NULL
);

-- Una fila por etiqueta del CSV (122). Los alias históricos apuntan a su
-- sucesor con canonical_id; las vistas y el mapa agrupan por esa columna.
CREATE TABLE countries (
  country_id    smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          text NOT NULL UNIQUE,
  iso3          char(3) NOT NULL,
  iso_numeric   char(3) NOT NULL,
  region_id     smallint NOT NULL REFERENCES regions (region_id),
  canonical_id  smallint REFERENCES countries (country_id),
  is_historical boolean NOT NULL DEFAULT false,
  notes         text
);

CREATE INDEX countries_canonical_idx ON countries (canonical_id);
CREATE INDEX countries_iso3_idx ON countries (iso3);

CREATE TABLE genres (
  genre_id smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name     text NOT NULL UNIQUE
);

CREATE TABLE directors (
  director_id smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        text NOT NULL UNIQUE
);

-- Títulos y tablas puente

CREATE TABLE titles (
  show_id        text PRIMARY KEY,
  type           text NOT NULL CHECK (type IN ('movie', 'series')),
  title          text NOT NULL,
  release_year   smallint NOT NULL,
  date_added     date,
  added_year     smallint,
  added_month    smallint CHECK (added_month BETWEEN 1 AND 12),
  rating         text,
  duration_value smallint,
  duration_unit  text CHECK (duration_unit IN ('min', 'season')),
  cast_text      text,
  description    text,
  CONSTRAINT titles_duration_pair CHECK (
    (duration_value IS NULL AND duration_unit IS NULL)
    OR (duration_value IS NOT NULL AND duration_unit IS NOT NULL)
  )
);

CREATE INDEX titles_release_year_idx ON titles (release_year);
CREATE INDEX titles_added_year_idx ON titles (added_year);
CREATE INDEX titles_type_idx ON titles (type);

CREATE TABLE title_countries (
  show_id    text NOT NULL REFERENCES titles (show_id) ON DELETE CASCADE,
  country_id smallint NOT NULL REFERENCES countries (country_id),
  position   smallint NOT NULL,
  PRIMARY KEY (show_id, country_id)
);

CREATE INDEX title_countries_country_idx ON title_countries (country_id);

CREATE TABLE title_genres (
  show_id  text NOT NULL REFERENCES titles (show_id) ON DELETE CASCADE,
  genre_id smallint NOT NULL REFERENCES genres (genre_id),
  PRIMARY KEY (show_id, genre_id)
);

CREATE INDEX title_genres_genre_idx ON title_genres (genre_id);

CREATE TABLE title_directors (
  show_id     text NOT NULL REFERENCES titles (show_id) ON DELETE CASCADE,
  director_id smallint NOT NULL REFERENCES directors (director_id),
  position    smallint NOT NULL,
  PRIMARY KEY (show_id, director_id)
);

CREATE INDEX title_directors_director_idx ON title_directors (director_id);

-- Trazabilidad del proceso

CREATE TABLE etl_runs (
  run_id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  run_at        timestamptz NOT NULL DEFAULT now(),
  source_file   text NOT NULL,
  source_sha256 text NOT NULL,
  rows_in       integer NOT NULL,
  rows_loaded   integer NOT NULL,
  status        text NOT NULL,
  notes         jsonb
);

-- Vistas de control para validación de totales

CREATE VIEW v_titles_by_country AS
WITH base AS (
  SELECT count(DISTINCT show_id)::numeric AS with_country FROM title_countries
),
grouped AS (
  SELECT coalesce(c.canonical_id, c.country_id) AS canonical_id,
         count(DISTINCT tc.show_id) AS titles
  FROM title_countries tc
  JOIN countries c ON c.country_id = tc.country_id
  GROUP BY 1
)
SELECT cc.name,
       cc.iso3,
       cc.iso_numeric,
       r.name AS region,
       g.titles,
       round(100 * g.titles / b.with_country, 1) AS pct
FROM grouped g
JOIN countries cc ON cc.country_id = g.canonical_id
JOIN regions r ON r.region_id = cc.region_id
CROSS JOIN base b
ORDER BY g.titles DESC, cc.name;

CREATE VIEW v_titles_by_release_year AS
SELECT release_year AS year, count(*) AS titles
FROM titles
GROUP BY release_year
ORDER BY release_year;

CREATE VIEW v_titles_by_added_year AS
SELECT added_year AS year, count(*) AS titles
FROM titles
WHERE added_year IS NOT NULL
GROUP BY added_year
ORDER BY added_year;

CREATE VIEW v_top_genres AS
SELECT g.name AS genre, count(DISTINCT tg.show_id) AS titles
FROM genres g
JOIN title_genres tg ON tg.genre_id = g.genre_id
GROUP BY g.name
ORDER BY titles DESC, g.name;

CREATE VIEW v_top_directors AS
SELECT d.name AS director, count(DISTINCT td.show_id) AS titles
FROM directors d
JOIN title_directors td ON td.director_id = d.director_id
GROUP BY d.name
ORDER BY titles DESC, d.name;

CREATE VIEW v_type_share AS
SELECT type, count(*) AS titles,
       round(100.0 * count(*) / (SELECT count(*) FROM titles), 1) AS pct
FROM titles
GROUP BY type
ORDER BY type;

CREATE VIEW v_unknowns AS
SELECT
  (SELECT count(*) FROM titles t
     WHERE NOT EXISTS (SELECT 1 FROM title_countries tc WHERE tc.show_id = t.show_id))
    AS without_country,
  (SELECT count(*) FROM titles t
     WHERE NOT EXISTS (SELECT 1 FROM title_directors td WHERE td.show_id = t.show_id))
    AS without_director,
  (SELECT count(*) FROM titles WHERE date_added IS NULL) AS without_date_added;
