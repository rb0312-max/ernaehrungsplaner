import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDiaryTarget } from '../diary/DiaryTarget';
import { MEAL_LABEL } from '../../domain/diary';
import { formatDateDe } from '../../domain/dates';
import { getFavoriteIds, listFavoritesAndRecent, searchLocal } from '../../db/foodRepository';
import { useActiveProfile } from '../profile/ProfileContext';
import type { Food } from '../../domain/types';
import { searchProducts } from '../../services/openFoodFacts';
import { FoodRow } from './FoodRow';
import { NEW_PATH, SCAN_PATH } from './paths';

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function SearchView() {
  const profileId = useActiveProfile().id;
  const { target, setTarget } = useDiaryTarget();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Food[]>([]);
  const [favIds, setFavIds] = useState<string[]>([]);
  const [start, setStart] = useState<{ favorites: Food[]; recent: Food[] }>({ favorites: [], recent: [] });
  const [error, setError] = useState<string>();
  const [online, setOnline] = useState<{ query: string; foods: Food[] }>();
  const [onlineBusy, setOnlineBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      const run = query.trim()
        ? Promise.all([searchLocal(query, profileId), getFavoriteIds(profileId)]).then(([r, f]) => !cancelled && (setResults(r), setFavIds(f)))
        : listFavoritesAndRecent(profileId).then((s) => !cancelled && (setStart(s), setResults([])));
      run.then(() => !cancelled && setError(undefined)).catch((e: unknown) => !cancelled && setError(msg(e)));
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, profileId]);

  // Online nur auf Knopfdruck, nicht bei jedem Tastendruck (Open Food Facts begrenzt Suchanfragen).
  async function searchOnline() {
    const q = query.trim();
    setOnlineBusy(true);
    setError(undefined);
    try {
      setOnline({ query: q, foods: await searchProducts(q) });
    } catch (e) {
      setError(msg(e));
    } finally {
      setOnlineBusy(false);
    }
  }

  const hasQuery = query.trim() !== '';
  return (
    <section>
      <h1>Lebensmittel</h1>
      {target && (
        <p className="notice" role="status">
          Wähle ein Lebensmittel für {MEAL_LABEL[target.meal]} am {formatDateDe(target.date)}.{' '}
          <button type="button" className="link" onClick={() => setTarget(undefined)}>Abbrechen</button>
        </p>
      )}
      <input
        type="search"
        placeholder="Lebensmittel suchen, z. B. Haferflocken"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Lebensmittel suchen"
      />
      <div className="actions">
        <Link to={SCAN_PATH} className="btn">Barcode scannen</Link>
        <Link to={NEW_PATH} className="btn">Neu anlegen</Link>
        {hasQuery && (
          <button type="button" className="btn" onClick={searchOnline} disabled={onlineBusy}>
            {onlineBusy ? 'Suche läuft …' : 'Online suchen'}
          </button>
        )}
      </div>
      {error && <p role="alert" className="error">{error}</p>}

      {hasQuery ? (
        <>
          {!results.length && !error && <p className="muted">Keine lokalen Treffer.</p>}
          <ul className="list">
            {results.map((f) => (
              <FoodRow key={f.id} food={f} favorite={favIds.includes(f.id)} />
            ))}
          </ul>
        </>
      ) : (
        <>
          {start.favorites.length > 0 && (
            <>
              <h2>Favoriten</h2>
              <ul className="list">
                {start.favorites.map((f) => (
                  <FoodRow key={f.id} food={f} favorite />
                ))}
              </ul>
            </>
          )}
          {start.recent.length > 0 && (
            <>
              <h2>Zuletzt verwendet</h2>
              <ul className="list">
                {start.recent.map((f) => (
                  <FoodRow key={f.id} food={f} />
                ))}
              </ul>
            </>
          )}
          {!start.favorites.length && !start.recent.length && (
            <p className="muted">Suchbegriff eingeben, Barcode scannen oder ein eigenes Lebensmittel anlegen.</p>
          )}
        </>
      )}

      {online && (
        <>
          <h2>Open Food Facts: „{online.query}“</h2>
          {!online.foods.length && <p className="muted">Keine Produkte mit Nährwerten gefunden.</p>}
          <ul className="list">
            {online.foods.map((f) => (
              <FoodRow key={f.id} food={f} unsaved />
            ))}
          </ul>
        </>
      )}
      <p className="muted small">
        Grunddaten: Max Rubner-Institut, Bundeslebensmittelschlüssel 4.0 (CC BY 4.0). Produkte: Open Food Facts (ODbL).
      </p>
    </section>
  );
}
