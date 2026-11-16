/**
 * Rezept-Logik ohne Browser-APIs: Nährwerte je Portion aus den Zutaten, Einordnung nach Makroverteilung,
 * Vorschläge, gemerkte Zuordnungen. Keine eigenen Nährwerte: alles wird aus den Lebensmitteln der Zutaten gerechnet.
 */
import { isValidGrams } from './diary';
import { gramsOf, isRangeMeasure } from './ingredientLine';
import { KCAL_PER_G, MACRO_PATTERNS } from './energy';
import { NUTRIENTS, scale, sum, type NutrientKey, type NutrientValues } from './nutrients';
import type { Food, FoodFilter, MacroPatternId, MacroSplit, Recipe, RecipeIngredient } from './types';
import { convertToGrams } from './unitConversion';

export type IngredientState = 'mapped' | 'ignored' | 'open';

/** mapped = Lebensmittel und Gramm vorhanden; ignored = bewusst nicht berechnet; open = es fehlt etwas. */
export function ingredientState(i: RecipeIngredient): IngredientState {
  if (i.ignored) return 'ignored';
  return i.per100 && isValidGrams(i.grams) ? 'mapped' : 'open';
}

export interface RecipeNutrition {
  /** Summe der zugeordneten Zutaten geteilt durch die Portionen. Nährstoffe ohne jede Angabe fehlen (unbekannt, nicht 0). */
  perServing: NutrientValues;
  /** Je Nährstoff: Anzahl zugeordneter Zutaten ohne Angabe; der Wert in `perServing` ist dann eine Untergrenze. */
  missing: Partial<Record<NutrientKey, number>>;
  mapped: number;
  open: number;
  ignored: number;
  /** Keine offene Zutat und mindestens eine zugeordnete. */
  complete: boolean;
  /** Gewicht der zugeordneten Zutaten je Portion in g (Rohgewicht laut Zutatenliste, ohne Garverlust). */
  gramsPerServing: number;
}

export function recipeNutrition(ingredients: RecipeIngredient[], servings: number): RecipeNutrition {
  const mapped = ingredients.filter((i) => ingredientState(i) === 'mapped');
  const open = ingredients.filter((i) => ingredientState(i) === 'open').length;
  const n = Number.isFinite(servings) && servings > 0 ? servings : NaN;
  const { total, missing } = sum(mapped.map((i) => scale(i.per100!, i.grams!)));
  const perServing: NutrientValues = {};
  for (const def of NUTRIENTS) {
    // Hat keine Zutat eine Angabe, bleibt der Nährstoff unbekannt.
    if ((missing[def.key] ?? 0) === mapped.length) continue;
    const v = (total[def.key] ?? 0) / n;
    if (Number.isFinite(v)) perServing[def.key] = v;
  }
  const grams = mapped.reduce((s, i) => s + i.grams!, 0);
  return {
    perServing,
    missing: mapped.length ? missing : {},
    mapped: mapped.length,
    open,
    ignored: ingredients.length - mapped.length - open,
    complete: open === 0 && mapped.length > 0,
    gramsPerServing: Number.isFinite(n) ? grams / n : NaN,
  };
}

/** Setzt die berechneten Felder eines Rezepts neu (vor dem Speichern aufrufen). */
export function withNutrition(recipe: Recipe): Recipe {
  const n = recipeNutrition(recipe.ingredients, recipe.servings);
  return { ...recipe, perServing: n.perServing, nutritionComplete: n.complete };
}

/**
 * Werte für einen Tagebucheintrag: je 100 g Rohgewicht und Gramm je Portion.
 * Nur bei vollständigem Rezept. Nährstoffe, die bei einer Zutat fehlen, werden weggelassen:
 * das Tagebuch führt sie dann als "ohne Angabe" statt eine zu kleine Zahl als vollständig zu zeigen.
 */
export function diaryValues(recipe: Pick<Recipe, 'ingredients' | 'servings'>): { per100: NutrientValues; gramsPerServing: number } | undefined {
  const n = recipeNutrition(recipe.ingredients, recipe.servings);
  if (!n.complete || !(n.gramsPerServing > 0)) return undefined;
  const per100: NutrientValues = {};
  for (const [k, v] of Object.entries(n.perServing) as [NutrientKey, number][]) {
    if (n.missing[k]) continue;
    per100[k] = (v / n.gramsPerServing) * 100;
  }
  return { per100, gramsPerServing: n.gramsPerServing };
}

/** Übernimmt ein Lebensmittel als Kopie in die Zutat. */
export function assignFood(i: RecipeIngredient, food: Pick<Food, 'id' | 'name' | 'per100'>): RecipeIngredient {
  return { ...i, foodId: food.id, foodName: food.name, per100: { ...food.per100 }, ignored: undefined };
}

export function clearFood(i: RecipeIngredient): RecipeIngredient {
  return { ...i, foodId: undefined, foodName: undefined, per100: undefined };
}

export interface RecipeErrors {
  title?: string;
  servings?: string;
  ingredients?: string;
}

export function validateRecipe(r: Pick<Recipe, 'title' | 'servings' | 'ingredients'>): RecipeErrors {
  const e: RecipeErrors = {};
  if (!r.title.trim()) e.title = 'Bitte einen Namen eingeben.';
  if (!Number.isFinite(r.servings) || r.servings <= 0) e.servings = 'Portionen: bitte eine Zahl größer 0 eingeben.';
  if (!r.ingredients.some((i) => i.name.trim())) e.ingredients = 'Mindestens eine Zutat eintragen.';
  return e;
}

/* ---------- Einordnung nach Makroverteilung ---------- */

/** Energieanteile von Protein, Fett und Kohlenhydraten in Prozent (Faktoren aus energy.ts); undefined, wenn ein Wert fehlt. */
export function macroShares(v: NutrientValues): MacroSplit | undefined {
  if (v.protein === undefined || v.fat === undefined || v.carbs === undefined) return undefined;
  const p = v.protein * KCAL_PER_G.protein;
  const f = v.fat * KCAL_PER_G.fat;
  const c = v.carbs * KCAL_PER_G.carbs;
  const total = p + f + c;
  if (!(total > 0)) return undefined;
  return { proteinPct: (p / total) * 100, fatPct: (f / total) * 100, carbsPct: (c / total) * 100 };
}

/** Abstand zweier Verteilungen in Prozentpunkten (0 = gleich, 100 = völlig verschieden). */
export function splitDistance(a: MacroSplit, b: MacroSplit): number {
  return (Math.abs(a.proteinPct - b.proteinPct) + Math.abs(a.fatPct - b.fatPct) + Math.abs(a.carbsPct - b.carbsPct)) / 2;
}

export type PatternId = Exclude<MacroPatternId, 'eigene'>;

/**
 * Ernährungsform, deren Verteilung (MACRO_PATTERNS in energy.ts) der des Rezepts am nächsten liegt.
 * Das ist ein Vergleich mit den Startwerten der App, keine offizielle Einstufung.
 */
export function nearestPattern(shares: MacroSplit): { id: PatternId; label: string; distance: number } {
  let best: { id: PatternId; label: string; distance: number } | undefined;
  for (const [id, p] of Object.entries(MACRO_PATTERNS) as [PatternId, (typeof MACRO_PATTERNS)[PatternId]][]) {
    const distance = splitDistance(shares, p.split);
    if (!best || distance < best.distance) best = { id, label: p.label, distance };
  }
  return best!;
}

/* ---------- Ernährungsweise ---------- */

const DIET_ACCEPTS: Record<FoodFilter, FoodFilter[]> = {
  omnivor: ['omnivor', 'pescetarisch', 'vegetarisch', 'vegan'],
  pescetarisch: ['pescetarisch', 'vegetarisch', 'vegan'],
  vegetarisch: ['vegetarisch', 'vegan'],
  vegan: ['vegan'],
};

/** Passt ein Rezept zur Ernährungsweise des Profils? undefined = Rezept ohne Angabe (nur bei omnivor egal). */
export function dietFits(profileFilter: FoodFilter, recipeDiet: FoodFilter | undefined): boolean | undefined {
  if (profileFilter === 'omnivor') return true;
  if (!recipeDiet) return undefined;
  return DIET_ACCEPTS[profileFilter].includes(recipeDiet);
}

/* ---------- Vorschläge ---------- */

/** Verteilung der noch offenen Makros des Tages; undefined, wenn nichts mehr offen ist. */
export function remainingSplit(targets: { proteinG: number; fatG: number; carbsG: number }, eaten: NutrientValues): MacroSplit | undefined {
  return macroShares({
    protein: Math.max(0, targets.proteinG - (eaten.protein ?? 0)),
    fat: Math.max(0, targets.fatG - (eaten.fat ?? 0)),
    carbs: Math.max(0, targets.carbsG - (eaten.carbs ?? 0)),
  });
}

export interface Candidate {
  id: string;
  title: string;
  kind: 'recipe' | 'bls';
  /** Je Portion (Rezept) bzw. je 100 g (BLS-Gericht). */
  values: NutrientValues;
  diet?: FoodFilter;
  /** Rezept mit offenen Zutaten: Werte sind unvollständig. */
  incomplete?: boolean;
}

export interface Suggestion extends Candidate {
  shares: MacroSplit;
  /** Abstand zur gewünschten Verteilung in Prozentpunkten; kleiner = passt besser. */
  distance: number;
  pattern: { id: PatternId; label: string };
  /** Nur Rezepte: eine Portion hat mehr kcal, als heute noch offen sind. */
  overKcal?: boolean;
  /** true = passt zur Ernährungsweise, undefined = keine Angabe. */
  dietOk: boolean | undefined;
}

export interface SuggestOptions {
  filter: FoodFilter;
  /** Gewünschte Verteilung: offene Makros des Tages oder die Verteilung des Profils. */
  target: MacroSplit;
  remainingKcal?: number;
  /** Auch Einträge ohne Angabe zur Ernährungsweise zeigen. */
  includeUnknownDiet?: boolean;
}

/** Sortiert nach Nähe zur gewünschten Makroverteilung. Einträge ohne Protein, Fett oder Kohlenhydrate entfallen. */
export function suggest(candidates: Candidate[], o: SuggestOptions): { items: Suggestion[]; hiddenUnknownDiet: number } {
  const items: Suggestion[] = [];
  let hiddenUnknownDiet = 0;
  for (const c of candidates) {
    const shares = macroShares(c.values);
    if (!shares) continue;
    const dietOk = dietFits(o.filter, c.diet);
    if (dietOk === false) continue;
    if (dietOk === undefined && !o.includeUnknownDiet) {
      hiddenUnknownDiet++;
      continue;
    }
    const { id, label } = nearestPattern(shares);
    items.push({
      ...c,
      shares,
      distance: splitDistance(shares, o.target),
      pattern: { id, label },
      overKcal: c.kind === 'recipe' && o.remainingKcal !== undefined && c.values.kcal !== undefined ? c.values.kcal > o.remainingKcal : undefined,
      dietOk,
    });
  }
  items.sort((a, b) => a.distance - b.distance || a.title.localeCompare(b.title, 'de'));
  return { items, hiddenUnknownDiet };
}

/* ---------- Gemerkte Zuordnungen ---------- */

/** Was der Nutzer beim Speichern von Rezepten zugeordnet hat; wird beim nächsten Import wieder vorgeschlagen. */
export interface Learned {
  /** Zutatenschlüssel (klein geschrieben) -> Lebensmittel. */
  foods: Record<string, string>;
  /** `<foodId>|<Einheit>` -> Gramm je Einheit, z. B. vom Nutzer eingetragene Gramm für "1 EL". */
  unitGrams: Record<string, number>;
}

export const EMPTY_LEARNED: Learned = { foods: {}, unitGrams: {} };
const WEIGHT_UNITS = new Set(['mg', 'g', 'kg']);
export const learnedKey = (key: string): string => key.trim().toLowerCase();
export const unitKey = (foodId: string, unit: string): string => `${foodId}|${unit}`;

/** Ergänzt die gemerkten Zuordnungen um die Zutaten eines gespeicherten Rezepts. */
export function learnFrom(learned: Learned, ingredients: RecipeIngredient[]): Learned {
  const foods = { ...learned.foods };
  const unitGrams = { ...learned.unitGrams };
  for (const i of ingredients) {
    if (ingredientState(i) !== 'mapped' || !i.foodId) continue;
    if (i.key) foods[learnedKey(i.key)] = i.foodId;
    // Unveränderte Umrechnungen sind kein Wert des Nutzers; sie werden beim nächsten Import neu gerechnet und gekennzeichnet.
    if (i.gramsOrigin === 'dichte' || i.gramsOrigin === 'usda' || i.gramsOrigin === 'kochwiki') continue;
    if (i.unit && !WEIGHT_UNITS.has(i.unit) && i.amount !== undefined && i.amount > 0) unitGrams[unitKey(i.foodId, i.unit)] = i.grams! / i.amount;
  }
  return { foods, unitGrams };
}

/**
 * Belegt fehlende Gramm vor. Reihenfolge: Gewichtsangabe der Quelle (steht schon in `grams`),
 * gemerkter Wert des Nutzers, Umrechnung (unitConversion.ts). Die Herkunft steht in `gramsOrigin`.
 */
export function prefillGrams(i: RecipeIngredient, learned: Learned): RecipeIngredient {
  if (i.grams !== undefined) return i;
  const known = learnedGrams(learned, i);
  if (known !== undefined) return { ...i, grams: known, gramsOrigin: 'gemerkt' };
  const c = convertToGrams(i);
  return c ? { ...i, grams: c.grams, gramsOrigin: c.origin, gramsNote: c.note } : i;
}

/** Gramm aus einer gemerkten Umrechnung des Nutzers; undefined, wenn es keine gibt. */
export function learnedGrams(learned: Learned, i: Pick<RecipeIngredient, 'foodId' | 'amount' | 'unit'>): number | undefined {
  if (!i.foodId || !i.unit || i.amount === undefined) return undefined;
  const perUnit = learned.unitGrams[unitKey(i.foodId, i.unit)];
  return perUnit === undefined ? undefined : perUnit * i.amount;
}

/** Hinweis unter dem Mengenfeld: woher vorbelegte Gramm stammen oder was noch fehlt. */
export function gramsHint(i: RecipeIngredient): string | undefined {
  if (!i.rawMeasure) return i.gramsOrigin === 'gemerkt' ? 'Vorbelegt mit dem gemerkten Wert aus einem früheren Rezept.' : undefined;
  const source = `Quelle: „${i.rawMeasure}“.`;
  switch (i.gramsOrigin) {
    case 'dichte':
      return `${source} ${i.gramsNote ?? 'Über die Dichte umgerechnet.'}`;
    case 'usda':
      return `${source} US-Daten, bitte prüfen: ${i.gramsNote ?? 'Portionsgewicht der USDA.'}`;
    case 'kochwiki':
      return `${source} Koch-Wiki, gerundet: ${i.gramsNote ?? 'Löffeltabelle des Koch-Wiki.'}`;
    case 'gemerkt':
      return `${source} Vorbelegt mit dem gemerkten Wert aus einem früheren Rezept.`;
    case 'quelle':
      return isRangeMeasure(i.rawMeasure) ? `${source} Vorbelegt ist der Mittelwert der Spanne.` : `Gewichtsangabe der Quelle: „${i.rawMeasure}“.`;
  }
  // Ohne Herkunft: vom Nutzer eingetragen oder geändert, oder vor Einführung der Herkunftsangabe gespeichert.
  if (gramsOf(i) !== undefined) return isRangeMeasure(i.rawMeasure) ? `${source} Die Quelle nennt eine Spanne.` : undefined;
  return i.grams === undefined ? `${source} Dafür gibt es keine Umrechnung, bitte Gramm eintragen (wiegen oder Packungsangabe).` : source;
}
