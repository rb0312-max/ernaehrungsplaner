import { describe, expect, it } from 'vitest';
import {
  calculatedTarget,
  eatingWindowEnd,
  macroKcal,
  newProfileDraft,
  profileNotes,
  resetSplit,
  setCustomSplit,
  setFastingMode,
  setGoal,
  setKcalAdjust,
  setMacroPattern,
  setTargetOverride,
  targetsOf,
  toggleFastDay,
  validateProfile,
} from './profile';
import { energyTargets } from './energy';
import type { Profile } from './types';

const NOW = new Date('2026-06-01');
const valid: Profile = {
  ...newProfileDraft('p', 0),
  name: 'Test',
  birthYear: 1986,
  heightCm: 180,
  weightKg: 80,
  pal: 1.6,
};

describe('Prüfung', () => {
  it('neues Profil ist unvollständig', () => {
    const e = validateProfile(newProfileDraft('x', 0), NOW);
    expect(Object.keys(e).sort()).toEqual(['birthYear', 'heightCm', 'name', 'weightKg']);
    expect(targetsOf(newProfileDraft('x', 0), NOW)).toBeUndefined();
  });

  it('gültiges Profil, Plausibilitätsgrenzen', () => {
    expect(validateProfile(valid, NOW)).toEqual({});
    expect(validateProfile({ ...valid, heightCm: 18 }, NOW).heightCm).toBeDefined();
    expect(validateProfile({ ...valid, weightKg: 800 }, NOW).weightKg).toBeDefined();
    expect(validateProfile({ ...valid, birthYear: 1850 }, NOW).birthYear).toBeDefined();
    expect(validateProfile({ ...valid, name: '  ' }, NOW).name).toBeDefined();
  });

  it('eigene Anteile müssen 100 % ergeben', () => {
    expect(validateProfile(setCustomSplit(valid, { proteinPct: 30, fatPct: 30, carbsPct: 30 }), NOW).split).toBeDefined();
    expect(validateProfile(setCustomSplit(valid, { proteinPct: 30, fatPct: 30, carbsPct: 40 }), NOW).split).toBeUndefined();
  });

  it('5:2 braucht genau zwei Fastentage', () => {
    let p = setFastingMode(valid, '5:2');
    expect(validateProfile(p, NOW).fastDays).toBeDefined();
    p = toggleFastDay(toggleFastDay(p, 1), 4);
    expect(validateProfile(p, NOW).fastDays).toBeUndefined();
    expect(toggleFastDay(p, 1).fasting.fastDays).toEqual([4]);
  });

  it('Hinweis unter 19 Jahren', () => {
    expect(profileNotes({ ...valid, birthYear: 2012 }, NOW)).toHaveLength(1);
    expect(profileNotes(valid, NOW)).toHaveLength(0);
  });
});

describe('Überschreibungen', () => {
  it('Überschreiben und Zurücksetzen auf den berechneten Wert', () => {
    const own = setTargetOverride(valid, 'kcal', 2000);
    expect(energyTargets(own, NOW).kcal).toBe(2000);
    expect(calculatedTarget(own, 'kcal', NOW)).toBe(2768);
    expect(setTargetOverride(own, 'kcal', undefined).targetOverrides).toEqual({});
    expect(energyTargets(setTargetOverride(own, 'kcal', undefined), NOW).kcal).toBe(2768);
  });

  it('berechnetes Protein folgt dem überschriebenen Kalorienziel', () => {
    const own = setTargetOverride(setTargetOverride(valid, 'kcal', 2000), 'protein', 160);
    expect(calculatedTarget(own, 'protein', NOW)).toBe(75); // 2000 × 15 % / 4
    expect(energyTargets(own, NOW).proteinG).toBe(160);
  });

  it('andere Überschreibungen (z. B. Mikronährstoffe) bleiben erhalten', () => {
    const p = { ...valid, targetOverrides: { vitC: 200 } };
    expect(setTargetOverride(p, 'kcal', 2000).targetOverrides).toEqual({ vitC: 200, kcal: 2000 });
    expect(setTargetOverride(setTargetOverride(p, 'kcal', 2000), 'kcal', undefined).targetOverrides).toEqual({ vitC: 200 });
  });

  it('Zielwechsel setzt die Anpassung zurück', () => {
    const adj = setKcalAdjust({ ...valid, goal: 'abnehmen' }, -300);
    expect(energyTargets(adj, NOW).kcal).toBe(2468);
    expect(energyTargets(setGoal(adj, 'abnehmen'), NOW).kcal).toBe(2268);
    expect(energyTargets(setKcalAdjust(adj, undefined), NOW).kcal).toBe(2268);
  });

  it('Makro-Muster', () => {
    const keto = setMacroPattern(valid, 'keto');
    expect(energyTargets(keto, NOW).carbsG).toBe(35);
    const own = setMacroPattern(keto, 'eigene');
    expect(own.customSplit).toEqual({ proteinPct: 20, fatPct: 75, carbsPct: 5 });
    expect(setMacroPattern(own, 'lowcarb').customSplit).toBeUndefined();
    const tweaked = setCustomSplit(keto, { proteinPct: 25, fatPct: 70, carbsPct: 5 });
    expect(resetSplit(tweaked).customSplit).toBeUndefined();
  });

  it('Energie der Makro-Ziele', () => {
    expect(macroKcal({ proteinG: 100, fatG: 50, carbsG: 200 })).toBe(400 + 450 + 800);
  });
});

describe('Fasten', () => {
  it('Ende des Essensfensters', () => {
    expect(eatingWindowEnd('16:8', '12:00')).toBe('20:00');
    expect(eatingWindowEnd('14:10', '14:30')).toBe('00:30');
    expect(eatingWindowEnd('eigene', '12:00')).toBeUndefined();
    expect(eatingWindowEnd('16:8', '')).toBeUndefined();
  });

  it('Moduswechsel behält den Beginn und berechnet das Ende', () => {
    const p = setFastingMode({ ...valid, fasting: { mode: '16:8', eatingWindowStart: '12:00', eatingWindowEnd: '20:00' } }, '14:10');
    expect(p.fasting).toEqual({ mode: '14:10', eatingWindowStart: '12:00', eatingWindowEnd: '22:00' });
    expect(setFastingMode(p, 'keins').fasting).toEqual({ mode: 'keins' });
  });
});
