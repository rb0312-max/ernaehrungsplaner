/**
 * BLS-Grunddaten (public/data/bls.json, erzeugt von tools/build_bls.py).
 * Werden einmal geladen und im Speicher gehalten; der Service Worker hält die Datei offline vor.
 */
import type { NutrientKey, NutrientValues } from '../domain/nutrients';
import { expandWord } from '../domain/synonyms';
import type { Food } from '../domain/types';

export interface BlsFile {
  version: string;
  source: string;
  license: string;
  nutrients: NutrientKey[];
  /** [Code, Name, englischer Name, ...Werte in der Reihenfolge von `nutrients`] */
  foods: [string, string, string, ...(number | null)[]][];
}

export interface BlsIndex {
  meta: Pick<BlsFile, 'version' | 'source' | 'license'>;
  foods: Food[];
  byId: Map<string, Food>;
  /** Kleingeschriebener Suchtext (deutsch + englisch) je Lebensmittel, gleiche Reihenfolge wie `foods`. */
  haystack: string[];
  /** Deutscher Name ohne Leer-/Sonderzeichen, damit "haferflocken" auch "Hafer Flocken" findet. */
  compact: string[];
  /** Wörter des deutschen Namens. */
  tokens: string[][];
}

export function buildBlsIndex(file: BlsFile): BlsIndex {
  const foods: Food[] = file.foods.map(([code, name, nameEn, ...values]) => {
    const per100: NutrientValues = {};
    file.nutrients.forEach((k, i) => {
      const v = values[i];
      if (v !== null && v !== undefined) per100[k] = v;
    });
    return { id: `bls:${code}`, source: 'bls', name, nameEn: nameEn || undefined, per100, updatedAt: 0 };
  });
  return {
    meta: { version: file.version, source: file.source, license: file.license },
    foods,
    byId: new Map(foods.map((f) => [f.id, f])),
    haystack: foods.map((f) => normalize(`${f.name} ${f.nameEn ?? ''}`)),
    compact: foods.map((f) => normalize(f.name).replace(/[^a-z0-9]/g, '')),
    tokens: foods.map((f) => normalize(f.name).split(/[^a-z0-9]+/).filter(Boolean)),
  };
}

let cached: Promise<BlsIndex> | undefined;

export function loadBls(): Promise<BlsIndex> {
  cached ??= fetch(`${import.meta.env.BASE_URL}data/bls.json`)
    .then((r) => {
      if (!r.ok) throw new Error(`BLS-Daten nicht ladbar (${r.status})`);
      return r.json() as Promise<BlsFile>;
    })
    .then(buildBlsIndex)
    .catch((e) => {
      cached = undefined;
      throw e;
    });
  return cached;
}

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Rangzahl eines Suchworts für das Lebensmittel i; Infinity = kommt nicht vor. */
function wordScore(index: BlsIndex, i: number, w: string): number {
  const tokens = index.tokens[i];
  const c = index.compact[i];
  if (tokens[0] === w || c === w) return 0;
  if (tokens.includes(w)) return 1;
  if (tokens[0].startsWith(w) || c.startsWith(w)) return 2;
  if (tokens.some((t) => t.startsWith(w))) return 3;
  if (c.includes(w)) return 6;
  if (index.haystack[i].includes(w)) return 10;
  return Infinity;
}

/**
 * Suche: alle Suchwörter müssen vorkommen. Rangfolge je Suchwort (kleiner = besser):
 * erstes Wort des Namens (0), anderes ganzes Wort (1), Wortanfang (2-3), irgendwo im Namen (6),
 * nur im englischen Namen (10). Bei Gleichstand zuerst kürzere Namen (meist das Grundlebensmittel).
 */
export function searchBls(index: BlsIndex, query: string, limit = 50): Food[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  // Je Suchwort zählt die beste Variante aus Wort und Synonymen (siehe domain/synonyms.ts).
  const variants = words.map((w) => [w, ...expandWord(w)]);
  const hits: { food: Food; score: number }[] = [];
  index.foods.forEach((food, i) => {
    let score = 0;
    for (const alts of variants) {
      let best = Infinity;
      for (const w of alts) best = Math.min(best, wordScore(index, i, w));
      if (best === Infinity) return;
      score += best;
    }
    hits.push({ food, score: score * 1000 + food.name.length });
  });
  return hits
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((h) => h.food);
}

/** Zubereitete Gerichte im BLS: Codes, die mit X oder Y beginnen (PLAN.md, Abschnitt 5a). */
export const isBlsDish = (id: string): boolean => /^bls:[XY]/.test(id);

export function listDishes(index: BlsIndex): Food[] {
  return index.foods.filter((f) => isBlsDish(f.id));
}

/**
 * Vorschlag für eine Rezeptzutat: nur wenn ein Grundlebensmittel (kein Gericht) genau mit diesem Wort beginnt
 * oder so heißt. Bevorzugt die rohe Form, sonst der kürzeste Name. Kein Treffer = kein Vorschlag;
 * der Nutzer wählt dann selbst. Der Vorschlag ist in der Oberfläche als ungeprüft zu kennzeichnen.
 */
export function suggestIngredientFood(index: BlsIndex, name: string): Food | undefined {
  const word = normalize(name).trim();
  if (!word) return undefined;
  const single = !/\s/.test(word);
  const alts = single ? [word, ...expandWord(word)] : [];
  const compactWord = word.replace(/[^a-z0-9]/g, '');
  const hits: Food[] = [];
  index.foods.forEach((food, i) => {
    if (isBlsDish(food.id)) return;
    if (index.compact[i] === compactWord || alts.includes(index.tokens[i][0])) hits.push(food);
  });
  if (!hits.length) return undefined;
  const raw = hits.filter((f) => /(^|[ ,])roh$/.test(f.name));
  return (raw.length ? raw : hits).sort((a, b) => a.name.length - b.name.length)[0];
}
