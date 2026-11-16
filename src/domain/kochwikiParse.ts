/**
 * Liest ein Rezept aus dem Wikitext des Koch-Wiki (https://www.kochwiki.org, Texte unter CC BY-SA 3.0).
 * Aufbau der Seiten (geprüft am 15.11.2026 an 40 zufälligen Rezepten): Vorlage {{Rezept| Menge, Zeit, Schwierigkeit }},
 * Abschnitte "Zutaten", "Kochgeschirr", "Zubereitung", "Beilagen", "Varianten"; Zutaten als Liste mit Verweisen [[Zutat:…|…]].
 * Nährwerte stehen dort nicht; sie entstehen erst durch die Zuordnung zu Lebensmitteln der App.
 */
import { gramsOf, parseIngredientLine, parseQuantity } from './ingredientLine';
import type { FoodFilter, RecipeIngredient } from './types';

export interface ParsedRecipe {
  title: string;
  /** Erste Zahl der Angabe "Menge"; undefined, wenn dort keine Zahl steht. */
  servings?: number;
  servingsNote?: string;
  time?: string;
  difficulty?: string;
  ingredients: RecipeIngredient[];
  instructions: string;
  tags: string[];
  /** Nur gesetzt, wenn eine Kategorie der Seite mit "Vegan…" oder "Vegetarisch…" beginnt. */
  diet?: FoodFilter;
}

const ENTITIES: Record<string, string> = { '&nbsp;': ' ', '&#8239;': ' ', '&#160;': ' ', '&amp;': '&', '&quot;': '"', '&#039;': "'", '&lt;': '<', '&gt;': '>' };

/** Entfernt Wiki-Auszeichnung aus einer Zeile und lässt den sichtbaren Text stehen. */
export function stripWiki(text: string): string {
  let s = text;
  s = s.replace(/<ref[^>]*>.*?<\/ref>/gis, '').replace(/<ref[^>]*\/>/gi, '');
  s = s.replace(/<br\s*\/?>/gi, ' ').replace(/<\/?[a-z][^>]*>/gi, '');
  // Vorlagen: Bruch {{B|1|8}} und Temperatur {{Grad|180}} / {{G|180}} haben sichtbaren Text, alle anderen sind Symbole oder Hinweise.
  s = s.replace(/\{\{\s*B\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\}\}/g, '$1/$2');
  s = s.replace(/\{\{\s*(?:Grad|G)\s*\|\s*([^}|]+?)\s*\}\}/g, '$1 °C');
  s = s.replace(/\{\{[^{}]*\}\}/g, '');
  // Dateien samt Beschriftung entfallen (Bilder haben eigene Lizenzen und werden nicht übernommen).
  s = s.replace(/\[\[\s*(?:Datei|Bild|Image|File)\s*:(?:[^[\]]|\[\[[^\]]*\]\])*\]\]/gi, '');
  s = s.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, (_m, shown: string) => shown.replace(/^:?(?:Zutat|Zubereitung|Kategorie|Wein|Bier|Whisky|Wissen|Gesundheit):/, ''));
  s = s.replace(/\[https?:\/\/\S+\s+([^\]]+)\]/g, '$1').replace(/\[https?:\/\/\S+\]/g, '');
  s = s.replace(/'{2,}/g, '');
  s = s.replace(/&#?\w+;/g, (e) => ENTITIES[e] ?? e);
  return s.replace(/[ \t]+/g, ' ').trim();
}

/** Ziel des ersten Verweises auf eine Zutatenseite, z. B. "Olivenöl" aus [[Zutat:Olivenöl|natives Olivenöl]]. */
export function ingredientKey(line: string): string | undefined {
  const m = /\[\[\s*Zutat\s*:\s*([^\]|#]+)/.exec(line);
  return m ? m[1].trim() : undefined;
}

interface Section {
  level: number;
  heading: string;
  lines: string[];
}

function sections(wikitext: string): Section[] {
  const out: Section[] = [{ level: 0, heading: '', lines: [] }];
  for (const line of wikitext.split(/\r?\n/)) {
    const h = /^(={2,})\s*(.*?)\s*\1\s*$/.exec(line);
    if (h) out.push({ level: h[1].length, heading: stripWiki(h[2]), lines: [] });
    else out[out.length - 1].lines.push(line);
  }
  return out;
}

/** Abschnitte der Ebene 2, deren Überschrift passt, samt ihrer Unterabschnitte. */
function blocks(all: Section[], match: RegExp): Section[] {
  const out: Section[] = [];
  let inside = false;
  for (const s of all) {
    if (s.level === 2) inside = match.test(s.heading);
    if (inside && s.level >= 2) out.push(s);
  }
  return out;
}

function templateField(wikitext: string, name: string): string | undefined {
  const m = new RegExp(String.raw`^\s*\|\s*${name}\s*=\s*(.*)$`, 'm').exec(wikitext);
  const v = m && stripWiki(m[1]);
  return v || undefined;
}

function toIngredient(line: string): RecipeIngredient | undefined {
  const name = stripWiki(line.replace(/^\*+\s*/, '')).replace(/[,;]$/, '').trim();
  // "…" ist im Koch-Wiki der Platzhalter für leere Listen.
  if (!name || /^(…|\.\.\.)$/.test(name)) return undefined;
  const parsed = parseIngredientLine(name);
  const grams = gramsOf(parsed);
  return {
    name,
    rawMeasure: parsed.rawMeasure,
    amount: parsed.amount,
    unit: parsed.unit,
    key: ingredientKey(line),
    grams,
    gramsOrigin: grams === undefined ? undefined : 'quelle',
  };
}

export function dietFromCategories(categories: string[]): FoodFilter | undefined {
  const names = categories.map((c) => c.replace(/^Kategorie:/, ''));
  if (names.some((c) => /^Vegan/i.test(c))) return 'vegan';
  if (names.some((c) => /^Vegetarisch/i.test(c))) return 'vegetarisch';
  return undefined;
}

/** Kategorien, die nur der Verwaltung des Wikis dienen, werden nicht als Schlagwort übernommen. */
const TECH_CATEGORY = /^(Schwierigkeit |Rezepte (mit|ohne) Alkohol$)/;

export function parseKochwiki(title: string, wikitext: string, categories: string[] = []): ParsedRecipe {
  const all = sections(wikitext);
  const ingredients = blocks(all, /^(Weitere )?Zutaten/i)
    .flatMap((s) => s.lines)
    .filter((l) => l.startsWith('*'))
    .map(toIngredient)
    .filter((i): i is RecipeIngredient => i !== undefined);

  const steps: string[] = [];
  for (const s of blocks(all, /^(Vorbereitung|Zubereitung|Fertigstellung|Servieren|Anrichten)/i)) {
    if (s.level > 2 && s.heading) steps.push(`${s.heading}:`);
    for (const l of s.lines) {
      if (/^\s*\[\[\s*(Datei|Bild|Image|File)\s*:/i.test(l) || /^\s*<\/?gallery/i.test(l)) continue;
      const t = stripWiki(l.replace(/^[*#:]+\s*/, ''));
      if (t && t !== '…') steps.push(t);
    }
  }

  const servingsNote = templateField(wikitext, 'Menge');
  const firstNumber = servingsNote && /\d+(?:[.,]\d+)?/.exec(servingsNote);
  const servings = firstNumber ? parseQuantity(firstNumber[0]) : undefined;
  const names = categories.map((c) => c.replace(/^Kategorie:/, ''));
  return {
    title,
    servings: servings && servings > 0 ? servings : undefined,
    servingsNote,
    time: templateField(wikitext, 'Zeit'),
    difficulty: templateField(wikitext, 'Schwierigkeit'),
    ingredients,
    instructions: steps.join('\n'),
    tags: names.filter((c) => !TECH_CATEGORY.test(c)),
    diet: dietFromCategories(categories),
  };
}

/** Seiten ohne Rezeptvorlage und ohne Zutatenliste sind keine Rezepte (z. B. Übersichten). */
export function looksLikeRecipe(wikitext: string): boolean {
  return /\{\{\s*Rezept\s*\|/.test(wikitext) || /^==\s*Zutaten/m.test(wikitext);
}
