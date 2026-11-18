"""Fixtures compartidas de las pruebas del ETL.

Las pruebas que dependen del CSV se saltan si el archivo no está: el
repositorio no versiona datos crudos, así que un clon limpio debe poder
ejecutar `pytest` sin descargar Kaggle.

Rutas aceptadas, en orden:

1. `NETFLIX_CSV` (variable de entorno, útil en CI).
2. `data/raw/netflix_titles.csv` (ruta definitiva).
3. `data/netflix_titles.csv` (ubicación provisional mientras se mueve).
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Any

import pytest

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


def find_csv() -> Path | None:
    override = os.environ.get("NETFLIX_CSV")
    candidates = [Path(override).expanduser()] if override else []
    candidates += [
        ROOT / "data" / "raw" / "netflix_titles.csv",
        ROOT / "data" / "netflix_titles.csv",
    ]
    return next((path for path in candidates if path.exists()), None)


@pytest.fixture(scope="session")
def csv_path() -> Path:
    path = find_csv()
    if path is None:
        pytest.skip(
            "No hay CSV. Descarga netflix_titles.csv en data/raw/ o define NETFLIX_CSV."
        )
    return path


@pytest.fixture(scope="session")
def frame(csv_path: Path) -> Any:
    pandas = pytest.importorskip("pandas")
    data = pandas.read_csv(csv_path, dtype=str, keep_default_na=False)
    data.columns = [column.strip() for column in data.columns]
    return data


@pytest.fixture(scope="session")
def etl() -> Any:
    pytest.importorskip("pandas")
    pytest.importorskip("psycopg")
    pytest.importorskip("dotenv")
    from etl import run

    return run


@pytest.fixture(scope="session")
def aliases(etl: Any) -> list[dict[str, str]]:
    return etl.read_aliases()
