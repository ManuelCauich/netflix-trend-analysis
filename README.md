# Tendencias del catálogo de Netflix

Dashboard estratégico sobre el catálogo de Netflix: qué produce y qué incorpora la
plataforma, con qué distribución geográfica y de géneros, y cómo evoluciona por año.

URL prevista al activar GitHub Pages:
<https://manuelcauich.github.io/netflix-trend-analysis/>

## Qué muestra

- **KPI principal:** títulos por país, en un mapa coroplético con búsqueda y top 10.
- **KPIs secundarios:** evolución por año (Estreno o Ingreso), top 5 de géneros con nube
  de palabras, películas vs. series y top 5 de directores.
- **Filtros globales:** tipo, modo de año, rango de años, región y género; el país se elige
  en el mapa o en la lista. Con indicador de filtros activos y botón «Limpiar filtros».

## Arquitectura

```text
data/raw/netflix_titles.csv
      │
      ▼
etl/run.py (Python + pandas) ──► PostgreSQL 16: netflix_dashboard
      │
      ▼
public/data/meta.json + public/data/titles.json
      │
      ▼
React + Vite + TypeScript ──► GitHub Pages
```

GitHub Pages solo sirve archivos estáticos: el navegador carga los JSON y aplica los
filtros. No hay backend ni conexión viva a PostgreSQL.

## Requisitos

- Node 22 y npm 10
- Python 3.12 con `venv`
- PostgreSQL 16 (solo para regenerar los datos)

## Datos

Dataset **Netflix Movies and TV Shows** de Kaggle, licencia **CC0: dominio público**:
<https://www.kaggle.com/datasets/shivamb/netflix-shows>

Descarga `netflix_titles.csv` y colócalo en `data/raw/netflix_titles.csv`. Mientras se
completa la migración también se acepta `data/netflix_titles.csv`. El CSV no se versiona;
los JSON derivados y `etl/aliases.csv` sí.

## Puesta en marcha

```bash
# 1. Dependencias
npm install
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 2. Base de datos (una sola vez)
sudo -u postgres psql -c "CREATE ROLE netflix LOGIN PASSWORD 'CAMBIAR_ESTA_CLAVE';"
sudo -u postgres createdb -O netflix netflix_dashboard

# 3. Cadena de datos: CSV → PostgreSQL → JSON
cp .env.example .env      # pon la misma contraseña
npm run data:build        # con el venv activado

# 4. Aplicación
npm run dev
```

`etl/run.py` es idempotente: borra y recrea el esquema en cada corrida. Dos corridas
seguidas producen los mismos totales.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compila a `dist/` |
| `npm run preview` | Sirve `dist/` en local |
| `npm test` | Pruebas de la interfaz con Vitest |
| `npm run lint` | Revisión con oxlint |
| `npm run data:build` | CSV → PostgreSQL → `public/data/*.json` |
| `npm run data:check` | Valida los JSON sin PostgreSQL |
| `pytest etl/tests` | Pruebas del ETL (se saltan sin CSV) |

## Cifras de control

| Comprobación | Valor |
|---|---:|
| Títulos | 8,807 |
| Películas / series | 6,131 / 2,676 |
| Con país / sin país | 7,976 / 831 |
| Etiquetas de país / canónicos | 122 / 119 |
| Títulos multipaís | 1,315 |
| Menciones de país / pares canónicos | 10,012 / 10,011 |

Los 9 títulos de Alemania Occidental/Oriental y la Unión Soviética se agrupan con Alemania
y Rusia: Alemania queda en **231** títulos distintos y Rusia en 30. Los alias suman 232
menciones alemanas, pero `s8746` trae Alemania Oriental y Occidental en el mismo título, de
ahí los 10,011 pares canónicos. «Desconocido» no entra en los rankings.

## Despliegue

GitHub Actions compila y publica en Pages en cada push a `main`. `vite.config.ts` deriva el
`base` de `GITHUB_REPOSITORY`, así que un cambio de nombre del repositorio no rompe el
sitio. Pages debe estar configurado en **Settings → Pages → Source: GitHub Actions**.

## Limitaciones conocidas

- 2021 está incompleto en altas: el archivo llega al 25 de septiembre de 2021. El aviso
  solo aparece en el modo Ingreso.
- 10 títulos no tienen fecha de ingreso y quedan fuera de ese modo.
- 831 títulos no tienen país: no aparecen en el mapa.
- Los porcentajes por país se calculan sobre los títulos con país, no sobre el total.
- Recharts pesa: el bundle ronda 239 KB gzip; conviene dividirlo por rutas más adelante.

## Licencia

Código con fines académicos. Datos bajo CC0.
