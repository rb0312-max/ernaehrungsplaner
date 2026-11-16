/**
 * Liest eine deutsche Zutatenzeile ("100–150 g Mehl", "2 EL Öl", "1/8 l Sahne", "Salz").
 * Reine Textzerlegung. In Gramm umgerechnet werden hier nur Gewichtsangaben (mg, g, kg).
 * Volumen, Löffel und Stück rechnet unitConversion.ts um, soweit es dafür eine Quelle gibt
 * (Dichten der Schweizer Nährwertdatenbank, Portionsgewichte der USDA).
 */

export interface ParsedLine {
  /** Menge; bei einer Spanne der Mittelwert (Festlegung dieser App, die Spanne steht in `rawMeasure`). */
  amount?: number;
  /** true, wenn die Quelle eine Spanne nennt ("1–2", "4 bis 6"). */
  isRange?: boolean;
  /** Vereinheitlichte Einheit, z. B. "g", "EL", "Stück". Ohne Einheitswort nach einer Zahl: "Stück". */
  unit?: string;
  /** Mengenangabe im Wortlaut der Quelle. */
  rawMeasure?: string;
  /** Text nach der Mengenangabe. */
  rest: string;
}

const FRACTIONS: Record<string, number> = { '½': 1 / 2, '¼': 1 / 4, '¾': 3 / 4, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 1 / 8 };

/** Schreibweisen -> vereinheitlichte Einheit. Nur Namen, keine Gewichte. */
export const UNIT_WORDS: Record<string, string> = {
  mg: 'mg', g: 'g', gr: 'g', gramm: 'g', kg: 'kg', kilo: 'kg', kilogramm: 'kg',
  ml: 'ml', cl: 'cl', dl: 'dl', l: 'l', liter: 'l',
  el: 'EL', essl: 'EL', esslöffel: 'EL', tl: 'TL', teel: 'TL', teelöffel: 'TL',
  pr: 'Prise', prise: 'Prise', prisen: 'Prise', msp: 'Msp', messerspitze: 'Msp', messerspitzen: 'Msp',
  stück: 'Stück', stücke: 'Stück', st: 'Stück', stk: 'Stück',
  bund: 'Bund', bd: 'Bund', dose: 'Dose', dosen: 'Dose', scheibe: 'Scheibe', scheiben: 'Scheibe',
  zehe: 'Zehe', zehen: 'Zehe', päckchen: 'Päckchen', pck: 'Päckchen', pkg: 'Päckchen', paket: 'Paket', pakete: 'Paket',
  becher: 'Becher', glas: 'Glas', gläser: 'Glas', tasse: 'Tasse', tassen: 'Tasse',
  blatt: 'Blatt', blätter: 'Blatt', zweig: 'Zweig', zweige: 'Zweig', stange: 'Stange', stangen: 'Stange',
  würfel: 'Würfel', tropfen: 'Tropfen', spritzer: 'Spritzer', schuss: 'Schuss', handvoll: 'Handvoll',
  kugel: 'Kugel', kugeln: 'Kugel', knolle: 'Knolle', knollen: 'Knolle', kopf: 'Kopf', köpfe: 'Kopf',
};

/** Gewichtseinheiten in Gramm (Definition der SI-Vorsätze). */
const GRAMS_PER_UNIT: Record<string, number> = { mg: 0.001, g: 1, kg: 1000 };

const NUM = String.raw`(?:\d+(?:[.,]\d+)?(?:\s*/\s*\d+)?(?:\s+\d+\s*/\s*\d+)?|[½¼¾⅓⅔⅛]|\d+\s*[½¼¾⅓⅔⅛])`;
const HEAD = new RegExp(String.raw`^(?:(?:etwa|ca\.?|circa|zirka|knapp|gut|mindestens|max\.?|ungefähr)\s+)?(${NUM})(?:\s*(?:–|-|−|bis)\s*(${NUM}))?\s*`, 'i');

/** "1", "1,5", "1/2", "1 1/2", "½", "1½" -> Zahl. */
export function parseQuantity(text: string): number | undefined {
  const t = text.trim();
  let m = /^(\d+)\s*([½¼¾⅓⅔⅛])$/.exec(t);
  if (m) return Number(m[1]) + FRACTIONS[m[2]];
  if (t in FRACTIONS) return FRACTIONS[t];
  m = /^(\d+)\s+(\d+)\s*\/\s*(\d+)$/.exec(t);
  if (m) return Number(m[3]) === 0 ? undefined : Number(m[1]) + Number(m[2]) / Number(m[3]);
  m = /^(\d+)\s*\/\s*(\d+)$/.exec(t);
  if (m) return Number(m[2]) === 0 ? undefined : Number(m[1]) / Number(m[2]);
  m = /^\d+(?:[.,]\d+)?$/.exec(t);
  return m ? Number(t.replace(',', '.')) : undefined;
}

export function parseIngredientLine(line: string): ParsedLine {
  const text = line.replace(/\s+/g, ' ').trim();
  const head = HEAD.exec(text);
  if (!head) return { rest: text };
  const first = parseQuantity(head[1]);
  if (first === undefined) return { rest: text };
  const second = head[2] === undefined ? undefined : parseQuantity(head[2]);
  let after = text.slice(head[0].length);
  let measure = head[0].trim();

  let unit = 'Stück';
  const word = /^([A-Za-zÄÖÜäöüß]+)\.?(?=\s|$)/.exec(after);
  const known = word && UNIT_WORDS[word[1].toLowerCase()];
  if (word && known) {
    unit = known;
    measure = `${measure} ${word[0]}`;
    after = after.slice(word[0].length).trim();
  }
  return {
    amount: second === undefined ? first : (first + second) / 2,
    isRange: second !== undefined || undefined,
    unit,
    rawMeasure: measure,
    rest: after,
  };
}

/** Nennt die Mengenangabe eine Spanne ("100–150 g", "4 bis 6")? */
export function isRangeMeasure(rawMeasure: string | undefined): boolean {
  return rawMeasure !== undefined && /\d\s*(–|-|−|bis)\s*\d/.test(rawMeasure);
}

/** Gramm aus einer gelesenen Menge; nur für Gewichtseinheiten, sonst unbekannt. */
export function gramsOf(p: Pick<ParsedLine, 'amount' | 'unit'>): number | undefined {
  if (p.amount === undefined || p.unit === undefined) return undefined;
  const f = GRAMS_PER_UNIT[p.unit];
  return f === undefined ? undefined : p.amount * f;
}
