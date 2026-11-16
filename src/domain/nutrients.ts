/**
 * Zentrale Nährstoffliste. Alle Mengen in der App beziehen sich auf diese Schlüssel und Einheiten.
 * Die Schlüssel müssen zu tools/build_bls.py (NUTRIENTS) passen.
 */
export type NutrientGroup = 'makro' | 'fett' | 'vitamin' | 'mineral' | 'spurenelement' | 'sonstiges';

export interface NutrientDef {
  key: string;
  label: string;
  unit: 'kcal' | 'g' | 'mg' | 'µg';
  group: NutrientGroup;
  /** Vitaminformen / Bezugsgröße, wie im BLS 4.0 bzw. bei der DGE angegeben. */
  forms?: string;
  /** Feldname in Open Food Facts (`nutriments.<off>_100g`) und Faktor von der OFF-Einheit in die App-Einheit. */
  off?: { field: string; factor: number };
}

// OFF liefert Nährstoffe in g je 100 g (Energie in kcal).
const G = 1;
const G_TO_MG = 1000;
const G_TO_UG = 1_000_000;

export const NUTRIENTS = [
  { key: 'kcal', label: 'Energie', unit: 'kcal', group: 'makro', off: { field: 'energy-kcal', factor: 1 } },
  { key: 'protein', label: 'Protein', unit: 'g', group: 'makro', off: { field: 'proteins', factor: G } },
  { key: 'fat', label: 'Fett', unit: 'g', group: 'makro', off: { field: 'fat', factor: G } },
  { key: 'carbs', label: 'Kohlenhydrate', unit: 'g', group: 'makro', off: { field: 'carbohydrates', factor: G } },
  { key: 'fiber', label: 'Ballaststoffe', unit: 'g', group: 'makro', off: { field: 'fiber', factor: G } },
  { key: 'sugar', label: 'Zucker', unit: 'g', group: 'makro', off: { field: 'sugars', factor: G } },
  { key: 'satFat', label: 'Gesättigte Fettsäuren', unit: 'g', group: 'fett', off: { field: 'saturated-fat', factor: G } },
  { key: 'mufa', label: 'Einfach ungesättigte Fettsäuren', unit: 'g', group: 'fett', off: { field: 'monounsaturated-fat', factor: G } },
  { key: 'pufa', label: 'Mehrfach ungesättigte Fettsäuren', unit: 'g', group: 'fett', off: { field: 'polyunsaturated-fat', factor: G } },
  { key: 'omega3', label: 'Omega-3-Fettsäuren', unit: 'g', group: 'fett', off: { field: 'omega-3-fat', factor: G } },
  { key: 'omega6', label: 'Omega-6-Fettsäuren', unit: 'g', group: 'fett', off: { field: 'omega-6-fat', factor: G } },
  { key: 'alcohol', label: 'Alkohol', unit: 'g', group: 'sonstiges' },
  { key: 'water', label: 'Wasser', unit: 'g', group: 'sonstiges' },
  { key: 'salt', label: 'Salz', unit: 'g', group: 'sonstiges', off: { field: 'salt', factor: G } },
  { key: 'cholesterol', label: 'Cholesterin', unit: 'mg', group: 'fett', off: { field: 'cholesterol', factor: G_TO_MG } },

  { key: 'vitA', label: 'Vitamin A', unit: 'µg', group: 'vitamin', forms: 'Retinol-Aktivitätsäquivalente (RAE): Retinol, Beta-Carotin, andere Provitamin-A-Carotinoide', off: { field: 'vitamin-a', factor: G_TO_UG } },
  { key: 'vitD', label: 'Vitamin D', unit: 'µg', group: 'vitamin', forms: 'D3 (Cholecalciferol), D2 (Ergocalciferol)', off: { field: 'vitamin-d', factor: G_TO_UG } },
  { key: 'vitE', label: 'Vitamin E', unit: 'mg', group: 'vitamin', forms: 'Alpha-Tocopherol (RRR-α-Tocopherol)', off: { field: 'vitamin-e', factor: G_TO_MG } },
  { key: 'vitK', label: 'Vitamin K', unit: 'µg', group: 'vitamin', forms: 'K1 (Phyllochinon), K2 (Menachinone)', off: { field: 'vitamin-k', factor: G_TO_UG } },
  { key: 'b1', label: 'Vitamin B1 (Thiamin)', unit: 'mg', group: 'vitamin', off: { field: 'vitamin-b1', factor: G_TO_MG } },
  { key: 'b2', label: 'Vitamin B2 (Riboflavin)', unit: 'mg', group: 'vitamin', off: { field: 'vitamin-b2', factor: G_TO_MG } },
  { key: 'niacin', label: 'Niacin', unit: 'mg', group: 'vitamin', forms: 'Niacin-Äquivalente (Niacin + Tryptophan/60)', off: { field: 'vitamin-pp', factor: G_TO_MG } },
  { key: 'b5', label: 'Pantothensäure', unit: 'mg', group: 'vitamin', off: { field: 'pantothenic-acid', factor: G_TO_MG } },
  { key: 'b6', label: 'Vitamin B6', unit: 'mg', group: 'vitamin', off: { field: 'vitamin-b6', factor: G_TO_MG } },
  { key: 'biotin', label: 'Biotin', unit: 'µg', group: 'vitamin', off: { field: 'biotin', factor: G_TO_UG } },
  { key: 'folate', label: 'Folat', unit: 'µg', group: 'vitamin', forms: 'Folat-Äquivalente: Nahrungsfolat, synthetische Folsäure', off: { field: 'vitamin-b9', factor: G_TO_UG } },
  { key: 'b12', label: 'Vitamin B12', unit: 'µg', group: 'vitamin', forms: 'Cobalamine', off: { field: 'vitamin-b12', factor: G_TO_UG } },
  { key: 'vitC', label: 'Vitamin C', unit: 'mg', group: 'vitamin', off: { field: 'vitamin-c', factor: G_TO_MG } },

  { key: 'sodium', label: 'Natrium', unit: 'mg', group: 'mineral', off: { field: 'sodium', factor: G_TO_MG } },
  { key: 'chloride', label: 'Chlorid', unit: 'mg', group: 'mineral', off: { field: 'chloride', factor: G_TO_MG } },
  { key: 'potassium', label: 'Kalium', unit: 'mg', group: 'mineral', off: { field: 'potassium', factor: G_TO_MG } },
  { key: 'calcium', label: 'Calcium', unit: 'mg', group: 'mineral', off: { field: 'calcium', factor: G_TO_MG } },
  { key: 'magnesium', label: 'Magnesium', unit: 'mg', group: 'mineral', off: { field: 'magnesium', factor: G_TO_MG } },
  { key: 'phosphorus', label: 'Phosphor', unit: 'mg', group: 'mineral', off: { field: 'phosphorus', factor: G_TO_MG } },
  { key: 'iron', label: 'Eisen', unit: 'mg', group: 'spurenelement', off: { field: 'iron', factor: G_TO_MG } },
  { key: 'zinc', label: 'Zink', unit: 'mg', group: 'spurenelement', off: { field: 'zinc', factor: G_TO_MG } },
  { key: 'iodine', label: 'Jod', unit: 'µg', group: 'spurenelement', off: { field: 'iodine', factor: G_TO_UG } },
  { key: 'copper', label: 'Kupfer', unit: 'mg', group: 'spurenelement', off: { field: 'copper', factor: G_TO_MG } },
  { key: 'manganese', label: 'Mangan', unit: 'mg', group: 'spurenelement', off: { field: 'manganese', factor: G_TO_MG } },
  { key: 'fluoride', label: 'Fluorid', unit: 'mg', group: 'spurenelement', off: { field: 'fluoride', factor: G_TO_MG } },
  { key: 'chromium', label: 'Chrom', unit: 'µg', group: 'spurenelement', off: { field: 'chromium', factor: G_TO_UG } },
  { key: 'molybdenum', label: 'Molybdän', unit: 'µg', group: 'spurenelement', off: { field: 'molybdenum', factor: G_TO_UG } },
  // Selen ist im BLS 4.0 nicht enthalten; Werte kommen nur aus Open Food Facts oder eigener Eingabe.
  { key: 'selenium', label: 'Selen', unit: 'µg', group: 'spurenelement', off: { field: 'selenium', factor: G_TO_UG } },
] as const satisfies readonly NutrientDef[];

export type NutrientKey = (typeof NUTRIENTS)[number]['key'];

/** Nährwerte je 100 g. Fehlender Schlüssel = unbekannt (nicht 0). */
export type NutrientValues = Partial<Record<NutrientKey, number>>;

/** Nährwerte einer Portion aus Werten je 100 g. */
export function scale(per100: NutrientValues, grams: number): NutrientValues {
  const out: NutrientValues = {};
  for (const [k, v] of Object.entries(per100) as [NutrientKey, number][]) out[k] = (v * grams) / 100;
  return out;
}

/** Summiert Nährwerte; unbekannte Werte zählen als 0, `missing` zählt je Nährstoff die Einträge ohne Angabe. */
export function sum(items: NutrientValues[]): { total: NutrientValues; missing: Partial<Record<NutrientKey, number>> } {
  const total: NutrientValues = {};
  const missing: Partial<Record<NutrientKey, number>> = {};
  for (const n of NUTRIENTS) {
    let s = 0;
    let miss = 0;
    for (const it of items) {
      const v = it[n.key];
      if (v === undefined) miss++;
      else s += v;
    }
    total[n.key] = s;
    if (miss) missing[n.key] = miss;
  }
  return { total, missing };
}
