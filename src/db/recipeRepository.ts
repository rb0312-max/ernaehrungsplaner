/** Zugriff auf gespeicherte Rezepte, gemerkte Zutaten-Zuordnungen und den Import aus dem Koch-Wiki. */
import { assignFood, learnFrom, learnedKey, prefillGrams, withNutrition, type Candidate, type Learned } from '../domain/recipe';
import type { Recipe, RecipeIngredient } from '../domain/types';
import type { WikiRecipe } from '../services/kochWiki';
import { listDishes, loadBls, suggestIngredientFood } from './blsFoods';
import { db, newId } from './db';
import { getFood } from './foodRepository';

const LEARNED_KEY = 'recipeLearned';

export async function listRecipes(): Promise<Recipe[]> {
  return (await db.recipes.toArray()).sort((a, b) => a.title.localeCompare(b.title, 'de'));
}

export function getRecipe(id: string): Promise<Recipe | undefined> {
  return db.recipes.get(id);
}

export async function getLearned(): Promise<Learned> {
  const v = (await db.settings.get(LEARNED_KEY))?.value as Partial<Learned> | undefined;
  return { foods: { ...v?.foods }, unitGrams: { ...v?.unitGrams } };
}

/** Speichert ein Rezept mit neu berechneten Nährwerten und merkt sich die Zuordnungen seiner Zutaten. */
export async function saveRecipe(recipe: Recipe): Promise<Recipe> {
  const stored = withNutrition({ ...recipe, title: recipe.title.trim(), updatedAt: Date.now() });
  await db.transaction('rw', db.recipes, db.settings, async () => {
    await db.recipes.put(stored);
    await db.settings.put({ key: LEARNED_KEY, value: learnFrom(await getLearned(), stored.ingredients) });
  });
  return stored;
}

/** Löscht ein Rezept. Tagebucheinträge behalten ihre Kopie der Werte. */
export async function deleteRecipe(id: string): Promise<void> {
  await db.recipes.delete(id);
}

export function findImported(sourceId: string): Promise<Recipe | undefined> {
  return db.recipes.where('sourceId').equals(sourceId).first();
}

export function newRecipeDraft(id = newId()): Recipe {
  return { id, source: 'custom', title: '', servings: NaN, ingredients: [], instructions: '', tags: [], nutritionComplete: false, perServing: {}, updatedAt: 0 };
}

/**
 * Schlägt für eine Zutat ein Lebensmittel und Gramm vor: zuerst die gemerkte Zuordnung des Nutzers,
 * sonst ein Grundlebensmittel aus dem BLS, das genau so heißt (als ungeprüfter Vorschlag markiert).
 * Gramm: Gewichtsangabe der Quelle, sonst gemerkter Wert des Nutzers, sonst Umrechnung (siehe prefillGrams).
 */
async function propose(i: RecipeIngredient, learned: Learned): Promise<RecipeIngredient> {
  if (!i.key) return i;
  let out = i;
  const knownId = learned.foods[learnedKey(i.key)];
  const known = knownId ? await getFood(knownId) : undefined;
  if (known) out = assignFood(i, known);
  else {
    const guess = suggestIngredientFood(await loadBls(), i.key);
    if (guess) out = { ...assignFood(i, guess), suggested: true };
  }
  return prefillGrams(out, learned);
}

/** Entwurf aus einem Koch-Wiki-Rezept (noch nicht gespeichert). */
export async function draftFromWiki(wiki: WikiRecipe): Promise<Recipe> {
  const learned = await getLearned();
  const ingredients = await Promise.all(wiki.ingredients.map((i) => propose(i, learned)));
  return withNutrition({
    id: newId(),
    source: 'kochwiki',
    sourceId: String(wiki.pageId),
    sourceUrl: wiki.url,
    sourceTitle: wiki.title,
    title: wiki.title,
    servings: wiki.servings ?? NaN,
    servingsNote: wiki.servingsNote,
    ingredients,
    instructions: wiki.instructions,
    tags: wiki.tags,
    diet: wiki.diet,
    nutritionComplete: false,
    perServing: {},
    updatedAt: 0,
  });
}

/** Kandidaten für Vorschläge: gespeicherte Rezepte (je Portion) und BLS-Gerichte (je 100 g, ohne Angabe zur Ernährungsweise). */
export async function listCandidates(): Promise<{ recipes: Candidate[]; dishes: Candidate[] }> {
  const recipes = (await listRecipes()).map<Candidate>((r) => ({
    id: r.id, title: r.title, kind: 'recipe', values: r.perServing, diet: r.diet, incomplete: !r.nutritionComplete,
  }));
  const dishes = listDishes(await loadBls()).map<Candidate>((f) => ({ id: f.id, title: f.name, kind: 'bls', values: f.per100 }));
  return { recipes, dishes };
}
