import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { isoDate } from '../../db/db';
import { addRecipeEntry } from '../../db/diaryRepository';
import { deleteRecipe, getRecipe } from '../../db/recipeRepository';
import { MEAL_SLOTS, isMealSlot } from '../../domain/diary';
import { isIsoDate } from '../../domain/dates';
import { formatNumber, nutrientSections } from '../../domain/foodDetail';
import { parseDecimal } from '../../domain/foodForm';
import { FOOD_FILTERS } from '../../domain/profile';
import { ingredientState, macroShares, nearestPattern, recipeNutrition } from '../../domain/recipe';
import type { MealSlot, Recipe } from '../../domain/types';
import { KOCHWIKI_LICENSE, kochwikiHistoryUrl } from '../../services/kochWiki';
import { useDiaryTarget } from '../diary/DiaryTarget';
import { diaryDayPath } from '../diary/paths';
import { foodPath } from '../foods/paths';
import { useActiveProfile } from '../profile/ProfileContext';
import { SHOPPING_NEW_PATH, type ShoppingNewState } from '../shopping/paths';
import { RECIPE_SOURCE_LABEL } from './MacroLine';
import { RECIPES_PATH, recipeEditPath } from './paths';

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));
const pct = (v: number) => `${Math.round(v)} %`;

export function RecipeDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  // null = geladen, aber nicht vorhanden.
  const recipe = useLiveQuery(async () => (await getRecipe(id)) ?? null, [id]);
  const [error, setError] = useState<string>();

  if (recipe === undefined) return <p className="muted">Lädt …</p>;
  if (recipe === null) {
    return (
      <section>
        <h1>Nicht gefunden</h1>
        <p className="muted">Dieses Rezept gibt es nicht (mehr).</p>
        <Link to={RECIPES_PATH} className="btn">Zu den Rezepten</Link>
      </section>
    );
  }

  return (
    <section>
      <p><Link to={RECIPES_PATH}>← Rezepte</Link></p>
      <h1>{recipe.title}</h1>
      <p className="muted">
        {RECIPE_SOURCE_LABEL[recipe.source]} · {formatNumber(recipe.servings)} {recipe.servings === 1 ? 'Portion' : 'Portionen'}
        {recipe.servingsNote && ` (Quelle: ${recipe.servingsNote})`}
        {' · '}Ernährungsweise: {recipe.diet ? FOOD_FILTERS[recipe.diet] : 'keine Angabe'}
      </p>
      <div className="actions">
        <Link to={recipeEditPath(recipe.id)} className="btn">Bearbeiten</Link>
        <Link to={SHOPPING_NEW_PATH} state={{ recipeId: recipe.id } satisfies ShoppingNewState} className="btn">Auf Einkaufsliste</Link>
        <button
          type="button"
          className="btn danger"
          onClick={() => {
            if (!window.confirm(`„${recipe.title}“ löschen? Bestehende Tagebucheinträge bleiben erhalten.`)) return;
            deleteRecipe(recipe.id).then(() => navigate(RECIPES_PATH, { replace: true }), (e: unknown) => setError(msg(e)));
          }}
        >
          Löschen
        </button>
      </div>
      {error && <p role="alert" className="error">{error}</p>}

      <Nutrition recipe={recipe} />
      <AddRecipeToDiary recipe={recipe} />

      <h2>Zutaten</h2>
      <ul className="list">
        {recipe.ingredients.map((i, n) => {
          const state = ingredientState(i);
          return (
            <li key={n}>
              <div>{i.name}</div>
              <div className="muted small">
                {state === 'ignored' && 'nicht berechnet'}
                {state === 'open' && <span className="error">offen: {i.per100 ? 'Gramm fehlen' : 'kein Lebensmittel zugeordnet'}</span>}
                {state === 'mapped' && (
                  <>
                    {formatNumber(i.grams)} g {i.foodId ? <Link to={foodPath(i.foodId)}>{i.foodName}</Link> : i.foodName}
                    {i.suggested && ' · automatisch zugeordnet, nicht geprüft'}
                    {i.gramsOrigin === 'dichte' && ' · Menge über die Dichte umgerechnet'}
                    {i.gramsOrigin === 'usda' && ' · Menge aus US-Daten, nicht geprüft'}
                    {i.gramsOrigin === 'kochwiki' && ' · Menge nach Löffeltabelle des Koch-Wiki (gerundet)'}
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {recipe.instructions.trim() && (
        <>
          <h2>Zubereitung</h2>
          {recipe.instructions.split('\n').filter((l) => l.trim()).map((l, n) => <p key={n}>{l}</p>)}
        </>
      )}

      {recipe.tags.length > 0 && <p className="muted small">Schlagwörter: {recipe.tags.join(', ')}</p>}

      {recipe.source === 'kochwiki' && recipe.sourceUrl && (
        <p className="muted small">
          Quelle: <a href={recipe.sourceUrl} target="_blank" rel="noreferrer">„{recipe.sourceTitle ?? recipe.title}“ im Koch-Wiki</a>, Autoren siehe{' '}
          <a href={kochwikiHistoryUrl(recipe.sourceTitle ?? recipe.title)} target="_blank" rel="noreferrer">Versionsgeschichte</a>, Lizenz{' '}
          <a href={KOCHWIKI_LICENSE.url} target="_blank" rel="noreferrer">{KOCHWIKI_LICENSE.name}</a>.{' '}
          {recipe.modified ? 'Der Text wurde in dieser App geändert. ' : 'Text ohne Wiki-Auszeichnung übernommen. '}
          Zuordnung zu Lebensmitteln, Gramm und Nährwerte stammen nicht aus dem Koch-Wiki.
        </p>
      )}
    </section>
  );
}

/** Nährwerte je Portion; Lücken werden benannt („mind.“ = bei mindestens einer Zutat fehlt die Angabe). */
function Nutrition({ recipe }: { recipe: Recipe }) {
  const n = useMemo(() => recipeNutrition(recipe.ingredients, recipe.servings), [recipe]);
  const shares = macroShares(n.perServing);
  const sections = nutrientSections(n.perServing, 100);
  const suggested = recipe.ingredients.filter((i) => i.suggested && ingredientState(i) === 'mapped').length;
  const usData = recipe.ingredients.filter((i) => i.gramsOrigin === 'usda' && ingredientState(i) === 'mapped').length;

  return (
    <>
      <section className="card" aria-label="Nährwerte je Portion">
        <div className="row">
          <span className="big">{formatNumber(n.perServing.kcal)} <span className="muted small">kcal je Portion</span></span>
          {n.mapped > 0 && <span className="muted small">ca. {formatNumber(n.gramsPerServing)} g</span>}
        </div>
        <p>Protein {formatNumber(n.perServing.protein)} g · Fett {formatNumber(n.perServing.fat)} g · Kohlenhydrate {formatNumber(n.perServing.carbs)} g</p>
        {shares && (
          <p className="muted small">
            Energieanteile: Protein {pct(shares.proteinPct)}, Fett {pct(shares.fatPct)}, Kohlenhydrate {pct(shares.carbsPct)}. Am nächsten an „{nearestPattern(shares).label}“ (Vergleich mit den Startwerten der App).
          </p>
        )}
        {n.open > 0 && (
          <p className="error small">
            {n.open} von {recipe.ingredients.length} Zutaten offen: Die Werte sind unvollständig und zu niedrig. Unter „Bearbeiten“ zuordnen oder als „nicht berechnen“ markieren.
          </p>
        )}
        <p className="muted small">
          Berechnet aus den Zutaten (Rohgewicht, ohne Garverlust){n.ignored > 0 && `; ${n.ignored} Zutat(en) nicht berechnet`}. Schätzung, kein Laborwert.
          {suggested > 0 && ` ${suggested} Zutat(en) automatisch zugeordnet und nicht geprüft.`}
          {usData > 0 && ` Bei ${usData} Zutat(en) stammt die Menge aus US-Portionsgewichten (USDA) und ist nicht geprüft.`}
        </p>
      </section>

      {n.mapped > 0 && (
        <details className="nutrients">
          <summary>Alle Nährwerte je Portion</summary>
          <p className="muted small">„–“ = bei keiner Zutat angegeben. „mind.“ = bei einem Teil der Zutaten fehlt die Angabe, der wahre Wert liegt höher.</p>
          {sections.map((s) => (
            <table key={s.group}>
              <thead>
                <tr>
                  <th scope="col">{s.label}</th>
                  <th scope="col" className="num">je Portion</th>
                </tr>
              </thead>
              <tbody>
                {s.rows.map((r) => (
                  <tr key={r.def.key} className={r.amount === undefined ? 'unknown' : undefined}>
                    <th scope="row">{r.def.label}</th>
                    <td className="num">
                      {r.amount !== undefined && n.missing[r.def.key as keyof typeof n.missing] ? 'mind. ' : ''}
                      {formatNumber(r.amount)} {r.amount !== undefined && r.def.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
        </details>
      )}
    </>
  );
}

/** Portionen des Rezepts ins Tagebuch eintragen. Bei offenen Zutaten gesperrt. */
function AddRecipeToDiary({ recipe }: { recipe: Recipe }) {
  const profileId = useActiveProfile().id;
  const navigate = useNavigate();
  const { target, setTarget } = useDiaryTarget();
  const [meal, setMeal] = useState<MealSlot>(target?.meal ?? 'mittag');
  const [date, setDate] = useState(target?.date ?? isoDate());
  const [portionsText, setPortionsText] = useState('1');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const portions = parseDecimal(portionsText);
  const ok = recipe.nutritionComplete && portions !== undefined && portions > 0 && isIsoDate(date);

  async function add() {
    if (!ok || portions === undefined) return;
    setBusy(true);
    setError(undefined);
    try {
      await addRecipeEntry(profileId, recipe, portions, meal, date);
      setTarget(undefined);
      navigate(diaryDayPath(date));
    } catch (e) {
      setError(msg(e));
      setBusy(false);
    }
  }

  return (
    <>
      <h2>Zum Tagebuch</h2>
      {!recipe.nutritionComplete ? (
        <p className="muted small">Erst möglich, wenn keine Zutat mehr offen ist. Sonst stünden im Tagebuch zu niedrige Werte, ohne dass man es sieht.</p>
      ) : (
        <>
          <div className="split2">
            <div className="field">
              <label htmlFor="rec-portions">Portionen</label>
              <input id="rec-portions" type="text" inputMode="decimal" value={portionsText} onChange={(e) => setPortionsText(e.target.value)} aria-invalid={!(portions !== undefined && portions > 0)} />
            </div>
            <div className="field">
              <label htmlFor="rec-meal">Mahlzeit</label>
              <select id="rec-meal" value={meal} onChange={(e) => isMealSlot(e.target.value) && setMeal(e.target.value)}>
                {MEAL_SLOTS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="rec-date">Tag</label>
            <input id="rec-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={!isIsoDate(date)} />
          </div>
          {error && <p role="alert" className="error">{error}</p>}
          <div className="actions">
            <button type="button" className="btn primary" disabled={!ok || busy} onClick={() => void add()}>
              {ok ? `${formatNumber(portions)} ${portions === 1 ? 'Portion' : 'Portionen'} hinzufügen` : 'Eingaben prüfen'}
            </button>
          </div>
        </>
      )}
    </>
  );
}
