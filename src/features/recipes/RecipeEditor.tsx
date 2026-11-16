import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { searchLocal } from '../../db/foodRepository';
import { getRecipe, newRecipeDraft, saveRecipe } from '../../db/recipeRepository';
import { formatNumber } from '../../domain/foodDetail';
import { FOOD_FILTERS } from '../../domain/profile';
import { assignFood, clearFood, gramsHint, ingredientState, recipeNutrition, validateRecipe, type RecipeErrors } from '../../domain/recipe';
import type { Food, FoodFilter, Recipe, RecipeIngredient } from '../../domain/types';
import { NumField } from '../../ui/NumField';
import { useActiveProfile } from '../profile/ProfileContext';
import { MacroLine } from './MacroLine';
import { RECIPES_PATH, RECIPE_IMPORT_PATH, recipePath, type RecipeEditorState } from './paths';

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Text, der bei importierten Rezepten aus der Quelle stammt; ändert er sich, wird das Rezept als geändert gekennzeichnet. */
const sourceText = (r: Recipe) => JSON.stringify([r.title.trim(), r.instructions.trim(), r.ingredients.map((i) => i.name.trim())]);

/** Rezept anlegen, bearbeiten oder einen Entwurf aus dem Koch-Wiki prüfen und speichern. */
export function RecipeEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const draft = (useLocation().state as RecipeEditorState | null)?.draft;
  const editing = id !== undefined;

  const [recipe, setRecipe] = useState<Recipe>();
  const [original, setOriginal] = useState<string>();
  const [errors, setErrors] = useState<RecipeErrors>({});
  const [error, setError] = useState<string>();
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = editing ? await getRecipe(id) : draft ?? { ...newRecipeDraft(), ingredients: [{ name: '' }] };
      if (cancelled) return;
      if (!r) return setMissing(true);
      setRecipe(r);
      setOriginal(sourceText(r));
    })().catch((e: unknown) => !cancelled && setError(msg(e)));
    return () => {
      cancelled = true;
    };
    // Der Entwurf kommt einmalig über den Router; spätere Änderungen des Zustands sollen das Formular nicht überschreiben.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const nutrition = useMemo(() => recipe && recipeNutrition(recipe.ingredients, recipe.servings), [recipe]);

  if (missing) {
    return (
      <section>
        <h1>Nicht gefunden</h1>
        <Link to={RECIPES_PATH} className="btn">Zu den Rezepten</Link>
      </section>
    );
  }
  if (!recipe || !nutrition) return error ? <p role="alert" className="error">{error}</p> : <p className="muted">Lädt …</p>;

  const patch = (p: Partial<Recipe>) => setRecipe({ ...recipe, ...p });
  const setIngredient = (n: number, i: RecipeIngredient) => patch({ ingredients: recipe.ingredients.map((x, k) => (k === n ? i : x)) });
  const imported = recipe.source === 'kochwiki';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!recipe) return;
    const cleaned = { ...recipe, ingredients: recipe.ingredients.filter((i) => i.name.trim()) };
    const errs = validateRecipe(cleaned);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      const modified = imported ? recipe.modified || sourceText(recipe) !== original || undefined : undefined;
      const stored = await saveRecipe({ ...cleaned, modified });
      navigate(recipePath(stored.id), { replace: true });
    } catch (err) {
      setError(msg(err));
    }
  }

  const cancelTo = editing ? recipePath(id) : draft ? RECIPE_IMPORT_PATH : RECIPES_PATH;

  return (
    <section>
      <p><Link to={cancelTo}>← Abbrechen</Link></p>
      <h1>{editing ? 'Rezept bearbeiten' : draft ? 'Rezept aus dem Koch-Wiki' : 'Neues Rezept'}</h1>
      {draft && !editing && (
        <p className="notice">
          Noch nicht gespeichert. Bitte die Zutaten prüfen: Lebensmittel sind automatisch vorgeschlagen. Gramm stammen aus Gewichtsangaben der Quelle,
          aus früher eingetragenen Werten oder aus einer Umrechnung; die Herkunft steht jeweils unter dem Feld, jeder Wert lässt sich überschreiben.
          Einmal eingetragene Zuordnungen und Gramm je Löffel oder Stück merkt sich die App für spätere Rezepte.
        </p>
      )}
      {error && <p role="alert" className="error">{error}</p>}
      <form onSubmit={submit} noValidate>
        <label>
          Name *
          <input type="text" value={recipe.title} onChange={(e) => patch({ title: e.target.value })} aria-invalid={!!errors.title} />
          {errors.title && <span className="error">{errors.title}</span>}
        </label>
        <div className="split2">
          <NumField
            label="Portionen *"
            value={recipe.servings}
            onChange={(v) => patch({ servings: v ?? NaN })}
            hint={recipe.servingsNote ? `Quelle: ${recipe.servingsNote}` : undefined}
            error={errors.servings}
          />
          <div className="field">
            <label htmlFor="rec-diet">Ernährungsweise</label>
            <select id="rec-diet" value={recipe.diet ?? ''} onChange={(e) => patch({ diet: (e.target.value || undefined) as FoodFilter | undefined })}>
              <option value="">keine Angabe</option>
              {(Object.keys(FOOD_FILTERS) as FoodFilter[]).map((f) => <option key={f} value={f}>{FOOD_FILTERS[f]}</option>)}
            </select>
          </div>
        </div>
        <p className="muted small">Die Ernährungsweise bestimmt, bei welchem Profil das Rezept vorgeschlagen wird. Ohne Angabe erscheint es nur bei „Alles (omnivor)“.</p>

        <h2>Zutaten</h2>
        {errors.ingredients && <p className="error">{errors.ingredients}</p>}
        {recipe.ingredients.map((i, n) => (
          <IngredientCard
            key={n}
            ingredient={i}
            onChange={(x) => setIngredient(n, x)}
            onRemove={() => patch({ ingredients: recipe.ingredients.filter((_, k) => k !== n) })}
          />
        ))}
        <div className="actions">
          <button type="button" className="btn" onClick={() => patch({ ingredients: [...recipe.ingredients, { name: '' }] })}>+ Zutat</button>
        </div>

        <label>
          Zubereitung
          <textarea rows={8} value={recipe.instructions} onChange={(e) => patch({ instructions: e.target.value })} />
        </label>

        <section className="card" aria-label="Berechnung">
          <p><MacroLine values={nutrition.perServing} basis="Je Portion" /></p>
          <p className={nutrition.open > 0 ? 'error small' : 'muted small'}>
            {nutrition.mapped} zugeordnet, {nutrition.ignored} nicht berechnet, {nutrition.open} offen.
            {nutrition.open > 0 && ' Offene Zutaten fehlen in den Werten; das Rezept lässt sich speichern, aber erst ohne offene Zutaten ins Tagebuch eintragen.'}
          </p>
        </section>
        {imported && <p className="muted small">Text aus dem Koch-Wiki (CC BY-SA 3.0). Änderungen an Name, Zutatentext oder Zubereitung werden beim Rezept als „geändert“ vermerkt.</p>}
        <div className="actions">
          <button type="submit" className="btn primary">Speichern</button>
        </div>
      </form>
    </section>
  );
}

function IngredientCard({ ingredient: i, onChange, onRemove }: { ingredient: RecipeIngredient; onChange: (i: RecipeIngredient) => void; onRemove: () => void }) {
  const [picking, setPicking] = useState(false);
  const state = ingredientState(i);

  return (
    <fieldset className={state === 'open' ? 'ingredient open' : 'ingredient'}>
      <label>
        Zutat
        <input type="text" value={i.name} onChange={(e) => onChange({ ...i, name: e.target.value })} placeholder="z. B. 200 g Haferflocken" />
      </label>
      {!i.ignored && (
        <>
          <div className="field">
            <div>Lebensmittel</div>
            {i.per100 ? (
              <p>
                {i.foodName} <span className="muted small">({formatNumber(i.per100.kcal)} kcal je 100 g)</span>
                {i.suggested && <span className="badge"> Vorschlag, bitte prüfen</span>}
              </p>
            ) : (
              <p className="error small">Noch kein Lebensmittel zugeordnet.</p>
            )}
            <div className="actions tight">
              <button type="button" className="btn small" onClick={() => setPicking(!picking)}>{i.per100 ? 'Ändern' : 'Lebensmittel wählen'}</button>
              {i.suggested && <button type="button" className="btn small" onClick={() => onChange({ ...i, suggested: undefined })}>Passt</button>}
              {i.per100 && <button type="button" className="btn small" onClick={() => onChange({ ...clearFood(i), suggested: undefined })}>Zuordnung lösen</button>}
            </div>
            {picking && (
              <FoodPicker
                initial={i.key ?? ''}
                onPick={(food) => {
                  onChange({ ...assignFood(i, food), suggested: undefined });
                  setPicking(false);
                }}
              />
            )}
          </div>
          <NumField
            label="Menge in Gramm"
            unit="g"
            value={i.grams}
            // Ein geänderter Wert ist der des Nutzers: Herkunft und Herleitung entfallen.
            onChange={(v) => onChange({ ...i, grams: v, gramsOrigin: undefined, gramsNote: undefined })}
            hint={gramsHint(i)}
          />
          {i.gramsOrigin === 'usda' && (
            <div className="actions tight">
              <span className="badge">US-Daten, bitte prüfen</span>
              <button type="button" className="btn small" onClick={() => onChange({ ...i, gramsOrigin: undefined, gramsNote: undefined })}>Menge passt</button>
            </div>
          )}
        </>
      )}
      <label className="check">
        <input type="checkbox" checked={!!i.ignored} onChange={(e) => onChange({ ...i, ignored: e.target.checked || undefined })} />
        Nicht berechnen (z. B. Salz nach Geschmack, Wasser zum Kochen)
      </label>
      <div className="actions tight">
        <button type="button" className="btn small danger" onClick={onRemove}>Zutat entfernen</button>
      </div>
    </fieldset>
  );
}

/** Suche in BLS, gespeicherten Produkten und eigenen Lebensmitteln; ein Tipp wählt aus. */
function FoodPicker({ initial, onPick }: { initial: string; onPick: (food: Food) => void }) {
  const profileId = useActiveProfile().id;
  const [query, setQuery] = useState(initial);
  const [results, setResults] = useState<Food[]>([]);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      searchLocal(query, profileId, 12).then(
        (r) => !cancelled && (setResults(r), setError(undefined)),
        (e: unknown) => !cancelled && setError(msg(e)),
      );
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, profileId]);

  return (
    <div className="inline-form">
      <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Lebensmittel suchen" aria-label="Lebensmittel suchen" autoFocus />
      {error && <p role="alert" className="error small">{error}</p>}
      {query.trim() !== '' && !results.length && !error && <p className="muted small">Keine Treffer. Eigene Lebensmittel und Produkte lassen sich im Bereich „Lebensmittel“ anlegen oder scannen.</p>}
      <ul className="list">
        {results.map((f) => (
          <li key={f.id}>
            <button type="button" className="pick" onClick={() => onPick(f)}>
              <span>{f.name}{f.brand && <span className="muted"> · {f.brand}</span>}</span>
              <span className="muted small"><MacroLine values={f.per100} basis="je 100 g" /></span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
