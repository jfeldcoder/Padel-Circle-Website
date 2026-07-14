/** One-line auto insights for the Trends charts, computed client-side. */

export interface DatedValue {
  date: string;
  value: number;
}

export function movingAverage(points: DatedValue[], window = 7): DatedValue[] {
  return points.map((p, i) => {
    const slice = points.slice(Math.max(0, i - window + 1), i + 1);
    const avg = slice.reduce((s, q) => s + q.value, 0) / slice.length;
    return { date: p.date, value: Math.round(avg * 10) / 10 };
  });
}

export function trendInsight(points: DatedValue[], unit: string, days: number): string | null {
  if (points.length < 2) return null;
  const first = points[0].value;
  const last = points[points.length - 1].value;
  const delta = Math.round((last - first) * 10) / 10;
  if (delta === 0) return `Holding steady over ${days === Infinity ? "the period" : `${days} days`}`;
  const dir = delta < 0 ? "Down" : "Up";
  const span = days === Infinity ? "the period" : `${days} days`;
  return `${dir} ${Math.abs(delta)} ${unit} over ${span}`;
}

export function averageInsight(
  points: DatedValue[],
  label: string,
  unit: string,
  target?: number | null
): string | null {
  if (points.length === 0) return null;
  const avg = Math.round(points.reduce((s, p) => s + p.value, 0) / points.length);
  let text = `Avg ${label} ${avg}${unit}`;
  if (target) {
    const pct = Math.round((avg / target) * 100);
    text += ` · ${pct}% of target`;
  }
  return text;
}
