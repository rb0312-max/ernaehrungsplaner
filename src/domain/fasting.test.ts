import { describe, expect, it } from 'vitest';
import { eatingWindowOf, fastingForDate, toMinutes, windowStateAt } from './fasting';

describe('Fasten', () => {
  it('Essensfenster: Ende aus dem Modus, bei eigenen Zeiten gespeichertes Ende', () => {
    expect(eatingWindowOf({ mode: '16:8', eatingWindowStart: '12:00' })).toEqual({ start: '12:00', end: '20:00' });
    expect(eatingWindowOf({ mode: '14:10', eatingWindowStart: '08:30' })).toEqual({ start: '08:30', end: '18:30' });
    expect(eatingWindowOf({ mode: 'eigene', eatingWindowStart: '11:00', eatingWindowEnd: '19:00' })).toEqual({ start: '11:00', end: '19:00' });
    expect(eatingWindowOf({ mode: 'eigene', eatingWindowStart: '11:00' })).toBeUndefined();
    expect(eatingWindowOf({ mode: '16:8' })).toBeUndefined();
    expect(eatingWindowOf({ mode: 'keins' })).toBeUndefined();
  });

  it('Fenster offen oder geschlossen, auch über Mitternacht', () => {
    const w = { start: '12:00', end: '20:00' };
    expect(windowStateAt(w, '11:59')).toEqual({ open: false, until: '12:00' });
    expect(windowStateAt(w, '12:00')).toEqual({ open: true, until: '20:00' });
    expect(windowStateAt(w, '20:00')).toEqual({ open: false, until: '12:00' });
    const night = { start: '18:00', end: '02:00' };
    expect(windowStateAt(night, '23:30')?.open).toBe(true);
    expect(windowStateAt(night, '01:00')?.open).toBe(true);
    expect(windowStateAt(night, '10:00')?.open).toBe(false);
    expect(windowStateAt({ start: '10:00', end: '10:00' }, '10:00')).toBeUndefined();
  });

  it('Uhrzeit nur im Format HH:MM', () => {
    expect(toMinutes('07:05')).toBe(425);
    expect(toMinutes('24:00')).toBeUndefined();
    expect(toMinutes('7:5')).toBeUndefined();
  });

  it('5:2: Fastentage nach Wochentag', () => {
    const f = { mode: '5:2' as const, fastDays: [1, 4] };
    expect(fastingForDate(f, '2026-11-16')).toEqual({ kind: 'days', fastDay: true, fastDayLabels: ['Mo', 'Do'] }); // Montag
    expect(fastingForDate(f, '2026-11-17')).toMatchObject({ kind: 'days', fastDay: false }); // Dienstag
    expect(fastingForDate(f, '2026-11-19')).toMatchObject({ fastDay: true }); // Donnerstag
  });

  it('ohne Fasten und mit Fenster', () => {
    expect(fastingForDate({ mode: 'keins' }, '2026-11-15')).toEqual({ kind: 'none' });
    expect(fastingForDate({ mode: '16:8', eatingWindowStart: '12:00' }, '2026-11-15')).toEqual({ kind: 'window', window: { start: '12:00', end: '20:00' } });
    expect(fastingForDate({ mode: '16:8' }, '2026-11-15')).toEqual({ kind: 'window', window: undefined });
  });
});
