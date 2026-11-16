/**
 * DGE/ÖGE-Referenzwerte für die Nährstoffzufuhr, Erwachsene ab 19 Jahren, je Tag.
 * Abgelesen von https://www.dge.de/wissenschaft/referenzwerte/ (Nährstoffseiten, Stand November 2026, 3. Auflage).
 * Nicht abgedeckt: unter 19 Jahre, Schwangere, Stillende.
 * Jeder Wert ist pro Profil über `Profile.targetOverrides` überschreibbar.
 */
import type { NutrientKey } from './nutrients';
import type { Profile } from './types';

export type RefKind = 'Empfohlene Zufuhr' | 'Schätzwert' | 'Richtwert';

/**
 * Erläuterung der Art des Werts, sinngemäß nach den DGE-FAQ zu den Referenzwerten (Fragen 7 bis 9),
 * https://www.dge.de/gesunde-ernaehrung/faq/referenzwerte/ (abgerufen 15.11.2026).
 */
export const REF_KIND_HELP: Record<RefKind | 'Eigener Wert', string> = {
  'Empfohlene Zufuhr': 'Aus dem bekannten durchschnittlichen Bedarf abgeleitet, mit Zuschlag. Deckt den Bedarf nahezu aller gesunden Personen der Gruppe. Größte Aussagekraft.',
  Schätzwert: 'Der Bedarf ist nicht genau genug bekannt. Abgeleitet aus der beobachteten Zufuhr Gesunder, gibt gute Hinweise auf eine angemessene, gesundheitlich unbedenkliche Zufuhr.',
  Richtwert: 'Orientierungshilfe für einen aus ernährungsphysiologischer Sicht wünschenswerten Bereich. Bei Ballaststoffen und Fluorid eine Untergrenze.',
  'Eigener Wert': 'Von dir eingetragen. Der DGE-Wert bleibt sichtbar und lässt sich wiederherstellen.',
};

/** Allgemeine Hinweise zur Anwendung, DGE-FAQ Fragen 2, 4, 5 und 10 (gleiche Quelle). */
export const REF_USAGE_NOTES = [
  'Die Referenzwerte gelten für Gesunde, nicht für Kranke oder bei Nährstoffmangel.',
  'Sie müssen nicht jeden Tag erreicht werden; der Durchschnitt einer Woche genügt.',
  'Wer einen Wert nicht ganz erreicht, hat nicht automatisch einen Mangel. Auf Bruchteile genau zu rechnen ist nicht sinnvoll.',
];

/** Altersgruppen der DGE: 19 bis <25, 25 bis <51, 51 bis <65, 65 und älter. */
type ByAge = readonly [number, number, number, number];

interface RefDef {
  kind: RefKind;
  m: ByAge;
  w: ByAge;
  /** Obergrenze, wenn die DGE einen Bereich angibt. */
  max?: number;
  note?: string;
}

const all = (v: number): ByAge => [v, v, v, v];

export const DGE_REFERENCE: Partial<Record<NutrientKey, RefDef>> = {
  vitA: { kind: 'Empfohlene Zufuhr', m: [850, 850, 850, 800], w: all(700), note: 'µg Retinol-Aktivitätsäquivalente' },
  vitD: { kind: 'Schätzwert', m: all(20), w: all(20), note: 'bei fehlender körpereigener Bildung (wenig Sonne)' },
  vitE: { kind: 'Schätzwert', m: all(8), w: all(8), note: 'als RRR-α-Tocopherol' },
  vitK: { kind: 'Schätzwert', m: [70, 70, 80, 80], w: [60, 60, 65, 65] },
  b1: { kind: 'Empfohlene Zufuhr', m: [1.3, 1.2, 1.2, 1.1], w: all(1.0) },
  b2: { kind: 'Empfohlene Zufuhr', m: [1.4, 1.4, 1.3, 1.3], w: [1.1, 1.1, 1.0, 1.0] },
  niacin: { kind: 'Empfohlene Zufuhr', m: [16, 15, 15, 14], w: [13, 12, 11, 11], note: 'mg Niacin-Äquivalente' },
  b5: { kind: 'Schätzwert', m: all(5), w: all(5) },
  b6: { kind: 'Empfohlene Zufuhr', m: all(1.6), w: all(1.4) },
  biotin: { kind: 'Schätzwert', m: all(40), w: all(40) },
  folate: { kind: 'Empfohlene Zufuhr', m: all(300), w: all(300), note: 'µg Folat-Äquivalente' },
  b12: { kind: 'Schätzwert', m: all(4.0), w: all(4.0) },
  vitC: { kind: 'Empfohlene Zufuhr', m: all(110), w: all(95), note: 'Raucher: 155 mg (m) bzw. 135 mg (w)' },

  sodium: { kind: 'Schätzwert', m: all(1500), w: all(1500) },
  chloride: { kind: 'Schätzwert', m: all(2300), w: all(2300) },
  potassium: { kind: 'Schätzwert', m: all(4000), w: all(4000) },
  calcium: { kind: 'Empfohlene Zufuhr', m: all(1000), w: all(1000) },
  magnesium: { kind: 'Schätzwert', m: all(350), w: all(300) },
  phosphorus: { kind: 'Schätzwert', m: all(550), w: all(550) },
  // Eisen (w) und Zink hängen zusätzlich vom Profil ab, siehe referenceFor().
  iron: { kind: 'Empfohlene Zufuhr', m: all(11), w: [16, 16, 16, 14], note: 'Frauen: 16 mg prämenopausal, 14 mg postmenopausal' },
  zinc: { kind: 'Empfohlene Zufuhr', m: all(14), w: all(8), note: 'abhängig von der Phytatzufuhr (niedrig/mittel/hoch)' },
  iodine: { kind: 'Empfohlene Zufuhr', m: all(150), w: all(150) },
  selenium: { kind: 'Schätzwert', m: all(70), w: all(60) },
  fluoride: { kind: 'Richtwert', m: all(3.5), w: all(3.0), note: 'Gesamtzufuhr inkl. Trinkwasser, Salz, Zahnpflege' },
  copper: { kind: 'Schätzwert', m: all(1.0), w: all(1.0), max: 1.5 },
  manganese: { kind: 'Schätzwert', m: all(2.0), w: all(2.0), max: 5.0 },
  chromium: { kind: 'Schätzwert', m: all(30), w: all(30), max: 100 },
  molybdenum: { kind: 'Schätzwert', m: all(50), w: all(50), max: 100 },

  fiber: { kind: 'Richtwert', m: all(30), w: all(30), note: 'mindestens 30 g bzw. 14,6 g je 1000 kcal' },
};

/** Zink nach Phytatzufuhr (DGE): [niedrig, mittel, hoch]. */
const ZINC = { m: { niedrig: 11, mittel: 14, hoch: 16 }, w: { niedrig: 7, mittel: 8, hoch: 10 } } as const;

/** DGE: Protein 0,8 g/kg Körpergewicht (19 bis <65 Jahre), 1,0 g/kg ab 65 Jahren. Bezogen auf Normalgewicht. */
export function dgeProteinPerKg(age: number): number {
  return age >= 65 ? 1.0 : 0.8;
}

export function ageBandIndex(age: number): 0 | 1 | 2 | 3 {
  if (age < 25) return 0;
  if (age < 51) return 1;
  if (age < 65) return 2;
  return 3;
}

export function ageOf(profile: Pick<Profile, 'birthYear'>, now = new Date()): number {
  return now.getFullYear() - profile.birthYear;
}

export interface Reference {
  key: NutrientKey;
  value: number;
  max?: number;
  kind: RefKind | 'Eigener Wert';
  note?: string;
  /** DGE-Wert, auch wenn er überschrieben wurde (zum Zurücksetzen und Vergleichen). */
  dgeValue: number;
  overridden: boolean;
}

type RefProfile = Pick<Profile, 'sex' | 'birthYear' | 'phytate' | 'postmenopausal' | 'targetOverrides'>;

/** Referenzwert eines Nährstoffs für ein Profil; `undefined`, wenn die DGE keinen Tageswert angibt. */
export function referenceFor(key: NutrientKey, profile: RefProfile, now = new Date()): Reference | undefined {
  const def = DGE_REFERENCE[key];
  if (!def) return undefined;
  const age = ageOf(profile, now);
  let dge = def[profile.sex][ageBandIndex(age)];
  if (key === 'zinc') dge = ZINC[profile.sex][profile.phytate];
  if (key === 'iron' && profile.sex === 'w') {
    const post = profile.postmenopausal ?? age >= 51;
    dge = age >= 65 || post ? 14 : 16;
  }
  const own = profile.targetOverrides[key];
  return {
    key,
    value: own ?? dge,
    max: def.max,
    kind: own !== undefined ? 'Eigener Wert' : def.kind,
    note: def.note,
    dgeValue: dge,
    overridden: own !== undefined,
  };
}

export const hasReference = (key: string): key is NutrientKey => key in DGE_REFERENCE;

/**
 * Eigenen Tageswert für einen Nährstoff mit DGE-Referenz setzen; `undefined` setzt auf den DGE-Wert zurück.
 * Anders als bei den Energie-/Makrozielen wird nicht gerundet (z. B. 1,3 mg Vitamin B1).
 * Werte ≤ 0 oder nicht endliche Werte werden nicht gespeichert.
 */
export function setReferenceOverride(p: Profile, key: NutrientKey, value: number | undefined): Profile {
  if (!hasReference(key)) return p;
  const { [key]: _dropped, ...rest } = p.targetOverrides;
  if (value === undefined) return { ...p, targetOverrides: rest };
  if (!Number.isFinite(value) || value <= 0) return p;
  return { ...p, targetOverrides: { ...rest, [key]: value } };
}

/** Entfernt alle eigenen Referenzwerte; Energie- und Makroziele bleiben unberührt. */
export function resetAllReferenceOverrides(p: Profile): Profile {
  const targetOverrides = Object.fromEntries(Object.entries(p.targetOverrides).filter(([k]) => !hasReference(k)));
  return { ...p, targetOverrides };
}

export function allReferences(profile: RefProfile, now = new Date()): Reference[] {
  return (Object.keys(DGE_REFERENCE) as NutrientKey[])
    .map((k) => referenceFor(k, profile, now))
    .filter((r): r is Reference => r !== undefined);
}
