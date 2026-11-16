import { describe, expect, it } from 'vitest';
import { BACKUP_VERSION, backupFileName, makeBackup, mergeRows, parseBackup } from './backup';

const KEYS = { profiles: 'id', diary: 'id', settings: 'key' };
const file = (over: Record<string, unknown> = {}) =>
  JSON.stringify({ format: 'ernaehrung-backup', version: 1, exportedAt: '2026-11-15T10:00:00.000Z', tables: { profiles: [{ id: 'a' }], settings: [{ key: 'k', value: 1 }] }, ...over });

describe('Sicherungsdatei', () => {
  it('Export und Import sind umkehrbar', () => {
    const b = makeBackup({ profiles: [{ id: 'a' }], diary: [] }, new Date('2026-11-15T10:00:00Z'));
    const r = parseBackup(JSON.stringify(b), KEYS);
    expect(r.ok && r.backup.tables).toEqual(b.tables);
    expect(r.ok && r.counts).toEqual({ profiles: 1, diary: 0 });
  });

  it('lehnt Fremdes ab', () => {
    expect(parseBackup('kein json', KEYS)).toMatchObject({ ok: false });
    expect(parseBackup('[]', KEYS)).toMatchObject({ ok: false });
    expect(parseBackup(file({ format: 'anders' }), KEYS)).toMatchObject({ ok: false });
  });

  it('lehnt neuere Formate ab, nennt die Versionen', () => {
    const r = parseBackup(file({ version: BACKUP_VERSION + 1 }), KEYS);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toContain('neueren');
    expect(parseBackup(file({ version: 0 }), KEYS)).toMatchObject({ ok: false });
    expect(parseBackup(file({ version: '1' }), KEYS)).toMatchObject({ ok: false });
  });

  it('prüft Tabellenform und Schlüsselfelder', () => {
    expect(parseBackup(file({ tables: { profiles: 'x' } }), KEYS)).toMatchObject({ ok: false });
    expect(parseBackup(file({ tables: { profiles: [{ name: 'ohne id' }] } }), KEYS)).toMatchObject({ ok: false });
    expect(parseBackup(file({ tables: { settings: [{ id: 'falsches Feld' }] } }), KEYS)).toMatchObject({ ok: false });
    expect(parseBackup(file({ tables: { profiles: [null] } }), KEYS)).toMatchObject({ ok: false });
  });

  it('ignoriert unbekannte Tabellen, verlangt aber mindestens eine bekannte', () => {
    const r = parseBackup(file({ tables: { profiles: [{ id: 'a' }], fremd: [1] } }), KEYS);
    expect(r.ok && Object.keys(r.backup.tables)).toEqual(['profiles']);
    expect(parseBackup(file({ tables: { fremd: [] } }), KEYS)).toMatchObject({ ok: false });
    expect(parseBackup(file({ tables: undefined }), KEYS)).toMatchObject({ ok: false });
  });

  it('Zusammenführen lässt das aktive Profil des Geräts unberührt', () => {
    const rows = [{ key: 'activeProfileId', value: 'x' }, { key: 'favoriteFoodIds:a', value: [] }];
    expect(mergeRows('settings', rows)).toEqual([rows[1]]);
    expect(mergeRows('profiles', [{ id: 'a' }])).toEqual([{ id: 'a' }]);
  });

  it('Dateiname mit lokalem Datum', () => {
    expect(backupFileName(new Date(2026, 10, 5))).toBe('ernaehrung-sicherung-2026-11-05.json');
  });
});
