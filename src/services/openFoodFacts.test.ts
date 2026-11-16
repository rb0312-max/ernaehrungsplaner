import { describe, expect, it } from 'vitest';
import { fetchByBarcode, mapOffProduct, searchProducts } from './openFoodFacts';

describe('Open Food Facts', () => {
  it('bildet ein Produkt ab und rechnet Einheiten um', () => {
    const food = mapOffProduct({
      code: '123', product_name: 'Testriegel', brands: 'Marke A, Marke B', serving_quantity: '25',
      nutriments: {
        'energy-kcal_100g': 539, proteins_100g: 6.3, fat_100g: 30.9, carbohydrates_100g: 57.5, sugars_100g: 0,
        sodium_100g: 0.044, 'vitamin-c_100g': 0.012, iron_100g: 0,
      },
    });
    expect(food).toMatchObject({ id: 'off:123', source: 'off', name: 'Testriegel', brand: 'Marke A', servingG: 25 });
    expect(food?.per100.kcal).toBe(539);
    expect(food?.per100.sugar).toBe(0); // Pflichtangabe: 0 ist ein echter Wert
    expect(food?.per100.sodium).toBeCloseTo(44);
    expect(food?.per100.vitC).toBeCloseTo(12);
    expect(food?.per100.iron).toBeUndefined(); // 0 bei Mikronährstoffen = unbekannt
  });

  it('verwirft Produkte ohne Namen oder Energie', () => {
    expect(mapOffProduct({ code: '1', product_name: 'X', nutriments: {} })).toBeUndefined();
    expect(mapOffProduct({ code: '1', nutriments: { 'energy-kcal_100g': 100 } })).toBeUndefined();
  });

  it('übersetzt Netzwerkfehler und Drosselung in verständliche Meldungen', async () => {
    const offline = (async () => { throw new TypeError('Failed to fetch'); }) as unknown as typeof fetch;
    await expect(searchProducts('x', offline)).rejects.toThrow(/nicht erreichbar/);
    await expect(fetchByBarcode('4006381333931', offline)).rejects.toThrow(/nicht erreichbar/);
    const busy = (async () => new Response('', { status: 429 })) as unknown as typeof fetch;
    await expect(searchProducts('x', busy)).rejects.toThrow(/überlastet/);
  });
});
