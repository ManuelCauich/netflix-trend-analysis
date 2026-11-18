import type { RankedDatum } from "../lib/aggregate.ts";
import { formatNumber } from "../lib/format.ts";
import { Card } from "./Card.tsx";
import styles from "./DirectorsCard.module.css";

interface DirectorsCardProps {
  top: RankedDatum[];
  withoutDirector: number;
}

export function DirectorsCard({ top, withoutDirector }: DirectorsCardProps) {
  const max = top[0]?.value ?? 1;

  return (
    <Card
      title="Directores"
      hint="KPI secundario · top 5; los títulos sin director no entran"
      level={3}
    >
      {top.length === 0 ? (
        <p className={styles.empty}>Sin directores con estos filtros.</p>
      ) : (
        <ol className={styles.list}>
          {top.map((director, index) => (
            <li key={director.name} className={styles.item}>
              <span className={styles.rank}>{index + 1}</span>
              <span className={styles.name}>{director.name}</span>
              <span className={styles.value}>{formatNumber(director.value)}</span>
              <span
                className={styles.bar}
                style={{ width: `${Math.max(6, (director.value / max) * 100)}%` }}
                aria-hidden="true"
              />
            </li>
          ))}
        </ol>
      )}

      <p className={styles.note}>
        {formatNumber(withoutDirector)} títulos de la selección no tienen director y se
        excluyen del ranking.
      </p>
    </Card>
  );
}
