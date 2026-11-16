import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { isoDate } from '../../db/db';
import { deleteWeight, listWeights, saveWeight } from '../../db/diaryRepository';
import { saveProfile } from '../../db/profileRepository';
import { formatDateDe, isIsoDate } from '../../domain/dates';
import { formatNumber, } from '../../domain/foodDetail';
import { parseDecimal } from '../../domain/foodForm';
import { validateWeightKg, weightSummary } from '../../domain/weight';
import { useActiveProfile } from '../profile/ProfileContext';
import { DIARY_PATH } from './paths';
import { WeightChart } from './WeightChart';

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Gewichtsverlauf: Eintragen (ein Wert je Tag), Diagramm, Liste. */
export function WeightView() {
  const profile = useActiveProfile();
  const entries = useLiveQuery(() => listWeights(profile.id), [profile.id]);
  const [date, setDate] = useState(isoDate());
  const [kgText, setKgText] = useState('');
  const [error, setError] = useState<string>();
  const [info, setInfo] = useState<string>();

  const kg = parseDecimal(kgText);
  const kgError = kgText.trim() === '' ? undefined : validateWeightKg(kg);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setInfo(undefined);
    if (kg === undefined || validateWeightKg(kg) || !isIsoDate(date)) {
      setError(!isIsoDate(date) ? 'Datum prüfen.' : (validateWeightKg(kg) ?? undefined));
      return;
    }
    try {
      await saveWeight(profile.id, date, kg);
      setKgText('');
      setError(undefined);
    } catch (err) {
      setError(msg(err));
    }
  }

  const summary = entries ? weightSummary(entries) : undefined;
  const newest = entries?.[entries.length - 1];

  return (
    <section>
      <h1>Heute</h1>
      <p className="tabs">
        <Link to={DIARY_PATH}>Tagebuch</Link>
        <span className="tab-on">Gewicht</span>
      </p>

      <form onSubmit={(e) => void submit(e)} noValidate>
        <div className="split2">
          <label>
            Tag
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={!isIsoDate(date)} />
          </label>
          <label>
            Gewicht (kg)
            <input type="text" inputMode="decimal" value={kgText} onChange={(e) => setKgText(e.target.value)} aria-invalid={!!kgError} placeholder="z. B. 72,4" />
          </label>
        </div>
        {(error || kgError) && <p role="alert" className="error small">{error ?? kgError}</p>}
        <div className="actions">
          <button type="submit" className="btn primary" disabled={kg === undefined || !!kgError}>Eintragen</button>
        </div>
        <p className="muted small">Ein Wert je Tag; ein neuer Wert für denselben Tag ersetzt den alten.</p>
      </form>

      {!entries ? (
        <p className="muted">Lädt …</p>
      ) : entries.length === 0 ? (
        <p className="muted">Noch keine Gewichtswerte.</p>
      ) : (
        <>
          <WeightChart entries={entries} />
          {summary && summary.count > 1 && (
            <dl className="facts">
              <dt>Erster Wert</dt><dd>{formatNumber(summary.first.weightKg)} kg ({formatDateDe(summary.first.date)})</dd>
              <dt>Letzter Wert</dt><dd>{formatNumber(summary.last.weightKg)} kg ({formatDateDe(summary.last.date)})</dd>
              <dt>Änderung</dt><dd>{summary.change > 0 ? '+' : ''}{formatNumber(Math.round(summary.change * 10) / 10)} kg</dd>
              <dt>Niedrigster / höchster</dt><dd>{formatNumber(summary.min)} / {formatNumber(summary.max)} kg</dd>
            </dl>
          )}
          {newest && newest.weightKg !== profile.weightKg && (
            <div className="notice">
              <p className="small">
                Profilgewicht (Grundlage der Ziele): {formatNumber(profile.weightKg)} kg. Letzter Wert: {formatNumber(newest.weightKg)} kg.
              </p>
              <button
                type="button"
                className="btn small"
                onClick={() => void saveProfile({ ...profile, weightKg: newest.weightKg }).then(() => setInfo('Profilgewicht aktualisiert, die Ziele wurden neu berechnet.'))}
              >
                Als Profilgewicht übernehmen
              </button>
            </div>
          )}
          {info && <p role="status" className="muted small">{info}</p>}
          <h2>Verlauf</h2>
          <ul className="list">
            {[...entries].reverse().map((w) => (
              <li key={w.id}>
                <div className="row">
                  <span>{formatDateDe(w.date)}</span>
                  <span>
                    <strong>{formatNumber(w.weightKg)} kg</strong>{' '}
                    <button
                      type="button"
                      className="link"
                      onClick={() => window.confirm(`Wert vom ${formatDateDe(w.date)} löschen?`) && void deleteWeight(w.id)}
                    >
                      Löschen
                    </button>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
