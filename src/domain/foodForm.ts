/**
 * Formular für eigene Lebensmittel: Texteingaben <-> Food. Leeres Feld = unbekannt (kein Schlüssel), nie 0.
 */
import { normalizeBarcode } from './barcode';
import { NUTRIENTS, type NutrientKey, type NutrientValues } from './nutrients';
import type { Food } from './types';

export interface FoodFormValues {
  name: string;
  brand: string;
  barcode: string;
  /** Portion in Gramm als Text, leer = keine Portion. */
  servingG: string;
  /** Nährwerte je 100 g als Text, Dezimalkomma erlaubt. */
  values: Partial<Record<NutrientKey, string>>;
}

/** Zahl mit Komma oder Punkt; leer oder ungültig = undefined. Negative Werte sind ungültig. */
export function parseDecimal(text: string): number | undefined {
  const t = text.trim().replace(',', '.');
  if (t === '' || !/^\d*\.?\d+$|^\d+\.$/.test(t)) return undefined;
  const v = Number(t);
  return Number.isFinite(v) && v >= 0 ? v : undefined;
}

/** Zahl für ein Eingabefeld: Dezimalkomma, keine Rundungsartefakte. */
export function formatInput(v: number | undefined): string {
  return v === undefined ? '' : String(Number(v.toPrecision(10))).replace('.', ',');
}

export function emptyForm(): FoodFormValues {
  return { name: '', brand: '', barcode: '', servingG: '', values: {} };
}

export function formFromFood(food: Food): FoodFormValues {
  const values: FoodFormValues['values'] = {};
  for (const n of NUTRIENTS) {
    const v = food.per100[n.key];
    if (v !== undefined) values[n.key] = formatInput(v);
  }
  return { name: food.name, brand: food.brand ?? '', barcode: food.barcode ?? '', servingG: formatInput(food.servingG), values };
}

export interface FoodFormResult {
  errors: Partial<Record<'name' | 'servingG' | 'barcode' | NutrientKey, string>>;
  per100: NutrientValues;
  servingG?: number;
}

/** Prüft das Formular. Pflicht: Name und Energie (kcal); alles andere darf fehlen. */
export function validateForm(form: FoodFormValues): FoodFormResult {
  const errors: FoodFormResult['errors'] = {};
  const per100: NutrientValues = {};
  if (!form.name.trim()) errors.name = 'Name fehlt.';
  for (const n of NUTRIENTS) {
    const raw = form.values[n.key] ?? '';
    if (raw.trim() === '') continue;
    const v = parseDecimal(raw);
    if (v === undefined) errors[n.key] = 'Keine gültige Zahl.';
    else per100[n.key] = v;
  }
  if (per100.kcal === undefined && !errors.kcal) errors.kcal = 'Energie (kcal) fehlt.';
  let servingG: number | undefined;
  if (form.servingG.trim() !== '') {
    servingG = parseDecimal(form.servingG);
    if (servingG === undefined || servingG <= 0) errors.servingG = 'Portion muss größer als 0 sein.';
  }
  if (form.barcode.trim() !== '' && !/^\d{8,14}$/.test(form.barcode.trim())) errors.barcode = 'Barcode besteht aus 8 bis 14 Ziffern.';
  return { errors, per100, servingG };
}

/** Baut aus gültigem Formular ein Food. `base` liefert id und Quelle beim Bearbeiten. */
export function foodFromForm(form: FoodFormValues, result: FoodFormResult, id: string, now = Date.now()): Food {
  return {
    id,
    source: 'custom',
    name: form.name.trim(),
    brand: form.brand.trim() || undefined,
    barcode: form.barcode.trim() ? normalizeBarcode(form.barcode.trim()) : undefined,
    per100: result.per100,
    servingG: result.servingG,
    updatedAt: now,
  };
}
