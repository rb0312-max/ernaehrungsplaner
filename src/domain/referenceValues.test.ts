import { describe, expect, it } from 'vitest';
import { allReferences, referenceFor } from './referenceValues';

const NOW = new Date('2026-06-01');
const man = { sex: 'm' as const, birthYear: 1986, phytate: 'mittel' as const, targetOverrides: {} };
const woman = { sex: 'w' as const, birthYear: 1990, phytate: 'mittel' as const, targetOverrides: {} };

describe('DGE-Referenzwerte', () => {
  it('Werte nach Geschlecht und Alter', () => {
    expect(referenceFor('vitC', man, NOW)?.value).toBe(110);
    expect(referenceFor('vitC', woman, NOW)?.value).toBe(95);
    expect(referenceFor('vitE', man, NOW)?.value).toBe(8);
    expect(referenceFor('vitA', { ...man, birthYear: 1950 }, NOW)?.value).toBe(800);
    expect(referenceFor('vitK', { ...woman, birthYear: 1970 }, NOW)?.value).toBe(65);
    expect(referenceFor('iodine', man, NOW)?.value).toBe(150);
  });

  it('Eisen bei Frauen hängt von der Menopause ab', () => {
    expect(referenceFor('iron', woman, NOW)?.value).toBe(16);
    expect(referenceFor('iron', { ...woman, birthYear: 1970 }, NOW)?.value).toBe(14);
    expect(referenceFor('iron', { ...woman, birthYear: 1970, postmenopausal: false }, NOW)?.value).toBe(16);
    expect(referenceFor('iron', man, NOW)?.value).toBe(11);
  });

  it('Zink hängt von der Phytatzufuhr ab', () => {
    expect(referenceFor('zinc', { ...man, phytate: 'hoch' }, NOW)?.value).toBe(16);
    expect(referenceFor('zinc', { ...woman, phytate: 'niedrig' }, NOW)?.value).toBe(7);
  });

  it('eigene Werte überschreiben, der DGE-Wert bleibt sichtbar', () => {
    const r = referenceFor('vitD', { ...man, targetOverrides: { vitD: 50 } }, NOW);
    expect(r).toMatchObject({ value: 50, dgeValue: 20, overridden: true, kind: 'Eigener Wert' });
  });

  it('liefert alle hinterlegten Nährstoffe', () => {
    expect(allReferences(man, NOW).length).toBe(29); // 13 Vitamine, 15 Mineralstoffe/Spurenelemente, Ballaststoffe
  });
});
