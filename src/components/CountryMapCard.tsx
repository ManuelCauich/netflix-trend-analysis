import { useMemo, useState } from "react";
import type { CountryMeta } from "../data/types.ts";
import type { CountryDatum } from "../lib/aggregate.ts";
import { formatNumber } from "../lib/format.ts";
import { CountryMap } from "../charts/CountryMap.tsx";
import { Card } from "./Card.tsx";
import styles from "./CountryMapCard.module.css";

interface CountryMapCardProps {
  data: CountryDatum[];
  allCountries: CountryMeta[];
  isoByNumeric: Map<string, CountryMeta>;
  selected: string | null;
  region: string | null;
  geoUrl: string;
  titlesWithoutCountry: number;
  canonicalCount: number;
  onSelect: (iso3: string | null) => void;
}

export function CountryMapCard({
  data,
  allCountries,
  isoByNumeric,
  selected,
  region,
  geoUrl,
  titlesWithoutCountry,
  canonicalCount,
  onSelect,
}: CountryMapCardProps) {
  const [query, setQuery] = useState("");

  const values = useMemo(
    () => new Map(data.map((item) => [item.iso3, item.value])),
    [data],
  );

  const ranked = useMemo(
    () =>
      allCountries
        .map((country) => ({ ...country, value: values.get(country.iso3) ?? 0 }))
        .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, "es")),
    [allCountries, values],
  );

  const normalized = query.trim().toLocaleLowerCase("es");
  const list = normalized
    ? ranked
        .filter((country) => country.name.toLocaleLowerCase("es").includes(normalized))
        .slice(0, 8)
    : ranked.slice(0, 10);

  const selectedName = selected
    ? (allCountries.find((country) => country.iso3 === selected)?.name ?? selected)
    : null;

  return (
    <Card
      title="Títulos por país"
      hint="KPI principal · Un título multipaís cuenta una vez por país"
      level={1}
      className={styles.card}
    >
      <div className={styles.layout}>
        <div className={styles.mapColumn}>
          <CountryMap
            data={data}
            isoByNumeric={isoByNumeric}
            selected={selected}
            region={region}
            geoUrl={geoUrl}
            onSelect={onSelect}
          />
          {selectedName ? (
            <p className={styles.selection}>
              País seleccionado: <strong>{selectedName}</strong>
              <button
                type="button"
                className={styles.linkButton}
                onClick={() => onSelect(null)}
              >
                Quitar
              </button>
            </p>
          ) : null}
          <p className={styles.bases}>
            {canonicalCount} países y territorios canónicos.{" "}
            {titlesWithoutCountry > 0
              ? `${formatNumber(titlesWithoutCountry)} títulos sin país no aparecen en el mapa.`
              : "Todos los títulos de la selección tienen país."}
          </p>
        </div>

        <div className={styles.listColumn}>
          <label className={styles.searchLabel} htmlFor="country-search">
            Buscar país
          </label>
          <input
            id="country-search"
            type="search"
            className={styles.search}
            placeholder="Buscar país..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          <h3 className={styles.listTitle}>
            {normalized ? "Coincidencias" : "Top 10 países con más títulos"}
          </h3>

          {list.length === 0 ? (
            <p className={styles.empty}>Ningún país coincide con “{query}”.</p>
          ) : (
            <ol className={styles.list}>
              {list.map((country, index) => {
                const isSelected = selected === country.iso3;
                return (
                  <li key={country.iso3}>
                    <button
                      type="button"
                      className={styles.listItem}
                      aria-pressed={isSelected}
                      onClick={() => onSelect(isSelected ? null : country.iso3)}
                    >
                      <span className={styles.rank}>{normalized ? "·" : index + 1}</span>
                      <span className={styles.countryName}>{country.name}</span>
                      <span className={styles.value}>{formatNumber(country.value)}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </Card>
  );
}
