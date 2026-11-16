import { describe, expect, it } from 'vitest';
import { copyEntry, createEntry, entryAmounts, groupByMeal, isValidGrams, knownTotal, progressOf, summarize } from './diary';
import type { DiaryEntry } from './types';

const entry = (id: string, meal: DiaryEntry['meal'], grams: number, per100: DiaryEntry['per100'], createdAt = 1): DiaryEntry => ({
  id, profileId: 'p', date: '2026-11-15', meal, grams, name: id, per100, createdAt,
});

describe('Tagebuch', () => {
  it('rechnet die Menge auf die Nährwerte um', () => {
    expect(entryAmounts({ grams: 150, per100: { kcal: 200, protein: 10 } })).toEqual({ kcal: 300, protein: 15 });
  });

  it('legt Einträge mit Kopie der Werte an', () => {
    const per100 = { kcal: 100 };
    const e = createEntry({ id: 'e1', profileId: 'p', date: '2026-11-15', meal: 'mittag', food: { id: 'bls:X', name: 'Reis', per100 }, grams: 80, now: 5 });
    per100.kcal = 999;
    expect(e).toMatchObject({ foodId: 'bls:X', name: 'Reis', grams: 80, createdAt: 5, per100: { kcal: 100 } });
  });

  it('kopiert an anderen Tag und Mahlzeit mit neuer ID und gleichen Werten', () => {
    const o = entry('a', 'fruehstueck', 50, { kcal: 40 });
    const c = copyEntry(o, { id: 'b', date: '2026-11-16', meal: 'snack', now: 9 });
    expect(c).toMatchObject({ id: 'b', date: '2026-11-16', meal: 'snack', grams: 50, name: 'a', per100: { kcal: 40 }, createdAt: 9 });
    expect(c.per100).not.toBe(o.per100);
  });

  it('Tagessumme: fehlende Werte werden gezählt, nicht als 0 verschwiegen', () => {
    const s = summarize([entry('a', 'mittag', 100, { kcal: 100, protein: 10 }), entry('b', 'mittag', 200, { kcal: 50 })]);
    expect(s.total.kcal).toBe(200);
    expect(s.total.protein).toBe(10);
    expect(s.missing.protein).toBe(1);
    expect(s.missing.kcal).toBeUndefined();
    expect(knownTotal(s, 'protein')).toBe(10);
  });

  it('knownTotal: unbekannt, wenn kein Eintrag den Wert kennt; ohne Einträge 0', () => {
    expect(knownTotal(summarize([entry('a', 'snack', 100, { kcal: 10 })]), 'fiber')).toBeUndefined();
    expect(knownTotal(summarize([]), 'kcal')).toBe(0);
  });

  it('gruppiert nach Mahlzeit in fester Reihenfolge, innerhalb nach Anlegezeit', () => {
    const g = groupByMeal([entry('spät', 'mittag', 100, { kcal: 10 }, 5), entry('früh', 'mittag', 100, { kcal: 20 }, 2), entry('x', 'snack', 100, { kcal: 5 })]);
    expect(g.map((m) => m.slot)).toEqual(['fruehstueck', 'mittag', 'abend', 'snack']);
    expect(g[1].entries.map((e) => e.id)).toEqual(['früh', 'spät']);
    expect(g[1].summary.total.kcal).toBeCloseTo(30);
    expect(g[0].entries).toEqual([]);
  });

  it('Fortschritt gegen Ziel', () => {
    expect(progressOf(1500, 2000)).toEqual({ ratio: 0.75, remaining: 500 });
    expect(progressOf(2200, 2000)?.remaining).toBe(-200);
    expect(progressOf(100, 0)).toBeUndefined();
  });

  it('Menge muss größer 0 sein', () => {
    expect(isValidGrams(0)).toBe(false);
    expect(isValidGrams(NaN)).toBe(false);
    expect(isValidGrams(undefined)).toBe(false);
    expect(isValidGrams(0.5)).toBe(true);
  });
});
