import { describe, expect, it } from 'vitest';
import { formatNumber, nutrientSections, toGrams } from './foodDetail';

describe('nutrientSections', () => {
  it('gruppiert, rechnet auf die Menge um und lässt Unbekanntes unbekannt', () => {
    const sections = nutrientSections({ kcal: 348, protein: 13.2 }, 50);
    const makro = sections.find((s) => s.group === 'makro')!;
    expect(makro.rows.find((r) => r.def.key === 'kcal')).toMatchObject({ per100: 348, amount: 174 });
    expect(makro.rows.find((r) => r.def.key === 'fat')).toMatchObject({ per100: undefined, amount: undefined });
    expect(sections.find((s) => s.group === 'vitamin')!.unknown).toBe(sections.find((s) => s.group === 'vitamin')!.rows.length);
  });
});

describe('toGrams', () => {
  it('rechnet Portionen nur mit bekannter Portionsgröße um', () => {
    expect(toGrams(2, 'portion', 30)).toBe(60);
    expect(toGrams(2, 'portion')).toBeUndefined();
    expect(toGrams(150, 'g')).toBe(150);
    expect(toGrams(-1, 'g')).toBeUndefined();
  });
});

describe('formatNumber', () => {
  it('formatiert deutsch und zeigt unbekannt als Strich', () => {
    expect(formatNumber(undefined)).toBe('–');
    expect(formatNumber(348)).toBe('348');
    expect(formatNumber(100)).toBe('100');
    expect(formatNumber(13.22)).toBe('13,2');
    expect(formatNumber(1.5)).toBe('1,5');
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(0.0004)).toBe('<0,001');
  });
});
