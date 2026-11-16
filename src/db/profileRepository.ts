/** Zugriff auf Profile und das aktive Profil. */
import { db, favoritesKey, getActiveProfileId, recentKey, setActiveProfileId } from './db';
import type { Profile } from '../domain/types';

export async function listProfiles(): Promise<Profile[]> {
  return (await db.profiles.toArray()).sort((a, b) => a.createdAt - b.createdAt);
}

/** Speichert ein Profil (neu oder geändert). */
export async function saveProfile(p: Profile): Promise<void> {
  await db.profiles.put(p);
}

/** Legt ein neues Profil an und macht es zum aktiven. */
export async function createProfile(p: Profile): Promise<void> {
  await db.transaction('rw', db.profiles, db.settings, async () => {
    await db.profiles.put(p);
    await setActiveProfileId(p.id);
  });
}

/** Löscht ein Profil samt Tagebuch, Gewichtsverlauf, Einkaufslisten, Favoriten und Zuletzt-Liste. Rezepte und Lebensmittel gehören keinem Profil. */
export async function deleteProfile(id: string): Promise<void> {
  await db.transaction('rw', [db.profiles, db.diary, db.weights, db.shoppingLists, db.settings], async () => {
    await db.diary.where('profileId').equals(id).delete();
    await db.weights.where('[profileId+date]').between([id, ''], [id, '￿']).delete();
    await db.shoppingLists.where('profileId').equals(id).delete();
    await db.settings.bulkDelete([favoritesKey(id), recentKey(id)]);
    await db.profiles.delete(id);
    if ((await getActiveProfileId()) === id) await db.settings.delete('activeProfileId');
  });
}

export { getActiveProfileId, setActiveProfileId };
