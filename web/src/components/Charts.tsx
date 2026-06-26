// Lightweight, dependency-free SVG charts + stat cards for the analytics dashboards.

export interface Point { date: string; value: number }

const shortDate = (d: string) => { const [, m, day] = d.split("-"); return `${Number(day)}/${Number(m)}`; };

/** A metric card with value + period-over-period delta. */
export function StatCard({ label, value, delta, hint }: { label: string; value: string | number; delta?: number; hint?: string }) {
  const up = (delta ?? 0) >= 0;
  return (
    <div className="card p-4">
      <p className="text-xs text-muted">{label}</p>
      <div className="mt-1 flex items-end gap-2">
        <p className="font-display text-2xl font-extrabold leading-none text-ink">{value}</p>
        {delta != null && delta !== 0 && (
          <span className={`mb-0.5 text-xs font-bold ${up ? "text-emerald-500" : "text-rose-500"}`}>{up ? "▲" : "▼"} {Math.abs(delta)}%</span>
        )}
      </div>
      {hint && <p className="mt-1 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

/** Bar chart for a daily series. Scales to its container width. */
export function BarChart({ data, color = "#0d9488", height = 160 }: { data: Point[]; color?: string; height?: number }) {
  if (!data.length) return <div className="flex h-40 items-center justify-center text-sm text-muted">No data for this period.</div>;
  const max = Math.max(1, ...data.map((d) => d.value));
  const W = 100, H = height, pad = 4;
  const bw = (W - pad * 2) / data.length;
  const total = data.reduce((s, d) => s + d.value, 0);
  // Show ~6 date labels evenly.
  const step = Math.max(1, Math.ceil(data.length / 6));
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
        {data.map((d, i) => {
          const h = (d.value / max) * (H - 18);
          return <rect key={i} x={pad + i * bw + bw * 0.12} y={H - 14 - h} width={bw * 0.76} height={Math.max(0, h)} rx={0.6} fill={color} opacity={0.85}>
            <title>{d.date}: {d.value}</title>
          </rect>;
        })}
      </svg>
      <div className="flex justify-between px-1 text-[10px] text-muted">
        {data.filter((_, i) => i % step === 0).map((d) => <span key={d.date}>{shortDate(d.date)}</span>)}
      </div>
      <p className="mt-1 text-center text-[11px] text-muted">Total: <span className="font-semibold text-ink">{total}</span></p>
    </div>
  );
}

/** Compact inline sparkline. */
export function Sparkline({ data, color = "#0d9488" }: { data: Point[]; color?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(1, ...data.map((d) => d.value));
  const W = 100, H = 28;
  const pts = data.map((d, i) => `${(i / (data.length - 1)) * W},${H - (d.value / max) * (H - 2) - 1}`).join(" ");
  return <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-7 w-full"><polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} /></svg>;
}
