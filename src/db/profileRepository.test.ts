import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, favoritesKey, recentKey } from './db';
import { createProfile, deleteProfile, getActiveProfileId, listProfiles, saveProfile } from './profileRepository';
import { newProfileDraft } from '../domain/profile';

const make = (id: string, createdAt: number) => ({ ...newProfileDraft(id, createdAt), name: id, birthYear: 1990, heightCm: 170, weightKg: 70 });

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe('Profile', () => {
  it('anlegen macht das Profil aktiv, Liste nach Anlagezeit', async () => {
    await createProfile(make('b', 2));
    await createProfile(make('a', 1));
    expect((await listProfiles()).map((p) => p.id)).toEqual(['a', 'b']);
    expect(await getActiveProfileId()).toBe('a');
  });

  it('ändern', async () => {
    await createProfile(make('a', 1));
    await saveProfile({ ...make('a', 1), weightKg: 72 });
    expect((await listProfiles())[0].weightKg).toBe(72);
  });

  it('löschen entfernt Profildaten, nicht die anderer Profile', async () => {
    await createProfile(make('a', 1));
    await createProfile(make('b', 2));
    await db.diary.bulkPut([
      { id: 'd1', profileId: 'a', date: '2026-11-15', meal: 'mittag', grams: 100, name: 'x', per100: {}, createdAt: 0 },
      { id: 'd2', profileId: 'b', date: '2026-11-15', meal: 'mittag', grams: 100, name: 'x', per100: {}, createdAt: 0 },
    ]);
    await db.weights.bulkPut([
      { id: 'w1', profileId: 'a', date: '2026-11-15', weightKg: 70 },
      { id: 'w2', profileId: 'b', date: '2026-11-15', weightKg: 80 },
    ]);
    await db.settings.bulkPut([
      { key: favoritesKey('a'), value: ['x'] },
      { key: favoritesKey('b'), value: ['x'] },
      { key: recentKey('b'), value: ['x'] },
    ]);
    await deleteProfile('b');
    expect((await db.settings.toArray()).map((r) => r.key).filter((k) => k.endsWith(':a') || k.endsWith(':b'))).toEqual([favoritesKey('a')]);
    expect((await db.diary.toArray()).map((d) => d.id)).toEqual(['d1']);
    expect((await db.weights.toArray()).map((w) => w.id)).toEqual(['w1']);
    expect(await getActiveProfileId()).toBeUndefined();
  });
});
