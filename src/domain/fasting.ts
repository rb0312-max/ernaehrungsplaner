/**
 * Fasten-Anzeige für den Tracker: Essensfenster (16:8, 14:10, eigene Zeiten) und Fastentage (5:2).
 * Es gibt keine Kalorienvorgabe für Fastentage; das Tagesziel bleibt, wie im Profil eingestellt.
 */
import { weekdayOf } from './dates';
import { WEEKDAYS, eatingWindowEnd } from './profile';
import type { Profile } from './types';

type Fasting = Profile['fasting'];

export interface EatingWindow {
  start: string;
  end: string;
}

/** Essensfenster aus den Profil-Einstellungen; `undefined`, wenn keines gesetzt oder der Modus keins vorsieht. */
export function eatingWindowOf(f: Fasting): EatingWindow | undefined {
  if (f.mode !== '16:8' && f.mode !== '14:10' && f.mode !== 'eigene') return undefined;
  if (!f.eatingWindowStart) return undefined;
  const end = f.mode === 'eigene' ? f.eatingWindowEnd : (eatingWindowEnd(f.mode, f.eatingWindowStart) ?? f.eatingWindowEnd);
  return end ? { start: f.eatingWindowStart, end } : undefined;
}

/** "HH:MM" in Minuten seit Mitternacht. */
export function toMinutes(hhmm: string): number | undefined {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return undefined;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h < 24 && min < 60 ? h * 60 + min : undefined;
}

export interface WindowState {
  open: boolean;
  /** Zeitpunkt des nächsten Wechsels (Öffnen oder Schließen), HH:MM. */
  until: string;
}

/** Ist das Essensfenster zur Uhrzeit `nowHhmm` offen? Fenster über Mitternacht (Ende vor Beginn) werden unterstützt. */
export function windowStateAt(w: EatingWindow, nowHhmm: string): WindowState | undefined {
  const s = toMinutes(w.start);
  const e = toMinutes(w.end);
  const n = toMinutes(nowHhmm);
  if (s === undefined || e === undefined || n === undefined || s === e) return undefined;
  const open = s < e ? n >= s && n < e : n >= s || n < e;
  return { open, until: open ? w.end : w.start };
}

export type FastingDay =
  | { kind: 'none' }
  | { kind: 'window'; window?: EatingWindow }
  | { kind: 'days'; fastDay: boolean; fastDayLabels: string[] };

/** Fasten-Lage für einen Kalendertag. */
export function fastingForDate(f: Fasting, date: string): FastingDay {
  if (f.mode === 'keins') return { kind: 'none' };
  if (f.mode === '5:2') {
    const days = f.fastDays ?? [];
    const wd = weekdayOf(date);
    return {
      kind: 'days',
      fastDay: wd !== undefined && days.includes(wd),
      fastDayLabels: WEEKDAYS.filter((w) => days.includes(w.day)).map((w) => w.label),
    };
  }
  return { kind: 'window', window: eatingWindowOf(f) };
}
