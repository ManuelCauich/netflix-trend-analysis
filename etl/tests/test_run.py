"""Pruebas unitarias para etl/run.py."""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path

import pytest

# Limpieza


def test_split_multi_quita_espacios_y_comas_sobrantes(etl) -> None:
    assert etl.split_multi(" United States, , Mexico ,") == [
        "United States",
        "Mexico",
    ]
    assert etl.split_multi("") == []
    assert etl.split_multi(" , ") == []


def test_parse_date_acepta_el_formato_del_csv(etl) -> None:
    assert etl.parse_date("September 25, 2021") == date(2021, 9, 25)
    assert etl.parse_date("  January 1, 2015  ") == date(2015, 1, 1)
    assert etl.parse_date("") is None


def test_parse_date_rechaza_formatos_desconocidos(etl) -> None:
    with pytest.raises(etl.EtlError):
        etl.parse_date("25/09/2021")


def test_parse_duration_distingue_minutos_y_temporadas(etl) -> None:
    assert etl.parse_duration("90 min") == (90, "min")
    assert etl.parse_duration("3 Seasons") == (3, "season")
    assert etl.parse_duration("1 Season") == (1, "season")
    assert etl.parse_duration("") == (None, None)


def test_parse_duration_rechaza_valores_raros(etl) -> None:
    with pytest.raises(etl.EtlError):
        etl.parse_duration("90")


# Aliases y mapeo geográfico


def test_aliases_tiene_122_etiquetas_y_119_canonicos(aliases) -> None:
    assert len(aliases) == 122
    assert len({row["name"] for row in aliases}) == 122
    assert len({row["canonical"] for row in aliases}) == 119


def test_aliases_marca_tres_historicos(aliases) -> None:
    historic = {row["name"] for row in aliases if row["is_historical"] == "true"}
    assert historic == {"East Germany", "West Germany", "Soviet Union"}


def test_aliases_apunta_a_canonicos_existentes(aliases) -> None:
    names = {row["name"] for row in aliases}
    for row in aliases:
        assert row["canonical"] in names
        if row["is_historical"] == "true":
            assert row["canonical"] != row["name"]


def test_solo_los_canonicos_repiten_codigo_iso(aliases) -> None:
    canonical = [row for row in aliases if row["canonical"] == row["name"]]
    assert len(canonical) == 119
    assert len({row["iso_numeric"] for row in canonical}) == 119
    assert len({row["iso3"] for row in canonical}) == 119


def test_todas_las_regiones_son_conocidas(etl, aliases) -> None:
    for row in aliases:
        assert row["region"] in etl.REGION_ORDER


# Cifras de control sobre el CSV


def test_validate_frame_acepta_el_csv_real(etl, frame, csv_path: Path) -> None:
    etl.validate_frame(frame, csv_path)


def test_validate_frame_rechaza_un_archivo_incompleto(etl, frame, csv_path: Path) -> None:
    with pytest.raises(etl.EtlError):
        etl.validate_frame(frame.head(10), csv_path)


def test_prepare_cuenta_8807_titulos_y_sus_relaciones(etl, frame, aliases) -> None:
    titles, statistics = etl.prepare(frame, aliases)

    assert len(titles) == 8807
    assert statistics["rows"] == 8807
    assert statistics["country_occurrences"] == 10012
    assert statistics["canonical_country_pairs"] == 10011
    assert statistics["multi_country"] == 1315
    assert statistics["genre_occurrences"] == 19323
    assert statistics["director_occurrences"] == 6977
    assert statistics["duration_fixes"] == 3

    assert {title["type"] for title in titles} == {"movie", "series"}
    assert sum(1 for title in titles if title["type"] == "movie") == 6131
    assert sum(1 for title in titles if title["type"] == "series") == 2676
    assert sum(1 for title in titles if not title["countries"]) == 831
    assert sum(1 for title in titles if not title["directors"]) == 2634
    assert sum(1 for title in titles if title["date_added"] is None) == 10


def test_prepare_no_deja_duraciones_en_rating(etl, frame, aliases) -> None:
    titles, _ = etl.prepare(frame, aliases)
    duration_like = etl.DURATION_RE

    for title in titles:
        has_value = title["duration_value"] is not None
        has_unit = title["duration_unit"] is not None
        assert has_value == has_unit
        if title["rating"] is not None:
            assert not duration_like.match(title["rating"])


def test_anio_pico_es_2018_con_1147_estrenos(etl, frame, aliases) -> None:
    titles, _ = etl.prepare(frame, aliases)
    counts: dict[int, int] = {}
    for title in titles:
        counts[title["release_year"]] = counts.get(title["release_year"], 0) + 1

    peak = max(counts, key=lambda year: (counts[year], -year))
    assert peak == 2018
    assert counts[peak] == 1147
    assert min(counts) >= 1925
    assert max(counts) <= 2021


def test_alemania_y_rusia_agrupan_sus_alias(etl, frame, aliases) -> None:
    titles, _ = etl.prepare(frame, aliases)
    canonical = {row["name"]: row["canonical"] for row in aliases}

    def count(country: str) -> int:
        return sum(
            1
            for title in titles
            if any(canonical[name] == country for name in title["countries"])
        )

    assert count("United States") == 3690
    assert count("Spain") == 232
    # s8746 trae Alemania Oriental y Occidental: 232 apariciones, 231 títulos.
    assert count("Germany") == 231
    assert count("Russia") == 30


def test_todos_los_paises_del_csv_estan_en_aliases(etl, frame, aliases) -> None:
    known = {row["name"] for row in aliases}
    labels = {
        country
        for value in frame["country"]
        for country in etl.split_multi(value)
    }
    assert labels == known


# Exportación de JSON


def test_build_meta_produce_119_paises_y_siete_regiones(etl, aliases) -> None:
    meta = etl.build_meta(
        Path("netflix_titles.csv"),
        "0" * 64,
        dict(etl.EXPECTED),
        aliases,
        "2026-01-01T00:00:00Z",
    )

    assert meta["schemaVersion"] == 1
    assert meta["defaultYearMode"] == "release"
    assert len(meta["regions"]) == 7
    assert len(meta["countries"]) == 119
    assert meta["totals"]["titles"] == 8807
    assert meta["totals"]["countryLabels"] == 122
    assert meta["totals"]["multiCountryTitles"] == 1315
    assert meta["totals"]["countryOccurrences"] == 10012
    assert meta["totals"]["canonicalCountryPairs"] == 10011

    by_name = {country["name"]: country for country in meta["countries"]}
    assert by_name["Germany"]["aliases"] == ["East Germany", "West Germany"]
    assert by_name["Russia"]["aliases"] == ["Soviet Union"]
    assert by_name["Spain"]["aliases"] == []
    assert by_name["Germany"]["isoNumeric"] == "276"
    assert by_name["Russia"]["isoNumeric"] == "643"


def test_build_titles_exporta_iso3_y_relaciones(etl, frame, aliases) -> None:
    titles, _ = etl.prepare(frame, aliases)
    meta = etl.build_meta(
        Path("netflix_titles.csv"),
        "0" * 64,
        dict(etl.EXPECTED),
        aliases,
        "2026-01-01T00:00:00Z",
    )
    exported = etl.build_titles(titles, aliases)
    iso3 = {country["iso3"] for country in meta["countries"]}

    assert len(exported) == 8807
    assert len({title["id"] for title in exported}) == 8807
    assert sum(len(title["countries"]) for title in exported) == 10011
    assert len({genre for title in exported for genre in title["genres"]}) == 42
    assert {title["type"] for title in exported} == {"movie", "series"}

    for title in exported:
        assert len(title["countries"]) == len(set(title["countries"]))
        assert all(code in iso3 for code in title["countries"])
        assert title["addedYear"] is None or 2000 <= title["addedYear"] <= 2021


def test_geometria_cubre_los_119_canonicos(etl, aliases) -> None:
    geometry = etl.GEOMETRY_PATH
    if not geometry.exists():
        pytest.skip("no está public/geo/countries-50m.json")

    topology = json.loads(geometry.read_text(encoding="utf-8"))
    ids = {
        str(item.get("id"))
        for item in topology["objects"]["countries"]["geometries"]
        if item.get("id") is not None
    }
    etl.check_geometry(aliases)
    for row in aliases:
        if row["canonical"] == row["name"]:
            assert row["iso_numeric"] in ids
