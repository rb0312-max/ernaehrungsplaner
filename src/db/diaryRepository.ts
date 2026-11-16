/** Zugriff auf Tagebuch und Gewichtsverlauf eines Profils. */
import { copyEntry, createEntry, createRecipeEntry } from '../domain/diary';
import { diaryValues } from '../domain/recipe';
import type { DiaryEntry, Food, MealSlot, Recipe, WeightEntry } from '../domain/types';
import { sortByDate } from '../domain/weight';
import { db, newId } from './db';
import { markUsed } from './foodRepository';

export function listDay(profileId: string, date: string): Promise<DiaryEntry[]> {
  return db.diary.where('[profileId+date]').equals([profileId, date]).sortBy('createdAt');
}

/** Trägt ein Lebensmittel ein; speichert eine Kopie der Werte und merkt es als zuletzt verwendet. */
export async function addFoodEntry(profileId: string, food: Food, grams: number, meal: MealSlot, date: string): Promise<DiaryEntry> {
  const entry = createEntry({ id: newId(), profileId, date, meal, food, grams });
  await db.diary.put(entry);
  await markUsed(profileId, food.id);
  return entry;
}

/** Trägt Portionen eines Rezepts ein. Nur möglich, wenn keine Zutat offen ist (sonst wären die Werte unbemerkt zu niedrig). */
export async function addRecipeEntry(profileId: string, recipe: Recipe, servings: number, meal: MealSlot, date: string): Promise<DiaryEntry> {
  const values = diaryValues(recipe);
  if (!values) throw new Error('Das Rezept hat offene Zutaten. Erst alle Zutaten zuordnen oder als „nicht berechnen“ markieren.');
  if (!Number.isFinite(servings) || servings <= 0) throw new Error('Portionen: bitte eine Zahl größer 0 eingeben.');
  const entry = createRecipeEntry({ id: newId(), profileId, date, meal, recipe, per100: values.per100, grams: values.gramsPerServing * servings });
  await db.diary.put(entry);
  return entry;
}

export async function updateEntry(id: string, patch: { grams?: number; meal?: MealSlot }): Promise<void> {
  await db.diary.update(id, patch);
}

export async function deleteEntry(id: string): Promise<void> {
  await db.diary.delete(id);
}

/** Kopiert einen Eintrag an einen Tag und in eine Mahlzeit; gibt die Kopie zurück. */
export async function copyEntryTo(id: string, date: string, meal: MealSlot): Promise<DiaryEntry | undefined> {
  const original = await db.diary.get(id);
  if (!original) return undefined;
  const copy = copyEntry(original, { id: newId(), date, meal });
  await db.diary.put(copy);
  return copy;
}

export async function listWeights(profileId: string): Promise<WeightEntry[]> {
  return sortByDate(await db.weights.where('[profileId+date]').between([profileId, ''], [profileId, '￿']).toArray());
}

/** Ein Gewicht je Tag: ein vorhandener Eintrag desselben Tages wird ersetzt. */
export async function saveWeight(profileId: string, date: string, weightKg: number): Promise<void> {
  await db.transaction('rw', db.weights, async () => {
    const existing = await db.weights.where('[profileId+date]').equals([profileId, date]).first();
    await db.weights.put({ id: existing?.id ?? newId(), profileId, date, weightKg });
  });
}

export async function deleteWeight(id: string): Promise<void> {
  await db.weights.delete(id);
}

/** Einträge eines Profils von `from` bis `to` (beide inklusive, Format YYYY-MM-DD). Für Auswertungen über mehrere Tage. */
export function diaryBetween(profileId: string, from: string, to: string): Promise<DiaryEntry[]> {
  return db.diary.where('[profileId+date]').between([profileId, from], [profileId, to], true, true).toArray();
}
