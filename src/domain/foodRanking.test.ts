import { describe, expect, it } from 'vitest';
import { MAX_RECENT, pushRecent, rankByUse } from './foodRanking';

const f = (id: string) => ({ id });

describe('rankByUse', () => {
  it('Favoriten, dann zuletzt Verwendete (jüngste zuerst), dann Rest in Suchreihenfolge', () => {
    const foods = ['a', 'b', 'c', 'd', 'e'].map(f);
    const ranked = rankByUse(foods, ['d'], ['c', 'b']).map((x) => x.id);
    expect(ranked).toEqual(['d', 'c', 'b', 'a', 'e']);
  });
  it('ein Favorit, der auch zuletzt verwendet wurde, steht bei den Favoriten', () => {
    expect(rankByUse(['a', 'b', 'c'].map(f), ['c'], ['c', 'b']).map((x) => x.id)).toEqual(['c', 'b', 'a']);
  });
});

describe('pushRecent', () => {
  it('setzt nach vorn, ohne Duplikat, und begrenzt die Länge', () => {
    expect(pushRecent(['a', 'b', 'c'], 'b')).toEqual(['b', 'a', 'c']);
    const many = Array.from({ length: MAX_RECENT + 5 }, (_, i) => `x${i}`);
    expect(pushRecent(many, 'neu')).toHaveLength(MAX_RECENT);
  });
});
