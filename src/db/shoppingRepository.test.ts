import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Recipe } from '../domain/types';
import { db } from './db';
import { deleteProfile } from './profileRepository';
import {
  addOwnItem, addRecipesToList, createShoppingList, deleteShoppingList, getShoppingList, listShoppingLists,
  removeCheckedItems, removeItem, setItemChecked,
} from './shoppingRepository';

const recipe = (id: string, servings: number, ingredients: Recipe['ingredients']): Recipe => ({
  id, source: 'custom', title: `Rezept ${id}`, servings, ingredients, instructions: '', tags: [], nutritionComplete: false, perServing: {}, updatedAt: 1,
});
const tomato = { name: '400 g Tomaten', foodId: 'bls:T', foodName: 'Tomate roh', per100: { kcal: 18 }, grams: 400 };

beforeEach(async () => {
  await Promise.all([db.recipes.clear(), db.shoppingLists.clear(), db.settings.clear(), db.diary.clear(), db.weights.clear(), db.profiles.clear()]);
  await db.recipes.bulkPut([recipe('a', 2, [tomato, { name: '2 EL Olivenöl' }]), recipe('b', 1, [{ ...tomato, grams: 100 }, { name: 'Salz', ignored: true }])]);
});

describe('shoppingRepository', () => {
  it('legt eine Liste aus Rezepten an, fasst zusammen und listet nach Datum, nur für das Profil', async () => {
    const l = await createShoppingList('p1', ' Wochenende ', [{ recipeId: 'a', portions: 4 }, { recipeId: 'b', portions: 1 }]);
    expect(l.title).toBe('Wochenende');
    expect(l.recipes).toEqual([{ id: 'a', title: 'Rezept a', portions: 4 }, { id: 'b', title: 'Rezept b', portions: 1 }]);
    expect(l.items.map((i) => [i.id, i.grams ?? i.amount])).toEqual([['food:bls:T', 900], ['text:olivenöl|EL', 4], ['text:salz|', undefined]]);
    await createShoppingList('p2', 'Andere', []);
    expect((await listShoppingLists('p1')).map((x) => x.id)).toEqual([l.id]);
    expect((await getShoppingList(l.id))?.items.length).toBe(3);
  });

  it('lehnt leeren Namen, ungültige Portionen und fehlende Rezepte ab, ohne etwas zu speichern', async () => {
    await expect(createShoppingList('p1', '  ', [])).rejects.toThrow(/Namen/);
    await expect(createShoppingList('p1', 'x', [{ recipeId: 'a', portions: 0 }])).rejects.toThrow(/Portionen/);
    await expect(createShoppingList('p1', 'x', [{ recipeId: 'zz', portions: 1 }])).rejects.toThrow(/nicht mehr/);
    expect(await db.shoppingLists.count()).toBe(0);
  });

  it('abhaken, eigene Posten, Entfernen, Erledigte entfernen', async () => {
    const { id } = await createShoppingList('p1', 'L', [{ recipeId: 'a', portions: 2 }]);
    await addOwnItem(id, ' Spülmittel ');
    await expect(addOwnItem(id, '  ')).rejects.toThrow(/Text/);
    let l = (await getShoppingList(id))!;
    expect(l.items.map((i) => i.name)).toEqual(['Tomate roh', 'Olivenöl', 'Spülmittel']);
    expect(l.items[2]).toMatchObject({ own: true, checked: false });
    await setItemChecked(id, 'food:bls:T', true);
    await setItemChecked(id, l.items[2].id, true);
    l = (await getShoppingList(id))!;
    expect(l.items.map((i) => i.checked)).toEqual([true, false, true]);
    await removeCheckedItems(id);
    expect((await getShoppingList(id))!.items.map((i) => i.name)).toEqual(['Olivenöl']);
    await removeItem(id, 'text:olivenöl|EL');
    expect((await getShoppingList(id))!.items).toEqual([]);
  });

  it('Rezepte nachträglich hinzufügen: addiert, öffnet abgehakte Posten wieder, ein Rezept nur einmal', async () => {
    const { id } = await createShoppingList('p1', 'L', [{ recipeId: 'a', portions: 2 }]);
    await setItemChecked(id, 'food:bls:T', true);
    await addRecipesToList(id, [{ recipeId: 'b', portions: 3 }]);
    const l = (await getShoppingList(id))!;
    expect(l.recipes.map((r) => r.id)).toEqual(['a', 'b']);
    expect(l.items.find((i) => i.id === 'food:bls:T')).toMatchObject({ grams: 700, checked: false });
    await expect(addRecipesToList(id, [{ recipeId: 'b', portions: 1 }])).rejects.toThrow(/schon auf der Liste/);
    expect((await getShoppingList(id))!.recipes.length).toBe(2);
  });

  it('Liste bleibt, wenn das Rezept gelöscht oder geändert wird', async () => {
    const { id } = await createShoppingList('p1', 'L', [{ recipeId: 'a', portions: 2 }]);
    await db.recipes.delete('a');
    expect((await getShoppingList(id))!.items.length).toBe(2);
  });

  it('Änderungen an einer gelöschten Liste werfen', async () => {
    const { id } = await createShoppingList('p1', 'L', []);
    await deleteShoppingList(id);
    await expect(setItemChecked(id, 'x', true)).rejects.toThrow(/gibt es nicht/);
  });

  it('Profil löschen entfernt seine Listen', async () => {
    await createShoppingList('p1', 'L', []);
    await createShoppingList('p2', 'M', []);
    await deleteProfile('p1');
    expect((await db.shoppingLists.toArray()).map((l) => l.profileId)).toEqual(['p2']);
  });
});
