/**
 * Lokale Datenhaltung (IndexedDB über Dexie). Alles bleibt auf dem Gerät.
 * Die BLS-Grunddaten liegen NICHT hier, sondern als statische Datei (siehe blsFoods.ts);
 * in `foods` stehen nur Open-Food-Facts-Produkte und eigene Lebensmittel.
 */
import Dexie, { type EntityTable } from 'dexie';
import { toIsoDate } from '../domain/dates';
import type { DiaryEntry, Food, Profile, Recipe, ShoppingList, WeightEntry } from '../domain/types';

export interface Setting {
  key: string;
  value: unknown;
}

export class AppDb extends Dexie {
  profiles!: EntityTable<Profile, 'id'>;
  foods!: EntityTable<Food, 'id'>;
  diary!: EntityTable<DiaryEntry, 'id'>;
  weights!: EntityTable<WeightEntry, 'id'>;
  recipes!: EntityTable<Recipe, 'id'>;
  shoppingLists!: EntityTable<ShoppingList, 'id'>;
  settings!: EntityTable<Setting, 'key'>;

  constructor(name = 'ernaehrung') {
    super(name);
    // Bei Schemaänderungen eine neue version(n) ergänzen, bestehende nicht ändern.
    this.version(1).stores({
      profiles: 'id',
      foods: 'id, source, barcode, name',
      diary: 'id, [profileId+date], profileId',
      weights: 'id, [profileId+date]',
      recipes: 'id, source, sourceId, *tags',
      shoppingLists: 'id, profileId',
      settings: 'key',
    });
  }
}

export const db = new AppDb();

export const newId = (): string => crypto.randomUUID();

/** Tagesdatum als YYYY-MM-DD in lokaler Zeit. */
export const isoDate = (d = new Date()): string => toIsoDate(d);

/** Favoriten und zuletzt verwendete Lebensmittel liegen pro Profil in `settings`. */
export const FAVORITES_PREFIX = 'favoriteFoodIds:';
export const RECENT_PREFIX = 'recentFoodIds:';
export const favoritesKey = (profileId: string): string => FAVORITES_PREFIX + profileId;
export const recentKey = (profileId: string): string => RECENT_PREFIX + profileId;

export async function getActiveProfileId(): Promise<string | undefined> {
  return (await db.settings.get('activeProfileId'))?.value as string | undefined;
}

export async function setActiveProfileId(id: string): Promise<void> {
  await db.settings.put({ key: 'activeProfileId', value: id });
}
