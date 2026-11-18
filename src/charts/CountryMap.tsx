import { useEffect, useMemo, useRef, useState } from "react";
import type { FeatureCollection, Geometry } from "geojson";
import { geoEqualEarth, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import type { CountryMeta } from "../data/types.ts";
import type { CountryDatum } from "../lib/aggregate.ts";
import { formatNumber } from "../lib/format.ts";
import styles from "./CountryMap.module.css";

const WIDTH = 660;
const HEIGHT = 330;
const ANTARCTICA = "010";

const MAP_STEPS = [
  { limit: 0.05, color: "var(--map-1)", label: "menos" },
  { limit: 0.2, color: "var(--map-2)", label: "" },
  { limit: 0.5, color: "var(--map-3)", label: "" },
  { limit: 1, color: "var(--map-4)", label: "más" },
];

function stepColor(value: number, max: number): string {
  if (value <= 0) return "var(--map-0)";
  const ratio = value / max;
  return MAP_STEPS.find((step) => ratio <= step.limit)?.color ?? "var(--map-4)";
}

const projection = geoEqualEarth();
const pathGenerator = geoPath(projection);
const countryPath = (geometry: Geometry) => pathGenerator(geometry) ?? "";

interface GeometryProps {
  name?: string;
}

type CountryTopology = Topology<{ countries: GeometryCollection<GeometryProps> }>;

interface CountryMapProps {
  data: CountryDatum[];
  isoByNumeric: Map<string, CountryMeta>;
  selected: string | null;
  region: string | null;
  geoUrl: string;
  onSelect: (iso3: string | null) => void;
}

interface Hover {
  name: string;
  value: number;
  x: number;
  y: number;
}

export function CountryMap({
  data,
  isoByNumeric,
  selected,
  region,
  geoUrl,
  onSelect,
}: CountryMapProps) {
  const [topology, setTopology] = useState<CountryTopology | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hover, setHover] = useState<Hover | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch(geoUrl, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<CountryTopology>;
      })
      .then(setTopology)
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : String(reason));
      });

    return () => controller.abort();
  }, [geoUrl]);

  const max = useMemo(
    () => data.reduce((best, item) => Math.max(best, item.value), 1),
    [data],
  );

  const values = useMemo(
    () => new Map(data.map((item) => [item.iso3, item.value])),
    [data],
  );

  const features = useMemo(() => {
    if (!topology) return [];
    const collection = feature(
      topology,
      topology.objects.countries,
    ) as FeatureCollection<Geometry, GeometryProps>;

    const world = {
      ...collection,
      features: collection.features.filter((item) => String(item.id) !== ANTARCTICA),
    };

    projection.fitExtent(
      [
        [8, 8],
        [WIDTH - 8, HEIGHT - 8],
      ],
      world,
    );

    return world.features;
  }, [topology]);

  function showTooltip(target: Element, name: string, value: number) {
    const box = containerRef.current?.getBoundingClientRect();
    if (!box) return;
    const rect = target.getBoundingClientRect();
    setHover({
      name,
      value,
      x: rect.left + rect.width / 2 - box.left,
      y: rect.top + rect.height / 2 - box.top,
    });
  }

  if (error) {
    return (
      <div className={styles.skeleton} role="alert">
        No se pudo cargar la geometría del mapa ({error}).
      </div>
    );
  }

  if (!topology) {
    return (
      <div className={styles.skeleton} aria-hidden="true">
        Cargando mapa…
      </div>
    );
  }

  return (
    <div className={styles.wrapper} ref={containerRef}>
      <svg
        className={styles.map}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="group"
        aria-label={`Mapa de títulos por país. ${data.length} países con títulos.`}
      >
        {features.map((item) => {
          const numeric = String(item.id ?? "").padStart(3, "0");
          const country = isoByNumeric.get(numeric);
          if (!country) {
            return (
              <path
                key={`unknown-${numeric}-${item.properties?.name ?? ""}`}
                d={countryPath(item.geometry)}
                className={styles.unknown}
                aria-hidden="true"
              />
            );
          }

          const value = values.get(country.iso3) ?? 0;
          const isSelected = selected === country.iso3;
          const dimmed = region !== null && country.region !== region;
          const name = country.name;

          return (
            <path
              key={country.iso3}
              d={countryPath(item.geometry)}
              className={styles.country}
              data-selected={isSelected || undefined}
              data-dimmed={dimmed || undefined}
              style={{ fill: stepColor(value, max) }}
              tabIndex={0}
              role="button"
              aria-pressed={isSelected}
              aria-label={`${name}: ${formatNumber(value)} ${value === 1 ? "título" : "títulos"}`}
              onClick={() => onSelect(isSelected ? null : country.iso3)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(isSelected ? null : country.iso3);
                }
              }}
              onMouseMove={(event) => showTooltip(event.currentTarget, name, value)}
              onMouseLeave={() => setHover(null)}
              onFocus={(event) => showTooltip(event.currentTarget, name, value)}
              onBlur={() => setHover(null)}
            />
          );
        })}
      </svg>

      {hover ? (
        <div className={styles.tooltip} style={{ left: hover.x, top: hover.y }} role="status">
          <strong>{hover.name}</strong>
          <span>{formatNumber(hover.value)} títulos</span>
        </div>
      ) : null}

      <div className={styles.legend}>
        <span>{MAP_STEPS[0]?.label}</span>
        <span className={styles.swatch} style={{ background: "var(--map-0)" }} title="sin títulos" />
        {MAP_STEPS.map((step) => (
          <span
            key={step.color}
            className={styles.swatch}
            style={{ background: step.color }}
          />
        ))}
        <span>{MAP_STEPS[MAP_STEPS.length - 1]?.label}</span>
        <span className={styles.legendNote}>gris: sin títulos o sin datos</span>
      </div>
    </div>
  );
}
