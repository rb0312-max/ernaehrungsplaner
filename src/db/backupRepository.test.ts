import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { createBackup, readBackup, restoreBackup } from './backupRepository';
import { newProfileDraft } from '../domain/profile';

const profile = (id: string) => ({ ...newProfileDraft(id, 1), name: id, birthYear: 1990, heightCm: 170, weightKg: 70 });

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe('Sicherung der Datenbank', () => {
  it('Export, Löschen, Import stellt alles wieder her', async () => {
    await db.profiles.put(profile('a'));
    await db.weights.put({ id: 'w1', profileId: 'a', date: '2026-11-15', weightKg: 70 });
    await db.settings.bulkPut([{ key: 'activeProfileId', value: 'a' }, { key: 'recipeLearned', value: { x: 1 } }]);
    const text = JSON.stringify(await createBackup());

    await Promise.all(db.tables.map((t) => t.clear()));
    const r = readBackup(text);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    await restoreBackup(r.backup, 'replace');
    expect(await db.profiles.count()).toBe(1);
    expect(await db.weights.get('w1')).toMatchObject({ weightKg: 70 });
    expect((await db.settings.get('activeProfileId'))?.value).toBe('a');
    expect((await db.settings.get('recipeLearned'))?.value).toEqual({ x: 1 });
  });

  it('Ersetzen löscht lokale Daten, auch in Tabellen, die in der Sicherung fehlen', async () => {
    await db.profiles.put(profile('neu'));
    const r = readBackup(JSON.stringify(await createBackup()));
    await db.profiles.put(profile('alt'));
    await db.weights.put({ id: 'w', profileId: 'alt', date: '2026-11-15', weightKg: 80 });
    if (!r.ok) throw new Error('Sicherung ungültig');
    await restoreBackup(r.backup, 'replace');
    expect((await db.profiles.toArray()).map((p) => p.id)).toEqual(['neu']);
    expect(await db.weights.count()).toBe(0);
  });

  it('Zusammenführen ergänzt, überschreibt gleiche IDs und behält das aktive Profil', async () => {
    await db.profiles.put(profile('a'));
    await db.settings.put({ key: 'activeProfileId', value: 'a' });
    const fremd = readBackup(JSON.stringify({
      format: 'ernaehrung-backup', version: 1, exportedAt: '',
      tables: { profiles: [{ ...profile('a'), weightKg: 99 }, profile('b')], settings: [{ key: 'activeProfileId', value: 'b' }] },
    }));
    if (!fremd.ok) throw new Error('Sicherung ungültig');
    await restoreBackup(fremd.backup, 'merge');
    expect((await db.profiles.toArray()).map((p) => p.id).sort()).toEqual(['a', 'b']);
    expect((await db.profiles.get('a'))?.weightKg).toBe(99);
    expect((await db.settings.get('activeProfileId'))?.value).toBe('a');
  });

  it('bei einem Fehler bleibt der alte Stand (Transaktion)', async () => {
    await db.profiles.put(profile('a'));
    const bad = { format: 'ernaehrung-backup' as const, version: 1, exportedAt: '', tables: { profiles: [{ id: {} }] } };
    await expect(restoreBackup(bad, 'replace')).rejects.toThrow();
    expect(await db.profiles.count()).toBe(1);
  });
});
