import type { YearMode } from "../data/types.ts";
import type { YearDatum } from "../lib/aggregate.ts";
import { formatNumber, formatPercent } from "../lib/format.ts";
import styles from "./KpiCards.module.css";

interface KpiCardsProps {
  selection: number;
  total: number;
  countries: number;
  movies: number;
  series: number;
  peak: YearDatum | null;
  mode: YearMode;
}

export function KpiCards({
  selection,
  total,
  countries,
  movies,
  series,
  peak,
  mode,
}: KpiCardsProps) {
  const cards = [
    {
      label: "Títulos en la selección",
      value: formatNumber(selection),
      note: `de ${formatNumber(total)} en el catálogo`,
    },
    {
      label: "Países y territorios",
      value: formatNumber(countries),
      note: "canónicos con al menos un título",
    },
    {
      label: "Películas y series",
      value: `${formatPercent(movies, movies + series)} / ${formatPercent(series, movies + series)}`,
      note: `${formatNumber(movies)} películas · ${formatNumber(series)} series`,
    },
    {
      label: mode === "release" ? "Año con más estrenos" : "Año con más ingresos",
      value: peak ? String(peak.year) : "—",
      note: peak ? `${formatNumber(peak.value)} títulos` : "sin datos en el rango",
    },
  ];

  return (
    <dl className={styles.grid}>
      {cards.map((card) => (
        <div key={card.label} className={styles.card}>
          <dt className={styles.label}>{card.label}</dt>
          <dd className={styles.value}>{card.value}</dd>
          <p className={styles.note}>{card.note}</p>
        </div>
      ))}
    </dl>
  );
}
