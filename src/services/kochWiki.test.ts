import { describe, expect, it } from 'vitest';
import { fetchKochwikiRecipe, kochwikiPageUrl, searchKochwiki } from './kochWiki';

const json = (body: unknown, status = 200) => async (url: string | URL | Request) => {
  calls.push(String(url));
  return new Response(JSON.stringify(body), { status });
};
let calls: string[] = [];

describe('Koch-Wiki', () => {
  it('sucht im Rezept-Namensraum mit CORS-Parameter und lässt Weiterleitungen weg', async () => {
    calls = [];
    const hits = await searchKochwiki('Linsen Suppe', json({
      query: { search: [
        { pageid: 1, title: 'Linsensuppe', wordcount: 394, snippet: 'Die <span class="searchmatch">Linsensuppe</span>' },
        { pageid: 2, title: 'Rote Linsensuppe', wordcount: 8, snippet: '#WEITERLEITUNG [[Rote <span class="searchmatch">Linsensuppe</span>]]' },
        { pageid: 3, title: 'Kürbis-Linsensuppe', wordcount: 3, snippet: '' },
      ] },
    }) as typeof fetch);
    expect(hits).toEqual([{ pageId: 1, title: 'Linsensuppe' }]);
    const url = new URL(calls[0]);
    expect(url.origin + url.pathname).toBe('https://www.kochwiki.org/w/api.php');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ action: 'query', list: 'search', srsearch: 'Linsen Suppe', srnamespace: '0', origin: '*', format: 'json' });
  });

  it('lädt und liest ein Rezept', async () => {
    const r = await fetchKochwikiRecipe(7, json({
      query: { pages: [{ pageid: 7, title: 'Test Suppe', revisions: [{ slots: { main: { content: '{{Rezept|\n | Menge = 2 Personen\n|}}\n== Zutaten ==\n* 100 g [[Zutat:Linse|Linsen]]\n== Zubereitung ==\n* Kochen.\n' } } }], categories: [{ title: 'Kategorie:Vegane Suppen' }] }] },
    }) as typeof fetch);
    expect(r).toMatchObject({ pageId: 7, title: 'Test Suppe', servings: 2, diet: 'vegan', url: 'https://www.kochwiki.org/wiki/Test_Suppe', instructions: 'Kochen.' });
    expect(r?.ingredients).toEqual([{ name: '100 g Linsen', rawMeasure: '100 g', amount: 100, unit: 'g', key: 'Linse', grams: 100, gramsOrigin: 'quelle' }]);
    expect(kochwikiPageUrl('Rührei & Speck')).toBe('https://www.kochwiki.org/wiki/R%C3%BChrei_%26_Speck');
  });

  it('fehlende Seiten und Nicht-Rezepte ergeben undefined', async () => {
    expect(await fetchKochwikiRecipe(8, json({ query: { pages: [{ title: 'X', missing: true }] } }) as typeof fetch)).toBeUndefined();
    expect(await fetchKochwikiRecipe(9, json({ query: { pages: [{ pageid: 9, title: 'Suppen', revisions: [{ slots: { main: { content: 'Übersicht' } } }] }] } }) as typeof fetch)).toBeUndefined();
  });

  it('meldet Netz-, Server- und API-Fehler verständlich', async () => {
    await expect(searchKochwiki('x', (async () => { throw new TypeError('Failed to fetch'); }) as typeof fetch)).rejects.toThrow(/nicht erreichbar/);
    await expect(searchKochwiki('x', json({}, 503) as typeof fetch)).rejects.toThrow(/503/);
    await expect(searchKochwiki('x', json({ error: { info: 'kaputt' } }) as typeof fetch)).rejects.toThrow(/kaputt/);
  });
});
