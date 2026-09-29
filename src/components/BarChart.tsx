interface DataPoint {
  label: string;
  value: number;
}

// A dependency-free bar chart: everything (bars, gaps, height) is
// computed in the same 0-100 x 0-60 coordinate space as the SVG's
// viewBox, and preserveAspectRatio="none" lets the surrounding CSS
// (h-40 w-full) freely stretch it — no external charting library needed
// for a handful of bars.
//
// `format` is a flag rather than a formatter function on purpose: this
// component (and its "money" formatting) needs to stay usable from a
// Server Component caller, and functions can't cross the server/client
// boundary as props.
export function BarChart({
  data,
  color = "#0d9488",
  format = "number",
}: {
  data: DataPoint[];
  color?: string;
  format?: "number" | "currency";
}) {
  const hasData = data.some((d) => d.value > 0);
  if (!hasData) {
    return <p className="py-12 text-center text-sm text-slate-400">No data for this period yet.</p>;
  }

  const max = Math.max(...data.map((d) => d.value));
  const barWidth = 100 / data.length;
  const formatValue = (v: number) => (format === "currency" ? `$${v.toFixed(2)}` : String(v));

  return (
    <div>
      <svg viewBox="0 0 100 60" preserveAspectRatio="none" className="h-40 w-full overflow-visible">
        {data.map((d, i) => {
          const h = max > 0 ? (d.value / max) * 55 : 0;
          return (
            <rect
              key={i}
              x={i * barWidth + barWidth * 0.15}
              y={60 - h}
              width={barWidth * 0.7}
              height={h}
              fill={color}
              rx="1"
            >
              <title>{`${d.label}: ${formatValue(d.value)}`}</title>
            </rect>
          );
        })}
      </svg>
      <div className="mt-1 flex">
        {data.map((d, i) => (
          <div
            key={i}
            style={{ width: `${barWidth}%` }}
            className="truncate px-0.5 text-center text-[10px] text-slate-400"
          >
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}
