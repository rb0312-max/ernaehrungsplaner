/**
 * Zufuhr aus dem Tagebuch (Tag oder Durchschnitt mehrerer Tage) im Vergleich zu den Referenzwerten.
 * Regeln: Fehlender Nährwert = unbekannt, nie 0. Ein Nährstoff ohne Angabe in allen Einträgen bleibt unbekannt;
 * fehlt er nur bei einem Teil der Einträge, ist die Summe ein Mindestwert (`missing` > 0).
 */
import { daysBetween } from './dates';
import { GROUP_LABELS } from './foodDetail';
import { NUTRIENTS, scale, sum, type NutrientDef, type NutrientGroup, type NutrientKey } from './nutrients';
import { allReferences, type Reference } from './referenceValues';
import type { DiaryEntry, Profile } from './types';

export interface NutrientIntake {
  /** Mittlere Menge je erfasstem Tag; `undefined`, wenn kein Eintrag eine Angabe hat. */
  amount?: number;
  /** Anzahl Einträge im Zeitraum ohne Angabe zu diesem Nährstoff. */
  missing: number;
}

export interface Intake {
  from: string;
  to: string;
  /** Länge des Zeitraums in Tagen (inklusive `to`). */
  days: number;
  /** Tage im Zeitraum mit mindestens einem Eintrag. */
  trackedDays: number;
  entryCount: number;
  byNutrient: Partial<Record<NutrientKey, NutrientIntake>>;
}

/**
 * Durchschnittliche Tageszufuhr im Zeitraum `from` bis `to` (beide inklusive).
 * Geteilt wird durch die Tage mit Einträgen, nicht durch alle Tage: ein Tag ohne Eintrag ist nicht erfasst, nicht "nichts gegessen".
 */
export function computeIntake(entries: DiaryEntry[], from: string, to: string): Intake {
  const inRange = entries.filter((e) => e.date >= from && e.date <= to);
  const trackedDays = new Set(inRange.map((e) => e.date)).size;
  const { total, missing } = sum(inRange.map((e) => scale(e.per100, e.grams)));
  const byNutrient: Intake['byNutrient'] = {};
  for (const n of NUTRIENTS) {
    const miss = missing[n.key] ?? 0;
    const known = inRange.length - miss;
    byNutrient[n.key] = { amount: known > 0 ? (total[n.key] ?? 0) / trackedDays : undefined, missing: miss };
  }
  return { from, to, days: daysBetween(from, to) + 1, trackedDays, entryCount: inRange.length, byNutrient };
}

export interface OverviewRow {
  def: NutrientDef & { key: NutrientKey };
  ref: Reference;
  amount?: number;
  missing: number;
  /** Anteil der Zufuhr am Referenzwert in Prozent (bei `missing` > 0 ein Mindestwert). */
  percent?: number;
  /** Zufuhr liegt über der Obergrenze, die die DGE für den Schätzwert nennt. */
  aboveMax: boolean;
}

export interface OverviewSection {
  group: NutrientGroup;
  label: string;
  rows: OverviewRow[];
}

/** Gruppen der Übersicht; `makro` enthält hier nur die Ballaststoffe (einziger Makronährstoff mit DGE-Wert in dieser Liste). */
const SECTION_ORDER: NutrientGroup[] = ['vitamin', 'mineral', 'spurenelement', 'makro'];

export function overview(profile: Profile, intake: Intake, now = new Date()): OverviewSection[] {
  const refs = new Map(allReferences(profile, now).map((r) => [r.key, r]));
  const rows: OverviewRow[] = [];
  for (const def of NUTRIENTS) {
    const ref = refs.get(def.key);
    if (!ref) continue;
    const { amount, missing } = intake.byNutrient[def.key] ?? { missing: 0 };
    rows.push({
      def,
      ref,
      amount,
      missing,
      percent: amount === undefined ? undefined : (amount / ref.value) * 100,
      aboveMax: amount !== undefined && ref.max !== undefined && amount > ref.max,
    });
  }
  return SECTION_ORDER.map((group) => ({
    group,
    label: group === 'makro' ? 'Ballaststoffe' : GROUP_LABELS[group],
    rows: rows.filter((r) => r.def.group === group),
  })).filter((s) => s.rows.length > 0);
}
