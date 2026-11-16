import { describe, expect, it } from 'vitest';
import type { WeightEntry } from './types';
import { chartGeometry, validateWeightKg, weightSummary } from './weight';

const w = (date: string, weightKg: number): WeightEntry => ({ id: date, profileId: 'p', date, weightKg });

describe('Gewichtsverlauf', () => {
  it('prüft den Eingabebereich', () => {
    expect(validateWeightKg(80)).toBeUndefined();
    expect(validateWeightKg(10)).toBeDefined();
    expect(validateWeightKg(undefined)).toBeDefined();
    expect(validateWeightKg(NaN)).toBeDefined();
  });

  it('Kennzahlen unabhängig von der Eingabereihenfolge', () => {
    const s = weightSummary([w('2026-11-10', 82), w('2026-11-01', 84), w('2026-11-05', 83)]);
    expect(s).toMatchObject({ change: -2, min: 82, max: 84, count: 3 });
    expect(s?.first.date).toBe('2026-11-01');
    expect(s?.last.date).toBe('2026-11-10');
    expect(weightSummary([])).toBeUndefined();
  });

  it('Diagramm: x nach Datum, y nach Wert (größter Wert oben)', () => {
    const g = chartGeometry([w('2026-11-01', 80), w('2026-11-03', 90), w('2026-11-11', 85)], 300, 100, 10)!;
    expect(g.minKg).toBe(80);
    expect(g.maxKg).toBe(90);
    expect(g.points.map((p) => Math.round(p.x))).toEqual([10, 66, 290]);
    expect(g.points.map((p) => p.y)).toEqual([90, 10, 50]);
  });

  it('Diagramm: ein Wert oder gleiche Werte liegen mittig', () => {
    expect(chartGeometry([w('2026-11-01', 80)], 300, 100, 10)!.points[0]).toMatchObject({ x: 150, y: 50 });
    expect(chartGeometry([w('2026-11-01', 80), w('2026-11-02', 80)], 300, 100, 10)!.points.map((p) => p.y)).toEqual([50, 50]);
    expect(chartGeometry([], 300, 100, 10)).toBeUndefined();
  });
});
