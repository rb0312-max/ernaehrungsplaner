/** Aufbereitung der Nährwerte für die Detailansicht und Mengenumrechnung. */
import { NUTRIENTS, scale, type NutrientDef, type NutrientGroup, type NutrientValues } from './nutrients';

export const GROUP_LABELS: Record<NutrientGroup, string> = {
  makro: 'Energie und Makronährstoffe',
  fett: 'Fette und Cholesterin',
  vitamin: 'Vitamine',
  mineral: 'Mineralstoffe',
  spurenelement: 'Spurenelemente',
  sonstiges: 'Sonstiges',
};

const GROUP_ORDER: NutrientGroup[] = ['makro', 'fett', 'vitamin', 'mineral', 'spurenelement', 'sonstiges'];

export interface NutrientRow {
  def: NutrientDef;
  per100?: number;
  /** Wert für die gewählte Menge; undefined = unbekannt. */
  amount?: number;
}

export interface NutrientSection {
  group: NutrientGroup;
  label: string;
  rows: NutrientRow[];
  /** Anzahl Nährstoffe ohne Angabe in dieser Gruppe. */
  unknown: number;
}

/** Gruppiert alle Nährstoffe; Nährstoffe ohne Angabe bleiben als Zeile mit undefined erhalten. */
export function nutrientSections(per100: NutrientValues, grams: number): NutrientSection[] {
  const scaled = scale(per100, grams);
  return GROUP_ORDER.map((group) => {
    const rows = NUTRIENTS.filter((n) => n.group === group).map((def) => ({
      def,
      per100: per100[def.key],
      amount: scaled[def.key],
    }));
    return { group, label: GROUP_LABELS[group], rows, unknown: rows.filter((r) => r.per100 === undefined).length };
  }).filter((s) => s.rows.length > 0);
}

export type AmountUnit = 'g' | 'portion';

/** Menge in Gramm aus Eingabe; Portion nur mit bekannter Portionsgröße. */
export function toGrams(value: number, unit: AmountUnit, servingG?: number): number | undefined {
  if (!Number.isFinite(value) || value < 0) return undefined;
  if (unit === 'g') return value;
  return servingG && servingG > 0 ? value * servingG : undefined;
}

/** Zahl in deutscher Schreibweise; unbekannt als "–". */
export function formatNumber(v: number | undefined): string {
  if (v === undefined) return '–';
  const digits = v >= 100 ? 0 : v >= 10 ? 1 : v >= 1 ? 2 : 3;
  let s = v.toFixed(digits);
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  // Ein bekannter, aber sehr kleiner Wert soll nicht wie 0 aussehen.
  if (s === '0' && v > 0) return '<0,001';
  return s.replace('.', ',');
}
