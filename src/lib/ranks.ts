export type Rank = {
  title: string;
  emoji: string;
  min: number;
  max: number | null;
  next: number | null;
  nextTitle: string | null;
  descriptionKey: string;
};

export type RankDef = { title: string; emoji: string; min: number; descriptionKey: string };

// Rank names are kept in English by design (flavor/brand names, like "Cloud
// Nine") — only their descriptions are translated.
export const RANKS: RankDef[] = [
  { title: "Fresh Snow", emoji: "❄️", min: 0, descriptionKey: "ranks.desc_fresh_snow" },
  { title: "Snow Rookie", emoji: "🌱", min: 1, descriptionKey: "ranks.desc_snow_rookie" },
  { title: "Lift Survivor", emoji: "🎟️", min: 4, descriptionKey: "ranks.desc_lift_survivor" },
  { title: "Powder Hunter", emoji: "🏂", min: 10, descriptionKey: "ranks.desc_powder_hunter" },
  { title: "Mountain Yeti", emoji: "🦄", min: 20, descriptionKey: "ranks.desc_mountain_yeti" },
  { title: "Legend of the Peaks", emoji: "🏔️", min: 40, descriptionKey: "ranks.desc_legend_of_peaks" },
];

export function getRank(completed: number): Rank {
  let idx = 0;
  for (let i = 0; i < RANKS.length; i++) if (completed >= RANKS[i].min) idx = i;
  const cur = RANKS[idx];
  const nxt = RANKS[idx + 1];
  return {
    title: cur.title,
    emoji: cur.emoji,
    min: cur.min,
    max: nxt ? nxt.min - 1 : null,
    next: nxt ? nxt.min : null,
    nextTitle: nxt ? nxt.title : null,
    descriptionKey: cur.descriptionKey,
  };
}

export function rangeLabel(r: RankDef, i: number, t: (key: string, vars?: Record<string, string | number>) => string): string {
  const next = RANKS[i + 1];
  if (!next) return t("ranks.range_plus", { n: r.min });
  if (next.min - 1 === r.min) return t(r.min === 1 ? "ranks.range_one" : "ranks.range_single", { n: r.min });
  return t("ranks.range_range", { min: r.min, max: next.min - 1 });
}
