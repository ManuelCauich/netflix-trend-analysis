import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatNumber, formatPercent } from "../lib/format.ts";
import styles from "./TypeDonut.module.css";

interface TypeDonutProps {
  movies: number;
  series: number;
}

export function TypeDonut({ movies, series }: TypeDonutProps) {
  const total = movies + series;
  const data = [
    { name: "Películas", value: movies, color: "var(--accent)" },
    { name: "Series", value: series, color: "var(--secondary)" },
  ];

  return (
    <div>
      <ResponsiveContainer width="100%" height={140}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="92%"
            paddingAngle={2}
            stroke="var(--surface)"
            strokeWidth={2}
            isAnimationActive={false}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--text)",
            }}
            formatter={(value, name) => [
              `${formatNumber(Number(value))} (${formatPercent(Number(value), total)})`,
              String(name),
            ]}
          />
        </PieChart>
      </ResponsiveContainer>

      <dl className={styles.legend}>
        {data.map((entry) => (
          <div key={entry.name} className={styles.row}>
            <dt>
              <span
                className={styles.dot}
                style={{ background: entry.color }}
                aria-hidden="true"
              />
              {entry.name}
            </dt>
            <dd>
              {formatNumber(entry.value)}
              <span className={styles.muted}> · {formatPercent(entry.value, total)}</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
