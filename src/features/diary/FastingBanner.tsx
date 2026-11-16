import { fastingForDate, windowStateAt } from '../../domain/fasting';
import type { Profile } from '../../domain/types';

/** Hinweis zum Fasten für den angezeigten Tag. `nowHhmm` nur für den heutigen Tag setzen (zeigt dann „jetzt offen/geschlossen“). */
export function FastingBanner({ fasting, date, nowHhmm }: { fasting: Profile['fasting']; date: string; nowHhmm?: string }) {
  const day = fastingForDate(fasting, date);
  if (day.kind === 'none') return null;

  if (day.kind === 'days') {
    if (day.fastDay) {
      return (
        <p className="notice" role="status">
          <strong>Fastentag</strong> (5:2). Die App ändert das Tagesziel an Fastentagen nicht; bei Bedarf das Ziel im Profil anpassen.
        </p>
      );
    }
    return (
      <p className="notice muted small">
        5:2: kein Fastentag.{day.fastDayLabels.length > 0 && ` Fastentage: ${day.fastDayLabels.join(', ')}.`}
      </p>
    );
  }

  if (!day.window) {
    return <p className="notice muted small">Fasten aktiv, aber kein Essensfenster eingetragen. Zeiten im Profil ergänzen.</p>;
  }
  const state = nowHhmm ? windowStateAt(day.window, nowHhmm) : undefined;
  return (
    <p className="notice" role="status">
      Essensfenster <strong>{day.window.start}–{day.window.end}</strong>
      {state && (state.open ? ` · jetzt offen, schließt um ${state.until}` : ` · jetzt geschlossen, öffnet um ${state.until}`)}
    </p>
  );
}
