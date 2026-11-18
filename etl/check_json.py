#!/usr/bin/env python3
"""Valida que los JSON generados en public/data cumplan el esquema y los totales de control."""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DATA = ROOT / "public" / "data"
GEOMETRY_PATH = ROOT / "public" / "geo" / "countries-50m.json"

REGIONS = [
    "Norteamérica",
    "Latinoamérica y Caribe",
    "Europa",
    "África",
    "Medio Oriente",
    "Asia",
    "Oceanía",
]

EXPECTED_TOTALS = {
    "titles": 8807,
    "movies": 6131,
    "series": 2676,
    "withCountry": 7976,
    "withoutCountry": 831,
    "withDirector": 6173,
    "withoutDirector": 2634,
    "countryLabels": 122,
    "countries": 119,
    "multiCountryTitles": 1315,
    "countryOccurrences": 10012,
    "canonicalCountryPairs": 10011,
    "genres": 42,
}

EXPECTED_COUNTRIES = {
    "United States": 3690,
    "Spain": 232,
    "Germany": 231,
    "Russia": 30,
}


def fail(errors: list[str], message: str) -> None:
    errors.append(message)
    print(f"  FALLA  {message}")


def ok(label: str) -> None:
    print(f"  ok     {label}")


def load_json(path: Path, errors: list[str]) -> Any | None:
    if not path.exists():
        fail(errors, f"no existe {path.relative_to(ROOT)}")
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        fail(errors, f"{path.name} no es JSON válido: {error}")
        return None


def check_meta(meta: dict[str, Any], errors: list[str]) -> None:
    if meta.get("schemaVersion") != 1:
        fail(errors, "meta.schemaVersion debe ser 1")
    else:
        ok("schemaVersion = 1")

    if meta.get("defaultYearMode") != "release":
        fail(errors, "meta.defaultYearMode debe ser «release»")
    else:
        ok("modo de año por defecto: estreno")

    source = meta.get("source", {})
    if len(str(source.get("sha256", ""))) != 64:
        fail(errors, "meta.source.sha256 debe tener 64 caracteres")
    if source.get("license") != "CC0":
        fail(errors, "meta.source.license debe ser CC0")

    totals = meta.get("totals", {})
    for key, expected in EXPECTED_TOTALS.items():
        value = totals.get(key)
        if value != expected:
            fail(errors, f"meta.totals.{key} = {value!r}; se esperaba {expected}")
        else:
            ok(f"meta.totals.{key} = {expected}")

    if source.get("rows") != totals.get("titles"):
        fail(
            errors,
            f"meta.source.rows ({source.get('rows')}) no coincide con los títulos "
            f"({totals.get('titles')})",
        )

    regions = meta.get("regions", [])
    names = [region.get("name") for region in regions]
    if names != REGIONS:
        fail(errors, f"meta.regions debe listar las 7 regiones en orden; llegó {names}")
    else:
        ok("7 regiones en orden")

    countries = meta.get("countries", [])
    if len(countries) != 119:
        fail(errors, f"meta.countries tiene {len(countries)} filas; se esperaban 119")
        return

    iso3 = [country.get("iso3") for country in countries]
    numeric = [country.get("isoNumeric") for country in countries]
    if len(set(iso3)) != 119:
        fail(errors, "meta.countries repite códigos ISO3")
    if len(set(numeric)) != 119:
        fail(errors, "meta.countries repite códigos ISO numéricos")
    for country in countries:
        if len(str(country.get("iso3", ""))) != 3:
            fail(errors, f"ISO3 inválido en {country.get('name')!r}")
        if len(str(country.get("isoNumeric", ""))) != 3:
            fail(errors, f"ISO numérico inválido en {country.get('name')!r}")
        if country.get("region") not in REGIONS:
            fail(errors, f"región desconocida en {country.get('name')!r}")
    if not errors:
        ok("119 países con ISO3, ISO numérico y región")

    by_name = {country["name"]: country for country in countries}
    if by_name.get("Germany", {}).get("aliases") != ["East Germany", "West Germany"]:
        fail(errors, "Alemania debe agrupar «East Germany» y «West Germany»")
    if by_name.get("Russia", {}).get("aliases") != ["Soviet Union"]:
        fail(errors, "Rusia debe agrupar «Soviet Union»")


def check_titles(
    titles: list[dict[str, Any]], meta: dict[str, Any], errors: list[str]
) -> None:
    countries = meta.get("countries", [])
    iso3 = {country["iso3"] for country in countries}

    ids = [title.get("id") for title in titles]
    if len(set(ids)) != len(ids):
        duplicates = [value for value, count in Counter(ids).items() if count > 1]
        fail(errors, f"titles.json repite {len(duplicates)} show_id: {duplicates[:5]}")

    computed = {
        "titles": len(titles),
        "movies": sum(1 for title in titles if title.get("type") == "movie"),
        "series": sum(1 for title in titles if title.get("type") == "series"),
        "withCountry": sum(1 for title in titles if title.get("countries")),
        "withoutCountry": sum(1 for title in titles if not title.get("countries")),
        "withDirector": sum(1 for title in titles if title.get("directors")),
        "withoutDirector": sum(1 for title in titles if not title.get("directors")),
        "multiCountryTitles": sum(
            1 for title in titles if len(title.get("countries", [])) > 1
        ),
        "canonicalCountryPairs": sum(
            len(set(title.get("countries", []))) for title in titles
        ),
        "genres": len({genre for title in titles for genre in title.get("genres", [])}),
    }

    for key, value in computed.items():
        declared = meta.get("totals", {}).get(key)
        if declared != value:
            fail(
                errors,
                f"titles.json calcula {key} = {value}, pero meta declara {declared}",
            )
    if not errors:
        ok("los totales de titles.json coinciden con meta.json")

    unknown = 0
    inconsistent = 0
    no_genre = 0
    without_date = 0
    year_range = [10_000, 0]
    for title in titles:
        for code in title.get("countries", []):
            if code not in iso3:
                unknown += 1
        if len(set(title.get("countries", []))) != len(title.get("countries", [])):
            inconsistent += 1
        if not title.get("genres"):
            no_genre += 1
        if title.get("addedYear") is None:
            without_date += 1
        year_range[0] = min(year_range[0], title.get("releaseYear", 0))
        year_range[1] = max(year_range[1], title.get("releaseYear", 0))
        has_duration = title.get("duration") is not None
        has_unit = title.get("durationUnit") is not None
        if has_duration != has_unit:
            inconsistent += 1

    if unknown:
        fail(errors, f"{unknown} referencias a países fuera de meta.countries")
    if inconsistent:
        fail(errors, f"{inconsistent} títulos con relaciones incoherentes")
    if no_genre:
        fail(errors, f"{no_genre} títulos sin género")
    if without_date != 10:
        fail(errors, f"{without_date} títulos sin año de ingreso; se esperaban 10")
    if year_range != [1925, 2021]:
        fail(errors, f"rango de estreno {year_range}; se esperaba [1925, 2021]")
    if not unknown and not inconsistent and not no_genre:
        ok("títulos con países conocidos, géneros y duración coherente")

    counts = Counter(
        code for title in titles for code in set(title.get("countries", []))
    )
    iso_by_name = {country["name"]: country["iso3"] for country in countries}
    for name, expected in EXPECTED_COUNTRIES.items():
        code = iso_by_name.get(name)
        value = counts.get(code, 0) if code else 0
        if value != expected:
            fail(errors, f"{name}: {value} títulos; se esperaban {expected}")
        else:
            ok(f"{name}: {expected} títulos")


def check_geometry(meta: dict[str, Any], errors: list[str]) -> None:
    if not GEOMETRY_PATH.exists():
        print(f"  aviso  no está {GEOMETRY_PATH.relative_to(ROOT)}; se omite el mapa")
        return

    topology = json.loads(GEOMETRY_PATH.read_text(encoding="utf-8"))
    ids = {
        str(item.get("id"))
        for item in topology["objects"]["countries"]["geometries"]
        if item.get("id") is not None
    }
    missing = [
        country["name"]
        for country in meta.get("countries", [])
        if country.get("isoNumeric") not in ids
    ]
    if missing:
        fail(errors, f"sin geometría en countries-50m.json: {missing}")
    else:
        ok("los 119 países canónicos tienen geometría")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=DEFAULT_DATA,
        help="carpeta con meta.json y titles.json (por defecto public/data)",
    )
    args = parser.parse_args(argv)

    print(f"Validando {args.data_dir.relative_to(ROOT) if args.data_dir.is_relative_to(ROOT) else args.data_dir}")

    errors: list[str] = []
    meta = load_json(args.data_dir / "meta.json", errors)
    titles = load_json(args.data_dir / "titles.json", errors)

    if isinstance(meta, dict):
        check_meta(meta, errors)
    if isinstance(meta, dict) and isinstance(titles, list):
        check_titles(titles, meta, errors)
        check_geometry(meta, errors)

    if errors:
        print(f"\n{len(errors)} comprobaciones fallaron.")
        return 1

    print("\nJSON válido: la aplicación puede publicarse.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
