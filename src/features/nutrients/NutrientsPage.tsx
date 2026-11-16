import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { diaryBetween } from '../../db/diaryRepository';
import { saveProfile } from '../../db/profileRepository';
import { formatDateDe, isIsoDate, shiftDate, toIsoDate } from '../../domain/dates';
import { formatNumber } from '../../domain/foodDetail';
import { computeIntake, overview, type OverviewRow } from '../../domain/intake';
import {
  REF_KIND_HELP,
  DGE_REFERENCE,
  REF_USAGE_NOTES,
  hasReference,
  resetAllReferenceOverrides,
  setReferenceOverride,
} from '../../domain/referenceValues';
import type { Profile } from '../../domain/types';
import { NumField } from '../../ui/NumField';
import { useActiveProfile } from '../profile/ProfileContext';

type Mode = 'tag' | 'woche';
const WEEK_DAYS = 7;

export function NutrientsPage() {
  const profile = useActiveProfile();
  const [mode, setMode] = useState<Mode>('woche');
  const [date, setDate] = useState(() => toIsoDate(new Date()));
  const from = mode === 'tag' ? date : shiftDate(date, -(WEEK_DAYS - 1));
  const entries = useLiveQuery(() => diaryBetween(profile.id, from, date), [profile.id, from, date]);
  const intake = entries ? computeIntake(entries, from, date) : undefined;
  const sections = intake ? overview(profile, intake) : [];
  const ownCount = Object.keys(profile.targetOverrides).filter(hasReference).length;
  const save = (p: Profile) => void saveProfile(p);

  return (
    <section>
      <h1>Vitamine und Mineralstoffe</h1>

      <div className="chips" role="group" aria-label="Zeitraum">
        {(
          [
            ['woche', 'Wochenschnitt'],
            ['tag', 'Tag'],
          ] as const
        ).map(([m, label]) => (
          <button key={m} type="button" className={mode === m ? 'chip on' : 'chip'} aria-pressed={mode === m} onClick={() => setMode(m)}>
            {label}
          </button>
        ))}
      </div>

      <div className="datebar">
        <button type="button" aria-label="Einen Tag zurück" onClick={() => setDate(shiftDate(date, -1))}>‹</button>
        <input type="date" aria-label="Datum" value={date} onChange={(e) => isIsoDate(e.target.value) && setDate(e.target.value)} />
        <button type="button" aria-label="Einen Tag vor" onClick={() => setDate(shiftDate(date, 1))}>›</button>
      </div>

      {intake && <Summary mode={mode} from={from} to={date} entryCount={intake.entryCount} trackedDays={intake.trackedDays} days={intake.days} />}

      {sections.map((s) => (
        <div key={s.group}>
          <h2>{s.label}</h2>
          <ul className="list">
            {s.rows.map((r) => (
              <li key={r.def.key}>
                <Row row={r} hasEntries={(intake?.entryCount ?? 0) > 0} profile={profile} onSave={save} />
              </li>
            ))}
          </ul>
        </div>
      ))}

      <h2>Einordnung</h2>
      <ul className="forms">
        {REF_USAGE_NOTES.map((n) => (
          <li key={n}>{n}</li>
        ))}
        <li>Referenzwerte sind keine individuellen Bedarfswerte und ersetzen keine ärztliche oder ernährungsmedizinische Beratung.</li>
      </ul>
      <dl className="legend">
        {(['Empfohlene Zufuhr', 'Schätzwert', 'Richtwert', 'Eigener Wert'] as const).map((k) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd className="muted small">{REF_KIND_HELP[k]}</dd>
          </div>
        ))}
      </dl>
      <p className="muted small">
        Quelle der Werte und Erläuterungen: DGE/ÖGE-Referenzwerte für die Nährstoffzufuhr, 3. Auflage, dge.de. Nur für Erwachsene ab 19 Jahren; Schwangere und Stillende sind nicht abgedeckt.
      </p>

      <h2>Angaben für Zink und Eisen</h2>
      <div className="field">
        <label htmlFor="phytate">Phytatzufuhr (Zink)</label>
        <select id="phytate" value={profile.phytate} onChange={(e) => save({ ...profile, phytate: e.target.value as Profile['phytate'] })}>
          <option value="niedrig">niedrig</option>
          <option value="mittel">mittel</option>
          <option value="hoch">hoch</option>
        </select>
        <div className="muted small">Die DGE nennt für Zink je nach Phytatzufuhr (niedrig, mittel, hoch) unterschiedliche Werte.</div>
      </div>
      {profile.sex === 'w' && (
        <div className="field">
          <label htmlFor="meno">Postmenopause (Eisen)</label>
          <select
            id="meno"
            value={profile.postmenopausal === undefined ? 'auto' : profile.postmenopausal ? 'ja' : 'nein'}
            onChange={(e) => {
              const { postmenopausal: _dropped, ...rest } = profile;
              save(e.target.value === 'auto' ? rest : { ...rest, postmenopausal: e.target.value === 'ja' });
            }}
          >
            <option value="auto">automatisch nach Alter (ab 51 Jahren ja)</option>
            <option value="ja">ja</option>
            <option value="nein">nein</option>
          </select>
          <div className="muted small">Die DGE unterscheidet bei Frauen vor und nach der Menopause.</div>
        </div>
      )}

      {ownCount > 0 && (
        <div className="actions">
          <button type="button" onClick={() => save(resetAllReferenceOverrides(profile))}>
            Alle eigenen Referenzwerte zurücksetzen ({ownCount})
          </button>
        </div>
      )}
    </section>
  );
}

function Summary(p: { mode: Mode; from: string; to: string; entryCount: number; trackedDays: number; days: number }) {
  if (p.entryCount === 0)
    return (
      <p className="note small" role="status">
        Keine Tagebucheinträge {p.mode === 'tag' ? `am ${formatDateDe(p.to)}` : `von ${formatDateDe(p.from)} bis ${formatDateDe(p.to)}`}. Gezeigt werden nur die Tagesmengen.
      </p>
    );
  return (
    <p className="muted small" role="status">
      {p.mode === 'tag'
        ? `${formatDateDe(p.to)}: ${p.entryCount} Einträge.`
        : `Durchschnitt je Tag mit Einträgen, ${formatDateDe(p.from)} bis ${formatDateDe(p.to)}: ${p.trackedDays} von ${p.days} Tagen erfasst, ${p.entryCount} Einträge. Tage ohne Eintrag zählen nicht mit.`}
    </p>
  );
}

function Row({ row, hasEntries, profile, onSave }: { row: OverviewRow; hasEntries: boolean; profile: Profile; onSave: (p: Profile) => void }) {
  const { def, ref, amount, missing, percent, aboveMax } = row;
  const [err, setErr] = useState<string>();
  const unit = def.unit;
  const num = (v: number) => `${formatNumber(v)} ${unit}`;
  const known = amount !== undefined;
  const bar = known ? Math.min(100, percent ?? 0) : 0;
  return (
    <details className="nrow">
      <summary>
        <div className="row">
          <strong>{def.label}</strong>
          <span className="badge">{ref.kind}</span>
        </div>
        {hasEntries && (
          <>
            <div className="nbar" role="progressbar" aria-label={`${def.label}: Anteil am Referenzwert`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={known ? Math.round(bar) : undefined}>
              <span style={{ width: `${bar}%` }} className={aboveMax ? 'over' : undefined} />
            </div>
            <div className="small">
              {known ? (
                <>
                  {missing > 0 && 'mind. '}
                  {num(amount)} von {num(ref.value)} ({missing > 0 && 'mind. '}{formatNumber(Math.round(percent ?? 0))} %)
                </>
              ) : (
                <span className="muted">Zufuhr unbekannt, bei keinem Eintrag angegeben · Ziel {num(ref.value)}</span>
              )}
            </div>
            {known && missing > 0 && <div className="small muted">{missing === 1 ? 'Bei 1 Eintrag fehlt' : `Bei ${missing} Einträgen fehlt`} die Angabe, die tatsächliche Zufuhr kann höher sein.</div>}
            {aboveMax && ref.max !== undefined && <div className="small error">Über der DGE-Obergrenze des Schätzwerts ({num(ref.max)}).</div>}
          </>
        )}
        {!hasEntries && <div className="small muted">Tagesmenge {num(ref.value)}{ref.max !== undefined ? ` (bis ${num(ref.max)})` : ''}</div>}
      </summary>

      <div className="detail">
        <dl className="facts">
          <dt>Referenzwert</dt>
          <dd>{num(ref.value)}</dd>
          {ref.overridden && (
            <>
              <dt>DGE-Wert ({DGE_REFERENCE[def.key]?.kind})</dt>
              <dd>{num(ref.dgeValue)}</dd>
            </>
          )}
          {ref.max !== undefined && (
            <>
              <dt>Obergrenze der DGE-Spanne</dt>
              <dd>{num(ref.max)}</dd>
            </>
          )}
        </dl>
        <p className="small">
          <strong>{ref.kind}.</strong> {REF_KIND_HELP[ref.kind]}
        </p>
        {ref.note && <p className="small">Hinweis der DGE: {ref.note}</p>}
        {def.forms && <p className="small">Formen und Bezugsgröße: {def.forms}</p>}
        <NumField
          label="Eigener Tageswert"
          unit={unit}
          value={profile.targetOverrides[def.key]}
          placeholder={`${formatNumber(ref.dgeValue)} (DGE)`}
          error={err}
          hint="Leer lassen = DGE-Wert."
          onChange={(v) => {
            if (v !== undefined && v <= 0) {
              setErr('Der Wert muss größer als 0 sein.');
              return;
            }
            setErr(undefined);
            onSave(setReferenceOverride(profile, def.key, v));
          }}
        />
        {ref.overridden && (
          <button type="button" className="link" onClick={() => { setErr(undefined); onSave(setReferenceOverride(profile, def.key, undefined)); }}>
            Auf DGE-Wert zurücksetzen ({num(ref.dgeValue)})
          </button>
        )}
      </div>
    </details>
  );
}
