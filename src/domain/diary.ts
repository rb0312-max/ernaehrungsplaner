/**
 * Tagebuch-Logik ohne Browser-APIs: Einträge anlegen/kopieren, Mahlzeiten gruppieren, Tagessummen gegen Ziele.
 * Keine eigenen Nährwerte oder Formeln; Mengenumrechnung und Summen kommen aus nutrients.ts.
 */
import { scale, sum, type NutrientKey, type NutrientValues } from './nutrients';
import type { DiaryEntry, Food, MealSlot } from './types';

export const MEAL_SLOTS: { id: MealSlot; label: string }[] = [
  { id: 'fruehstueck', label: 'Frühstück' },
  { id: 'mittag', label: 'Mittagessen' },
  { id: 'abend', label: 'Abendessen' },
  { id: 'snack', label: 'Snacks' },
];

export const MEAL_LABEL: Record<MealSlot, string> = Object.fromEntries(MEAL_SLOTS.map((m) => [m.id, m.label])) as Record<MealSlot, string>;

export const isMealSlot = (s: unknown): s is MealSlot => MEAL_SLOTS.some((m) => m.id === s);

/** Menge muss eine Zahl größer 0 sein. */
export const isValidGrams = (g: number | undefined): g is number => g !== undefined && Number.isFinite(g) && g > 0;

/** Nährwerte eines Eintrags für seine Menge. */
export const entryAmounts = (e: Pick<DiaryEntry, 'per100' | 'grams'>): NutrientValues => scale(e.per100, e.grams);

interface NewEntry {
  id: string;
  profileId: string;
  date: string;
  meal: MealSlot;
  food: Pick<Food, 'id' | 'name' | 'per100'>;
  grams: number;
  now?: number;
}

/** Neuer Eintrag mit Kopie von Name und Nährwerten (alte Tage bleiben stabil, siehe PLAN.md). */
export function createEntry({ id, profileId, date, meal, food, grams, now = Date.now() }: NewEntry): DiaryEntry {
  return { id, profileId, date, meal, foodId: food.id, grams, name: food.name, per100: { ...food.per100 }, createdAt: now };
}

interface NewRecipeEntry {
  id: string;
  profileId: string;
  date: string;
  meal: MealSlot;
  recipe: { id: string; title: string };
  /** Werte je 100 g Rohgewicht und Gewicht der gegessenen Menge, siehe diaryValues() in recipe.ts. */
  per100: NutrientValues;
  grams: number;
  now?: number;
}

/** Eintrag aus einem Rezept; speichert wie bei Lebensmitteln eine Kopie der Werte. */
export function createRecipeEntry({ id, profileId, date, meal, recipe, per100, grams, now = Date.now() }: NewRecipeEntry): DiaryEntry {
  return { id, profileId, date, meal, recipeId: recipe.id, grams, name: recipe.title, per100: { ...per100 }, createdAt: now };
}

/** Kopie eines Eintrags an anderem Tag und/oder in anderer Mahlzeit; behält die gespeicherten Werte des Originals. */
export function copyEntry(e: DiaryEntry, to: { id: string; date: string; meal: MealSlot; now?: number }): DiaryEntry {
  return { ...e, per100: { ...e.per100 }, id: to.id, date: to.date, meal: to.meal, createdAt: to.now ?? Date.now() };
}

export interface DaySummary {
  /** Summe; unbekannte Werte zählen darin als 0. Ob sie vollständig ist, zeigt `missing`. */
  total: NutrientValues;
  /** Je Nährstoff: Anzahl Einträge ohne Angabe. */
  missing: Partial<Record<NutrientKey, number>>;
  count: number;
}

export function summarize(entries: DiaryEntry[]): DaySummary {
  const { total, missing } = sum(entries.map(entryAmounts));
  return { total, missing, count: entries.length };
}

/** Summe eines Nährstoffs; `undefined`, wenn kein Eintrag eine Angabe dazu hat (dann nicht 0 anzeigen). */
export function knownTotal(s: DaySummary, key: NutrientKey): number | undefined {
  if (s.count > 0 && (s.missing[key] ?? 0) === s.count) return undefined;
  return s.total[key] ?? 0;
}

export interface MealGroup {
  slot: MealSlot;
  label: string;
  entries: DiaryEntry[];
  summary: DaySummary;
}

/** Einträge je Mahlzeit in fester Reihenfolge (leere Mahlzeiten bleiben erhalten), innerhalb nach Anlegezeit. */
export function groupByMeal(entries: DiaryEntry[]): MealGroup[] {
  return MEAL_SLOTS.map(({ id, label }) => {
    const own = entries.filter((e) => e.meal === id).sort((a, b) => a.createdAt - b.createdAt);
    return { slot: id, label, entries: own, summary: summarize(own) };
  });
}

export interface Progress {
  /** Anteil am Ziel (1 = erreicht), nicht begrenzt. */
  ratio: number;
  /** Ziel minus Ist; negativ = über dem Ziel. */
  remaining: number;
}

export function progressOf(value: number, target: number): Progress | undefined {
  if (!Number.isFinite(target) || target <= 0) return undefined;
  return { ratio: value / target, remaining: target - value };
}
