#!/usr/bin/env python3
"""Pipeline ETL para el catálogo de Netflix: CSV -> PostgreSQL -> JSON estático."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import re
import sys
from collections import Counter
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd
import psycopg
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
ALIASES_PATH = ROOT / "etl" / "aliases.csv"
SCHEMA_PATH = ROOT / "etl" / "schema.sql"
GEOMETRY_PATH = ROOT / "public" / "geo" / "countries-50m.json"
DEFAULT_OUT = ROOT / "public" / "data"

REGION_ORDER = [
    "Norteamérica",
    "Latinoamérica y Caribe",
    "Europa",
    "África",
    "Medio Oriente",
    "Asia",
    "Oceanía",
]

MONTHS = {
    "January": 1,
    "February": 2,
    "March": 3,
    "April": 4,
    "May": 5,
    "June": 6,
    "July": 7,
    "August": 8,
    "September": 9,
    "October": 10,
    "November": 11,
    "December": 12,
}

# Tres filas traen la duración en `rating` y `duration` vacío.
DURATION_RATING_FIXES = {"s5542": 74, "s5795": 84, "s5814": 66}

DURATION_RE = re.compile(r"^(\d+)\s+(min|Seasons?)$")

TYPE_MAP = {"Movie": "movie", "TV Show": "series"}

EXPECTED = {
    "titles": 8807,
    "movies": 6131,
    "series": 2676,
    "with_country": 7976,
    "without_country": 831,
    "country_labels": 122,
    "countries": 119,
    "multi_country": 1315,
    "country_occurrences": 10012,
    "canonical_country_pairs": 10011,
    "genres": 42,
    "genre_occurrences": 19323,
    "with_director": 6173,
    "without_director": 2634,
    "directors": 4993,
    "director_occurrences": 6977,
    "without_date_added": 10,
    "peak_year": 2018,
    "peak_titles": 1147,
    "united_states": 3690,
    "germany": 231,
    "russia": 30,
}

NOTES = [
    "122 etiquetas de país en el CSV; 119 países y territorios canónicos.",
    "Alemania Occidental/Oriental se agrupan con Alemania y la Unión Soviética con Rusia; por eso las 10,012 menciones de país del CSV quedan en 10,011 pares título–país.",
    "831 títulos no tienen país y no aparecen en el mapa.",
    "10 títulos no tienen fecha de ingreso y se excluyen del modo «ingreso».",
    "2021 está incompleto en altas: el archivo llega al 25 de septiembre de 2021.",
]


class EtlError(RuntimeError):
    """Error de datos o de configuración que detiene la corrida."""


def default_csv_path() -> Path:
    """Ruta del CSV: `data/raw/` si existe; si no, la ubicación provisional."""
    primary = ROOT / "data" / "raw" / "netflix_titles.csv"
    legacy = ROOT / "data" / "netflix_titles.csv"
    return primary if primary.exists() else legacy


def split_multi(value: str) -> list[str]:
    """Separa valores multivalor y descarta comas y espacios sobrantes."""
    return [segment.strip() for segment in value.strip(" ,").split(",") if segment.strip()]


def parse_date(value: str) -> date | None:
    text = value.strip()
    if not text:
        return None
    try:
        return datetime.strptime(text, "%B %d, %Y").date()
    except ValueError as error:
        raise EtlError(f"fecha de ingreso inválida: {value!r}") from error


def parse_duration(value: str) -> tuple[int | None, str | None]:
    text = value.strip()
    if not text:
        return None, None
    match = DURATION_RE.match(text)
    if not match:
        raise EtlError(f"duración inválida: {value!r}")
    unit = "min" if match.group(2) == "min" else "season"
    return int(match.group(1)), unit


def read_aliases() -> list[dict[str, Any]]:
    """Lee `etl/aliases.csv` y valida que la configuración esté completa."""
    if not ALIASES_PATH.exists():
        raise EtlError(f"no existe {ALIASES_PATH.relative_to(ROOT)}")

    with ALIASES_PATH.open(encoding="utf-8", newline="") as handle:
        rows = [dict(row) for row in csv.DictReader(handle)]

    if not rows:
        raise EtlError("aliases.csv está vacío")

    names = {row["name"] for row in rows}
    if len(names) != len(rows):
        raise EtlError("aliases.csv tiene nombres repetidos")

    for row in rows:
        if not row["name"] or not row["iso3"] or not row["iso_numeric"]:
            raise EtlError(f"fila incompleta en aliases.csv: {row}")
        if row["region"] not in REGION_ORDER:
            raise EtlError(f"región desconocida en {row['name']}: {row['region']!r}")
        if row["canonical"] not in names:
            raise EtlError(f"canónico inexistente para {row['name']}: {row['canonical']!r}")

    return rows


def check_geometry(aliases: list[dict[str, Any]]) -> None:
    """Comprueba que cada país canónico tenga geometría en el TopoJSON."""
    if not GEOMETRY_PATH.exists():
        print(f"  aviso: no existe {GEOMETRY_PATH.relative_to(ROOT)}; se omite la comprobación")
        return

    topology = json.loads(GEOMETRY_PATH.read_text(encoding="utf-8"))
    ids = {str(item.get("id")) for item in topology["objects"]["countries"]["geometries"]}
    canonical = {row["canonical"]: row for row in aliases}
    missing = [
        name
        for name, row in canonical.items()
        if row["iso_numeric"] not in ids
    ]
    if missing:
        raise EtlError(f"sin geometría en countries-50m.json: {sorted(missing)}")


def prepare(
    frame: pd.DataFrame, aliases: list[dict[str, Any]]
) -> tuple[list[dict[str, Any]], dict[str, int]]:
    """Limpia el DataFrame y devuelve los títulos listos para cargar."""
    known = {row["name"] for row in aliases}
    canonical = {row["name"]: row["canonical"] for row in aliases}
    titles: list[dict[str, Any]] = []
    statistical: Counter[str] = Counter()

    for row in frame.itertuples(index=False):
        show_id = row.show_id.strip()
        if not show_id:
            raise EtlError("hay una fila sin show_id")

        type_value = TYPE_MAP.get(row.type.strip())
        if type_value is None:
            raise EtlError(f"{show_id}: tipo desconocido {row.type!r}")

        countries = list(dict.fromkeys(split_multi(row.country)))
        unknown = [country for country in countries if country not in known]
        if unknown:
            raise EtlError(f"{show_id}: países sin fila en aliases.csv: {unknown}")

        genres = list(dict.fromkeys(split_multi(row.listed_in)))
        directors = list(dict.fromkeys(split_multi(row.director)))

        added = parse_date(row.date_added)

        if show_id in DURATION_RATING_FIXES:
            duration_value, duration_unit = DURATION_RATING_FIXES[show_id], "min"
            rating = None
            statistical["duration_fixes"] += 1
        else:
            duration_value, duration_unit = parse_duration(row.duration)
            rating = row.rating.strip() or None

        if rating is not None and DURATION_RE.match(rating):
            raise EtlError(f"{show_id}: la duración sigue en rating ({rating!r})")

        titles.append(
            {
                "show_id": show_id,
                "type": type_value,
                "title": row.title.strip(),
                "release_year": int(row.release_year),
                "date_added": added,
                "rating": rating,
                "duration_value": duration_value,
                "duration_unit": duration_unit,
                "cast_text": row.cast.strip() or None,
                "description": row.description.strip() or None,
                "countries": countries,
                "genres": genres,
                "directors": directors,
            }
        )

        statistical["rows"] += 1
        statistical["country_occurrences"] += len(countries)
        statistical["canonical_country_pairs"] += len(
            {canonical[name] for name in countries}
        )
        statistical["genre_occurrences"] += len(genres)
        statistical["director_occurrences"] += len(directors)
        if len(countries) > 1:
            statistical["multi_country"] += 1

    return titles, dict(statistical)


def validate_frame(frame: pd.DataFrame, source: Path) -> None:
    expected_columns = {
        "show_id",
        "type",
        "title",
        "director",
        "cast",
        "country",
        "date_added",
        "release_year",
        "rating",
        "duration",
        "listed_in",
        "description",
    }
    missing = expected_columns - set(frame.columns)
    if missing:
        raise EtlError(f"{source.name}: faltan columnas {sorted(missing)}")
    if len(frame) != EXPECTED["titles"]:
        raise EtlError(
            f"{source.name}: {len(frame)} filas, se esperaban {EXPECTED['titles']}"
        )
    duplicated = frame["show_id"].duplicated().sum()
    if duplicated:
        raise EtlError(f"{source.name}: {duplicated} show_id duplicados")

    years = pd.to_numeric(frame["release_year"], errors="coerce")
    if years.isna().any():
        raise EtlError("hay release_year no numéricos")
    if years.min() < 1925 or years.max() > 2021:
        raise EtlError(f"release_year fuera de rango: {years.min()}–{years.max()}")


def load(
    connection: psycopg.Connection,
    titles: list[dict[str, Any]],
    aliases: list[dict[str, Any]],
) -> None:
    """Borra y recrea el esquema, y carga todo dentro de una transacción."""
    with connection.cursor() as cursor:
        cursor.execute(SCHEMA_PATH.read_text(encoding="utf-8"))

        region_ids: dict[str, int] = {}
        for order, name in enumerate(REGION_ORDER, start=1):
            cursor.execute(
                "INSERT INTO regions (name, sort_order) VALUES (%s, %s) RETURNING region_id",
                (name, order),
            )
            region_ids[name] = cursor.fetchone()[0]

        country_ids: dict[str, int] = {}
        for row in aliases:
            cursor.execute(
                """
                INSERT INTO countries
                    (name, iso3, iso_numeric, region_id, is_historical, notes)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING country_id
                """,
                (
                    row["name"],
                    row["iso3"],
                    row["iso_numeric"],
                    region_ids[row["region"]],
                    row["is_historical"].strip().lower() == "true",
                    row["notes"] or None,
                ),
            )
            country_ids[row["name"]] = cursor.fetchone()[0]

        for row in aliases:
            if row["canonical"] != row["name"]:
                cursor.execute(
                    "UPDATE countries SET canonical_id = %s WHERE country_id = %s",
                    (country_ids[row["canonical"]], country_ids[row["name"]]),
                )

        cursor.executemany(
            """
            INSERT INTO titles (
                show_id, type, title, release_year, date_added, added_year,
                added_month, rating, duration_value, duration_unit, cast_text,
                description
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            [
                (
                    item["show_id"],
                    item["type"],
                    item["title"],
                    item["release_year"],
                    item["date_added"],
                    item["date_added"].year if item["date_added"] else None,
                    item["date_added"].month if item["date_added"] else None,
                    item["rating"],
                    item["duration_value"],
                    item["duration_unit"],
                    item["cast_text"],
                    item["description"],
                )
                for item in titles
            ],
        )

        genre_names = sorted({genre for item in titles for genre in item["genres"]})
        genre_ids: dict[str, int] = {}
        for name in genre_names:
            cursor.execute(
                "INSERT INTO genres (name) VALUES (%s) RETURNING genre_id", (name,)
            )
            genre_ids[name] = cursor.fetchone()[0]

        director_names = sorted({name for item in titles for name in item["directors"]})
        director_ids: dict[str, int] = {}
        for name in director_names:
            cursor.execute(
                "INSERT INTO directors (name) VALUES (%s) RETURNING director_id", (name,)
            )
            director_ids[name] = cursor.fetchone()[0]

        cursor.executemany(
            "INSERT INTO title_countries (show_id, country_id, position) VALUES (%s, %s, %s)",
            [
                (item["show_id"], country_ids[country], position)
                for item in titles
                for position, country in enumerate(item["countries"], start=1)
            ],
        )
        cursor.executemany(
            "INSERT INTO title_genres (show_id, genre_id) VALUES (%s, %s)",
            [
                (item["show_id"], genre_ids[genre])
                for item in titles
                for genre in item["genres"]
            ],
        )
        cursor.executemany(
            "INSERT INTO title_directors (show_id, director_id, position) VALUES (%s, %s, %s)",
            [
                (item["show_id"], director_ids[name], position)
                for item in titles
                for position, name in enumerate(item["directors"], start=1)
            ],
        )


CHECKS: list[tuple[str, str, str]] = [
    ("títulos", "SELECT count(*) FROM titles", "titles"),
    ("películas", "SELECT count(*) FROM titles WHERE type = 'movie'", "movies"),
    ("series", "SELECT count(*) FROM titles WHERE type = 'series'", "series"),
    (
        "títulos con país",
        "SELECT count(DISTINCT show_id) FROM title_countries",
        "with_country",
    ),
    (
        "títulos sin país",
        "SELECT count(*) FROM titles t WHERE NOT EXISTS "
        "(SELECT 1 FROM title_countries tc WHERE tc.show_id = t.show_id)",
        "without_country",
    ),
    ("etiquetas de país", "SELECT count(*) FROM countries", "country_labels"),
    (
        "países canónicos",
        "SELECT count(*) FROM countries WHERE canonical_id IS NULL",
        "countries",
    ),
    (
        "títulos multipaís",
        "SELECT count(*) FROM (SELECT show_id FROM title_countries "
        "GROUP BY show_id HAVING count(*) > 1) s",
        "multi_country",
    ),
    ("apariciones de país", "SELECT count(*) FROM title_countries", "country_occurrences"),
    (
        "pares título–país canónico",
        "SELECT count(*) FROM (SELECT DISTINCT tc.show_id, "
        "coalesce(c.canonical_id, c.country_id) AS country_id "
        "FROM title_countries tc JOIN countries c ON c.country_id = tc.country_id) s",
        "canonical_country_pairs",
    ),
    ("géneros", "SELECT count(*) FROM genres", "genres"),
    ("apariciones de género", "SELECT count(*) FROM title_genres", "genre_occurrences"),
    (
        "títulos con director",
        "SELECT count(DISTINCT show_id) FROM title_directors",
        "with_director",
    ),
    (
        "títulos sin director",
        "SELECT count(*) FROM titles t WHERE NOT EXISTS "
        "(SELECT 1 FROM title_directors td WHERE td.show_id = t.show_id)",
        "without_director",
    ),
    ("directores", "SELECT count(*) FROM directors", "directors"),
    (
        "apariciones de director",
        "SELECT count(*) FROM title_directors",
        "director_occurrences",
    ),
    (
        "títulos sin fecha de ingreso",
        "SELECT count(*) FROM titles WHERE date_added IS NULL",
        "without_date_added",
    ),
    (
        "año con más estrenos",
        "SELECT release_year FROM titles GROUP BY release_year "
        "ORDER BY count(*) DESC, release_year LIMIT 1",
        "peak_year",
    ),
    (
        "estrenos del año pico",
        "SELECT count(*) FROM titles WHERE release_year = 2018",
        "peak_titles",
    ),
    (
        "Estados Unidos",
        "SELECT count(DISTINCT show_id) FROM title_countries WHERE country_id IN "
        "(SELECT country_id FROM countries WHERE canonical_id IS NULL AND name = 'United States')",
        "united_states",
    ),
    (
        "Alemania (agrupada)",
        "SELECT count(DISTINCT tc.show_id) FROM title_countries tc "
        "JOIN countries c ON c.country_id = tc.country_id "
        "WHERE coalesce(c.canonical_id, c.country_id) = "
        "(SELECT country_id FROM countries WHERE name = 'Germany')",
        "germany",
    ),
    (
        "Rusia (agrupada)",
        "SELECT count(DISTINCT tc.show_id) FROM title_countries tc "
        "JOIN countries c ON c.country_id = tc.country_id "
        "WHERE coalesce(c.canonical_id, c.country_id) = "
        "(SELECT country_id FROM countries WHERE name = 'Russia')",
        "russia",
    ),
]


def run_checks(cursor: psycopg.Cursor[Any]) -> dict[str, int]:
    """Compara la base cargada con las cifras de control; corta si falla."""
    results: dict[str, int] = {}
    failures: list[str] = []

    for label, query, key in CHECKS:
        cursor.execute(query)
        value = int(cursor.fetchone()[0])
        expected = EXPECTED[key]
        results[key] = value
        status = "ok" if value == expected else "FALLA"
        print(f"  {label:<28} {value:>7}  esperado {expected:>7}  {status}")
        if value != expected:
            failures.append(f"{label}: {value} != {expected}")

    if failures:
        raise EtlError("las comprobaciones no cuadran:\n  " + "\n  ".join(failures))

    return results


def build_meta(
    source: Path,
    sha256: str,
    results: dict[str, int],
    aliases: list[dict[str, Any]],
    generated_at: str,
) -> dict[str, Any]:
    by_canonical: dict[str, dict[str, Any]] = {}
    alias_map: dict[str, list[str]] = {}

    for row in aliases:
        alias_map.setdefault(row["canonical"], [])
        if row["name"] != row["canonical"]:
            alias_map[row["canonical"]].append(row["name"])
        if row["canonical"] == row["name"]:
            by_canonical[row["canonical"]] = row

    countries = []
    for name in sorted(by_canonical):
        row = by_canonical[name]
        countries.append(
            {
                "name": name,
                "iso3": row["iso3"],
                "isoNumeric": row["iso_numeric"],
                "region": row["region"],
                "aliases": sorted(alias_map.get(name, [])),
            }
        )

    return {
        "schemaVersion": 1,
        "generatedAt": generated_at,
        "source": {
            "file": source.name,
            "sha256": sha256,
            "rows": results["titles"],
            "license": "CC0",
        },
        "defaultYearMode": "release",
        "totals": {
            "titles": results["titles"],
            "movies": results["movies"],
            "series": results["series"],
            "withCountry": results["with_country"],
            "withoutCountry": results["without_country"],
            "withDirector": results["with_director"],
            "withoutDirector": results["without_director"],
            "countryLabels": results["country_labels"],
            "countries": results["countries"],
            "multiCountryTitles": results["multi_country"],
            "countryOccurrences": results["country_occurrences"],
            "canonicalCountryPairs": results["canonical_country_pairs"],
            "genres": results["genres"],
        },
        "bases": {
            "country": results["with_country"],
            "director": results["with_director"],
            "genre": "títulos; un título puede tener hasta 3 géneros",
            "region": "títulos con al menos un país de la región",
        },
        "regions": [
            {"name": name, "order": order}
            for order, name in enumerate(REGION_ORDER, start=1)
        ],
        "countries": countries,
        "notes": NOTES,
    }


def build_titles(titles: list[dict[str, Any]], aliases: list[dict[str, Any]]) -> list[dict[str, Any]]:
    iso_by_name = {row["name"]: row["iso3"] for row in aliases}
    exported = []

    for item in titles:
        countries = list(dict.fromkeys(iso_by_name[name] for name in item["countries"]))
        exported.append(
            {
                "id": item["show_id"],
                "type": item["type"],
                "releaseYear": item["release_year"],
                "addedYear": item["date_added"].year if item["date_added"] else None,
                "countries": countries,
                "genres": item["genres"],
                "directors": item["directors"],
                "duration": item["duration_value"],
                "durationUnit": item["duration_unit"],
                "rating": item["rating"],
            }
        )

    return exported


def export(out_dir: Path, meta: dict[str, Any], titles: list[dict[str, Any]]) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    meta_path = out_dir / "meta.json"
    titles_path = out_dir / "titles.json"

    meta_path.write_text(
        json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    titles_path.write_text(
        json.dumps(titles, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )

    for path in (meta_path, titles_path):
        size = path.stat().st_size / 1024
        print(f"  {path.relative_to(ROOT)}  {size:.0f} KB")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--csv",
        type=Path,
        default=default_csv_path(),
        help=(
            "CSV de Kaggle (por defecto data/raw/netflix_titles.csv; "
            "si no existe, data/netflix_titles.csv)"
        ),
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=DEFAULT_OUT,
        help="carpeta de los JSON (por defecto public/data)",
    )
    parser.add_argument(
        "--database-url",
        help="cadena de conexión; si falta se usa DATABASE_URL del entorno o .env",
    )
    args = parser.parse_args(argv)

    load_dotenv(ROOT / ".env")
    database_url = args.database_url or os.environ.get("DATABASE_URL")
    if not database_url:
        print(
            "Falta DATABASE_URL. Copia .env.example a .env y pon la contraseña del rol.",
            file=sys.stderr,
        )
        return 1

    source: Path = args.csv
    if not source.exists():
        print(f"No existe el CSV: {source}", file=sys.stderr)
        print(
            "Descárgalo de Kaggle y colócalo en data/raw/netflix_titles.csv "
            "(o en data/netflix_titles.csv)",
            file=sys.stderr,
        )
        return 1

    try:
        print(f"1/5 Leyendo {source}")
        frame = pd.read_csv(source, dtype=str, keep_default_na=False)
        frame.columns = [column.strip() for column in frame.columns]
        validate_frame(frame, source)

        print("2/5 Limpiando y validando")
        aliases = read_aliases()
        check_geometry(aliases)
        titles, statistics = prepare(frame, aliases)
        print(
            f"  {statistics['rows']:,} títulos · {statistics['country_occurrences']:,} países"
            f" · {statistics['multi_country']:,} multipaís"
            f" · {statistics['duration_fixes']} duraciones corregidas"
        )

        sha256 = hashlib.sha256(source.read_bytes()).hexdigest()
        generated_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
        generated_at = generated_at.replace("+00:00", "Z")

        print("3/5 Cargando en PostgreSQL")
        with psycopg.connect(database_url) as connection:
            with connection.transaction():
                load(connection, titles, aliases)

            with connection.cursor() as cursor:
                print("4/5 Comprobando totales")
                results = run_checks(cursor)

                meta = build_meta(source, sha256, results, aliases, generated_at)
                exported = build_titles(titles, aliases)
                meta["source"]["file"] = source.name

                cursor.execute(
                    """
                    INSERT INTO etl_runs
                        (source_file, source_sha256, rows_in, rows_loaded, status, notes)
                    VALUES (%s, %s, %s, %s, %s, %s::jsonb)
                    """,
                    (
                        source.name,
                        sha256,
                        statistics["rows"],
                        results["titles"],
                        "ok",
                        json.dumps(
                            {
                                "durationFixes": statistics["duration_fixes"],
                                "countryLabels": results["country_labels"],
                                "countries": results["countries"],
                                "multiCountry": results["multi_country"],
                            }
                        ),
                    ),
                )

        print("5/5 Exportando JSON")
        export(args.out, meta, exported)
    except EtlError as error:
        print(f"\nETL detenido: {error}", file=sys.stderr)
        return 1
    except psycopg.Error as error:
        print(f"\nError de PostgreSQL: {error}", file=sys.stderr)
        return 1

    print("\nListo. La base y los JSON quedaron actualizados.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
