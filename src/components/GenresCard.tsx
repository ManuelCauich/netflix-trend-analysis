import { useState } from "react";
import type { RankedDatum } from "../lib/aggregate.ts";
import { formatNumber } from "../lib/format.ts";
import { WordCloud } from "../charts/WordCloud.tsx";
import { Card } from "./Card.tsx";
import styles from "./GenresCard.module.css";

interface GenresCardProps {
  top: RankedDatum[];
  all: RankedDatum[];
  selected: string | null;
  onSelect: (genre: string | null) => void;
  cloudLimit: number;
}

export function GenresCard({ top, all, selected, onSelect, cloudLimit }: GenresCardProps) {
  const [view, setView] = useState<"bars" | "cloud">("bars");
  const max = top[0]?.value ?? 1;
  const cloudWords = all.slice(0, cloudLimit);

  return (
    <Card
      title="Géneros"
      hint="KPI secundario · Un título puede tener hasta tres géneros"
      actions={
        <div className={styles.tabs} role="tablist" aria-label="Vista de géneros">
          <button
            type="button"
            role="tab"
            aria-selected={view === "bars"}
            className={styles.tab}
            onClick={() => setView("bars")}
          >
            Barras
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "cloud"}
            className={styles.tab}
            onClick={() => setView("cloud")}
          >
            Nube
          </button>
        </div>
      }
    >
      {view === "bars" ? (
        <div role="tabpanel">
          {top.length === 0 ? (
            <p className={styles.empty}>Sin géneros con estos filtros.</p>
          ) : (
            <ol className={styles.bars}>
              {top.map((genre, index) => {
                const isSelected = selected === genre.name;
                return (
                  <li key={genre.name}>
                    <button
                      type="button"
                      className={styles.barRow}
                      aria-pressed={isSelected}
                      onClick={() => onSelect(isSelected ? null : genre.name)}
                    >
                      <span className={styles.barLabel}>
                        <span className={styles.rank}>{index + 1}</span>
                        {genre.name}
                      </span>
                      <span
                        className={styles.bar}
                        style={{
                          width: `${Math.max(4, (genre.value / max) * 100)}%`,
                          background: isSelected ? "var(--accent)" : "var(--secondary)",
                        }}
                        aria-hidden="true"
                      />
                      <span className={styles.barValue}>{formatNumber(genre.value)}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
          <details>
            <summary>Ver datos</summary>
            <table>
              <caption className="sr-only">Títulos por género</caption>
              <thead>
                <tr>
                  <th scope="col">Género</th>
                  <th scope="col">Títulos</th>
                </tr>
              </thead>
              <tbody>
                {all.map((genre) => (
                  <tr key={genre.name}>
                    <td>{genre.name}</td>
                    <td>{formatNumber(genre.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </div>
      ) : (
        <div role="tabpanel">
          <WordCloud words={cloudWords} />
          {all.length > cloudWords.length ? (
            <p className={styles.note}>
              Se muestran los {cloudWords.length} géneros con más títulos de {all.length}.
            </p>
          ) : null}
        </div>
      )}
    </Card>
  );
}
