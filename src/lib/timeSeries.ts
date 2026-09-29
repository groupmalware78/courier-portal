export const PERIODS = ["daily", "weekly", "monthly", "yearly"] as const;
export type Period = (typeof PERIODS)[number];

export const PERIOD_LABELS: Record<Period, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

interface Point {
  date: Date;
  value: number;
}

export interface SeriesPoint {
  label: string;
  value: number;
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

// Builds a fixed, zero-filled set of buckets covering a sensible lookback
// window per granularity (14 days / 12 weeks / 12 months / 5 years) and
// sums `value` for every point that falls in each bucket. Bucketing
// happens in JS rather than SQL date-truncation to keep the same
// fetch-once-aggregate-in-memory pattern already used by the financial
// report on this page.
export function buildTimeSeries(points: Point[], period: Period): SeriesPoint[] {
  const now = new Date();
  const buckets: { start: Date; end: Date; label: string }[] = [];

  if (period === "daily") {
    for (let i = 13; i >= 0; i--) {
      const start = new Date(startOfDay(now).getTime() - i * DAY_MS);
      const end = new Date(start.getTime() + DAY_MS);
      buckets.push({ start, end, label: `${start.getMonth() + 1}/${start.getDate()}` });
    }
  } else if (period === "weekly") {
    const thisWeek = startOfWeek(now);
    for (let i = 11; i >= 0; i--) {
      const start = new Date(thisWeek.getTime() - i * 7 * DAY_MS);
      const end = new Date(start.getTime() + 7 * DAY_MS);
      buckets.push({ start, end, label: `${start.getMonth() + 1}/${start.getDate()}` });
    }
  } else if (period === "monthly") {
    for (let i = 11; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      buckets.push({ start, end, label: MONTH_LABELS[start.getMonth()] });
    }
  } else {
    for (let i = 4; i >= 0; i--) {
      const start = new Date(now.getFullYear() - i, 0, 1);
      const end = new Date(now.getFullYear() - i + 1, 0, 1);
      buckets.push({ start, end, label: String(start.getFullYear()) });
    }
  }

  return buckets.map(({ start, end, label }) => ({
    label,
    value: points.reduce((sum, p) => (p.date >= start && p.date < end ? sum + p.value : sum), 0),
  }));
}

// One lookback window (5 years) covers every period's bucket range, so
// callers only need a single bounded query for all four series.
export function timeSeriesLookbackStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear() - 4, 0, 1);
}

export function buildAllPeriods(points: Point[]): Record<Period, SeriesPoint[]> {
  return {
    daily: buildTimeSeries(points, "daily"),
    weekly: buildTimeSeries(points, "weekly"),
    monthly: buildTimeSeries(points, "monthly"),
    yearly: buildTimeSeries(points, "yearly"),
  };
}
