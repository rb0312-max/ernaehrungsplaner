import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { assignFood } from '../domain/recipe';
import type { Food, RecipeIngredient } from '../domain/types';
import type { WikiRecipe } from '../services/kochWiki';
import { buildBlsIndex, isBlsDish, listDishes, suggestIngredientFood } from './blsFoods';
import { db } from './db';
import { addRecipeEntry, listDay } from './diaryRepository';
import { deleteFood, saveFood } from './foodRepository';
import { deleteRecipe, draftFromWiki, findImported, getLearned, getRecipe, listCandidates, listRecipes, newRecipeDraft, saveRecipe } from './recipeRepository';

const blsText = readFileSync('public/data/bls.json', 'utf-8');
// loadBls() holt bls.json per fetch; im Test aus der Datei bedienen.
vi.stubGlobal('fetch', async () => new Response(blsText));
const idx = buildBlsIndex(JSON.parse(blsText));

const myOil: Food = { id: 'custom:oel', source: 'custom', name: 'Mein Öl', per100: { kcal: 880, fat: 99, protein: 0, carbs: 0 }, updatedAt: 1 };

const wiki = (ingredients: RecipeIngredient[]): WikiRecipe => ({
  pageId: 42, url: 'https://www.kochwiki.org/wiki/Test', title: 'Test', servings: 2, servingsNote: '2 Personen', ingredients, instructions: 'Kochen.', tags: ['Suppe'], diet: 'vegan',
});

beforeEach(async () => {
  await Promise.all([db.recipes.clear(), db.settings.clear(), db.foods.clear(), db.diary.clear()]);
});

describe('BLS-Helfer für Rezepte', () => {
  it('schlägt nur Grundlebensmittel vor, die genau so heißen, bevorzugt roh', () => {
    expect(suggestIngredientFood(idx, 'Tomate')?.name).toBe('Tomate roh');
    expect(suggestIngredientFood(idx, 'Knoblauch')?.name).toBe('Knoblauch roh');
    expect(suggestIngredientFood(idx, 'Ei')?.name).toBe('Hühnerei roh');
    expect(suggestIngredientFood(idx, 'Olivenöl')?.name).toBe('Olivenöl');
    // Kein Grundlebensmittel beginnt mit diesem Wort -> kein Vorschlag statt eines Gerichts.
    expect(suggestIngredientFood(idx, 'Salz')).toBeUndefined();
    expect(suggestIngredientFood(idx, 'Mehl')).toBeUndefined();
    expect(suggestIngredientFood(idx, '')).toBeUndefined();
    for (const w of ['Tomate', 'Butter', 'Zucker', 'Honig', 'Kartoffel']) {
      const f = suggestIngredientFood(idx, w);
      expect(f && isBlsDish(f.id), w).toBe(false);
    }
  });
  it('Gerichte sind die Codes X und Y', () => {
    const dishes = listDishes(idx);
    expect(dishes.length).toBe(2050);
    expect(dishes.every((f) => /^bls:[XY]/.test(f.id))).toBe(true);
  });
});

describe('recipeRepository', () => {
  it('speichert mit berechneten Nährwerten, listet nach Titel und löscht', async () => {
    const tomato = idx.byId.get('bls:G561100')!;
    const r = await saveRecipe({ ...newRecipeDraft('r1'), title: ' Tomatensalat ', servings: 2, ingredients: [{ ...assignFood({ name: '400 g Tomaten' }, tomato), grams: 400 }] });
    expect(r.title).toBe('Tomatensalat');
    expect(r.nutritionComplete).toBe(true);
    expect(r.perServing.kcal).toBeCloseTo((tomato.per100.kcal! * 400) / 100 / 2);
    await saveRecipe({ ...newRecipeDraft('r2'), title: 'Apfelmus', servings: 1, ingredients: [{ name: 'Äpfel' }] });
    expect((await listRecipes()).map((x) => x.title)).toEqual(['Apfelmus', 'Tomatensalat']);
    expect((await getRecipe('r2'))?.nutritionComplete).toBe(false);
    await deleteRecipe('r2');
    expect(await getRecipe('r2')).toBeUndefined();
  });

  it('Import: BLS-Vorschlag als ungeprüft markiert, Gramm aus der Quelle oder umgerechnet, mit Herkunft', async () => {
    const draft = await draftFromWiki(wiki([
      { name: '400 g Tomaten', key: 'Tomate', amount: 400, unit: 'g', grams: 400 },
      { name: '2 EL Olivenöl', key: 'Olivenöl', amount: 2, unit: 'EL' },
      { name: 'Salz', key: 'Salz' },
      { name: 'frischer Salat' },
      { name: '1 Bund Petersilie', key: 'Petersilie', amount: 1, unit: 'Bund', rawMeasure: '1 Bund' },
      { name: '1 große Zwiebel', key: 'Zwiebel', amount: 1, unit: 'Stück', rawMeasure: '1' },
    ]));
    expect(draft).toMatchObject({ source: 'kochwiki', sourceId: '42', sourceTitle: 'Test', servings: 2, diet: 'vegan', nutritionComplete: false });
    expect(draft.ingredients[0]).toMatchObject({ foodId: 'bls:G561100', suggested: true, grams: 400 });
    // 2 EL = 30 ml mal 0,92 g/ml (Schweizer Nährwertdatenbank, Olivenöl).
    expect(draft.ingredients[1]).toMatchObject({ foodId: 'bls:Q120000', suggested: true, grams: 27.6, gramsOrigin: 'dichte' });
    expect(draft.ingredients[2].foodId).toBeUndefined();
    expect(draft.ingredients[3].foodId).toBeUndefined();
    // Für "Bund" gibt es keine Umrechnung: die Menge bleibt offen.
    expect(draft.ingredients[4].grams).toBeUndefined();
    expect(draft.ingredients[4].gramsOrigin).toBeUndefined();
    // Stückgewicht aus US-Daten (USDA 170000, "1 large" = 150 g), als solche gekennzeichnet.
    expect(draft.ingredients[5]).toMatchObject({ grams: 150, gramsOrigin: 'usda' });
    expect(draft.ingredients[5].gramsNote).toContain('USDA 170000');
    expect(await getRecipe(draft.id)).toBeUndefined();
  });

  it('merkt Zuordnung und Gramm je Einheit des Nutzers und schlägt sie beim nächsten Import vor', async () => {
    await saveFood(myOil);
    const first = await draftFromWiki(wiki([{ name: '2 EL Olivenöl', key: 'Olivenöl', amount: 2, unit: 'EL' }]));
    // Wie im Formular: ein vom Nutzer geänderter Wert verliert die Herkunft "umgerechnet".
    await saveRecipe({ ...first, ingredients: [{ ...assignFood(first.ingredients[0], myOil), suggested: undefined, grams: 24, gramsOrigin: undefined, gramsNote: undefined }] });
    expect(await getLearned()).toEqual({ foods: { olivenöl: 'custom:oel' }, unitGrams: { 'custom:oel|EL': 12 } });
    expect((await findImported('42'))?.id).toBe(first.id);

    // Der gemerkte Wert des Nutzers geht der Umrechnung vor.
    const second = await draftFromWiki({ ...wiki([{ name: '3 EL natives Olivenöl', key: 'Olivenöl', amount: 3, unit: 'EL' }]), pageId: 43 });
    expect(second.ingredients[0]).toMatchObject({ foodId: 'custom:oel', foodName: 'Mein Öl', grams: 36, gramsOrigin: 'gemerkt' });
    expect(second.ingredients[0].suggested).toBeUndefined();
    expect(second.nutritionComplete).toBe(true);
  });

  it('unverändert gespeicherte Umrechnungen gelten nicht als Wert des Nutzers', async () => {
    const first = await draftFromWiki(wiki([{ name: '1 Zwiebel', key: 'Zwiebel', amount: 1, unit: 'Stück', rawMeasure: '1' }]));
    expect(first.ingredients[0]).toMatchObject({ grams: 110, gramsOrigin: 'usda' });
    await saveRecipe(first);
    expect((await getLearned()).unitGrams).toEqual({});
    // Sonst würde "1 kleine Zwiebel" beim nächsten Import mit 110 g statt 70 g vorbelegt.
    const second = await draftFromWiki({ ...wiki([{ name: '1 kleine Zwiebel', key: 'Zwiebel', amount: 1, unit: 'Stück', rawMeasure: '1' }]), pageId: 43 });
    expect(second.ingredients[0]).toMatchObject({ grams: 70, gramsOrigin: 'usda' });
  });

  it('gelöschte Lebensmittel: das Rezept behält seine Kopie, gemerkte Zuordnung fällt auf den BLS-Vorschlag zurück', async () => {
    await saveFood(myOil);
    const r = await saveRecipe({ ...newRecipeDraft('r1'), title: 'Öl pur', servings: 1, ingredients: [{ ...assignFood({ name: 'Öl', key: 'Olivenöl' }, myOil), grams: 10 }] });
    await deleteFood(myOil.id);
    expect((await getRecipe(r.id))?.perServing.kcal).toBeCloseTo(88);
    const draft = await draftFromWiki(wiki([{ name: 'Olivenöl', key: 'Olivenöl' }]));
    expect(draft.ingredients[0]).toMatchObject({ foodId: 'bls:Q120000', suggested: true });
  });

  it('Tagebucheintrag aus Rezept: Portionen in Gramm Rohgewicht, nur bei vollständigem Rezept', async () => {
    await saveFood(myOil);
    const r = await saveRecipe({ ...newRecipeDraft('r1'), title: 'Öl pur', servings: 2, ingredients: [{ ...assignFood({ name: 'Öl' }, myOil), grams: 40 }, { name: 'Salz', ignored: true }] });
    const e = await addRecipeEntry('p1', r, 1.5, 'mittag', '2026-11-15');
    expect(e).toMatchObject({ recipeId: 'r1', name: 'Öl pur', grams: 30 });
    expect(e.per100.kcal).toBeCloseTo(880);
    expect(e.foodId).toBeUndefined();
    expect((await listDay('p1', '2026-11-15')).length).toBe(1);
    const incomplete = await saveRecipe({ ...r, id: 'r2', ingredients: [...r.ingredients, { name: '2 Eier' }] });
    await expect(addRecipeEntry('p1', incomplete, 1, 'mittag', '2026-11-15')).rejects.toThrow(/offene Zutaten/);
    await expect(addRecipeEntry('p1', r, 0, 'mittag', '2026-11-15')).rejects.toThrow(/Portionen/);
  });

  it('Kandidaten für Vorschläge: Rezepte je Portion und BLS-Gerichte je 100 g', async () => {
    await saveRecipe({ ...newRecipeDraft('r1'), title: 'Öl pur', servings: 1, diet: 'vegan', ingredients: [{ ...assignFood({ name: 'Öl' }, myOil), grams: 10 }] });
    const { recipes, dishes } = await listCandidates();
    expect(recipes).toEqual([{ id: 'r1', title: 'Öl pur', kind: 'recipe', values: expect.objectContaining({ fat: 9.9 }), diet: 'vegan', incomplete: false }]);
    expect(dishes.length).toBe(2050);
    expect(dishes[0]).toMatchObject({ kind: 'bls' });
    expect(dishes[0].diet).toBeUndefined();
  });
});
