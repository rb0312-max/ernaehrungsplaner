/** Kalenderdaten als YYYY-MM-DD in lokaler Zeit (ohne Zeitzonen-Umrechnung, Rechnung über 12:00 Uhr gegen Sommerzeit-Sprünge). */

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseIsoDate(s: string): Date | undefined {
  const m = ISO.exec(s);
  if (!m) return undefined;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d, 12);
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d ? date : undefined;
}

export const isIsoDate = (s: string): boolean => parseIsoDate(s) !== undefined;

export function toIsoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Verschiebt ein Datum um ganze Tage; ungültige Eingabe bleibt unverändert. */
export function shiftDate(s: string, days: number): string {
  const d = parseIsoDate(s);
  if (!d) return s;
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

/** Wochentag wie `Date.getDay()`: 0 = Sonntag ... 6 = Samstag. */
export function weekdayOf(s: string): number | undefined {
  return parseIsoDate(s)?.getDay();
}

/** Ganze Tage von `a` bis `b` (negativ, wenn `b` vor `a` liegt). */
export function daysBetween(a: string, b: string): number {
  const da = parseIsoDate(a);
  const db = parseIsoDate(b);
  if (!da || !db) return NaN;
  return Math.round((db.getTime() - da.getTime()) / 86_400_000);
}

const WEEKDAY_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

/** z. B. "Sa, 15.11.2026". */
export function formatDateDe(s: string): string {
  const d = parseIsoDate(s);
  if (!d) return s;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${WEEKDAY_SHORT[d.getDay()]}, ${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/** "15.11." für Achsenbeschriftungen. */
export function formatDayMonth(s: string): string {
  const d = parseIsoDate(s);
  if (!d) return s;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.`;
}
