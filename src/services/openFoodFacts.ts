/**
 * Open Food Facts (https://world.openfoodfacts.org), Daten unter ODbL.
 * Barcode-Abfrage und Textsuche; Ergebnisse werden auf den Food-Typ der App abgebildet.
 */
import { NUTRIENTS, type NutrientKey, type NutrientValues } from '../domain/nutrients';
import type { Food } from '../domain/types';

const BASE = 'https://world.openfoodfacts.org';
const FIELDS = 'code,product_name,product_name_de,brands,quantity,serving_quantity,nutriments';

/** Pflichtangaben der EU-Nährwerttabelle: hier ist 0 ein echter Wert. */
const LABEL_NUTRIENTS = new Set<NutrientKey>(['kcal', 'protein', 'fat', 'carbs', 'sugar', 'satFat', 'salt', 'fiber']);

interface OffProduct {
  code?: string;
  product_name?: string;
  product_name_de?: string;
  brands?: string;
  serving_quantity?: number | string;
  nutriments?: Record<string, unknown>;
}

export function mapOffProduct(p: OffProduct, now = Date.now()): Food | undefined {
  const n = p.nutriments ?? {};
  const per100: NutrientValues = {};
  for (const def of NUTRIENTS) {
    if (!('off' in def)) continue;
    const raw = n[`${def.off.field}_100g`];
    const v = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
    if (!Number.isFinite(v)) continue;
    // Bei Vitaminen/Mineralstoffen steht in OFF oft 0, obwohl der Wert nur nicht angegeben ist -> als unbekannt behandeln.
    if (v === 0 && !LABEL_NUTRIENTS.has(def.key)) continue;
    per100[def.key] = v * def.off.factor;
  }
  if (per100.kcal === undefined && typeof n['energy_100g'] === 'number') per100.kcal = (n['energy_100g'] as number) / 4.184;
  const name = (p.product_name_de || p.product_name || '').trim();
  if (!p.code || !name || per100.kcal === undefined) return undefined;
  const serving = Number(p.serving_quantity);
  return {
    id: `off:${p.code}`,
    source: 'off',
    name,
    brand: p.brands?.split(',')[0]?.trim() || undefined,
    barcode: p.code,
    per100,
    servingG: Number.isFinite(serving) && serving > 0 ? serving : undefined,
    updatedAt: now,
  };
}

/** OFF ist zeitweise überlastet (503) oder drosselt (429); das ist kein Fehler der App. */
function offError(status: number): Error {
  return new Error(
    status === 503 || status === 429
      ? 'Open Food Facts ist gerade überlastet. Bitte in einer Minute erneut versuchen.'
      : `Open Food Facts antwortet mit Fehler ${status}.`,
  );
}

/** Netzwerkfehler des Browsers ("Failed to fetch") treten bei Offline-Betrieb und bei Drosselung ohne CORS-Antwort auf. */
async function request(fetchFn: typeof fetch, url: string): Promise<Response> {
  try {
    return await fetchFn(url);
  } catch {
    throw new Error('Open Food Facts ist nicht erreichbar: keine Internetverbindung oder zu viele Anfragen in kurzer Zeit. Bitte in einer Minute erneut versuchen.');
  }
}

export type BarcodeResult = { status: 'found'; food: Food } | { status: 'not_found' } | { status: 'incomplete'; name?: string };

export async function fetchByBarcode(barcode: string, fetchFn: typeof fetch = fetch): Promise<BarcodeResult> {
  const res = await request(fetchFn, `${BASE}/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`);
  if (res.status === 404) return { status: 'not_found' };
  if (!res.ok) throw offError(res.status);
  const data = (await res.json()) as { status?: number; product?: OffProduct };
  if (data.status !== 1 || !data.product) return { status: 'not_found' };
  const food = mapOffProduct(data.product);
  return food ? { status: 'found', food } : { status: 'incomplete', name: data.product.product_name };
}

/** Textsuche. OFF begrenzt Suchanfragen (ca. 10 pro Minute), daher nur auf ausdrücklichen Nutzerwunsch aufrufen. */
export async function searchProducts(query: string, fetchFn: typeof fetch = fetch): Promise<Food[]> {
  const url = `${BASE}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=25&lc=de&fields=${FIELDS}`;
  const res = await request(fetchFn, url);
  if (!res.ok) throw offError(res.status);
  const data = (await res.json()) as { products?: OffProduct[] };
  return (data.products ?? []).map((p) => mapOffProduct(p)).filter((f): f is Food => f !== undefined);
}
