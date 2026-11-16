import { describe, expect, it } from 'vitest';
import { daysBetween, formatDateDe, isIsoDate, shiftDate, toIsoDate, weekdayOf } from './dates';

describe('dates', () => {
  it('prüft Kalenderdaten', () => {
    expect(isIsoDate('2026-11-15')).toBe(true);
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('15.11.2026')).toBe(false);
  });
  it('verschiebt über Monats- und Jahresgrenzen sowie die Zeitumstellung', () => {
    expect(shiftDate('2026-11-30', 1)).toBe('2026-12-01');
    expect(shiftDate('2026-01-01', -1)).toBe('2025-12-31');
    expect(shiftDate('2026-03-28', 2)).toBe('2026-03-30');
    expect(shiftDate('2026-10-24', 2)).toBe('2026-10-26');
    expect(shiftDate('kaputt', 1)).toBe('kaputt');
  });
  it('Wochentag wie Date.getDay()', () => {
    expect(weekdayOf('2026-11-15')).toBe(0); // Sonntag
    expect(weekdayOf('2026-11-16')).toBe(1); // Montag
  });
  it('zählt Tage zwischen Daten', () => {
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2);
    expect(daysBetween('2026-11-15', '2026-11-10')).toBe(-5);
  });
  it('formatiert deutsch', () => {
    expect(formatDateDe('2026-11-15')).toBe('So, 15.11.2026');
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
