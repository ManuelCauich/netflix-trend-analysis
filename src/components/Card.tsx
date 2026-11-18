import { useId, type ReactNode } from "react";
import styles from "./Card.module.css";

interface CardProps {
  title: string;
  hint?: string;
  level?: 1 | 2 | 3;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Card({
  title,
  hint,
  level = 2,
  actions,
  className,
  children,
}: CardProps) {
  const titleId = useId();

  return (
    <section
      className={[styles.card, className].filter(Boolean).join(" ")}
      data-level={level}
      aria-labelledby={titleId}
    >
      <header className={styles.header}>
        <div>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          {hint ? <p className={styles.hint}>{hint}</p> : null}
        </div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </header>
      <div className={styles.body}>{children}</div>
    </section>
  );
}
