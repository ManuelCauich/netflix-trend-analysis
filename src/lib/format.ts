const numberFormat = new Intl.NumberFormat("es-MX");
const percentFormat = new Intl.NumberFormat("es-MX", {
  style: "percent",
  maximumFractionDigits: 1,
});

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

export function formatPercent(part: number, total: number): string {
  if (total === 0) return "—";
  return percentFormat.format(part / total);
}

export function formatRange(range: [number, number]): string {
  return `${range[0]}–${range[1]}`;
}

export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

export function shortNumber(value: number): string {
  if (value >= 1000) {
    const thousands = value / 1000;
    return `${thousands.toFixed(thousands >= 10 ? 0 : 1).replace(".", ",")} mil`;
  }
  return formatNumber(value);
}
