import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { listRecipes } from '../../db/recipeRepository';
import { addRecipesToList, createShoppingList, getShoppingList } from '../../db/shoppingRepository';
import { formatInput } from '../../domain/foodForm';
import { defaultListTitle } from '../../domain/shopping';
import { useActiveProfile } from '../profile/ProfileContext';
import { RecipePicker, picksOf, type Selection } from './RecipePicker';
import { SHOPPING_PATH, shoppingListPath, type ShoppingNewState } from './paths';

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Neue Liste: Name und Rezepte mit Portionen wählen (auch ohne Rezepte, für eigene Posten). */
export function NewListView() {
  const profileId = useActiveProfile().id;
  const navigate = useNavigate();
  const preselect = (useLocation().state as ShoppingNewState | null)?.recipeId;
  const recipes = useLiveQuery(listRecipes);
  const [title, setTitle] = useState(defaultListTitle(new Date().toLocaleDateString('de-DE')));
  const [selected, setSelected] = useState<Selection>({});
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  // Vorauswahl aus der Rezeptansicht, einmal, sobald die Rezepte geladen sind.
  const [preselected, setPreselected] = useState(false);
  useEffect(() => {
    if (preselected || !recipes) return;
    setPreselected(true);
    const r = recipes.find((x) => x.id === preselect);
    if (r) setSelected({ [r.id]: formatInput(r.servings) });
  }, [recipes, preselect, preselected]);

  const picks = picksOf(selected);

  async function create() {
    if (!picks) return;
    setBusy(true);
    setError(undefined);
    try {
      const list = await createShoppingList(profileId, title, picks);
      navigate(shoppingListPath(list.id), { replace: true });
    } catch (e) {
      setError(msg(e));
      setBusy(false);
    }
  }

  return (
    <section>
      <p><Link to={SHOPPING_PATH}>← Einkaufslisten</Link></p>
      <h1>Neue Liste</h1>
      <div className="field">
        <label htmlFor="list-title">Name</label>
        <input id="list-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} aria-invalid={!title.trim()} />
      </div>
      <h2>Rezepte</h2>
      <p className="muted small">Mengen werden auf die gewählten Portionen umgerechnet. Ohne Auswahl entsteht eine leere Liste für eigene Posten.</p>
      {!recipes ? <p className="muted">Lädt …</p> : <RecipePicker recipes={recipes} selected={selected} onChange={setSelected} />}
      {error && <p role="alert" className="error">{error}</p>}
      <div className="actions">
        <button type="button" className="btn primary" disabled={!picks || !title.trim() || busy} onClick={() => void create()}>
          {!picks ? 'Portionen prüfen' : Object.keys(selected).length ? `Liste aus ${Object.keys(selected).length} ${Object.keys(selected).length === 1 ? 'Rezept' : 'Rezepten'} anlegen` : 'Leere Liste anlegen'}
        </button>
      </div>
    </section>
  );
}

/** Rezepte zu einer bestehenden Liste hinzufügen; Rezepte, die schon darauf stehen, fehlen in der Auswahl. */
export function AddRecipesView() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const list = useLiveQuery(async () => (await getShoppingList(id)) ?? null, [id]);
  const recipes = useLiveQuery(listRecipes);
  const [selected, setSelected] = useState<Selection>({});
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  if (list === undefined || !recipes) return <p className="muted">Lädt …</p>;
  if (list === null) {
    return (
      <section>
        <h1>Nicht gefunden</h1>
        <p className="muted">Diese Liste gibt es nicht (mehr).</p>
        <Link to={SHOPPING_PATH} className="btn">Zu den Einkaufslisten</Link>
      </section>
    );
  }
  const onList = new Set(list.recipes.map((r) => r.id));
  const available = recipes.filter((r) => !onList.has(r.id));
  const picks = picksOf(selected);

  async function add() {
    if (!picks || !picks.length) return;
    setBusy(true);
    setError(undefined);
    try {
      await addRecipesToList(id, picks);
      navigate(shoppingListPath(id), { replace: true });
    } catch (e) {
      setError(msg(e));
      setBusy(false);
    }
  }

  return (
    <section>
      <p><Link to={shoppingListPath(id)}>← {list.title}</Link></p>
      <h1>Rezepte hinzufügen</h1>
      <p className="muted small">Gleiche Zutaten werden zu bestehenden Posten addiert; ein dadurch größerer Posten ist wieder offen.</p>
      {!available.length && recipes.length > 0 ? <p className="muted">Alle Rezepte stehen schon auf dieser Liste.</p> : <RecipePicker recipes={available} selected={selected} onChange={setSelected} />}
      {error && <p role="alert" className="error">{error}</p>}
      <div className="actions">
        <button type="button" className="btn primary" disabled={!picks || !picks.length || busy} onClick={() => void add()}>
          {!picks ? 'Portionen prüfen' : picks.length ? 'Hinzufügen' : 'Rezept wählen'}
        </button>
      </div>
    </section>
  );
}
