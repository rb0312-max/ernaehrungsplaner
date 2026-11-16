import { useState } from 'react';
import { readBackup, restoreBackup } from '../../db/backupRepository';
import type { Backup } from '../../domain/backup';

const TABLE_LABELS: Record<string, string> = {
  profiles: 'Profile',
  foods: 'Lebensmittel',
  diary: 'Tagebucheinträge',
  weights: 'Gewichtswerte',
  recipes: 'Rezepte',
  shoppingLists: 'Einkaufslisten',
};

interface Loaded {
  backup: Backup;
  counts: Record<string, number>;
  name: string;
}

/**
 * Sicherungsdatei wählen, Inhalt anzeigen, dann einspielen.
 * `hasData` = auf dem Gerät gibt es schon Daten; dann wird zwischen Zusammenführen und Ersetzen gewählt.
 */
export function BackupImport({ hasData, onDone }: { hasData: boolean; onDone?: () => void }) {
  const [loaded, setLoaded] = useState<Loaded>();
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function pick(file: File | undefined) {
    setLoaded(undefined);
    setError('');
    setDone(false);
    if (!file) return;
    const parsed = readBackup(await file.text());
    if (!parsed.ok) return setError(parsed.error);
    setLoaded({ backup: parsed.backup, counts: parsed.counts, name: file.name });
  }

  async function run() {
    if (!loaded) return;
    const effective = hasData ? mode : 'replace';
    if (effective === 'replace' && hasData && !window.confirm('Alle Daten auf diesem Gerät werden gelöscht und durch die Sicherung ersetzt. Fortfahren?')) return;
    setBusy(true);
    setError('');
    try {
      await restoreBackup(loaded.backup, effective);
      setDone(true);
      setLoaded(undefined);
      onDone?.();
    } catch (e) {
      setError(`Einspielen fehlgeschlagen, die Daten auf dem Gerät sind unverändert: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="field">
        <label htmlFor="backup-file">Sicherungsdatei (.json)</label>
        <input id="backup-file" type="file" accept=".json,application/json" onChange={(e) => void pick(e.target.files?.[0])} />
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {done && <p className="note" role="status">Sicherung eingespielt.</p>}
      {loaded && (
        <div className="card">
          <p><strong>{loaded.name}</strong></p>
          {loaded.backup.exportedAt && <p className="muted small">Erstellt am {new Date(loaded.backup.exportedAt).toLocaleString('de-DE')}</p>}
          <ul className="forms">
            {Object.entries(loaded.counts).map(([t, n]) => (
              <li key={t}>{n} {TABLE_LABELS[t] ?? t}</li>
            ))}
          </ul>
          {hasData && (
            <fieldset>
              <legend>Auf diesem Gerät</legend>
              <label>
                <input type="radio" name="mode" checked={mode === 'merge'} onChange={() => setMode('merge')} />{' '}
                Zusammenführen: Einträge mit gleicher Kennung werden überschrieben, alles andere bleibt
              </label>
              <label>
                <input type="radio" name="mode" checked={mode === 'replace'} onChange={() => setMode('replace')} />{' '}
                Ersetzen: vorher alles löschen
              </label>
            </fieldset>
          )}
          <button type="button" className="btn primary" disabled={busy} onClick={() => void run()}>
            {busy ? 'Spiele ein …' : 'Einspielen'}
          </button>
        </div>
      )}
    </div>
  );
}
