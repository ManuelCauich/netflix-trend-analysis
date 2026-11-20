import type { YearDatum } from "../lib/aggregate.ts";
import type { YearMode } from "../data/types.ts";
import { formatNumber } from "../lib/format.ts";
import { TrendLine } from "../charts/TrendLine.tsx";
import { Card } from "./Card.tsx";
import styles from "./TrendCard.module.css";

interface TrendCardProps {
  series: YearDatum[];
  mode: YearMode;
  yearRange: [number, number];
  total: number;
}

export function TrendCard({ series, mode, yearRange, total }: TrendCardProps) {
  const isRelease = mode === "release";

  return (
    <Card
      title={isRelease ? "Evolución de estrenos por año" : "Evolución de ingresos al catálogo por año"}
      hint={`${isRelease ? "Año de estreno" : "Año de ingreso al catálogo"} · ${formatNumber(total)} títulos en el rango`}
      className={styles.card}
    >
      <TrendLine series={series} mode={mode} yearRange={yearRange} />

      {mode === "added" ? (
        <p className={styles.warning}>
          2021 está incompleto en altas: el archivo llega al 25 de septiembre de 2021. Los
          10 títulos sin fecha de ingreso quedan fuera de este modo.
        </p>
      ) : null}

      <details>
        <summary>Ver datos</summary>
        <table>
          <caption className="sr-only">Títulos por año</caption>
          <thead>
            <tr>
              <th scope="col">Año</th>
              <th scope="col">Títulos</th>
            </tr>
          </thead>
          <tbody>
            {series.map((item) => (
              <tr key={item.year}>
                <td>{item.year}</td>
                <td>{formatNumber(item.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </Card>
  );
}
