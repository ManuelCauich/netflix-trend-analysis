import { TypeDonut } from "../charts/TypeDonut.tsx";
import { formatNumber, formatPercent } from "../lib/format.ts";
import { Card } from "./Card.tsx";

interface TypeDonutCardProps {
  movies: number;
  series: number;
}

export function TypeDonutCard({ movies, series }: TypeDonutCardProps) {
  const total = movies + series;

  return (
    <Card title="Películas y series" hint="Sobre la selección actual">
      <TypeDonut movies={movies} series={series} />
      <details>
        <summary>Ver datos</summary>
        <table>
          <caption className="sr-only">
            Títulos por tipo en la selección actual
          </caption>
          <thead>
            <tr>
              <th scope="col">Tipo</th>
              <th scope="col">Títulos</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Películas</td>
              <td>{formatNumber(movies)}</td>
            </tr>
            <tr>
              <td>Series</td>
              <td>{formatNumber(series)}</td>
            </tr>
            <tr>
              <td>Total</td>
              <td>{formatNumber(total)}</td>
            </tr>
            <tr>
              <td>Distribución</td>
              <td>
                {formatPercent(movies, total)} / {formatPercent(series, total)}
              </td>
            </tr>
          </tbody>
        </table>
      </details>
    </Card>
  );
}
