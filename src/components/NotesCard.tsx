import type { Meta } from "../data/types.ts";
import { formatNumber } from "../lib/format.ts";
import { Card } from "./Card.tsx";
import styles from "./NotesCard.module.css";

interface NotesCardProps {
  meta: Meta;
  withoutCountry: number;
}

export function NotesCard({ meta, withoutCountry }: NotesCardProps) {
  return (
    <Card title="Bases, fuentes y notas" level={3} className={styles.card}>
      <div className={styles.grid}>
        <div>
          <h3 className={styles.heading}>Bases de cálculo</h3>
          <ul className={styles.list}>
            <li>
              Los porcentajes de país se calculan sobre los títulos con país (
              {formatNumber(meta.bases.country)}), no sobre el total.
            </li>
            <li>
              Un título multipaís cuenta una vez por país: {formatNumber(meta.totals.multiCountryTitles)}{" "}
              títulos, {formatNumber(meta.totals.countryOccurrences)} menciones en el CSV y{" "}
              {formatNumber(meta.totals.canonicalCountryPairs)} pares título–país canónico.
            </li>
            <li>
              Los rankings de género cuentan títulos distintos; un título puede tener hasta tres
              géneros, así que los porcentajes no suman 100 %.
            </li>
            <li>
              “Desconocido” no entra en los rankings: {formatNumber(withoutCountry)} títulos de la
              selección no tienen país.
            </li>
          </ul>
        </div>

        <div>
          <h3 className={styles.heading}>Fuente y notas del catálogo</h3>
          <ul className={styles.list}>
            <li>
              Dataset: <em>Netflix Movies and TV Shows</em> (Kaggle), licencia {meta.source.license}.
            </li>
            <li>{formatNumber(meta.totals.countryLabels)} etiquetas de país en el CSV y {formatNumber(meta.totals.countries)} países y territorios canónicos tras agrupar Alemania Occidental/Oriental y la Unión Soviética.</li>
            {meta.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
