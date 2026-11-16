/**
 * Mengenumrechnung beim Rezeptimport: aus "2 EL Olivenöl" oder "1 große Zwiebel" werden Gramm.
 * Alle Dichten und Portionsgewichte stehen in conversionData.ts; die Datei wird von tools/build_conversions.py
 * aus den Originaldateien erzeugt (Schweizer Nährwertdatenbank, USDA FoodData Central). Hier stehen nur die Regeln.
 *
 * - Flüssigkeiten (ml, cl, dl, l, EL, TL): Volumen mal Dichte (g/ml) der Schweizer Nährwertdatenbank.
 * - Feste Zutaten per Löffel oder Stück: Portionsgewichte der USDA. Das sind US-Daten (US-Löffel, US-Größen);
 *   die Oberfläche kennzeichnet sie als "US-Daten, bitte prüfen".
 * - Mehl und Speisestärke per Löffel: Löffeltabelle des Koch-Wiki (gerundete Werte), weil die USDA dafür
 *   keinen Löffelwert nennt (Entscheidung des Nutzers vom 15.11.2026).
 * - Zugeordnet wird über den Zutatenschlüssel des Koch-Wiki (Ziel des Zutat-Links), nicht über das Lebensmittel.
 */
import { CONVERSION_SOURCES, DENSITY_RULES, KOCHWIKI_SPOON_RULES, USDA_RULES } from './conversionData';
import { formatNumber } from './foodDetail';
import { UNIT_WORDS, isRangeMeasure } from './ingredientLine';
import type { RecipeIngredient } from './types';

export interface ConversionSources {
  swiss: { name: string; publisher: string; url: string };
  usda: { name: string; publisher: string; url: string; license: string };
  kochwiki: { name: string; url: string; license: string };
}

interface RuleBase {
  /** Zutatenschlüssel des Koch-Wiki, klein geschrieben. */
  keys: string[];
  /** Regulärer Ausdruck (klein geschrieben), der in der Zutatenzeile vorkommen muss. */
  requires?: string;
  /** Regulärer Ausdruck (klein geschrieben), der in der Zutatenzeile nicht vorkommen darf. */
  excludes?: string;
}

export interface DensityRule extends RuleBase {
  /** false: nur ml, cl, dl, l; nicht EL und TL. */
  spoons: boolean;
  swissId: number;
  swissName: string;
  gPerMl: number;
}

/** Portion im Wortlaut der Quelle ("1 medium (2-1/2\" dia)") und ihr Gewicht. */
export interface UsdaPortion {
  grams: number;
  label: string;
}

export type PieceSize = 'klein' | 'mittel' | 'gross';

export interface UsdaRule extends RuleBase {
  fdcId: number;
  description: string;
  tbsp?: UsdaPortion;
  tsp?: UsdaPortion;
  /** Stückgewichte nach Größe; "einheitlich" = nur ein Stückgewicht, Größenwörter der Zeile passen dann nicht. */
  piece?: Partial<Record<PieceSize | 'einheitlich', UsdaPortion>>;
  /** Einheiten, die neben einer Zahl ohne Einheit als Stück gelten, z. B. "Zehe". */
  units?: string[];
}

/** Zeile der Löffeltabelle des Koch-Wiki: Gramm je gestrichenem Teelöffel (5 ml) und Esslöffel (15 ml). */
export interface KochwikiSpoonRule extends RuleBase {
  /** Bezeichnung der Zeile in der Quelle, z. B. "Mehl". */
  row: string;
  tsp: number;
  tbsp: number;
}

/**
 * Volumen je Einheit in ml. ml, cl, dl, l: Definition der SI-Vorsätze. EL und TL: gestrichener Löffel nach
 * Koch-Wiki, "Zubereitung:Maße und Gewichte" (https://www.kochwiki.org/wiki/Zubereitung:Maße_und_Gewichte,
 * Version 398712 vom 01.11.2016, CC BY-SA 3.0): EL 15 ml, TL 5 ml, "EL entspricht 3 TL".
 */
export const ML_PER_UNIT: Record<string, number> = { ml: 1, cl: 10, dl: 100, l: 1000, EL: 15, TL: 5 };
/** Verhältnis Esslöffel zu Teelöffel (gleiche Koch-Wiki-Seite). */
const TSP_PER_TBSP = 3;

export type ConversionOrigin = 'dichte' | 'usda' | 'kochwiki';

export interface Conversion {
  /** Auf 0,1 g gerundet (Rundung dieser App für die Anzeige). */
  grams: number;
  origin: ConversionOrigin;
  /** Herleitung im Wortlaut, für die Anzeige unter dem Mengenfeld. */
  note: string;
}

type Line = Pick<RecipeIngredient, 'key' | 'amount' | 'unit' | 'name' | 'rawMeasure'>;

const LETTER = 'a-zäöüß';
/** Ganzes Wort; ohne Lookbehind, das ältere Safari-Versionen nicht kennen. */
const word = (pattern: string) => new RegExp(`(?:^|[^${LETTER}])(?:${pattern})(?![${LETTER}])`);
const SIZE_WORDS: Record<PieceSize, RegExp> = {
  klein: word('kleine[rnsm]?'),
  mittel: word('mittelgro(?:ß|ss)e?[rnsm]?|mittlere[rnsm]?|mittel'),
  gross: word('gro(?:ß|ss)e[rnsm]?'),
};
const SIZE_LABEL: Record<PieceSize, string> = { klein: 'klein', mittel: 'mittel', gross: 'groß' };
/** Teilmengen in Worten ("1 halbe Zitrone"): die gelesene Zahl stimmt dann nicht. */
const PARTIAL = word('halbe[rnsm]?|hälfte|viertel|drittel|achtel');
const APPROX = /^(?:etwa|ca\.?|circa|zirka|knapp|gut|mindestens|max\.?|ungefähr)\s+/i;

const round = (g: number) => Math.round(g * 10) / 10;
const fmt = (v: number) => formatNumber(v);

function matches(rule: RuleBase, key: string, text: string): boolean {
  if (!rule.keys.includes(key)) return false;
  if (rule.requires && !new RegExp(rule.requires).test(text)) return false;
  return !(rule.excludes && new RegExp(rule.excludes).test(text));
}

/** Zahl ohne Einheitswort ("2 Zwiebeln"); "2 Stück …" zählt nicht, das kann auch ein Teilstück meinen. */
function isBareCount(i: Line): boolean {
  if (i.unit !== 'Stück') return false;
  const measure = (i.rawMeasure ?? '').replace(APPROX, '').replace(/\bbis\b/gi, '');
  return !new RegExp(`[${LETTER}]`, 'i').test(measure);
}

/** Steht in der Zeile ein anderes Einheitswort ("1 große Dose Tomaten", "1 Zwiebel (ca. 100 g)")? */
function hasOtherUnitWord(text: string, ownUnit: string): boolean {
  return text.split(new RegExp(`[^${LETTER}]+`)).some((t) => {
    const unit = UNIT_WORDS[t];
    return unit !== undefined && unit !== 'Stück' && unit !== ownUnit;
  });
}

/** Größe laut Zeile; undefined = keine Angabe, 'unklar' = mehrere verschiedene. */
function sizeOf(text: string): PieceSize | 'unklar' | undefined {
  const found = (Object.keys(SIZE_WORDS) as PieceSize[]).filter((s) => SIZE_WORDS[s].test(text));
  return found.length > 1 ? 'unklar' : found[0];
}

const usdaRef = (r: UsdaRule, p: UsdaPortion) => `„${p.label}“, USDA ${r.fdcId} „${r.description}“`;

function fromDensity(i: Line, key: string, text: string): Conversion | undefined {
  const mlPerUnit = ML_PER_UNIT[i.unit!];
  if (mlPerUnit === undefined) return undefined;
  const spoon = i.unit === 'EL' || i.unit === 'TL';
  const rule = DENSITY_RULES.find((r) => (r.spoons || !spoon) && matches(r, key, text));
  if (!rule) return undefined;
  const ml = i.amount! * mlPerUnit;
  const volume = spoon ? `${fmt(ml)} ml (1 ${i.unit} gestrichen = ${mlPerUnit} ml laut Koch-Wiki)` : `${fmt(ml)} ml`;
  return {
    grams: round(ml * rule.gPerMl),
    origin: 'dichte',
    note: `Umgerechnet: ${volume} × ${fmt(rule.gPerMl)} g/ml (Dichte von „${rule.swissName}“, ${CONVERSION_SOURCES.swiss.name}).`,
  };
}

function fromKochwikiSpoon(i: Line, key: string, text: string): Conversion | undefined {
  const rule = KOCHWIKI_SPOON_RULES.find((r) => matches(r, key, text));
  if (!rule) return undefined;
  const perUnit = i.unit === 'EL' ? rule.tbsp : rule.tsp;
  return {
    grams: round(i.amount! * perUnit),
    origin: 'kochwiki',
    note: `1 ${i.unit} = ${fmt(perUnit)} g („${rule.row}“, Löffeltabelle des Koch-Wiki). Gerundeter Wert für gestrichene Messlöffel.`,
  };
}

function fromSpoon(i: Line, key: string, text: string): Conversion | undefined {
  const rule = USDA_RULES.find((r) => (r.tbsp || r.tsp) && matches(r, key, text));
  if (!rule) return undefined;
  const own = i.unit === 'EL' ? rule.tbsp : rule.tsp;
  const other = i.unit === 'EL' ? rule.tsp : rule.tbsp;
  // Nennt die Quelle nur den anderen Löffel, wird über 1 EL = 3 TL umgerechnet.
  const perUnit = own ? own.grams : i.unit === 'EL' ? other!.grams * TSP_PER_TBSP : other!.grams / TSP_PER_TBSP;
  const derived = own ? '' : ` Aus dem ${i.unit === 'EL' ? 'Teelöffel' : 'Esslöffel'}wert gerechnet (1 EL = 3 TL).`;
  return {
    grams: round(i.amount! * perUnit),
    origin: 'usda',
    note: `1 ${i.unit} = ${fmt(round(perUnit))} g (${usdaRef(rule, (own ?? other)!)}). Gilt für gestrichene US-Löffel.${derived}`,
  };
}

function fromPiece(i: Line, key: string, text: string): Conversion | undefined {
  const bare = isBareCount(i);
  const rule = USDA_RULES.find((r) => r.piece && (bare || r.units?.includes(i.unit!)) && matches(r, key, text));
  if (!rule?.piece) return undefined;
  if (PARTIAL.test(text) || hasOtherUnitWord(text, i.unit!)) return undefined;
  const size = sizeOf(text);
  if (size === 'unklar') return undefined;
  let portion: UsdaPortion | undefined;
  let sizeNote = '';
  if (rule.piece.einheitlich) {
    // Nur ein Stückgewicht vorhanden: bei einer Größenangabe in der Zeile passt es nicht sicher.
    if (size) return undefined;
    portion = rule.piece.einheitlich;
  } else if (size) {
    portion = rule.piece[size];
    sizeNote = ` Größe laut Zeile: ${SIZE_LABEL[size]}.`;
  } else {
    portion = rule.piece.mittel;
    sizeNote = ' Ohne Größenangabe ist „mittel“ angenommen.';
  }
  if (!portion) return undefined;
  return {
    grams: round(i.amount! * portion.grams),
    origin: 'usda',
    note: `1 Stück = ${fmt(portion.grams)} g (${usdaRef(rule, portion)}).${sizeNote}`,
  };
}

/**
 * Gramm für eine gelesene Zutatenzeile; undefined, wenn es für Zutat und Einheit keine Umrechnung gibt.
 * Nicht umgerechnet werden gehäufte Löffel (die Quellen gelten für gestrichene), "2 Stück …" und Zeilen
 * mit Teilmengen in Worten, einer weiteren Einheit oder einer zweiten Menge.
 */
export function convertToGrams(i: Line): Conversion | undefined {
  if (!i.key || !i.unit || i.amount === undefined || !(i.amount > 0)) return undefined;
  const key = i.key.trim().toLowerCase();
  const text = i.name.toLowerCase();
  const spoon = i.unit === 'EL' || i.unit === 'TL';
  if (spoon && /gehäuft|gehaeuft/.test(text)) return undefined;
  // "3 EL Butter und 1 EL Öl", "1 rote und 1 grüne Paprikaschote": die Zeile nennt eine zweite Menge, gelesen ist nur die erste.
  if (/\sund\s+\d/.test(text)) return undefined;
  const c = fromDensity(i, key, text) ?? (spoon ? fromKochwikiSpoon(i, key, text) ?? fromSpoon(i, key, text) : fromPiece(i, key, text));
  if (!c) return undefined;
  return isRangeMeasure(i.rawMeasure) ? { ...c, note: `${c.note} Die Quelle nennt eine Spanne, gerechnet ist mit dem Mittelwert.` } : c;
}
