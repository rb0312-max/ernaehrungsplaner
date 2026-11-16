import { knownTotal, progressOf, type DaySummary } from '../../domain/diary';
import type { EnergyTargets } from '../../domain/energy';
import { formatNumber } from '../../domain/foodDetail';

const MACROS = [
  { key: 'protein', label: 'Protein', target: 'proteinG' },
  { key: 'fat', label: 'Fett', target: 'fatG' },
  { key: 'carbs', label: 'Kohlenhydrate', target: 'carbsG' },
] as const;

function Bar({ ratio }: { ratio: number }) {
  const pct = Math.max(0, Math.min(1, ratio)) * 100;
  return (
    <div className="bar" aria-hidden="true">
      <div className={ratio > 1 ? 'bar-fill over' : 'bar-fill'} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Tagessummen gegen die Ziele (Energie, Protein, Fett, Kohlenhydrate). Fehlende Angaben werden benannt. */
export function DaySummaryCard({ summary, targets }: { summary: DaySummary; targets: EnergyTargets | undefined }) {
  const kcal = knownTotal(summary, 'kcal');
  const kcalProgress = kcal !== undefined && targets ? progressOf(kcal, targets.kcal) : undefined;
  const incomplete = (Object.keys(summary.missing) as (keyof typeof summary.missing)[]).filter((k) => k === 'kcal' || MACROS.some((m) => m.key === k));

  return (
    <section className="card" aria-label="Tagessumme">
      <div className="row">
        <span className="big">{kcal === undefined ? '–' : formatNumber(kcal)} <span className="muted small">kcal</span></span>
        <span className="muted">{targets ? `Ziel ${formatNumber(targets.kcal)} kcal` : 'kein Ziel'}</span>
      </div>
      {kcalProgress && (
        <>
          <Bar ratio={kcalProgress.ratio} />
          <p className={kcalProgress.remaining < 0 ? 'error small' : 'muted small'}>
            {kcalProgress.remaining < 0
              ? `${formatNumber(-kcalProgress.remaining)} kcal über dem Ziel`
              : `noch ${formatNumber(kcalProgress.remaining)} kcal übrig`}
          </p>
        </>
      )}
      {MACROS.map((m) => {
        const v = knownTotal(summary, m.key);
        const t = targets?.[m.target];
        const p = v !== undefined && t !== undefined ? progressOf(v, t) : undefined;
        return (
          <div key={m.key} className="macro">
            <div className="row small">
              <span>{m.label}</span>
              <span className="num">
                {v === undefined ? '–' : formatNumber(v)} g{t !== undefined && <span className="muted"> / {formatNumber(t)} g</span>}
              </span>
            </div>
            {p && <Bar ratio={p.ratio} />}
          </div>
        );
      })}
      {incomplete.length > 0 && (
        <p className="muted small">
          Summe unvollständig: Bei manchen Einträgen fehlt die Angabe zu {incomplete.map((k) => MACROS.find((m) => m.key === k)?.label ?? 'Energie').join(', ')}. Fehlendes zählt nicht als 0.
        </p>
      )}
    </section>
  );
}
