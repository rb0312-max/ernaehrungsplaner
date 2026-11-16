import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { draftFromWiki, findImported } from '../../db/recipeRepository';
import { KOCHWIKI_LICENSE, fetchKochwikiRecipe, searchKochwiki, type WikiHit } from '../../services/kochWiki';
import { RECIPES_PATH, RECIPE_NEW_PATH, recipePath, type RecipeEditorState } from './paths';

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Online-Suche im Koch-Wiki; ein Treffer wird geladen, ausgelesen und als Entwurf im Formular geöffnet. */
export function ImportView() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<{ query: string; hits: WikiHit[] }>();
  const [busy, setBusy] = useState<'search' | number>();
  const [error, setError] = useState<string>();

  // Nur auf Knopfdruck suchen, nicht bei jedem Tastendruck (fremder Server).
  async function search(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setBusy('search');
    setError(undefined);
    try {
      setResult({ query: q, hits: await searchKochwiki(q) });
    } catch (err) {
      setError(msg(err));
    } finally {
      setBusy(undefined);
    }
  }

  async function open(hit: WikiHit) {
    setBusy(hit.pageId);
    setError(undefined);
    try {
      const existing = await findImported(String(hit.pageId));
      if (existing) return navigate(recipePath(existing.id));
      const wiki = await fetchKochwikiRecipe(hit.pageId);
      if (!wiki) return setError(`„${hit.title}“ ist keine Rezeptseite mit Zutatenliste.`);
      const state: RecipeEditorState = { draft: await draftFromWiki(wiki) };
      navigate(RECIPE_NEW_PATH, { state });
    } catch (err) {
      setError(msg(err));
    } finally {
      setBusy(undefined);
    }
  }

  return (
    <section>
      <p><Link to={RECIPES_PATH}>← Rezepte</Link></p>
      <h1>Koch-Wiki durchsuchen</h1>
      <form onSubmit={search}>
        <input type="search" placeholder="Gericht oder Zutat, z. B. Linsensuppe" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Im Koch-Wiki suchen" />
        <div className="actions">
          <button type="submit" className="btn primary" disabled={busy !== undefined || !query.trim()}>{busy === 'search' ? 'Suche läuft …' : 'Suchen'}</button>
        </div>
      </form>
      {error && <p role="alert" className="error">{error}</p>}
      {result && (
        <>
          <h2>Treffer für „{result.query}“</h2>
          {!result.hits.length && <p className="muted">Nichts gefunden.</p>}
          <ul className="list">
            {result.hits.map((h) => (
              <li key={h.pageId}>
                <button type="button" className="pick" disabled={busy !== undefined} onClick={() => void open(h)}>
                  <span>{h.title}</span>
                  {busy === h.pageId && <span className="muted small">Lädt …</span>}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="muted small">
        Rezepte aus dem <a href="https://www.kochwiki.org" target="_blank" rel="noreferrer">Koch-Wiki</a>, Texte unter{' '}
        <a href={KOCHWIKI_LICENSE.url} target="_blank" rel="noreferrer">{KOCHWIKI_LICENSE.name}</a>. Braucht eine Internetverbindung. Das Koch-Wiki enthält keine Nährwerte;
        sie werden nach dem Übernehmen aus den zugeordneten Lebensmitteln berechnet. Bilder werden nicht übernommen.
      </p>
    </section>
  );
}
