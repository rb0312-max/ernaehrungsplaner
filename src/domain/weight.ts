/** Gewichtsverlauf: Prüfung, Kennzahlen und Geometrie des Diagramms. Keine Bewertung, nur Messwerte. */
import { daysBetween } from './dates';
import { LIMITS } from './profile';
import type { WeightEntry } from './types';

export function validateWeightKg(kg: number | undefined): string | undefined {
  const [lo, hi] = LIMITS.weightKg;
  if (kg === undefined || !Number.isFinite(kg) || kg < lo || kg > hi) return `Gewicht zwischen ${lo} und ${hi} kg eingeben.`;
  return undefined;
}

/** Aufsteigend nach Datum (ein Eintrag je Tag wird vom Repository sichergestellt). */
export const sortByDate = (entries: WeightEntry[]): WeightEntry[] => [...entries].sort((a, b) => a.date.localeCompare(b.date));

export interface WeightSummary {
  first: WeightEntry;
  last: WeightEntry;
  /** Letzter minus erster Wert in kg. */
  change: number;
  min: number;
  max: number;
  count: number;
}

export function weightSummary(entries: WeightEntry[]): WeightSummary | undefined {
  if (!entries.length) return undefined;
  const sorted = sortByDate(entries);
  const kgs = sorted.map((e) => e.weightKg);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  return { first, last, change: last.weightKg - first.weightKg, min: Math.min(...kgs), max: Math.max(...kgs), count: sorted.length };
}

export interface ChartPoint {
  x: number;
  y: number;
  entry: WeightEntry;
}

export interface ChartGeometry {
  points: ChartPoint[];
  minKg: number;
  maxKg: number;
}

/**
 * Punkte für ein Liniendiagramm in einem Rahmen `width` × `height` (SVG-Koordinaten, y nach unten) mit Innenabstand `pad`.
 * x folgt dem Datum (Abstand in Tagen), y der Spanne zwischen kleinstem und größtem Wert; bei nur einem Wert
 * oder gleichen Werten liegen die Punkte mittig.
 */
export function chartGeometry(entries: WeightEntry[], width: number, height: number, pad: number): ChartGeometry | undefined {
  if (!entries.length) return undefined;
  const sorted = sortByDate(entries);
  const kgs = sorted.map((e) => e.weightKg);
  const minKg = Math.min(...kgs);
  const maxKg = Math.max(...kgs);
  const spanDays = daysBetween(sorted[0].date, sorted[sorted.length - 1].date);
  const innerW = width - 2 * pad;
  const innerH = height - 2 * pad;
  const points = sorted.map((entry) => {
    const x = spanDays > 0 ? pad + (daysBetween(sorted[0].date, entry.date) / spanDays) * innerW : width / 2;
    const y = maxKg > minKg ? pad + (1 - (entry.weightKg - minKg) / (maxKg - minKg)) * innerH : height / 2;
    return { x, y, entry };
  });
  return { points, minKg, maxKg };
}
