/** Zugriff auf Einkaufslisten. Posten sind Kopien; ein späteres Ändern oder Löschen von Rezepten verändert die Liste nicht. */
import { shoppingItemsFor, shoppingRecipes, type ShoppingSource } from '../domain/shopping';
import type { ShoppingList } from '../domain/types';
import { db, newId } from './db';

export interface RecipePick {
  recipeId: string;
  portions: number;
}

export async function listShoppingLists(profileId: string): Promise<ShoppingList[]> {
  return (await db.shoppingLists.where('profileId').equals(profileId).toArray()).sort((a, b) => b.createdAt - a.createdAt);
}

export function getShoppingList(id: string): Promise<ShoppingList | undefined> {
  return db.shoppingLists.get(id);
}

async function sourcesOf(picks: RecipePick[]): Promise<ShoppingSource[]> {
  return Promise.all(
    picks.map(async (p) => {
      const recipe = await db.recipes.get(p.recipeId);
      if (!recipe) throw new Error('Ein gewähltes Rezept gibt es nicht mehr.');
      return { recipe, portions: p.portions };
    }),
  );
}

/** Legt eine Liste an (auch ohne Rezepte, nur für eigene Posten). */
export async function createShoppingList(profileId: string, title: string, picks: RecipePick[]): Promise<ShoppingList> {
  const name = title.trim();
  if (!name) throw new Error('Bitte einen Namen eingeben.');
  const sources = await sourcesOf(picks);
  const list: ShoppingList = {
    id: newId(),
    profileId,
    title: name,
    recipes: shoppingRecipes(sources),
    items: shoppingItemsFor(sources),
    createdAt: Date.now(),
  };
  await db.shoppingLists.put(list);
  return list;
}

/** Ändert eine Liste in einer Transaktion; wirft, wenn es sie nicht gibt. */
async function update(id: string, change: (l: ShoppingList) => ShoppingList): Promise<void> {
  await db.transaction('rw', db.shoppingLists, async () => {
    const list = await db.shoppingLists.get(id);
    if (!list) throw new Error('Diese Liste gibt es nicht (mehr).');
    await db.shoppingLists.put(change(list));
  });
}

/** Fügt Rezepte hinzu; Mengen gleicher Posten werden addiert (und der Posten wieder als offen markiert). Ein Rezept steht nur einmal auf der Liste. */
export async function addRecipesToList(id: string, picks: RecipePick[]): Promise<void> {
  const sources = await sourcesOf(picks);
  await update(id, (l) => {
    const dup = sources.find((s) => l.recipes.some((r) => r.id === s.recipe.id));
    if (dup) throw new Error(`„${dup.recipe.title}“ steht schon auf der Liste.`);
    return { ...l, recipes: [...l.recipes, ...shoppingRecipes(sources)], items: shoppingItemsFor(sources, l.items) };
  });
}

export function setItemChecked(id: string, itemId: string, checked: boolean): Promise<void> {
  return update(id, (l) => ({ ...l, items: l.items.map((i) => (i.id === itemId ? { ...i, checked } : i)) }));
}

export function removeItem(id: string, itemId: string): Promise<void> {
  return update(id, (l) => ({ ...l, items: l.items.filter((i) => i.id !== itemId) }));
}

export function removeCheckedItems(id: string): Promise<void> {
  return update(id, (l) => ({ ...l, items: l.items.filter((i) => !i.checked) }));
}

/** Eigener Posten, Text im Wortlaut (z. B. "Spülmittel"). */
export function addOwnItem(id: string, text: string): Promise<void> {
  const name = text.trim();
  if (!name) return Promise.reject(new Error('Bitte einen Text eingeben.'));
  return update(id, (l) => ({ ...l, items: [...l.items, { id: `own:${newId()}`, name, own: true, checked: false }] }));
}

export async function deleteShoppingList(id: string): Promise<void> {
  await db.shoppingLists.delete(id);
}
