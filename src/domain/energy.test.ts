import { describe, expect, it } from 'vitest';
import { bmrMifflinStJeor, energyTargets } from './energy';
import type { Profile } from './types';

const NOW = new Date('2026-06-01');
const base: Profile = {
  id: 'p', name: 'Test', sex: 'm', birthYear: 1986, heightCm: 180, weightKg: 80, pal: 1.6,
  goal: 'halten', macroPattern: 'ausgewogen', foodFilter: 'omnivor', fasting: { mode: 'keins' },
  phytate: 'mittel', targetOverrides: {}, createdAt: 0,
};

describe('Energiebedarf', () => {
  it('Mifflin-St Jeor', () => {
    expect(bmrMifflinStJeor('m', 80, 180, 40)).toBe(1730); // 800 + 1125 - 200 + 5
    expect(bmrMifflinStJeor('w', 65, 168, 35)).toBe(1364); // 650 + 1050 - 175 - 161
  });

  it('Gesamtumsatz und Makros (ausgewogen)', () => {
    const t = energyTargets(base, NOW);
    expect(t.tdee).toBe(2768);
    expect(t.kcal).toBe(2768);
    expect(t.proteinG).toBe(104); // 15 % / 4
    expect(t.fatG).toBe(92); // 30 % / 9
    expect(t.carbsG).toBe(381); // 55 % / 4
    expect(t.dgeProteinMinG).toBe(64);
  });

  it('Ziel Abnehmen zieht 500 kcal ab, eigene Werte überschreiben', () => {
    expect(energyTargets({ ...base, goal: 'abnehmen' }, NOW).kcal).toBe(2268);
    expect(energyTargets({ ...base, goal: 'abnehmen', kcalAdjust: -300 }, NOW).kcal).toBe(2468);
    const own = energyTargets({ ...base, targetOverrides: { kcal: 2000, protein: 160 } }, NOW);
    expect(own.kcal).toBe(2000);
    expect(own.proteinG).toBe(160);
  });

  it('Keto: 5 % Kohlenhydrate', () => {
    expect(energyTargets({ ...base, macroPattern: 'keto' }, NOW).carbsG).toBe(35);
  });

  it('warnt, wenn das Ziel unter dem Grundumsatz liegt', () => {
    // 1200 kcal: unter dem Grundumsatz, und 15 % Protein (45 g) liegen unter dem DGE-Minimum (64 g)
    expect(energyTargets({ ...base, targetOverrides: { kcal: 1200 } }, NOW).warnings).toHaveLength(2);
    expect(energyTargets(base, NOW).warnings).toHaveLength(0);
  });
});
