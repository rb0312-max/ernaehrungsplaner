/**
 * Einkaufslisten aus Rezepten, ohne Browser-APIs.
 * Zusammengefasst wird nur, was sich ohne Umrechnung zusammenzählen lässt:
 * - Zutaten mit Lebensmittel und Gramm: je Lebensmittel, Summe in Gramm.
 * - Alle anderen Zutaten (offen oder "nicht berechnen"): als Text mit Menge der Quelle; gleiche Schreibweise und
 *   gleiche Einheit werden addiert, verschiedene Einheiten bleiben getrennte Posten (keine Löffel-/Stück-Umrechnung).
 * Gewichte (mg, kg) werden in g umgerechnet (SI-Vorsätze, siehe ingredientLine.ts).
 */
import { formatNumber } from './foodDetail';
import { gramsOf, parseIngredientLine } from './ingredientLine';
import { ingredientState } from './recipe';
import type { Recipe, ShoppingItem, ShoppingList, ShoppingRecipe } from './types';

export interface ShoppingSource {
  recipe: Pick<Recipe, 'id' | 'title' | 'servings' | 'ingredients'>;
  /** Gewünschte Portionen; die Mengen werden mit Portionen / Portionen des Rezepts skaliert. */
  portions: number;
}

export const isValidPortions = (p: number | undefined): p is number => p !== undefined && Number.isFinite(p) && p > 0;

const norm = (s: string): string => s.replace(/\s+/g, ' ').trim().toLowerCase();

/** Posten einer Zutat, bereits auf die gewünschten Portionen skaliert. */
function itemOf(i: Recipe['ingredients'][number], factor: number, from: string): ShoppingItem | undefined {
  if (ingredientState(i) === 'mapped') {
    const name = i.foodName ?? i.name;
    return { id: `food:${i.foodId ?? norm(name)}`, name, foodId: i.foodId, grams: i.grams! * factor, from: [from], checked: false };
  }
  const text = i.name.replace(/\s+/g, ' ').trim();
  if (!text) return undefined;
  // Immer den aktuellen Text lesen: der Nutzer kann ihn im Editor geändert haben, dann wäre `amount` veraltet.
  const p = parseIngredientLine(text);
  let amount = p.amount;
  let unit = p.unit;
  let name = p.rest;
  if (amount === undefined || unit === undefined || !name) {
    amount = undefined;
    unit = undefined;
    name = text;
  } else {
    const g = gramsOf({ amount, unit });
    if (g !== undefined) {
      amount = g;
      unit = 'g';
    }
  }
  return {
    id: `text:${norm(name)}|${unit ?? ''}`,
    name,
    amount: amount === undefined ? undefined : amount * factor,
    unit,
    from: [from],
    checked: false,
  };
}

/** Fügt Posten in eine Liste ein; gleiche Posten werden addiert und wieder als offen markiert. Eigene Posten bleiben unverändert. */
export function mergeItems(existing: ShoppingItem[], added: ShoppingItem[]): ShoppingItem[] {
  const out = existing.map((i) => ({ ...i, from: i.from && [...i.from] }));
  for (const a of added) {
    const hit = out.find((i) => i.id === a.id);
    if (!hit) {
      out.push({ ...a, from: a.from && [...a.from] });
      continue;
    }
    if (a.grams !== undefined) hit.grams = (hit.grams ?? 0) + a.grams;
    if (a.amount !== undefined) hit.amount = (hit.amount ?? 0) + a.amount;
    hit.from = [...new Set([...(hit.from ?? []), ...(a.from ?? [])])];
    hit.checked = false;
  }
  return out;
}

/** Posten aller Rezepte, zusammengefasst und in `existing` eingefügt. Wirft bei ungültigen Portionen oder Rezepten ohne Portionenzahl. */
export function shoppingItemsFor(sources: ShoppingSource[], existing: ShoppingItem[] = []): ShoppingItem[] {
  let items = existing;
  for (const { recipe, portions } of sources) {
    if (!isValidPortions(portions)) throw new Error(`„${recipe.title}“: Portionen müssen eine Zahl größer 0 sein.`);
    if (!isValidPortions(recipe.servings)) throw new Error(`„${recipe.title}“ hat keine gültige Portionenzahl.`);
    const factor = portions / recipe.servings;
    const added = recipe.ingredients.flatMap((i) => itemOf(i, factor, recipe.title) ?? []);
    items = mergeItems(items, added);
  }
  return items;
}

export function shoppingRecipes(sources: ShoppingSource[]): ShoppingRecipe[] {
  return sources.map((s) => ({ id: s.recipe.id, title: s.recipe.title, portions: s.portions }));
}

/** "400 g", "1,25 kg", "3 EL"; bei Stück ohne Einheitswort nur die Zahl; undefined ohne Menge. */
export function itemQuantity(item: Pick<ShoppingItem, 'grams' | 'amount' | 'unit'>): string | undefined {
  if (item.grams !== undefined) return item.grams >= 1000 ? `${formatNumber(item.grams / 1000)} kg` : `${formatNumber(item.grams)} g`;
  if (item.amount === undefined) return undefined;
  if (item.unit === 'g' && item.amount >= 1000) return `${formatNumber(item.amount / 1000)} kg`;
  return item.unit && item.unit !== 'Stück' ? `${formatNumber(item.amount)} ${item.unit}` : formatNumber(item.amount);
}

export function itemLabel(item: Pick<ShoppingItem, 'name' | 'grams' | 'amount' | 'unit'>): string {
  return [itemQuantity(item), item.name].filter(Boolean).join(' ');
}

/** Offene Posten zuerst, erledigte am Ende; innerhalb davon bleibt die Reihenfolge. */
export function orderedItems(items: ShoppingItem[]): ShoppingItem[] {
  return [...items.filter((i) => !i.checked), ...items.filter((i) => i.checked)];
}

/** Text zum Teilen: Titel und alle noch nicht abgehakten Posten. */
export function shoppingText(list: Pick<ShoppingList, 'title' | 'items'>): string {
  const open = list.items.filter((i) => !i.checked);
  return [list.title, '', ...(open.length ? open.map((i) => `- ${itemLabel(i)}`) : ['(alles erledigt)'])].join('\n');
}

export function defaultListTitle(dateDe: string): string {
  return `Einkauf ${dateDe}`;
}
