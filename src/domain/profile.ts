/**
 * Profil-Logik ohne Browser-APIs: Vorgabewerte, Prüfung der Eingaben, Überschreibungen der Tagesziele.
 * Keine Nährwerte oder Formeln hier; die Berechnung steht in energy.ts.
 */
import { GOAL_DEFAULTS, KCAL_PER_G, energyTargets, splitFor, type EnergyTargets } from './energy';
import { ageOf } from './referenceValues';
import type { FastingMode, Goal, MacroPatternId, MacroSplit, Profile } from './types';

/** Überschreibbare Tagesziele (Schlüssel in `Profile.targetOverrides`). */
export type TargetKey = 'kcal' | 'protein' | 'fat' | 'carbs';

export const FOOD_FILTERS: Record<Profile['foodFilter'], string> = {
  omnivor: 'Alles (omnivor)',
  pescetarisch: 'Pescetarisch (Fisch, kein Fleisch)',
  vegetarisch: 'Vegetarisch',
  vegan: 'Vegan',
};

export const FASTING_MODES: Record<FastingMode, string> = {
  keins: 'Kein Fasten',
  '16:8': '16:8 (8 Stunden Essensfenster)',
  '14:10': '14:10 (10 Stunden Essensfenster)',
  '5:2': '5:2 (zwei Fastentage pro Woche)',
  eigene: 'Eigenes Essensfenster',
};

/** Länge des Essensfensters in Stunden; die zweite Zahl im Namen des Modus. */
const EATING_HOURS: Partial<Record<FastingMode, number>> = { '16:8': 8, '14:10': 10 };

/** Wochentage für `fasting.fastDays`: 0 = Sonntag ... 6 = Samstag (wie `Date.getDay()`). */
export const WEEKDAYS = [
  { day: 1, label: 'Mo' },
  { day: 2, label: 'Di' },
  { day: 3, label: 'Mi' },
  { day: 4, label: 'Do' },
  { day: 5, label: 'Fr' },
  { day: 6, label: 'Sa' },
  { day: 0, label: 'So' },
] as const;

/**
 * Neues Profil für das Formular. Körperdaten sind bewusst unbekannt (NaN) und müssen eingegeben werden.
 * Die übrigen Vorgaben sind Formular-Voreinstellungen, keine Empfehlung.
 */
export function newProfileDraft(id: string, now = Date.now()): Profile {
  return {
    id,
    name: '',
    sex: 'm',
    birthYear: NaN,
    heightCm: NaN,
    weightKg: NaN,
    pal: 1.4,
    goal: 'halten',
    macroPattern: 'ausgewogen',
    foodFilter: 'omnivor',
    fasting: { mode: 'keins' },
    phytate: 'mittel',
    targetOverrides: {},
    createdAt: now,
  };
}

/** Grenzen nur zur Plausibilitätsprüfung der Eingabe (Tippfehler), keine Ernährungswerte. */
export const LIMITS = { heightCm: [100, 250], weightKg: [30, 300], age: [10, 120] } as const;

export type ProfileErrors = Partial<Record<'name' | 'birthYear' | 'heightCm' | 'weightKg' | 'split' | 'fastDays', string>>;

export function validateProfile(p: Profile, now = new Date()): ProfileErrors {
  const e: ProfileErrors = {};
  if (!p.name.trim()) e.name = 'Name fehlt.';
  const age = ageOf(p, now);
  if (!Number.isInteger(p.birthYear) || age < LIMITS.age[0] || age > LIMITS.age[1])
    e.birthYear = 'Geburtsjahr als vierstellige Zahl eingeben.';
  const inRange = (v: number, [lo, hi]: readonly [number, number]) => Number.isFinite(v) && v >= lo && v <= hi;
  if (!inRange(p.heightCm, LIMITS.heightCm)) e.heightCm = `Größe zwischen ${LIMITS.heightCm[0]} und ${LIMITS.heightCm[1]} cm eingeben.`;
  if (!inRange(p.weightKg, LIMITS.weightKg)) e.weightKg = `Gewicht zwischen ${LIMITS.weightKg[0]} und ${LIMITS.weightKg[1]} kg eingeben.`;
  if (p.customSplit) {
    const { proteinPct, fatPct, carbsPct } = p.customSplit;
    const parts = [proteinPct, fatPct, carbsPct];
    if (!parts.every((v) => Number.isFinite(v) && v >= 0) || Math.round(proteinPct + fatPct + carbsPct) !== 100)
      e.split = 'Die Anteile müssen zusammen 100 % ergeben.';
  }
  if (p.fasting.mode === '5:2' && (p.fasting.fastDays?.length ?? 0) !== 2) e.fastDays = 'Genau zwei Fastentage wählen.';
  return e;
}

export const isValid = (p: Profile, now = new Date()): boolean => Object.keys(validateProfile(p, now)).length === 0;

/** Hinweise zur Reichweite der Datengrundlage (nicht blockierend). */
export function profileNotes(p: Profile, now = new Date()): string[] {
  const notes: string[] = [];
  if (Number.isInteger(p.birthYear) && ageOf(p, now) < 19)
    notes.push('Die DGE-Referenzwerte in dieser App gelten nur für Erwachsene ab 19 Jahren.');
  return notes;
}

/** Berechnete Ziele; `undefined`, solange die Eingaben ungültig sind. */
export function targetsOf(p: Profile, now = new Date()): EnergyTargets | undefined {
  return isValid(p, now) ? energyTargets(p, now) : undefined;
}

const TARGET_FIELD = { kcal: 'kcal', protein: 'proteinG', fat: 'fatG', carbs: 'carbsG' } as const;

/** Berechneter Wert eines Ziels ohne dessen eigene Überschreibung (Ziel für "Zurücksetzen"). */
export function calculatedTarget(p: Profile, key: TargetKey, now = new Date()): number {
  const { [key]: _dropped, ...rest } = p.targetOverrides;
  return energyTargets({ ...p, targetOverrides: rest }, now)[TARGET_FIELD[key]];
}

export function setTargetOverride(p: Profile, key: TargetKey, value: number | undefined): Profile {
  const { [key]: _dropped, ...rest } = p.targetOverrides;
  const targetOverrides = value === undefined || !Number.isFinite(value) ? rest : { ...rest, [key]: Math.round(value) };
  return { ...p, targetOverrides };
}

/** Beim Wechsel des Ziels gilt wieder die Standard-Anpassung des neuen Ziels. */
export function setGoal(p: Profile, goal: Goal): Profile {
  const { kcalAdjust: _dropped, ...rest } = p;
  return { ...rest, goal };
}

export const effectiveKcalAdjust = (p: Pick<Profile, 'goal' | 'kcalAdjust'>): number =>
  p.kcalAdjust ?? GOAL_DEFAULTS[p.goal].kcalAdjust;

export function setKcalAdjust(p: Profile, value: number | undefined): Profile {
  const { kcalAdjust: _dropped, ...rest } = p;
  return value === undefined || !Number.isFinite(value) ? rest : { ...rest, kcalAdjust: Math.round(value) };
}

/** Makro-Muster wählen: eigene Anteile werden verworfen; "eigene" startet mit den bisherigen Anteilen. */
export function setMacroPattern(p: Profile, id: MacroPatternId): Profile {
  const current = splitFor(p);
  const { customSplit: _dropped, ...rest } = p;
  return id === 'eigene' ? { ...rest, macroPattern: id, customSplit: { ...current } } : { ...rest, macroPattern: id };
}

export function setCustomSplit(p: Profile, split: MacroSplit): Profile {
  return { ...p, customSplit: split };
}

/** Anpassung eines Musters zurücknehmen (nur bei Mustern, nicht bei "eigene"). */
export function resetSplit(p: Profile): Profile {
  const { customSplit: _dropped, ...rest } = p;
  return rest;
}

/** Energie der Makro-Ziele in g (Protein, Fett, Kohlenhydrate), zum Vergleich mit dem Kalorienziel. */
export function macroKcal(t: Pick<EnergyTargets, 'proteinG' | 'fatG' | 'carbsG'>): number {
  return t.proteinG * KCAL_PER_G.protein + t.fatG * KCAL_PER_G.fat + t.carbsG * KCAL_PER_G.carbs;
}

/** Ende des Essensfensters aus Beginn und Modus (16:8, 14:10); sonst `undefined`. Format HH:MM. */
export function eatingWindowEnd(mode: FastingMode, start: string): string | undefined {
  const hours = EATING_HOURS[mode];
  const m = /^(\d{2}):(\d{2})$/.exec(start);
  if (hours === undefined || !m) return undefined;
  const h = (Number(m[1]) + hours) % 24;
  return `${String(h).padStart(2, '0')}:${m[2]}`;
}

export function setFastingMode(p: Profile, mode: FastingMode): Profile {
  const { eatingWindowStart, fastDays } = p.fasting;
  if (mode === 'keins') return { ...p, fasting: { mode } };
  if (mode === '5:2') return { ...p, fasting: { mode, fastDays } };
  const end = eatingWindowStart ? eatingWindowEnd(mode, eatingWindowStart) : undefined;
  return {
    ...p,
    fasting: { mode, eatingWindowStart, eatingWindowEnd: end ?? (mode === 'eigene' ? p.fasting.eatingWindowEnd : undefined) },
  };
}

export function setEatingWindow(p: Profile, start: string | undefined, end?: string): Profile {
  const mode = p.fasting.mode;
  return {
    ...p,
    fasting: { ...p.fasting, eatingWindowStart: start, eatingWindowEnd: mode === 'eigene' ? end : start ? eatingWindowEnd(mode, start) : undefined },
  };
}

export function toggleFastDay(p: Profile, day: number): Profile {
  const cur = p.fasting.fastDays ?? [];
  const fastDays = cur.includes(day) ? cur.filter((d) => d !== day) : [...cur, day];
  return { ...p, fasting: { ...p.fasting, fastDays } };
}
