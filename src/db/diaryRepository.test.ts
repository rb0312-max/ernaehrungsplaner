import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Food } from '../domain/types';
import { db } from './db';
import { addFoodEntry, copyEntryTo, diaryBetween, deleteEntry, deleteWeight, listDay, listWeights, saveWeight, updateEntry } from './diaryRepository';
import { listFavoritesAndRecent } from './foodRepository';
import { deleteProfile } from './profileRepository';

const food: Food = { id: 'custom:1', source: 'custom', name: 'Mein Müsli', per100: { kcal: 400, protein: 10 }, updatedAt: 1 };

beforeEach(async () => {
  await db.foods.clear();
  await db.diary.clear();
  await db.weights.clear();
  await db.settings.clear();
  await db.profiles.clear();
  await db.foods.put(food);
});

describe('diaryRepository', () => {
  it('trägt ein, liest je Profil und Tag, ändert und löscht', async () => {
    const e = await addFoodEntry('p1', food, 50, 'fruehstueck', '2026-11-15');
    await addFoodEntry('p1', food, 20, 'snack', '2026-11-16');
    await addFoodEntry('p2', food, 30, 'snack', '2026-11-15');
    expect((await listDay('p1', '2026-11-15')).map((x) => x.id)).toEqual([e.id]);
    await updateEntry(e.id, { grams: 75, meal: 'mittag' });
    expect((await listDay('p1', '2026-11-15'))[0]).toMatchObject({ grams: 75, meal: 'mittag', name: 'Mein Müsli' });
    await deleteEntry(e.id);
    expect(await listDay('p1', '2026-11-15')).toEqual([]);
  });

  it('merkt das Lebensmittel als zuletzt verwendet (PLAN.md, M1-Befund)', async () => {
    await addFoodEntry('p1', food, 50, 'snack', '2026-11-15');
    expect((await listFavoritesAndRecent('p1')).recent.map((f) => f.id)).toEqual(['custom:1']);
    expect((await listFavoritesAndRecent('p2')).recent).toEqual([]);
  });

  it('der Eintrag behält seine Werte, auch wenn das Lebensmittel geändert oder gelöscht wird', async () => {
    await addFoodEntry('p1', food, 100, 'snack', '2026-11-15');
    await db.foods.put({ ...food, per100: { kcal: 1 } });
    await db.foods.delete(food.id);
    expect((await listDay('p1', '2026-11-15'))[0].per100.kcal).toBe(400);
  });

  it('kopiert einen Eintrag auf einen anderen Tag', async () => {
    const e = await addFoodEntry('p1', food, 60, 'abend', '2026-11-15');
    const c = await copyEntryTo(e.id, '2026-11-16', 'mittag');
    expect(c).toMatchObject({ date: '2026-11-16', meal: 'mittag', grams: 60 });
    expect(c?.id).not.toBe(e.id);
    expect(await listDay('p1', '2026-11-15')).toHaveLength(1);
    expect(await listDay('p1', '2026-11-16')).toHaveLength(1);
    expect(await copyEntryTo('gibt-es-nicht', '2026-11-16', 'mittag')).toBeUndefined();
  });

  it('Gewicht: ein Eintrag je Tag, sortiert, pro Profil', async () => {
    await saveWeight('p1', '2026-11-10', 82);
    await saveWeight('p1', '2026-11-01', 84);
    await saveWeight('p1', '2026-11-10', 81.5);
    await saveWeight('p2', '2026-11-10', 60);
    const list = await listWeights('p1');
    expect(list.map((w) => [w.date, w.weightKg])).toEqual([['2026-11-01', 84], ['2026-11-10', 81.5]]);
    await deleteWeight(list[0].id);
    expect(await listWeights('p1')).toHaveLength(1);
  });

  it('Profil löschen entfernt Tagebuch und Gewicht', async () => {
    await addFoodEntry('p1', food, 50, 'snack', '2026-11-15');
    await saveWeight('p1', '2026-11-15', 80);
    await deleteProfile('p1');
    expect(await listDay('p1', '2026-11-15')).toEqual([]);
    expect(await listWeights('p1')).toEqual([]);
  });

  it('diaryBetween: nur das Profil, Grenzen inklusive', async () => {
    for (const d of ['2026-11-08', '2026-11-09', '2026-11-15', '2026-11-16']) await addFoodEntry('p1', food, 10, 'snack', d);
    await addFoodEntry('p2', food, 10, 'snack', '2026-11-12');
    expect((await diaryBetween('p1', '2026-11-09', '2026-11-15')).map((e) => e.date).sort()).toEqual(['2026-11-09', '2026-11-15']);
  });
});
