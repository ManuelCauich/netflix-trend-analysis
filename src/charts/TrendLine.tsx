import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { YearDatum } from "../lib/aggregate.ts";
import type { YearMode } from "../data/types.ts";
import { formatNumber } from "../lib/format.ts";

interface TrendLineProps {
  series: YearDatum[];
  mode: YearMode;
  yearRange: [number, number];
}

export function TrendLine({ series, mode, yearRange }: TrendLineProps) {
  const stroke = mode === "release" ? "var(--accent)" : "var(--secondary)";
  const [from, to] = yearRange;

  return (
    <ResponsiveContainer width="100%" height={175}>
      <LineChart data={series} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="year"
          stroke="var(--text-muted)"
          tickLine={false}
          axisLine={{ stroke: "var(--border)" }}
          tick={{ fill: "var(--text-muted)", fontSize: 12 }}
          minTickGap={24}
        />
        <YAxis
          stroke="var(--text-muted)"
          tickLine={false}
          axisLine={false}
          width={44}
          tick={{ fill: "var(--text-muted)", fontSize: 12 }}
          tickFormatter={(value: number) => formatNumber(value)}
        />
        <Tooltip
          contentStyle={{
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            color: "var(--text)",
          }}
          labelStyle={{ color: "var(--text-muted)" }}
          labelFormatter={(year) =>
            `${mode === "release" ? "Estrenos" : "Ingresos"} en ${String(year)}`
          }
          formatter={(value) => [formatNumber(Number(value)), "Títulos"]}
        />
        <ReferenceArea x1={from} x2={to} fill="var(--secondary)" fillOpacity={0.08} />
        <Line
          type="monotone"
          dataKey="value"
          name="Títulos"
          stroke={stroke}
          strokeWidth={2.4}
          dot={false}
          activeDot={{ r: 4, fill: stroke }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
