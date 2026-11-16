import { formatDayMonth } from '../../domain/dates';
import { formatNumber } from '../../domain/foodDetail';
import type { WeightEntry } from '../../domain/types';
import { chartGeometry } from '../../domain/weight';

const W = 320;
const H = 160;
const PAD = 32;

/** Liniendiagramm des Gewichtsverlaufs (SVG, skaliert auf die Breite). Achse folgt der Spanne der Messwerte, nicht 0. */
export function WeightChart({ entries }: { entries: WeightEntry[] }) {
  const g = chartGeometry(entries, W, H, PAD);
  if (!g) return null;
  const line = g.points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const first = g.points[0].entry;
  const last = g.points[g.points.length - 1].entry;
  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Gewichtsverlauf von ${formatDayMonth(first.date)} bis ${formatDayMonth(last.date)}`}>
        <line x1={PAD} y1={H - PAD / 2} x2={W - PAD} y2={H - PAD / 2} className="axis" />
        {g.points.length > 1 && <polyline points={line} className="line" fill="none" />}
        {g.points.map((p) => (
          <circle key={p.entry.id} cx={p.x} cy={p.y} r={3.5} className="dot">
            <title>{`${formatDayMonth(p.entry.date)} ${formatNumber(p.entry.weightKg)} kg`}</title>
          </circle>
        ))}
        <text x={2} y={PAD + 4} className="axis-label">{formatNumber(g.maxKg)}</text>
        <text x={2} y={H - PAD + 4} className="axis-label">{formatNumber(g.minKg)}</text>
        <text x={PAD} y={H - 2} className="axis-label">{formatDayMonth(first.date)}</text>
        {g.points.length > 1 && <text x={W - PAD} y={H - 2} textAnchor="end" className="axis-label">{formatDayMonth(last.date)}</text>}
      </svg>
      <figcaption className="muted small">kg; Achse von {formatNumber(g.minKg)} bis {formatNumber(g.maxKg)} kg, nicht ab 0.</figcaption>
    </figure>
  );
}
