/** Sicherung und Wiederherstellung der lokalen Datenbank (Format siehe domain/backup.ts). */
import { makeBackup, mergeRows, parseBackup, type Backup, type ParsedBackup } from '../domain/backup';
import { db } from './db';

/** Alle Tabellen als Sicherung. */
export async function createBackup(now = new Date()): Promise<Backup> {
  const tables: Record<string, Record<string, unknown>[]> = {};
  for (const t of db.tables) tables[t.name] = (await t.toArray()) as Record<string, unknown>[];
  return makeBackup(tables, now);
}

/** Schlüsselfeld je Tabelle, aus dem Dexie-Schema (`id`, bei `settings` `key`). */
function tableKeys(): Record<string, string> {
  return Object.fromEntries(db.tables.map((t) => [t.name, String(t.schema.primKey.keyPath)]));
}

export function readBackup(text: string): ParsedBackup {
  return parseBackup(text, tableKeys());
}

/**
 * Spielt eine Sicherung ein.
 * - `merge`: Einträge mit gleicher ID werden überschrieben, alles andere bleibt; das aktive Profil dieses Geräts bleibt.
 * - `replace`: alle lokalen Daten werden zuerst gelöscht, auch Tabellen, die in der Sicherung fehlen.
 * Alles in einer Transaktion: bei einem Fehler bleibt der alte Stand erhalten.
 */
export async function restoreBackup(backup: Backup, mode: 'merge' | 'replace'): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    for (const t of db.tables) {
      if (mode === 'replace') await t.clear();
      const rows = backup.tables[t.name];
      if (!rows) continue;
      await t.bulkPut(mode === 'merge' ? mergeRows(t.name, rows) : rows);
    }
  });
}
