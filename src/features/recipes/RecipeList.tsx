import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { normalize } from '../../db/blsFoods';
import { listRecipes } from '../../db/recipeRepository';
import { MEAL_LABEL } from '../../domain/diary';
import { formatDateDe } from '../../domain/dates';
import { useDiaryTarget } from '../diary/DiaryTarget';
import { SHOPPING_PATH } from '../shopping/paths';
import { MacroLine, RECIPE_SOURCE_LABEL } from './MacroLine';
import { RECIPE_IMPORT_PATH, RECIPE_NEW_PATH, RECIPE_SUGGEST_PATH, recipePath } from './paths';

/** Gespeicherte Rezepte mit Filter nach Name oder Schlagwort. */
export function RecipeList() {
  const recipes = useLiveQuery(listRecipes);
  const { target, setTarget } = useDiaryTarget();
  const [query, setQuery] = useState('');
  const words = normalize(query).split(/\s+/).filter(Boolean);
  const shown = recipes?.filter((r) => {
    const h = normalize(`${r.title} ${r.tags.join(' ')}`);
    return words.every((w) => h.includes(w));
  });

  return (
    <section>
      <h1>Rezepte</h1>
      {target && (
        <p className="notice" role="status">
          Wähle ein Rezept für {MEAL_LABEL[target.meal]} am {formatDateDe(target.date)}.{' '}
          <button type="button" className="link" onClick={() => setTarget(undefined)}>Abbrechen</button>
        </p>
      )}
      <input type="search" placeholder="In meinen Rezepten suchen" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="In meinen Rezepten suchen" />
      <div className="actions">
        <Link to={RECIPE_SUGGEST_PATH} className="btn">Vorschläge</Link>
        <Link to={RECIPE_IMPORT_PATH} className="btn">Koch-Wiki durchsuchen</Link>
        <Link to={RECIPE_NEW_PATH} className="btn">Neues Rezept</Link>
        <Link to={SHOPPING_PATH} className="btn">Einkaufslisten</Link>
      </div>

      {!recipes ? (
        <p className="muted">Lädt …</p>
      ) : !recipes.length ? (
        <p className="muted">Noch keine Rezepte gespeichert. Lege ein eigenes an oder übernimm eines aus dem Koch-Wiki. Unter „Vorschläge“ stehen außerdem die Gerichte aus dem Bundeslebensmittelschlüssel.</p>
      ) : (
        <>
          {!shown?.length && <p className="muted">Kein Rezept passt zu „{query}“.</p>}
          <ul className="list">
            {shown?.map((r) => (
              <li key={r.id}>
                <Link to={recipePath(r.id)} className="rowlink">
                  <div className="row">
                    <span>{r.title}</span>
                    <span className="badge">{RECIPE_SOURCE_LABEL[r.source]}</span>
                  </div>
                  <div className="muted small">
                    <MacroLine values={r.perServing} basis="je Portion" />
                    {!r.nutritionComplete && ' · unvollständig'}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
