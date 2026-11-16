/**
 * Sicherungsdatei (Export/Import als JSON). Reine Logik ohne Browser-APIs.
 * Format: Kopfzeile mit Kennung und Versionsnummer, darunter alle Tabellen der lokalen Datenbank.
 * Die Versionsnummer zählt das Dateiformat, nicht das Dexie-Schema; bei einer inkompatiblen Änderung erhöhen.
 */

export const BACKUP_FORMAT = 'ernaehrung-backup';
export const BACKUP_VERSION = 1;

/** Schlüssel in `settings`, der beim Zusammenführen nicht überschrieben wird (gehört zum Gerät, nicht zu den Daten). */
export const DEVICE_SETTING_KEYS: readonly string[] = ['activeProfileId'];

export type BackupTables = Record<string, Record<string, unknown>[]>;

export interface Backup {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  tables: BackupTables;
}

export type ParsedBackup = { ok: true; backup: Backup; counts: Record<string, number> } | { ok: false; error: string };

export function makeBackup(tables: BackupTables, now = new Date()): Backup {
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: now.toISOString(), tables };
}

/** Dateiname der Sicherung, z. B. `ernaehrung-sicherung-2026-11-15.json` (lokales Datum). */
export function backupFileName(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `ernaehrung-sicherung-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.json`;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Liest und prüft eine Sicherungsdatei. `tableKeys` nennt je bekannter Tabelle das Schlüsselfeld
 * (`id`, bei `settings` `key`). Unbekannte Tabellen werden ignoriert. Geprüft wird nur die Form,
 * nicht der Inhalt der Datensätze.
 */
export function parseBackup(text: string, tableKeys: Record<string, string>): ParsedBackup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Die Datei ist keine gültige JSON-Datei.' };
  }
  if (!isRecord(data) || data.format !== BACKUP_FORMAT) {
    return { ok: false, error: 'Das ist keine Sicherungsdatei dieser App.' };
  }
  if (typeof data.version !== 'number' || !Number.isInteger(data.version) || data.version < 1) {
    return { ok: false, error: 'Die Versionsnummer der Sicherung fehlt oder ist ungültig.' };
  }
  if (data.version > BACKUP_VERSION) {
    return { ok: false, error: `Die Sicherung stammt aus einer neueren App-Version (Format ${data.version}, diese App kennt bis ${BACKUP_VERSION}). Bitte die App aktualisieren.` };
  }
  if (!isRecord(data.tables)) return { ok: false, error: 'In der Sicherung fehlen die Daten.' };

  const tables: BackupTables = {};
  const counts: Record<string, number> = {};
  for (const [name, keyField] of Object.entries(tableKeys)) {
    const rows = data.tables[name];
    if (rows === undefined) continue;
    if (!Array.isArray(rows)) return { ok: false, error: `Tabelle „${name}“ ist beschädigt.` };
    for (const row of rows) {
      if (!isRecord(row) || typeof row[keyField] !== 'string' || row[keyField] === '') {
        return { ok: false, error: `Tabelle „${name}“ enthält einen Eintrag ohne „${keyField}“.` };
      }
    }
    tables[name] = rows as Record<string, unknown>[];
    counts[name] = rows.length;
  }
  if (Object.keys(tables).length === 0) return { ok: false, error: 'Die Sicherung enthält keine bekannten Daten.' };
  const exportedAt = typeof data.exportedAt === 'string' ? data.exportedAt : '';
  return { ok: true, backup: { format: BACKUP_FORMAT, version: data.version, exportedAt, tables }, counts };
}

/** Beim Zusammenführen: Geräteeinstellungen der Sicherung weglassen. */
export function mergeRows(table: string, rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return table === 'settings' ? rows.filter((r) => !DEVICE_SETTING_KEYS.includes(r.key as string)) : rows;
}
