/** Einheitlicher Zugriff auf Lebensmittel aus allen Quellen (BLS, Open Food Facts, eigene). */
import { normalizeBarcode } from '../domain/barcode';
import { expandWord } from '../domain/synonyms';
import { pushRecent, rankByUse } from '../domain/foodRanking';
import type { Food } from '../domain/types';
import { fetchByBarcode } from '../services/openFoodFacts';
import { loadBls, normalize, searchBls } from './blsFoods';
import { FAVORITES_PREFIX, RECENT_PREFIX, db, favoritesKey, recentKey } from './db';

export async function getFood(id: string): Promise<Food | undefined> {
  if (id.startsWith('bls:')) return (await loadBls()).byId.get(id);
  return db.foods.get(id);
}

async function getIds(key: string): Promise<string[]> {
  const v = (await db.settings.get(key))?.value;
  return Array.isArray(v) ? (v as string[]) : [];
}

export const getFavoriteIds = (profileId: string) => getIds(favoritesKey(profileId));

/** Schaltet den Favoritenstatus um; gibt den neuen Status zurück. */
export async function toggleFavorite(profileId: string, id: string): Promise<boolean> {
  const key = favoritesKey(profileId);
  const ids = await getIds(key);
  const isFav = ids.includes(id);
  await db.settings.put({ key, value: isFav ? ids.filter((x) => x !== id) : [id, ...ids] });
  return !isFav;
}

/** Merkt ein Lebensmittel als zuletzt verwendet (Detailansicht geöffnet, gespeichert; später auch Tagebucheintrag). */
export async function markUsed(profileId: string, id: string): Promise<void> {
  const key = recentKey(profileId);
  await db.settings.put({ key, value: pushRecent(await getIds(key), id) });
}

async function resolve(ids: string[]): Promise<Food[]> {
  const foods = await Promise.all(ids.map(getFood));
  return foods.filter((f): f is Food => f !== undefined);
}

/** Favoriten und zuletzt verwendete Lebensmittel für die Startansicht ohne Suchbegriff. */
export async function listFavoritesAndRecent(profileId: string): Promise<{ favorites: Food[]; recent: Food[] }> {
  const [favIds, recentIds] = await Promise.all([getIds(favoritesKey(profileId)), getIds(recentKey(profileId))]);
  const favorites = await resolve(favIds);
  const favSet = new Set(favIds);
  const recent = await resolve(recentIds.filter((id) => !favSet.has(id)));
  return { favorites, recent };
}

/** Sucht lokal in eigenen/gespeicherten Produkten und im BLS; Favoriten und zuletzt Verwendete zuerst. */
export async function searchLocal(query: string, profileId: string, limit = 50): Promise<Food[]> {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const variants = words.map((w) => [w, ...expandWord(w)]);
  const own = (await db.foods.toArray()).filter((f) => {
    const h = normalize(`${f.name} ${f.brand ?? ''}`);
    return variants.every((alts) => alts.some((w) => h.includes(w)));
  });
  // Mehr Treffer holen als angezeigt, damit Favoriten aus tieferen Rängen noch nach vorn kommen.
  const bls = searchBls(await loadBls(), query, 500);
  const [favIds, recentIds] = await Promise.all([getIds(favoritesKey(profileId)), getIds(recentKey(profileId))]);
  return rankByUse([...own, ...bls], favIds, recentIds).slice(0, limit);
}

/** Speichert ein eigenes Lebensmittel oder ein Open-Food-Facts-Produkt (z. B. nach dem Scan). */
export async function saveFood(food: Food): Promise<void> {
  if (food.source === 'bls') throw new Error('BLS-Lebensmittel sind schreibgeschützt; als eigenes Lebensmittel kopieren.');
  await db.foods.put({ ...food, updatedAt: Date.now() });
}

/** Löscht ein gespeichertes Lebensmittel samt Favoriten-/Zuletzt-Einträgen aller Profile. Tagebucheinträge behalten ihre Kopie der Werte. */
export async function deleteFood(id: string): Promise<void> {
  await db.transaction('rw', db.foods, db.settings, async () => {
    await db.foods.delete(id);
    const rows = await db.settings.filter((r) => r.key.startsWith(FAVORITES_PREFIX) || r.key.startsWith(RECENT_PREFIX)).toArray();
    for (const { key, value } of rows) {
      const ids = Array.isArray(value) ? (value as string[]) : [];
      if (ids.includes(id)) await db.settings.put({ key, value: ids.filter((x) => x !== id) });
    }
  });
}

export async function findByBarcode(barcode: string): Promise<Food | undefined> {
  return db.foods.where('barcode').equals(barcode).first();
}

export type RefreshResult = { status: 'updated'; food: Food } | { status: 'not_found' } | { status: 'incomplete' };

/** Holt die aktuellen Werte eines gespeicherten Open-Food-Facts-Produkts neu und überschreibt die lokale Kopie. */
export async function refreshFromOff(food: Food, fetchFn?: typeof fetch): Promise<RefreshResult> {
  if (food.source !== 'off' || !food.barcode) throw new Error('Nur Open-Food-Facts-Produkte lassen sich aktualisieren.');
  const res = await fetchByBarcode(food.barcode, fetchFn);
  if (res.status === 'not_found') return { status: 'not_found' };
  if (res.status === 'incomplete') return { status: 'incomplete' };
  const updated: Food = { ...res.food, id: food.id, servingG: res.food.servingG ?? food.servingG };
  await saveFood(updated);
  return { status: 'updated', food: { ...updated, updatedAt: Date.now() } };
}

export type BarcodeLookup =
  | { status: 'local' | 'fetched'; food: Food }
  | { status: 'not_found' }
  | { status: 'incomplete'; name?: string };

/**
 * Barcode auflösen: zuerst lokal gespeichert, sonst Open Food Facts (Treffer wird gespeichert).
 * Netzwerk- und Serverfehler werden als Error geworfen, damit die Oberfläche erneut versuchen kann.
 */
export async function resolveBarcode(input: string, fetchFn?: typeof fetch): Promise<BarcodeLookup> {
  const barcode = normalizeBarcode(input);
  const local = await findByBarcode(barcode);
  if (local) return { status: 'local', food: local };
  const res = await fetchByBarcode(barcode, fetchFn);
  if (res.status !== 'found') return res;
  await saveFood(res.food);
  return { status: 'fetched', food: res.food };
}
