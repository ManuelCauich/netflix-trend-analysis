import type { DataMode } from "../data/types.ts";
import styles from "./Header.module.css";

interface HeaderProps {
  mode: DataMode;
  rows: number;
  generatedAt: string;
}

export function Header({ mode, rows, generatedAt }: HeaderProps) {
  return (
    <header className={styles.header}>
      <div>
        <p className={styles.eyebrow}>Dashboard estratégico · Catálogo de Netflix</p>
        <h1 className={styles.title}>Tendencias del catálogo de Netflix</h1>
        <p className={styles.subtitle}>
          Qué produce y qué incorpora la plataforma: países, géneros y evolución por año.
        </p>
        <p className={styles.guide}>
          Empieza por el mapa; los filtros acotan país, año, género y tipo.
        </p>
      </div>

      <div className={styles.meta}>
        {mode === "fixture" ? (
          <p className={styles.badge} role="status">
            Datos de ejemplo: ejecuta el ETL para ver el catálogo real
          </p>
        ) : (
          <p className={styles.source}>
            {new Intl.NumberFormat("es-MX").format(rows)} títulos · Actualizado{" "}
            {new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(
              new Date(generatedAt),
            )}
          </p>
        )}
      </div>
    </header>
  );
}
