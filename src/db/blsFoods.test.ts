import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildBlsIndex, searchBls } from './blsFoods';

const idx = buildBlsIndex(JSON.parse(readFileSync('public/data/bls.json', 'utf-8')));

describe('BLS-Daten', () => {
  it('enthält den vollständigen BLS 4.0', () => {
    expect(idx.foods.length).toBe(7140);
    expect(idx.byId.get('bls:C133000')).toMatchObject({ name: 'Hafer Flocken', per100: { kcal: 348, protein: 13.22 } });
  });

  it('fehlende Werte bleiben unbekannt statt 0', () => {
    expect(idx.byId.get('bls:C133000')?.per100.vitC).toBeUndefined();
  });

  it('findet zusammengeschriebene Suchbegriffe und Umlaute', () => {
    expect(searchBls(idx, 'haferflocken')[0].name).toBe('Hafer Flocken');
    expect(searchBls(idx, 'apfel roh')[0].name).toBe('Apfel roh');
  });

  it('findet über Synonyme', () => {
    expect(searchBls(idx, 'Ei')[0].name).toBe('Hühnerei roh');
    expect(searchBls(idx, 'topfen')[0].name).toMatch(/quark/i);
    expect(searchBls(idx, 'brokkoli')[0].name).toMatch(/broccoli/i);
    expect(searchBls(idx, 'paradeiser')[0].name).toBe('Tomate roh');
  });
});
