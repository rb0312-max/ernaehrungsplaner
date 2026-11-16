import { describe, expect, it } from 'vitest';
import { itemLabel, itemQuantity, mergeItems, orderedItems, shoppingItemsFor, shoppingText } from './shopping';
import type { RecipeIngredient, ShoppingItem } from './types';

const mapped = (name: string, foodId: string, foodName: string, grams: number): RecipeIngredient => ({ name, foodId, foodName, per100: { kcal: 10 }, grams });
const recipe = (id: string, servings: number, ingredients: RecipeIngredient[]) => ({ id, title: `Rezept ${id}`, servings, ingredients });

describe('shoppingItemsFor', () => {
  it('fasst Zutaten mit gleichem Lebensmittel zusammen und skaliert auf die Portionen', () => {
    const a = recipe('a', 2, [mapped('400 g Tomaten', 'bls:T', 'Tomate roh', 400), mapped('1 Zwiebel', 'bls:Z', 'Zwiebel roh', 80)]);
    const b = recipe('b', 4, [mapped('200 g Tomaten', 'bls:T', 'Tomate roh', 200)]);
    const items = shoppingItemsFor([{ recipe: a, portions: 3 }, { recipe: b, portions: 2 }]);
    expect(items.map((i) => [i.id, i.name, i.grams, i.from])).toEqual([
      ['food:bls:T', 'Tomate roh', 400 * 1.5 + 100, ['Rezept a', 'Rezept b']],
      ['food:bls:Z', 'Zwiebel roh', 120, ['Rezept a']],
    ]);
  });

  it('übernimmt offene und nicht berechnete Zutaten als Text mit Menge der Quelle', () => {
    const r = recipe('a', 2, [
      { name: '2 EL Olivenöl', key: 'Olivenöl' },
      { name: 'Salz', ignored: true },
      { name: '1 Bund Petersilie' },
    ]);
    const items = shoppingItemsFor([{ recipe: r, portions: 4 }]);
    expect(items.map(itemLabel)).toEqual(['4 EL Olivenöl', 'Salz', '2 Bund Petersilie']);
    expect(items[1].amount).toBeUndefined();
  });

  it('addiert Textposten nur bei gleichem Namen und gleicher Einheit, ohne Umrechnung', () => {
    const a = recipe('a', 1, [{ name: '2 EL Olivenöl' }, { name: '1 TL Salz' }]);
    const b = recipe('b', 1, [{ name: '3 EL olivenöl' }, { name: '100 ml Olivenöl' }, { name: 'Salz' }]);
    const items = shoppingItemsFor([{ recipe: a, portions: 1 }, { recipe: b, portions: 1 }]);
    expect(items.map(itemLabel)).toEqual(['5 EL Olivenöl', '1 TL Salz', '100 ml Olivenöl', 'Salz']);
  });

  it('rechnet Gewichte in g um und addiert sie', () => {
    const a = recipe('a', 1, [{ name: '500 g Mehl' }]);
    const b = recipe('b', 1, [{ name: '1 kg Mehl' }, { name: '500 mg Hefe' }]);
    const items = shoppingItemsFor([{ recipe: a, portions: 1 }, { recipe: b, portions: 1 }]);
    expect(items.map((i) => [i.name, i.amount, i.unit])).toEqual([['Mehl', 1500, 'g'], ['Hefe', 0.5, 'g']]);
    expect(itemLabel(items[0])).toBe('1,5 kg Mehl');
  });

  it('liest den aktuellen Zutatentext, nicht eine veraltete Menge', () => {
    const r = recipe('a', 1, [{ name: '3 EL Öl', amount: 1, unit: 'TL', rawMeasure: '1 TL' }]);
    expect(shoppingItemsFor([{ recipe: r, portions: 1 }]).map(itemLabel)).toEqual(['3 EL Öl']);
  });

  it('Zeile ohne Namen nach der Menge bleibt ganz erhalten', () => {
    const r = recipe('a', 1, [{ name: '200 g' }, { name: '   ' }]);
    const items = shoppingItemsFor([{ recipe: r, portions: 1 }]);
    expect(items.map((i) => [i.name, i.amount])).toEqual([['200 g', undefined]]);
  });

  it('lehnt ungültige Portionen ab', () => {
    const r = recipe('a', 2, [{ name: 'Salz' }]);
    expect(() => shoppingItemsFor([{ recipe: r, portions: 0 }])).toThrow(/Portionen/);
    expect(() => shoppingItemsFor([{ recipe: r, portions: NaN }])).toThrow(/Portionen/);
    expect(() => shoppingItemsFor([{ recipe: { ...r, servings: NaN }, portions: 1 }])).toThrow(/Portionenzahl/);
  });
});

describe('mergeItems', () => {
  const item = (id: string, over: Partial<ShoppingItem> = {}): ShoppingItem => ({ id, name: id, checked: false, ...over });

  it('addiert, öffnet geänderte Posten wieder und lässt eigene und andere Posten unberührt', () => {
    const existing = [
      item('food:a', { grams: 100, checked: true, from: ['X'] }),
      item('food:b', { grams: 50, checked: true }),
      item('own:1', { own: true, checked: true }),
    ];
    const out = mergeItems(existing, [item('food:a', { grams: 20, from: ['Y'] }), item('food:c', { grams: 5 })]);
    expect(out.map((i) => [i.id, i.grams, i.checked])).toEqual([
      ['food:a', 120, false],
      ['food:b', 50, true],
      ['own:1', undefined, true],
      ['food:c', 5, false],
    ]);
    expect(out[0].from).toEqual(['X', 'Y']);
    // Eingabe bleibt unverändert.
    expect(existing[0]).toMatchObject({ grams: 100, checked: true, from: ['X'] });
  });
});

describe('Anzeige und Text', () => {
  it('Menge: g, kg, Einheit, Stück ohne Einheitswort, keine Menge', () => {
    expect(itemQuantity({ grams: 400 })).toBe('400 g');
    expect(itemQuantity({ grams: 1250 })).toBe('1,25 kg');
    expect(itemQuantity({ amount: 2, unit: 'Stück' })).toBe('2');
    expect(itemQuantity({ amount: 1.5, unit: 'EL' })).toBe('1,5 EL');
    expect(itemQuantity({})).toBeUndefined();
  });

  it('erledigte Posten stehen am Ende', () => {
    const items: ShoppingItem[] = [
      { id: '1', name: 'a', checked: true },
      { id: '2', name: 'b', checked: false },
      { id: '3', name: 'c', checked: true },
      { id: '4', name: 'd', checked: false },
    ];
    expect(orderedItems(items).map((i) => i.id)).toEqual(['2', '4', '1', '3']);
  });

  it('Text enthält nur offene Posten', () => {
    const items: ShoppingItem[] = [
      { id: '1', name: 'Tomate roh', grams: 550, checked: false },
      { id: '2', name: 'Salz', checked: true },
      { id: '3', name: 'Spülmittel', own: true, checked: false },
    ];
    expect(shoppingText({ title: 'Wochenende', items })).toBe('Wochenende\n\n- 550 g Tomate roh\n- Spülmittel');
    expect(shoppingText({ title: 'Leer', items: [{ ...items[1] }] })).toBe('Leer\n\n(alles erledigt)');
  });
});
