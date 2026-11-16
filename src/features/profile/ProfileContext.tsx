import { createContext, useContext } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getActiveProfileId, listProfiles, setActiveProfileId } from '../../db/profileRepository';
import type { Profile } from '../../domain/types';

export interface ProfileState {
  profiles: Profile[];
  /** Aktives Profil; fällt auf das erste zurück, wenn das gespeicherte nicht mehr existiert. */
  active: Profile | undefined;
  setActive: (id: string) => Promise<void>;
}

export const ProfileContext = createContext<ProfileState | undefined>(undefined);

/** Lädt Profile und aktives Profil; `undefined`, solange die Datenbank liest. */
export function useProfileState(): ProfileState | undefined {
  const data = useLiveQuery(async () => ({ profiles: await listProfiles(), activeId: await getActiveProfileId() }));
  if (!data) return undefined;
  const active = data.profiles.find((p) => p.id === data.activeId) ?? data.profiles[0];
  return { profiles: data.profiles, active, setActive: setActiveProfileId };
}

/** Nur innerhalb der App nach der Ersteinrichtung verwenden: dann gibt es immer ein aktives Profil. */
export function useActiveProfile(): Profile {
  const ctx = useContext(ProfileContext);
  if (!ctx?.active) throw new Error('Kein aktives Profil');
  return ctx.active;
}

export function useProfiles(): ProfileState {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('ProfileContext fehlt');
  return ctx;
}
