import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildBlsIndex, normalize } from '../db/blsFoods';
import { SYNONYMS } from './synonyms';

const idx = buildBlsIndex(JSON.parse(readFileSync('public/data/bls.json', 'utf-8')));

describe('Synonyme', () => {
  it('Schlüssel sind normalisiert, Zielwörter kommen in BLS-Namen vor', () => {
    for (const [word, targets] of Object.entries(SYNONYMS)) {
      expect(word, word).toBe(normalize(word));
      for (const t of targets) {
        expect(t, t).toBe(normalize(t));
        expect(idx.haystack.some((h) => h.includes(t)), `${word} -> ${t}`).toBe(true);
      }
    }
  });
});
