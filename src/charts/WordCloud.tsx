import { Wordcloud } from "@visx/wordcloud";
import type { RankedDatum } from "../lib/aggregate.ts";
import styles from "./WordCloud.module.css";

const WIDTH = 360;
const HEIGHT = 200;

// Generador pseudoaleatorio con semilla fija para mantener la nube estable entre renders
function makeRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

interface WordCloudProps {
  words: RankedDatum[];
}

export function WordCloud({ words }: WordCloudProps) {
  if (words.length === 0) {
    return <p className={styles.empty}>Sin géneros con estos filtros.</p>;
  }

  const max = Math.max(...words.map((word) => word.value));
  const min = Math.min(...words.map((word) => word.value));
  const fontSize = (value: number) => {
    if (max === min) return 18;
    return 12 + ((value - min) / (max - min)) * 26;
  };

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className={styles.svg}
      role="img"
      aria-label={`Nube de palabras con ${words.length} géneros; el tamaño indica el número de títulos. Los datos completos están en la tabla “Ver datos”.`}
    >
      <Wordcloud
        width={WIDTH}
        height={HEIGHT}
        words={words.map((word) => ({ text: word.name, value: word.value }))}
        fontSize={(word) => fontSize(word.value)}
        font="var(--font)"
        fontWeight={600}
        rotate={0}
        padding={2}
        spiral="archimedean"
        random={makeRandom(42)}
      >
        {(cloudWords) =>
          cloudWords.map((word, index) => (
            <text
              key={`${word.text}-${index}`}
              transform={`translate(${word.x ?? 0}, ${word.y ?? 0}) rotate(${word.rotate ?? 0})`}
              fontSize={word.size}
              fontWeight={600}
              fill={index < 3 ? "var(--accent)" : "var(--text-muted)"}
              textAnchor="middle"
            >
              {word.text}
            </text>
          ))
        }
      </Wordcloud>
    </svg>
  );
}
