import type { NutrientKey, NutrientValues } from './nutrients';

export type Sex = 'm' | 'w';
export type Goal = 'abnehmen' | 'halten' | 'zunehmen' | 'muskelaufbau';
export type MacroPatternId = 'ausgewogen' | 'lowcarb' | 'keto' | 'highcarb' | 'highprotein' | 'eigene';
export type FoodFilter = 'omnivor' | 'pescetarisch' | 'vegetarisch' | 'vegan';
export type FastingMode = 'keins' | '16:8' | '14:10' | '5:2' | 'eigene';
export type MealSlot = 'fruehstueck' | 'mittag' | 'abend' | 'snack';

export interface MacroSplit {
  /** Anteile an der Energie in Prozent, Summe 100. */
  proteinPct: number;
  fatPct: number;
  carbsPct: number;
}

export interface Profile {
  id: string;
  name: string;
  sex: Sex;
  birthYear: number;
  heightCm: number;
  weightKg: number;
  /** Physical Activity Level, siehe energy.ts PAL_LEVELS. */
  pal: number;
  goal: Goal;
  /** Gewünschte Änderung in kcal/Tag gegenüber dem Gesamtumsatz (negativ = Defizit). Überschreibt den Standard des Ziels. */
  kcalAdjust?: number;
  macroPattern: MacroPatternId;
  /** Nur bei macroPattern 'eigene' oder wenn der Nutzer ein Muster angepasst hat. */
  customSplit?: MacroSplit;
  foodFilter: FoodFilter;
  fasting: { mode: FastingMode; eatingWindowStart?: string; eatingWindowEnd?: string; fastDays?: number[] };
  /** Für die Zink-Empfehlung der DGE. */
  phytate: 'niedrig' | 'mittel' | 'hoch';
  /** Für die Eisen-Empfehlung der DGE (Frauen). Undefiniert = nach Alter (ab 51 postmenopausal angenommen). */
  postmenopausal?: boolean;
  /** Eigene Tagesziele; überschreiben die berechneten bzw. die DGE-Referenzwerte. */
  targetOverrides: Partial<Record<NutrientKey, number>>;
  createdAt: number;
}

export type FoodSource = 'bls' | 'off' | 'custom';

export interface Food {
  /** `bls:<Code>`, `off:<Barcode>` oder `custom:<uuid>` */
  id: string;
  source: FoodSource;
  name: string;
  nameEn?: string;
  brand?: string;
  barcode?: string;
  per100: NutrientValues;
  /** Übliche Portion in Gramm, falls bekannt. */
  servingG?: number;
  updatedAt: number;
}

export interface DiaryEntry {
  id: string;
  profileId: string;
  /** YYYY-MM-DD */
  date: string;
  meal: MealSlot;
  foodId?: string;
  recipeId?: string;
  grams: number;
  /** Kopie zum Zeitpunkt des Eintrags, damit alte Tage stabil bleiben, wenn sich Lebensmittel ändern. */
  name: string;
  per100: NutrientValues;
  createdAt: number;
}

export interface WeightEntry {
  id: string;
  profileId: string;
  date: string;
  weightKg: number;
}

export interface RecipeIngredient {
  /** Anzeigetext; bei importierten Rezepten die Zutatenzeile der Quelle (ohne Wiki-Auszeichnung). */
  name: string;
  /** Mengenangabe der Quelle im Wortlaut, z. B. "2 EL" oder "100–150 g". */
  rawMeasure?: string;
  /** Aus der Quelle gelesene Menge und Einheit (bei Spannen der Mittelwert), für gemerkte Umrechnungen. */
  amount?: number;
  unit?: string;
  /** Schlüssel für gemerkte Zuordnungen; beim Koch-Wiki das Ziel des Zutat-Links (z. B. "Olivenöl"). */
  key?: string;
  /** Zugeordnetes Lebensmittel; ohne Zuordnung fehlen die Nährwerte dieser Zutat. */
  foodId?: string;
  /** Kopie von Name und Nährwerten des Lebensmittels, damit das Rezept stabil bleibt, wenn es geändert oder gelöscht wird. */
  foodName?: string;
  per100?: NutrientValues;
  grams?: number;
  /**
   * Herkunft vorbelegter Gramm: Gewichtsangabe der Quelle, gemerkter Wert des Nutzers, Umrechnung über die Dichte
   * (Schweizer Nährwertdatenbank), über US-Portionsgewichte (USDA) oder über die Löffeltabelle des Koch-Wiki.
   * Fehlt, sobald der Nutzer den Wert ändert.
   */
  gramsOrigin?: 'quelle' | 'gemerkt' | 'dichte' | 'usda' | 'kochwiki';
  /** Herleitung einer umgerechneten Menge im Wortlaut (nur bei 'dichte', 'usda' und 'kochwiki'). */
  gramsNote?: string;
  /** true: Lebensmittel automatisch vorgeschlagen und vom Nutzer noch nicht bestätigt oder geändert. */
  suggested?: boolean;
  /** true: bewusst nicht berechnet (z. B. "Salz nach Geschmack"); zählt nicht als offene Zutat. */
  ignored?: boolean;
}

export type RecipeSource = 'kochwiki' | 'custom';

export interface Recipe {
  id: string;
  source: RecipeSource;
  /** Seitennummer in der Quelle. */
  sourceId?: string;
  sourceUrl?: string;
  /** Titel der Seite in der Quelle (für die Namensnennung). */
  sourceTitle?: string;
  /** true, wenn Titel, Zutatentext oder Zubereitung gegenüber der Quelle geändert wurden (Kennzeichnungspflicht CC BY-SA). */
  modified?: boolean;
  title: string;
  servings: number;
  /** Mengenangabe der Quelle im Wortlaut, z. B. "4 bis 6 Personen". */
  servingsNote?: string;
  ingredients: RecipeIngredient[];
  instructions: string;
  tags: string[];
  /** Ernährungsweise, zu der das Rezept passt; undefined = keine Angabe. */
  diet?: FoodFilter;
  /** true, wenn keine Zutat offen ist (jede hat Lebensmittel und Gramm oder ist bewusst nicht berechnet). */
  nutritionComplete: boolean;
  /** Berechnete Nährwerte je Portion (aus den zugeordneten Zutaten). */
  perServing: NutrientValues;
  updatedAt: number;
}

export interface ShoppingItem {
  /** Zusammenfassungsschlüssel (`food:<foodId>`, `text:<Name>|<Einheit>`) bzw. `own:<uuid>` bei eigenen Posten; je Liste eindeutig. */
  id: string;
  /** Name des Lebensmittels bzw. Text der Zutat ohne Mengenangabe. */
  name: string;
  /** Gramm (Rohgewicht), nur bei Posten mit zugeordnetem Lebensmittel. */
  grams?: number;
  /** Menge und Einheit der Quelle bei Textposten (Zutaten ohne Zuordnung), ohne Umrechnung; nur Gewichte werden in g umgerechnet. */
  amount?: number;
  unit?: string;
  foodId?: string;
  /** Titel der Rezepte, aus denen der Posten stammt. */
  from?: string[];
  /** true: vom Nutzer eingetragen. */
  own?: boolean;
  checked: boolean;
}

/** Rezept auf einer Einkaufsliste; Titel als Kopie, falls das Rezept gelöscht wird. */
export interface ShoppingRecipe {
  id: string;
  title: string;
  portions: number;
}

export interface ShoppingList {
  id: string;
  profileId: string;
  title: string;
  recipes: ShoppingRecipe[];
  items: ShoppingItem[];
  createdAt: number;
}
