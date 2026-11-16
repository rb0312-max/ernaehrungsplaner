import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { listShoppingLists } from '../../db/shoppingRepository';
import { useActiveProfile } from '../profile/ProfileContext';
import { RECIPES_PATH } from '../recipes/paths';
import { SHOPPING_NEW_PATH, shoppingListPath } from './paths';

const dateDe = (t: number) => new Date(t).toLocaleDateString('de-DE');

/** Einkaufslisten des aktiven Profils, neueste zuerst. */
export function ListsView() {
  const profileId = useActiveProfile().id;
  const lists = useLiveQuery(() => listShoppingLists(profileId), [profileId]);

  return (
    <section>
      <p><Link to={RECIPES_PATH}>← Rezepte</Link></p>
      <h1>Einkaufslisten</h1>
      <div className="actions">
        <Link to={SHOPPING_NEW_PATH} className="btn primary">Neue Liste</Link>
      </div>
      {!lists ? (
        <p className="muted">Lädt …</p>
      ) : !lists.length ? (
        <p className="muted">Noch keine Liste. Lege eine aus einem oder mehreren Rezepten an, oder eine leere für eigene Posten.</p>
      ) : (
        <ul className="list">
          {lists.map((l) => {
            const done = l.items.filter((i) => i.checked).length;
            return (
              <li key={l.id}>
                <Link to={shoppingListPath(l.id)} className="rowlink">
                  <div className="row">
                    <span>{l.title}</span>
                    <span className="muted small">{dateDe(l.createdAt)}</span>
                  </div>
                  <div className="muted small">{done} von {l.items.length} erledigt{l.recipes.length > 0 && ` · ${l.recipes.length} ${l.recipes.length === 1 ? 'Rezept' : 'Rezepte'}`}</div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
