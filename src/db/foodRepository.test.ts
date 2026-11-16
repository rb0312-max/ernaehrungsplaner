import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Food } from '../domain/types';
import { db } from './db';
import {
  deleteFood, findByBarcode, getFavoriteIds, getFood, listFavoritesAndRecent, markUsed, refreshFromOff, resolveBarcode, saveFood, searchLocal, toggleFavorite,
} from './foodRepository';

// loadBls() holt bls.json per fetch; im Test aus der Datei bedienen.
vi.stubGlobal('fetch', async () => new Response(readFileSync('public/data/bls.json', 'utf-8')));

/** Test-Profil. */
const P = 'p1';
const Q = 'p2';

const custom = (id: string, name: string, extra: Partial<Food> = {}): Food => ({
  id, source: 'custom', name, per100: { kcal: 100 }, updatedAt: 1, ...extra,
});

beforeEach(async () => {
  await db.foods.clear();
  await db.settings.clear();
});

describe('foodRepository', () => {
  it('speichert, findet per Barcode und löscht; BLS ist schreibgeschützt', async () => {
    await saveFood(custom('custom:1', 'Mein Müsli', { barcode: '4006381333931' }));
    expect((await findByBarcode('4006381333931'))?.name).toBe('Mein Müsli');
    expect((await getFood('custom:1'))?.name).toBe('Mein Müsli');
    const bls = await getFood('bls:C133000');
    await expect(saveFood(bls!)).rejects.toThrow();
    await deleteFood('custom:1');
    expect(await getFood('custom:1')).toBeUndefined();
  });

  it('Favoriten und zuletzt Verwendete kommen in der Suche zuerst', async () => {
    const plain = (await searchLocal('apfel', P)).map((f) => f.id);
    const last = plain[plain.length - 1];
    const second = plain[plain.length - 2];
    await toggleFavorite(P, last);
    await markUsed(P, second);
    const ranked = (await searchLocal('apfel', P)).map((f) => f.id);
    expect(ranked.slice(0, 2)).toEqual([last, second]);
  });

  it('Startansicht liefert Favoriten und zuletzt Verwendete ohne Doppelung', async () => {
    const [a, b] = (await searchLocal('apfel', P)).map((f) => f.id);
    await toggleFavorite(P, a);
    await markUsed(P, a);
    await markUsed(P, b);
    const { favorites, recent } = await listFavoritesAndRecent(P);
    expect(favorites.map((f) => f.id)).toEqual([a]);
    expect(recent.map((f) => f.id)).toEqual([b]);
  });

  it('Löschen entfernt auch Favoriten- und Zuletzt-Einträge', async () => {
    await saveFood(custom('custom:2', 'Testbrot'));
    await toggleFavorite(P, 'custom:2');
    await markUsed(P, 'custom:2');
    await deleteFood('custom:2');
    const { favorites, recent } = await listFavoritesAndRecent(P);
    expect(favorites).toEqual([]);
    expect(recent).toEqual([]);
  });

  it('Favoriten und Zuletzt-Liste gelten pro Profil', async () => {
    await saveFood(custom('custom:5', 'Testkäse'));
    await toggleFavorite(P, 'custom:5');
    await markUsed(P, 'custom:5');
    expect((await listFavoritesAndRecent(P)).favorites.map((f) => f.id)).toEqual(['custom:5']);
    expect(await listFavoritesAndRecent(Q)).toEqual({ favorites: [], recent: [] });
    // Löschen räumt die Listen aller Profile auf.
    await toggleFavorite(Q, 'custom:5');
    await deleteFood('custom:5');
    expect((await listFavoritesAndRecent(P)).favorites).toEqual([]);
    expect((await listFavoritesAndRecent(Q)).favorites).toEqual([]);
    expect(await getFavoriteIds(Q)).toEqual([]);
  });

  it('findet eigene Lebensmittel auch über Synonyme', async () => {
    await saveFood(custom('custom:3', 'Hühnerei Bio'));
    expect((await searchLocal('ei', P))[0].id).toBe('custom:3');
  });

  it('aktualisiert ein Open-Food-Facts-Produkt und behält die ID', async () => {
    const old: Food = { id: 'off:4006381333931', source: 'off', name: 'Alt', barcode: '4006381333931', per100: { kcal: 1 }, servingG: 30, updatedAt: 1 };
    await saveFood(old);
    const body = { status: 1, product: { code: '4006381333931', product_name: 'Neu', nutriments: { 'energy-kcal_100g': 250, proteins_100g: 7 } } };
    const fetchFn = (async () => new Response(JSON.stringify(body))) as unknown as typeof fetch;
    const res = await refreshFromOff(old, fetchFn);
    expect(res.status).toBe('updated');
    const stored = await getFood('off:4006381333931');
    expect(stored).toMatchObject({ name: 'Neu', per100: { kcal: 250, protein: 7 }, servingG: 30 });
  });

  it('meldet nicht gefundene Produkte und lehnt Nicht-OFF-Lebensmittel ab', async () => {
    const off: Food = { id: 'off:1', source: 'off', name: 'X', barcode: '1', per100: { kcal: 1 }, updatedAt: 1 };
    const notFound = (async () => new Response('{}', { status: 404 })) as unknown as typeof fetch;
    expect((await refreshFromOff(off, notFound)).status).toBe('not_found');
    await expect(refreshFromOff(custom('custom:9', 'Y'))).rejects.toThrow();
  });

  it('Barcode: lokal vor Online, Treffer wird gespeichert, sonst nicht gefunden/unvollständig', async () => {
    await saveFood(custom('custom:5', 'Lokal', { barcode: '73513537' }));
    const never = (async () => { throw new Error('darf nicht abgefragt werden'); }) as unknown as typeof fetch;
    expect((await resolveBarcode('73513537', never)).status).toBe('local');

    const hit = (async () => new Response(JSON.stringify({ status: 1, product: { code: '4006381333931', product_name: 'Stift', nutriments: { 'energy-kcal_100g': 10 } } }))) as unknown as typeof fetch;
    const r = await resolveBarcode('4006381333931', hit);
    expect(r.status).toBe('fetched');
    expect((await findByBarcode('4006381333931'))?.name).toBe('Stift');

    const miss = (async () => new Response(JSON.stringify({ status: 0 }))) as unknown as typeof fetch;
    expect((await resolveBarcode('036000291452', miss)).status).toBe('not_found');

    const incomplete = (async () => new Response(JSON.stringify({ status: 1, product: { code: '1', product_name: 'Ohne Werte', nutriments: {} } }))) as unknown as typeof fetch;
    expect(await resolveBarcode('1', incomplete)).toEqual({ status: 'incomplete', name: 'Ohne Werte' });

    const down = (async () => new Response('', { status: 503 })) as unknown as typeof fetch;
    await expect(resolveBarcode('2', down)).rejects.toThrow(/überlastet/);
  });

  it('Barcode: UPC-A wird wie bei Open Food Facts 13-stellig gesucht und gespeichert', async () => {
    let asked = '';
    const hit = (async (url: string) => {
      asked = url;
      return new Response(JSON.stringify({ status: 1, product: { code: '0036000291452', product_name: 'Erdnussbutter', nutriments: { 'energy-kcal_100g': 600 } } }));
    }) as unknown as typeof fetch;
    const r = await resolveBarcode('036000291452', hit);
    expect(asked).toContain('/0036000291452.json');
    expect(r.status).toBe('fetched');
    const never = (async () => { throw new Error('darf nicht abgefragt werden'); }) as unknown as typeof fetch;
    expect((await resolveBarcode('036000291452', never)).status).toBe('local');
  });
});
