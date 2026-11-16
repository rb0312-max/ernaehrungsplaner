/**
 * Reihenfolge von Suchtreffern: Favoriten zuerst, dann zuletzt verwendete (jüngste zuerst), dann der Rest.
 * Innerhalb einer Gruppe bleibt die Reihenfolge der Suche (Relevanz) erhalten.
 */
export const MAX_RECENT = 30;

export function rankByUse<T extends { id: string }>(foods: T[], favoriteIds: string[], recentIds: string[]): T[] {
  const fav = new Set(favoriteIds);
  const recent = new Map(recentIds.map((id, i) => [id, i]));
  const tier = (f: T) => (fav.has(f.id) ? 0 : recent.has(f.id) ? 1 : 2);
  return foods
    .map((f, i) => ({ f, i }))
    .sort((a, b) => {
      const ta = tier(a.f);
      const tb = tier(b.f);
      if (ta !== tb) return ta - tb;
      if (ta === 1) return recent.get(a.f.id)! - recent.get(b.f.id)!;
      return a.i - b.i;
    })
    .map((x) => x.f);
}

/** Setzt eine ID an den Anfang der Liste der zuletzt verwendeten (ohne Duplikat, begrenzt). */
export function pushRecent(recentIds: string[], id: string): string[] {
  return [id, ...recentIds.filter((x) => x !== id)].slice(0, MAX_RECENT);
}
