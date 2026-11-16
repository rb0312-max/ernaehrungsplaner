/**
 * Energiebedarf und Makro-Ziele.
 * Grundumsatz nach Mifflin-St Jeor (1990); Gesamtumsatz = Grundumsatz × PAL.
 * Die Zu-/Abschläge je Ziel und die Makro-Verteilungen der Ernährungsformen sind
 * übliche Startwerte (keine offiziellen Vorgaben) und pro Profil anpassbar.
 */
import { ageOf, dgeProteinPerKg } from './referenceValues';
import type { Goal, MacroPatternId, MacroSplit, Profile, Sex } from './types';

export const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9, alcohol: 7 } as const;

/** PAL-Stufen. 1,4 / 1,6 / 1,8 sind die Stufen der DGE-Richtwerte für die Energiezufuhr; 1,2 und 2,0 sind übliche Ergänzungen. */
export const PAL_LEVELS = [
  { value: 1.2, label: 'Fast nur sitzend oder liegend' },
  { value: 1.4, label: 'Sitzend, kaum Freizeitaktivität (Büro)' },
  { value: 1.6, label: 'Sitzend, zeitweise gehend/stehend' },
  { value: 1.8, label: 'Überwiegend gehend/stehend' },
  { value: 2.0, label: 'Körperlich anstrengende Arbeit oder viel Sport' },
] as const;

export function bmrMifflinStJeor(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'm' ? 5 : -161);
}

/** Standard-Anpassung in kcal/Tag je Ziel (Startwert, anpassbar über Profile.kcalAdjust). */
export const GOAL_DEFAULTS: Record<Goal, { label: string; kcalAdjust: number }> = {
  abnehmen: { label: 'Abnehmen', kcalAdjust: -500 },
  halten: { label: 'Gewicht halten', kcalAdjust: 0 },
  zunehmen: { label: 'Zunehmen', kcalAdjust: 300 },
  muskelaufbau: { label: 'Muskelaufbau', kcalAdjust: 300 },
};

export const MACRO_PATTERNS: Record<Exclude<MacroPatternId, 'eigene'>, { label: string; split: MacroSplit; hint: string }> = {
  ausgewogen: {
    label: 'Ausgewogen (DGE)',
    split: { proteinPct: 15, fatPct: 30, carbsPct: 55 },
    hint: 'DGE-Richtwerte: ca. 30 % Fett, über 50 % Kohlenhydrate',
  },
  lowcarb: { label: 'Low Carb', split: { proteinPct: 30, fatPct: 45, carbsPct: 25 }, hint: 'Startwert, anpassbar' },
  keto: { label: 'Keto', split: { proteinPct: 20, fatPct: 75, carbsPct: 5 }, hint: 'Startwert, anpassbar' },
  highcarb: { label: 'High Carb', split: { proteinPct: 15, fatPct: 20, carbsPct: 65 }, hint: 'Startwert, anpassbar' },
  highprotein: { label: 'High Protein', split: { proteinPct: 30, fatPct: 30, carbsPct: 40 }, hint: 'Startwert, anpassbar' },
};

export function splitFor(profile: Pick<Profile, 'macroPattern' | 'customSplit'>): MacroSplit {
  if (profile.customSplit) return profile.customSplit;
  if (profile.macroPattern === 'eigene') return MACRO_PATTERNS.ausgewogen.split;
  return MACRO_PATTERNS[profile.macroPattern].split;
}

export interface EnergyTargets {
  bmr: number;
  tdee: number;
  /** Tagesziel nach Zielanpassung. */
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  /** Mindest-Protein nach DGE (g/Tag) zum Vergleich. */
  dgeProteinMinG: number;
  /** Hinweise, z. B. wenn das Ziel unter den Grundumsatz fällt. */
  warnings: string[];
}

type EnergyProfile = Pick<
  Profile,
  'sex' | 'birthYear' | 'heightCm' | 'weightKg' | 'pal' | 'goal' | 'kcalAdjust' | 'macroPattern' | 'customSplit' | 'targetOverrides'
>;

export function energyTargets(profile: EnergyProfile, now = new Date()): EnergyTargets {
  const age = ageOf(profile, now);
  const bmr = bmrMifflinStJeor(profile.sex, profile.weightKg, profile.heightCm, age);
  const tdee = bmr * profile.pal;
  const o = profile.targetOverrides;
  const kcal = o.kcal ?? tdee + (profile.kcalAdjust ?? GOAL_DEFAULTS[profile.goal].kcalAdjust);
  const split = splitFor(profile);
  const targets: EnergyTargets = {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    kcal: Math.round(kcal),
    proteinG: Math.round(o.protein ?? (kcal * split.proteinPct) / 100 / KCAL_PER_G.protein),
    fatG: Math.round(o.fat ?? (kcal * split.fatPct) / 100 / KCAL_PER_G.fat),
    carbsG: Math.round(o.carbs ?? (kcal * split.carbsPct) / 100 / KCAL_PER_G.carbs),
    dgeProteinMinG: Math.round(dgeProteinPerKg(age) * profile.weightKg),
    warnings: [],
  };
  if (targets.kcal < targets.bmr) targets.warnings.push('Das Kalorienziel liegt unter dem Grundumsatz.');
  if (targets.proteinG < targets.dgeProteinMinG)
    targets.warnings.push('Das Proteinziel liegt unter der DGE-Empfehlung für dein Körpergewicht.');
  return targets;
}
