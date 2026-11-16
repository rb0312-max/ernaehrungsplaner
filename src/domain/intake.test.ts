import { describe, expect, it } from 'vitest';
import { computeIntake, overview } from './intake';
import { newProfileDraft } from './profile';
import { resetAllReferenceOverrides, setReferenceOverride } from './referenceValues';
import type { DiaryEntry, Profile } from './types';

const NOW = new Date('2026-11-15');
const profile: Profile = { ...newProfileDraft('p', 0), name: 'T', sex: 'm', birthYear: 1990, heightCm: 180, weightKg: 80 };

let n = 0;
const entry = (date: string, grams: number, per100: DiaryEntry['per100']): DiaryEntry => ({
  id: `e${++n}`, profileId: 'p', date, meal: 'mittag', grams, name: 'x', per100, createdAt: 0,
});

describe('computeIntake', () => {
  it('Tag: skaliert je Eintrag und summiert', () => {
    const i = computeIntake([entry('2026-11-15', 200, { vitC: 50 }), entry('2026-11-15', 50, { vitC: 10 })], '2026-11-15', '2026-11-15');
    expect(i).toMatchObject({ days: 1, trackedDays: 1, entryCount: 2 });
    expect(i.byNutrient.vitC).toEqual({ amount: 105, missing: 0 });
  });

  it('Wochenschnitt teilt durch Tage mit Einträgen, nicht durch 7', () => {
    const entries = [entry('2026-11-10', 100, { vitC: 100 }), entry('2026-11-10', 100, { vitC: 20 }), entry('2026-11-12', 100, { vitC: 60 })];
    const i = computeIntake(entries, '2026-11-09', '2026-11-15');
    expect(i).toMatchObject({ days: 7, trackedDays: 2, entryCount: 3 });
    expect(i.byNutrient.vitC?.amount).toBe(90); // (120 + 60) / 2
  });

  it('Einträge außerhalb des Zeitraums zählen nicht', () => {
    const i = computeIntake([entry('2026-11-08', 100, { vitC: 100 }), entry('2026-11-16', 100, { vitC: 100 })], '2026-11-09', '2026-11-15');
    expect(i.entryCount).toBe(0);
    expect(i.byNutrient.vitC?.amount).toBeUndefined();
  });

  it('fehlender Wert ist unbekannt, nie 0; teilweise fehlend = Mindestwert', () => {
    const entries = [entry('2026-11-15', 100, { vitC: 40 }), entry('2026-11-15', 100, {}), entry('2026-11-15', 100, { iron: 1 })];
    const i = computeIntake(entries, '2026-11-15', '2026-11-15');
    expect(i.byNutrient.vitC).toEqual({ amount: 40, missing: 2 });
    expect(i.byNutrient.iron).toEqual({ amount: 1, missing: 2 });
    expect(i.byNutrient.vitK).toEqual({ amount: undefined, missing: 3 });
  });

  it('ein bekannter Wert 0 ist nicht unbekannt', () => {
    const i = computeIntake([entry('2026-11-15', 100, { vitC: 0 })], '2026-11-15', '2026-11-15');
    expect(i.byNutrient.vitC).toEqual({ amount: 0, missing: 0 });
  });

  it('ohne Einträge ist alles unbekannt', () => {
    const i = computeIntake([], '2026-11-15', '2026-11-15');
    expect(i.trackedDays).toBe(0);
    expect(i.byNutrient.vitC).toEqual({ amount: undefined, missing: 0 });
  });
});

describe('overview', () => {
  const find = (sections: ReturnType<typeof overview>, key: string) => sections.flatMap((s) => s.rows).find((r) => r.def.key === key);

  it('Gruppen und Reihenfolge, 29 Nährstoffe mit DGE-Wert', () => {
    const s = overview(profile, computeIntake([], '2026-11-15', '2026-11-15'), NOW);
    expect(s.map((x) => x.label)).toEqual(['Vitamine', 'Mineralstoffe', 'Spurenelemente', 'Ballaststoffe']);
    expect(s.flatMap((x) => x.rows)).toHaveLength(29);
  });

  it('Prozent vom Referenzwert (Vitamin C, Mann: 110 mg)', () => {
    const i = computeIntake([entry('2026-11-15', 100, { vitC: 55 })], '2026-11-15', '2026-11-15');
    expect(find(overview(profile, i, NOW), 'vitC')).toMatchObject({ amount: 55, percent: 50, aboveMax: false });
  });

  it('eigener Wert ändert den Bezug', () => {
    const own = setReferenceOverride(profile, 'vitC', 55);
    const i = computeIntake([entry('2026-11-15', 100, { vitC: 55 })], '2026-11-15', '2026-11-15');
    expect(find(overview(own, i, NOW), 'vitC')?.percent).toBe(100);
  });

  it('Obergrenze der DGE (Kupfer 1,5 mg)', () => {
    const i = computeIntake([entry('2026-11-15', 100, { copper: 2 })], '2026-11-15', '2026-11-15');
    expect(find(overview(profile, i, NOW), 'copper')?.aboveMax).toBe(true);
    expect(find(overview(profile, i, NOW), 'iron')?.aboveMax).toBe(false);
  });

  it('unbekannt: kein Prozentwert', () => {
    const r = find(overview(profile, computeIntake([entry('2026-11-15', 100, {})], '2026-11-15', '2026-11-15'), NOW), 'vitC');
    expect(r).toMatchObject({ amount: undefined, percent: undefined, missing: 1 });
  });
});

describe('Referenzwerte überschreiben', () => {
  it('ohne Rundung, Zurücksetzen mit undefined', () => {
    const p = setReferenceOverride(profile, 'b1', 1.35);
    expect(p.targetOverrides.b1).toBe(1.35);
    expect(setReferenceOverride(p, 'b1', undefined).targetOverrides.b1).toBeUndefined();
  });

  it('ungültige Werte und Nährstoffe ohne Referenz ändern nichts', () => {
    expect(setReferenceOverride(profile, 'b1', 0)).toBe(profile);
    expect(setReferenceOverride(profile, 'b1', -1)).toBe(profile);
    expect(setReferenceOverride(profile, 'b1', NaN)).toBe(profile);
    expect(setReferenceOverride(profile, 'cholesterol', 5)).toBe(profile);
  });

  it('Alles zurücksetzen lässt Energie- und Makroziele stehen', () => {
    const p = { ...profile, targetOverrides: { kcal: 2000, protein: 120, vitC: 200, iron: 20 } };
    expect(resetAllReferenceOverrides(p).targetOverrides).toEqual({ kcal: 2000, protein: 120 });
  });
});
