/**
 * Koch-Wiki (https://www.kochwiki.org): deutschsprachige Rezepte, Texte unter CC BY-SA 3.0
 * (https://creativecommons.org/licenses/by-sa/3.0/, Angabe im Seitenfuß und auf "Koch-Wiki:Lizenzbestimmungen", geprüft 15.11.2026).
 * Abruf über die MediaWiki-Schnittstelle; `origin=*` erlaubt den Aufruf aus dem Browser (geprüft 15.11.2026).
 * Bilder werden nicht übernommen (eigene Lizenzen je Datei).
 */
import { looksLikeRecipe, parseKochwiki, type ParsedRecipe } from '../domain/kochwikiParse';

const BASE = 'https://www.kochwiki.org';
const API = `${BASE}/w/api.php`;

export const KOCHWIKI_LICENSE = { name: 'CC BY-SA 3.0', url: 'https://creativecommons.org/licenses/by-sa/3.0/' } as const;
export const kochwikiPageUrl = (title: string): string => `${BASE}/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
export const kochwikiHistoryUrl = (title: string): string => `${BASE}/w/index.php?title=${encodeURIComponent(title.replace(/ /g, '_'))}&action=history`;

export interface WikiHit {
  pageId: number;
  title: string;
}

export interface WikiRecipe extends ParsedRecipe {
  pageId: number;
  url: string;
}

async function request<T>(fetchFn: typeof fetch, params: Record<string, string>): Promise<T> {
  const url = `${API}?${new URLSearchParams({ format: 'json', formatversion: '2', origin: '*', ...params })}`;
  let res: Response;
  try {
    res = await fetchFn(url);
  } catch {
    throw new Error('Das Koch-Wiki ist nicht erreichbar. Bitte die Internetverbindung prüfen und später erneut versuchen.');
  }
  if (!res.ok) throw new Error(`Das Koch-Wiki antwortet mit Fehler ${res.status}.`);
  const data = (await res.json()) as T & { error?: { info?: string } };
  if (data.error) throw new Error(`Das Koch-Wiki meldet einen Fehler: ${data.error.info ?? 'unbekannt'}`);
  return data;
}

/** Volltextsuche in den Rezeptseiten (Namensraum 0). Weiterleitungen und Seiten ohne Text entfallen. */
export async function searchKochwiki(query: string, fetchFn: typeof fetch = fetch): Promise<WikiHit[]> {
  const data = await request<{ query?: { search?: { pageid: number; title: string; snippet?: string; wordcount?: number }[] } }>(fetchFn, {
    action: 'query',
    list: 'search',
    srsearch: query,
    srnamespace: '0',
    srlimit: '30',
  });
  return (data.query?.search ?? [])
    .filter((h) => !/^#(WEITERLEITUNG|REDIRECT)/i.test((h.snippet ?? '').replace(/<[^>]+>/g, '')) && (h.wordcount ?? 0) > 20)
    .map((h) => ({ pageId: h.pageid, title: h.title }));
}

interface PageResponse {
  query?: {
    pages?: { pageid?: number; title: string; missing?: boolean; revisions?: { slots?: { main?: { content?: string } } }[]; categories?: { title: string }[] }[];
  };
}

/** Lädt eine Rezeptseite und liest sie aus; undefined, wenn es die Seite nicht gibt oder sie kein Rezept ist. */
export async function fetchKochwikiRecipe(pageId: number, fetchFn: typeof fetch = fetch): Promise<WikiRecipe | undefined> {
  const data = await request<PageResponse>(fetchFn, {
    action: 'query',
    pageids: String(pageId),
    prop: 'revisions|categories',
    rvprop: 'content',
    rvslots: 'main',
    cllimit: 'max',
  });
  const page = data.query?.pages?.[0];
  const text = page?.revisions?.[0]?.slots?.main?.content;
  if (!page || page.missing || !text || !looksLikeRecipe(text)) return undefined;
  const parsed = parseKochwiki(page.title, text, (page.categories ?? []).map((c) => c.title));
  return { ...parsed, pageId: page.pageid ?? pageId, url: kochwikiPageUrl(page.title) };
}
