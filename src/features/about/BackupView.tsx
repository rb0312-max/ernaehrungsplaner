import { useState } from 'react';
import { Link } from 'react-router-dom';
import { createBackup } from '../../db/backupRepository';
import { backupFileName } from '../../domain/backup';
import { BackupImport } from './BackupImport';

/** Datei im Browser zum Speichern anbieten. */
function download(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function BackupView() {
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  async function exportNow() {
    setError('');
    try {
      const now = new Date();
      const name = backupFileName(now);
      download(name, JSON.stringify(await createBackup(now)));
      setSaved(name);
    } catch (e) {
      setSaved('');
      setError(`Export fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return (
    <section>
      <p><Link to="/profil">← Profil</Link></p>
      <h1>Sicherung</h1>
      <p className="muted">
        Alle Daten liegen nur in diesem Browser auf diesem Gerät. Wird der Browser-Speicher gelöscht, sind sie weg. Die Sicherungsdatei ist
        auch der Weg auf ein anderes Gerät.
      </p>

      <h2>Exportieren</h2>
      <p className="muted small">Enthält alle Profile mit Tagebuch, Gewichtsverlauf, eigenen Lebensmitteln, Rezepten und Einstellungen. Die Datei ist nicht verschlüsselt und enthält Gesundheitsdaten.</p>
      <button type="button" className="btn primary" onClick={() => void exportNow()}>Sicherung herunterladen</button>
      {saved && <p className="note" role="status">Gespeichert als {saved}</p>}
      {error && <p className="error" role="alert">{error}</p>}

      <h2>Importieren</h2>
      <BackupImport hasData />
    </section>
  );
}
