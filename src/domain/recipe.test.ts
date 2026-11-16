import { describe, expect, it } from 'vitest';
import { MACRO_PATTERNS } from './energy';
import {
  EMPTY_LEARNED, assignFood, diaryValues, dietFits, gramsHint, ingredientState, learnFrom, learnedGrams, macroShares, nearestPattern, prefillGrams,
  recipeNutrition, remainingSplit, splitDistance, suggest, validateRecipe, withNutrition, type Candidate,
} from './recipe';
import type { Recipe, RecipeIngredient } from './types';

const oil: RecipeIngredient = { name: '2 EL Öl', key: 'Olivenöl', amount: 2, unit: 'EL', foodId: 'bls:Q1', foodName: 'Öl', per100: { kcal: 900, fat: 100, protein: 0, carbs: 0 }, grams: 20 };
const flour: RecipeIngredient = { name: '200 g Mehl', key: 'Mehl', amount: 200, unit: 'g', foodId: 'custom:m', foodName: 'Mehl', per100: { kcal: 350, protein: 10, fat: 1, carbs: 72, vitC: 0 }, grams: 200 };
const salt: RecipeIngredient = { name: 'Salz', ignored: true };
const open: RecipeIngredient = { name: '2 Eier', amount: 2, unit: 'Stück' };

const recipe = (ingredients: RecipeIngredient[], servings = 2): Recipe => ({
  id: 'r1', source: 'custom', title: 'Test', servings, ingredients, instructions: '', tags: [], nutritionComplete: false, perServing: {}, updatedAt: 0,
});

describe('recipeNutrition', () => {
  it('rechnet je Portion aus Gramm und Werten je 100 g', () => {
    const n = recipeNutrition([oil, flour, salt], 2);
    // Öl 20 g: 180 kcal, 20 g Fett; Mehl 200 g: 700 kcal, 20 g Protein, 2 g Fett, 144 g KH
    expect(n.perServing.kcal).toBeCloseTo(440);
    expect(n.perServing.fat).toBeCloseTo(11);
    expect(n.perServing.protein).toBeCloseTo(10);
    expect(n.perServing.carbs).toBeCloseTo(72);
    expect(n).toMatchObject({ mapped: 2, open: 0, ignored: 1, complete: true, gramsPerServing: 110 });
  });

  it('fehlende Werte: teilweise bekannt = Untergrenze mit Zähler, nirgends bekannt = fehlt', () => {
    const n = recipeNutrition([oil, flour], 1);
    expect(n.perServing.vitC).toBe(0);
    expect(n.missing.vitC).toBe(1);
    expect('iron' in n.perServing).toBe(false);
    expect(n.missing.kcal).toBeUndefined();
  });

  it('offene Zutaten machen das Rezept unvollständig', () => {
    expect(ingredientState(open)).toBe('open');
    expect(ingredientState({ ...oil, grams: undefined })).toBe('open');
    expect(ingredientState({ ...oil, grams: 0 })).toBe('open');
    expect(ingredientState({ ...open, ignored: true })).toBe('ignored');
    expect(recipeNutrition([oil, open], 1)).toMatchObject({ complete: false, open: 1 });
    expect(recipeNutrition([salt], 1).complete).toBe(false);
    expect(withNutrition(recipe([oil, open]))).toMatchObject({ nutritionComplete: false });
    expect(withNutrition(recipe([oil, flour])).perServing.kcal).toBeCloseTo(440);
  });

  it('ohne gültige Portionenzahl gibt es keine Werte', () => {
    expect(recipeNutrition([oil], NaN).perServing).toEqual({});
    expect(recipeNutrition([oil], 0).perServing).toEqual({});
  });
});

describe('diaryValues', () => {
  it('liefert Werte je 100 g Rohgewicht und lässt lückenhafte Nährstoffe weg', () => {
    const v = diaryValues(recipe([oil, flour]))!;
    expect(v.gramsPerServing).toBe(110);
    expect(v.per100.kcal).toBeCloseTo(400);
    // Vitamin C fehlt beim Öl -> im Tagebuch unbekannt statt zu niedrig.
    expect('vitC' in v.per100).toBe(false);
    // Eine Portion (110 g) ergibt wieder die Werte je Portion.
    expect((v.per100.kcal! * v.gramsPerServing) / 100).toBeCloseTo(440);
  });
  it('gibt bei offenen Zutaten nichts zurück', () => {
    expect(diaryValues(recipe([oil, open]))).toBeUndefined();
  });
});

describe('Zuordnung und Prüfung', () => {
  it('assignFood kopiert die Werte und hebt "nicht berechnen" auf', () => {
    const per100 = { kcal: 50 };
    const i = assignFood({ name: 'x', ignored: true }, { id: 'custom:1', name: 'X', per100 });
    expect(i).toMatchObject({ foodId: 'custom:1', foodName: 'X', per100: { kcal: 50 } });
    expect(i.ignored).toBeUndefined();
    expect(i.per100).not.toBe(per100);
  });
  it('validateRecipe', () => {
    expect(validateRecipe(recipe([oil]))).toEqual({});
    expect(Object.keys(validateRecipe({ title: ' ', servings: NaN, ingredients: [] }))).toEqual(['title', 'servings', 'ingredients']);
  });
});

describe('Makroverteilung', () => {
  it('rechnet Energieanteile mit 4/9/4 kcal je g', () => {
    const s = macroShares({ protein: 10, fat: 10, carbs: 10 })!;
    expect(s.proteinPct).toBeCloseTo((40 / 170) * 100);
    expect(s.fatPct).toBeCloseTo((90 / 170) * 100);
    expect(macroShares({ protein: 1, fat: 1 })).toBeUndefined();
    expect(macroShares({ protein: 0, fat: 0, carbs: 0 })).toBeUndefined();
  });
  it('nächste Ernährungsform ist die mit dem kleinsten Abstand', () => {
    for (const [id, p] of Object.entries(MACRO_PATTERNS)) expect(nearestPattern(p.split)).toMatchObject({ id, distance: 0 });
    expect(nearestPattern({ proteinPct: 20, fatPct: 72, carbsPct: 8 }).id).toBe('keto');
    expect(splitDistance({ proteinPct: 100, fatPct: 0, carbsPct: 0 }, { proteinPct: 0, fatPct: 100, carbsPct: 0 })).toBe(100);
  });
  it('offene Makros des Tages', () => {
    const t = { proteinG: 100, fatG: 50, carbsG: 200 };
    expect(remainingSplit(t, {})).toEqual(macroShares({ protein: 100, fat: 50, carbs: 200 }));
    expect(remainingSplit(t, { protein: 100, fat: 80, carbs: 100 })).toEqual({ proteinPct: 0, fatPct: 0, carbsPct: 100 });
    expect(remainingSplit(t, { protein: 100, fat: 50, carbs: 250 })).toBeUndefined();
  });
});

describe('Ernährungsweise und Vorschläge', () => {
  it('dietFits', () => {
    expect(dietFits('omnivor', undefined)).toBe(true);
    expect(dietFits('vegetarisch', 'vegan')).toBe(true);
    expect(dietFits('vegan', 'vegetarisch')).toBe(false);
    expect(dietFits('pescetarisch', 'omnivor')).toBe(false);
    expect(dietFits('vegan', undefined)).toBeUndefined();
  });

  const c = (id: string, values: Candidate['values'], extra: Partial<Candidate> = {}): Candidate => ({ id, title: id, kind: 'recipe', values, ...extra });
  const fatty = c('fett', { kcal: 600, protein: 20, fat: 50, carbs: 5 }, { diet: 'omnivor' });
  const carby = c('kh', { kcal: 300, protein: 10, fat: 5, carbs: 55 }, { diet: 'vegan' });
  const unknownDiet = c('ohne', { kcal: 300, protein: 10, fat: 5, carbs: 55 });
  const noMacros = c('leer', { kcal: 100 });

  it('sortiert nach Nähe zur Zielverteilung und lässt Einträge ohne Makros weg', () => {
    const keto = suggest([carby, fatty, noMacros], { filter: 'omnivor', target: MACRO_PATTERNS.keto.split, remainingKcal: 500 });
    expect(keto.items.map((s) => s.id)).toEqual(['fett', 'kh']);
    expect(keto.items[0]).toMatchObject({ overKcal: true, pattern: { id: 'keto' } });
    expect(keto.items[1].overKcal).toBe(false);
    expect(suggest([carby, fatty], { filter: 'omnivor', target: MACRO_PATTERNS.highcarb.split }).items[0].id).toBe('kh');
  });

  it('filtert nach Ernährungsweise; ohne Angabe nur auf Wunsch', () => {
    const o = { filter: 'vegan', target: MACRO_PATTERNS.ausgewogen.split } as const;
    const strict = suggest([carby, fatty, unknownDiet], o);
    expect(strict.items.map((s) => s.id)).toEqual(['kh']);
    expect(strict.hiddenUnknownDiet).toBe(1);
    const loose = suggest([carby, fatty, unknownDiet], { ...o, includeUnknownDiet: true });
    expect(loose.items.map((s) => s.id).sort()).toEqual(['kh', 'ohne']);
    expect(loose.items.find((s) => s.id === 'ohne')?.dietOk).toBeUndefined();
  });
});

describe('gemerkte Zuordnungen', () => {
  it('merkt Lebensmittel je Zutat und Gramm je Einheit, aber keine Gewichtseinheiten', () => {
    const l = learnFrom(EMPTY_LEARNED, [oil, flour, salt, open]);
    expect(l.foods).toEqual({ olivenöl: 'bls:Q1', mehl: 'custom:m' });
    expect(l.unitGrams).toEqual({ 'bls:Q1|EL': 10 });
    expect(learnedGrams(l, { foodId: 'bls:Q1', amount: 3, unit: 'EL' })).toBe(30);
    expect(learnedGrams(l, { foodId: 'bls:Q1', amount: 3, unit: 'TL' })).toBeUndefined();
    expect(EMPTY_LEARNED).toEqual({ foods: {}, unitGrams: {} });
  });

  it('merkt keine Gramm, die unverändert aus einer Umrechnung stammen', () => {
    const l = learnFrom(EMPTY_LEARNED, [{ ...oil, grams: 27.6, gramsOrigin: 'dichte' }]);
    expect(l.foods).toEqual({ olivenöl: 'bls:Q1' });
    expect(l.unitGrams).toEqual({});
    expect(learnFrom(EMPTY_LEARNED, [{ ...oil, gramsOrigin: 'kochwiki' }, { ...oil, foodId: 'bls:Q2', gramsOrigin: 'usda' }]).unitGrams).toEqual({});
  });
});

describe('Gramm vorbelegen', () => {
  const learned = { foods: {}, unitGrams: { 'bls:Q1|EL': 10 } };
  const line: RecipeIngredient = { name: '2 EL Olivenöl', rawMeasure: '2 EL', key: 'Olivenöl', amount: 2, unit: 'EL', foodId: 'bls:Q1' };

  it('Reihenfolge: Gewichtsangabe der Quelle, gemerkter Wert, Umrechnung', () => {
    const fromSource: RecipeIngredient = { ...line, grams: 25, gramsOrigin: 'quelle' };
    expect(prefillGrams(fromSource, learned)).toBe(fromSource);
    expect(prefillGrams(line, learned)).toMatchObject({ grams: 20, gramsOrigin: 'gemerkt' });
    // Ohne gemerkten Wert: 30 ml mal 0,92 g/ml.
    const converted = prefillGrams(line, EMPTY_LEARNED);
    expect(converted).toMatchObject({ grams: 27.6, gramsOrigin: 'dichte' });
    expect(converted.gramsNote).toContain('Schweizer Nährwertdatenbank');
    const none = prefillGrams({ name: '1 Bund Petersilie', rawMeasure: '1 Bund', key: 'Petersilie', amount: 1, unit: 'Bund' }, EMPTY_LEARNED);
    expect(none.grams).toBeUndefined();
    expect(none.gramsOrigin).toBeUndefined();
  });

  it('der Hinweis nennt die Herkunft', () => {
    expect(gramsHint({ name: '200 g Mehl', rawMeasure: '200 g', amount: 200, unit: 'g', grams: 200, gramsOrigin: 'quelle' })).toBe('Gewichtsangabe der Quelle: „200 g“.');
    expect(gramsHint({ name: '100–150 g Käse', rawMeasure: '100–150 g', amount: 125, unit: 'g', grams: 125, gramsOrigin: 'quelle' })).toContain('Mittelwert');
    expect(gramsHint(prefillGrams(line, learned))).toContain('gemerkten Wert');
    expect(gramsHint(prefillGrams(line, EMPTY_LEARNED))).toContain('Umgerechnet: 30 ml');
    const onion = prefillGrams({ name: '1 Zwiebel', rawMeasure: '1', key: 'Zwiebel', amount: 1, unit: 'Stück' }, EMPTY_LEARNED);
    expect(gramsHint(onion)).toContain('US-Daten, bitte prüfen');
    expect(gramsHint(onion)).toContain('USDA 170000');
    const flour3 = prefillGrams({ name: '3 EL Mehl', rawMeasure: '3 EL', key: 'Mehl', amount: 3, unit: 'EL' }, EMPTY_LEARNED);
    expect(flour3).toMatchObject({ grams: 30, gramsOrigin: 'kochwiki' });
    expect(gramsHint(flour3)).toContain('Koch-Wiki, gerundet: 1 EL = 10 g');
  });

  it('ohne Umrechnung bittet der Hinweis um Gramm; ein eigener Wert zeigt nur die Quelle', () => {
    const bund: RecipeIngredient = { name: '1 Bund Petersilie', rawMeasure: '1 Bund', amount: 1, unit: 'Bund' };
    expect(gramsHint(bund)).toContain('bitte Gramm eintragen');
    expect(gramsHint({ ...bund, grams: 30 })).toBe('Quelle: „1 Bund“.');
    expect(gramsHint({ name: 'Salz' })).toBeUndefined();
    // Vor Einführung der Herkunftsangabe gespeicherte Gewichtsangabe: kein Hinweis nötig.
    expect(gramsHint({ name: '200 g Mehl', rawMeasure: '200 g', amount: 200, unit: 'g', grams: 200 })).toBeUndefined();
  });
});
