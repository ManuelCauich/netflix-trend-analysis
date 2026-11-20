import { useEffect, useMemo, useState } from "react";
import type { Dataset } from "./data/types.ts";
import { loadDataset } from "./data/load.ts";
import {
  allGenres,
  countryCounts,
  distinctCountries,
  peakYear,
  topDirectors,
  topGenres,
  typeSplit,
  withoutAddedYear,
  withoutCountry,
  yearlySeries,
} from "./lib/aggregate.ts";
import {
  applyFilters,
  createFilters,
  yearDomain,
  type Filters,
} from "./lib/filters.ts";
import { Header } from "./components/Header.tsx";
import { FilterBar } from "./components/FilterBar.tsx";
import { KpiCards } from "./components/KpiCards.tsx";
import { CountryMapCard } from "./components/CountryMapCard.tsx";
import { TypeDonutCard } from "./components/TypeDonutCard.tsx";
import { GenresCard } from "./components/GenresCard.tsx";
import { TrendCard } from "./components/TrendCard.tsx";
import { DirectorsCard } from "./components/DirectorsCard.tsx";
import { NotesCard } from "./components/NotesCard.tsx";
import styles from "./App.module.css";

const CLOUD_LIMIT = 30;

export default function App() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [filters, setFilters] = useState<Filters | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    loadDataset(controller.signal)
      .then((loaded) => {
        setDataset(loaded);
        setFilters(createFilters(loaded.titles, loaded.meta.defaultYearMode));
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : String(reason));
      });

    return () => controller.abort();
  }, []);

  const defaults = useMemo(
    () =>
      dataset
        ? createFilters(dataset.titles, dataset.meta.defaultYearMode)
        : null,
    [dataset],
  );

  const views = useMemo(() => {
    if (!dataset || !filters) return null;

    const { titles, countriesByIso } = dataset;
    const selection = applyFilters(titles, filters, countriesByIso);
    const mapTitles = applyFilters(titles, filters, countriesByIso, ["country", "region"]);
    const donutTitles = applyFilters(titles, filters, countriesByIso, "type");
    const genreTitles = applyFilters(titles, filters, countriesByIso, "genre");
    const trendTitles = applyFilters(titles, filters, countriesByIso, "year");

    const series = yearlySeries(
      trendTitles,
      filters.yearMode,
      yearDomain(titles, filters.yearMode),
    );

    return {
      selection,
      series,
      peak: peakYear(series),
      mapData: countryCounts(mapTitles, countriesByIso),
      split: typeSplit(donutTitles),
      genresTop: topGenres(genreTitles),
      genresAll: allGenres(genreTitles),
      directors: topDirectors(selection),
      countries: distinctCountries(selection),
      missingCountry: withoutCountry(selection),
      missingDirector: selection.filter((title) => title.directors.length === 0).length,
      missingAdded: withoutAddedYear(selection),
    };
  }, [dataset, filters]);

  if (error) {
    return (
      <main className={styles.page}>
        <p role="alert">
          No se pudo cargar el dashboard: {error}. Revisa la consola y la ruta de los
          JSON.
        </p>
      </main>
    );
  }

  if (!dataset || !filters || !views || !defaults) {
    return (
      <main className={styles.page}>
        <p role="status" className={styles.loading}>
          Cargando el catálogo…
        </p>
      </main>
    );
  }

  const { meta } = dataset;

  return (
    <div className={styles.page}>
      <Header
        mode={dataset.mode}
        rows={meta.totals.titles}
        generatedAt={meta.generatedAt}
      />

      <FilterBar
        filters={filters}
        defaults={defaults}
        domain={yearDomain(dataset.titles, filters.yearMode)}
        yearDomainFor={(mode) => yearDomain(dataset.titles, mode)}
        genres={dataset.genres}
        regions={meta.regions.map((region) => region.name)}
        countriesByIso={dataset.countriesByIso}
        resultCount={views.selection.length}
        totalCount={dataset.titles.length}
        onChange={setFilters}
        onReset={() => setFilters(defaults)}
      />

      <KpiCards
        selection={views.selection.length}
        total={dataset.titles.length}
        countries={views.countries}
        movies={views.split.movies}
        series={views.split.series}
        peak={views.peak}
        mode={filters.yearMode}
      />

      <main className={styles.grid}>
        <CountryMapCard
          data={views.mapData}
          allCountries={meta.countries}
          isoByNumeric={dataset.isoByNumeric}
          selected={filters.country}
          region={filters.region}
          geoUrl={`${import.meta.env.BASE_URL}geo/countries-50m.json`}
          titlesWithoutCountry={views.missingCountry}
          canonicalCount={meta.totals.countries}
          onSelect={(country) => setFilters({ ...filters, country })}
        />

        <TypeDonutCard movies={views.split.movies} series={views.split.series} />

        <GenresCard
          top={views.genresTop}
          all={views.genresAll}
          selected={filters.genre}
          cloudLimit={CLOUD_LIMIT}
          onSelect={(genre) => setFilters({ ...filters, genre })}
        />

        <TrendCard
          series={views.series}
          mode={filters.yearMode}
          yearRange={filters.yearRange}
          total={views.selection.length}
        />

        <DirectorsCard top={views.directors} withoutDirector={views.missingDirector} />

        <NotesCard meta={meta} withoutCountry={views.missingCountry} />
      </main>

      <footer className={styles.footer}>
        <p>
          Datos de <em>Netflix Movies and TV Shows</em> (Kaggle, {meta.source.license}). Los
          filtros se aplican en el navegador sobre los JSON exportados desde PostgreSQL.
        </p>
        <p>
          {filters.yearMode === "added" && views.missingAdded > 0
            ? `${views.missingAdded} títulos sin fecha de ingreso quedan fuera del modo Ingreso al catálogo.`
            : `Modo ${filters.yearMode === "release" ? "Estreno" : "Ingreso al catálogo"} · año de referencia del eje temporal.`}
        </p>
      </footer>
    </div>
  );
}
