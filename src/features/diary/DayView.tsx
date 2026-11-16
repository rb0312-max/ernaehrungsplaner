import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { isoDate } from '../../db/db';
import { listDay } from '../../db/diaryRepository';
import { groupByMeal, summarize } from '../../domain/diary';
import { formatDateDe, isIsoDate, shiftDate } from '../../domain/dates';
import { formatNumber } from '../../domain/foodDetail';
import { targetsOf } from '../../domain/profile';
import { useActiveProfile } from '../profile/ProfileContext';
import { DaySummaryCard } from './DaySummaryCard';
import { useDiaryTarget } from './DiaryTarget';
import { EntryRow } from './EntryRow';
import { FastingBanner } from './FastingBanner';
import { WEIGHT_PATH, diaryDayPath } from './paths';

const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/** Tagesansicht: Datum wählen, Fasten-Hinweis, Summen gegen Ziele, Einträge je Mahlzeit. */
export function DayView() {
  const profile = useActiveProfile();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { setTarget } = useDiaryTarget();
  const today = isoDate();
  const requested = params.get('datum') ?? today;
  const date = isIsoDate(requested) ? requested : today;
  const entries = useLiveQuery(() => listDay(profile.id, date), [profile.id, date]);

  const go = (d: string) => navigate(diaryDayPath(d), { replace: true });
  const targets = targetsOf(profile);

  return (
    <section>
      <h1>Heute</h1>
      <p className="tabs">
        <span className="tab-on">Tagebuch</span>
        <Link to={WEIGHT_PATH}>Gewicht</Link>
      </p>

      <div className="datenav">
        <button type="button" className="btn" onClick={() => go(shiftDate(date, -1))} aria-label="Vorheriger Tag">‹</button>
        <div className="datecenter">
          <input type="date" value={date} onChange={(e) => isIsoDate(e.target.value) && go(e.target.value)} aria-label="Datum" />
          <span className="muted small">{date === today ? 'Heute, ' : ''}{formatDateDe(date)}</span>
        </div>
        <button type="button" className="btn" onClick={() => go(shiftDate(date, 1))} aria-label="Nächster Tag">›</button>
      </div>
      {date !== today && (
        <p><button type="button" className="link" onClick={() => go(today)}>Zu heute</button></p>
      )}

      <FastingBanner fasting={profile.fasting} date={date} nowHhmm={date === today ? hhmm(new Date()) : undefined} />

      {!entries ? (
        <p className="muted">Lädt …</p>
      ) : (
        <>
          <DaySummaryCard summary={summarize(entries)} targets={targets} />
          {groupByMeal(entries).map((g) => (
            <section key={g.slot} className="meal">
              <div className="row">
                <h2>{g.label}</h2>
                <span className="muted small">
                  {g.entries.length > 0 && (g.summary.missing.kcal === g.entries.length ? '– kcal' : `${formatNumber(g.summary.total.kcal)} kcal`)}
                </span>
              </div>
              {g.entries.length > 0 && (
                <ul className="list">
                  {g.entries.map((e) => <EntryRow key={e.id} entry={e} today={today} />)}
                </ul>
              )}
              {g.entries.length > 0 && g.summary.missing.kcal !== undefined && g.summary.missing.kcal < g.entries.length && (
                <p className="muted small">Energie bei {g.summary.missing.kcal} Eintrag/Einträgen unbekannt, nicht mitgezählt.</p>
              )}
              <div className="actions">
                <Link
                  to="/lebensmittel"
                  className="btn"
                  onClick={() => setTarget({ meal: g.slot, date })}
                >
                  + Hinzufügen
                </Link>
                <Link to="/rezepte" className="btn" onClick={() => setTarget({ meal: g.slot, date })}>
                  + Rezept
                </Link>
              </div>
            </section>
          ))}
          <p className="muted small">Hinzufügen über Suche, Barcode-Scan oder aus einem gespeicherten Rezept.</p>
        </>
      )}
    </section>
  );
}
