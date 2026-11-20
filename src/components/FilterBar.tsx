import type { CountryMeta, YearMode } from "../data/types.ts";
import {
  activeChips,
  resetFilter,
  type Filters,
} from "../lib/filters.ts";
import { formatNumber } from "../lib/format.ts";
import styles from "./FilterBar.module.css";

interface FilterBarProps {
  filters: Filters;
  defaults: Filters;
  domain: [number, number];
  yearDomainFor: (mode: YearMode) => [number, number];
  genres: string[];
  regions: string[];
  countriesByIso: Map<string, CountryMeta>;
  resultCount: number;
  totalCount: number;
  onChange: (next: Filters) => void;
  onReset: () => void;
}

function years(domain: [number, number]): number[] {
  const list: number[] = [];
  for (let year = domain[0]; year <= domain[1]; year += 1) list.push(year);
  return list;
}

export function FilterBar({
  filters,
  defaults,
  domain,
  yearDomainFor,
  genres,
  regions,
  countriesByIso,
  resultCount,
  totalCount,
  onChange,
  onReset,
}: FilterBarProps) {
  const chips = activeChips(filters, defaults, countriesByIso);
  const available = years(domain);
  const [from, to] = filters.yearRange;

  function setMode(mode: YearMode) {
    if (mode === filters.yearMode) return;
    onChange({ ...filters, yearMode: mode, yearRange: yearDomainFor(mode) });
  }

  function setFrom(year: number) {
    onChange({ ...filters, yearRange: [year, Math.max(year, to)] });
  }

  function setTo(year: number) {
    onChange({ ...filters, yearRange: [Math.min(year, from), year] });
  }

  return (
    <section className={styles.bar} aria-label="Filtros globales">
      <div className={styles.controls}>
        <div className={styles.field}>
          <span className={styles.label} id="filter-type-label">
            Tipo
          </span>
          <div
            className={styles.segmented}
            role="group"
            aria-labelledby="filter-type-label"
          >
            {(
              [
                ["all", "Todos"],
                ["movie", "Películas"],
                ["series", "Series"],
              ] as Array<[Filters["type"], string]>
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={styles.segment}
                aria-pressed={filters.type === value}
                onClick={() => onChange({ ...filters, type: value })}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className={`${styles.field} ${styles.modeField}`}>
          <span className={styles.label} id="filter-mode-label">
            Año de referencia
          </span>
          <div
            className={styles.segmented}
            role="group"
            aria-labelledby="filter-mode-label"
          >
            <button
              type="button"
              className={styles.segment}
              aria-pressed={filters.yearMode === "release"}
              onClick={() => setMode("release")}
            >
              Estreno
            </button>
            <button
              type="button"
              className={styles.segment}
              aria-pressed={filters.yearMode === "added"}
              onClick={() => setMode("added")}
            >
              Ingreso al catálogo
            </button>
          </div>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Rango de años</span>
          <div className={styles.range}>
            <label className={styles.srLabel} htmlFor="year-from">
              Desde
            </label>
            <select
              id="year-from"
              className={styles.select}
              value={from}
              onChange={(event) => setFrom(Number(event.target.value))}
            >
              {available.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <span aria-hidden="true">–</span>
            <label className={styles.srLabel} htmlFor="year-to">
              Hasta
            </label>
            <select
              id="year-to"
              className={styles.select}
              value={to}
              onChange={(event) => setTo(Number(event.target.value))}
            >
              {available.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="filter-region">
            Región
          </label>
          <select
            id="filter-region"
            className={styles.select}
            value={filters.region ?? ""}
            onChange={(event) =>
              onChange({ ...filters, region: event.target.value || null })
            }
          >
            <option value="">Todas</option>
            {regions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="filter-genre">
            Género
          </label>
          <select
            id="filter-genre"
            className={styles.select}
            value={filters.genre ?? ""}
            onChange={(event) =>
              onChange({ ...filters, genre: event.target.value || null })
            }
          >
            <option value="">Todos</option>
            {genres.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>País</span>
          <p className={styles.countryValue}>
            {filters.country
              ? (countriesByIso.get(filters.country)?.name ?? filters.country)
              : "Todos · Elige en el mapa"}
          </p>
        </div>
      </div>

      <p className={styles.modeHelp}>
        <strong>Estreno</strong> usa el año de estreno del título.{" "}
        <strong>Ingreso al catálogo</strong> usa la fecha en que se añadió a
        Netflix; no es su año de estreno.
      </p>

      <div className={styles.footer}>
        <p className={styles.count} aria-live="polite">
          <strong>{formatNumber(resultCount)}</strong> de {formatNumber(totalCount)} títulos
        </p>

        {chips.length > 0 ? (
          <div className={styles.active} aria-label="Filtros activos">
            <span className={styles.activeLabel}>
              {chips.length} {chips.length === 1 ? "filtro activo" : "filtros activos"}
            </span>
            <ul className={styles.chips}>
              {chips.map((chip) => (
                <li key={chip.key}>
                  <button
                    type="button"
                    className={styles.chip}
                    onClick={() => onChange(resetFilter(filters, chip.dimension, defaults))}
                    aria-label={`Quitar filtro ${chip.label}`}
                  >
                    {chip.label}
                    <span aria-hidden="true">×</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <span className={styles.noFilters}>Sin filtros activos</span>
        )}

        <button
          type="button"
          className={styles.clear}
          onClick={onReset}
          disabled={chips.length === 0}
        >
          Limpiar filtros
        </button>
      </div>
    </section>
  );
}
