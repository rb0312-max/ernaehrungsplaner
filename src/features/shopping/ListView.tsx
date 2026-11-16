import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { addOwnItem, deleteShoppingList, getShoppingList, removeCheckedItems, removeItem, setItemChecked } from '../../db/shoppingRepository';
import { formatNumber } from '../../domain/foodDetail';
import { itemLabel, orderedItems, shoppingText } from '../../domain/shopping';
import type { ShoppingList } from '../../domain/types';
import { recipePath } from '../recipes/paths';
import { SHOPPING_PATH, shoppingAddPath } from './paths';

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function ListView() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  // null = geladen, aber nicht vorhanden.
  const list = useLiveQuery(async () => (await getShoppingList(id)) ?? null, [id]);
  const [text, setText] = useState('');
  const [error, setError] = useState<string>();
  const [shared, setShared] = useState<{ message: string; text?: string }>();

  if (list === undefined) return <p className="muted">Lädt …</p>;
  if (list === null) {
    return (
      <section>
        <h1>Nicht gefunden</h1>
        <p className="muted">Diese Liste gibt es nicht (mehr).</p>
        <Link to={SHOPPING_PATH} className="btn">Zu den Einkaufslisten</Link>
      </section>
    );
  }

  const run = (p: Promise<unknown>) => p.then(() => setError(undefined), (e: unknown) => setError(msg(e)));
  const done = list.items.filter((i) => i.checked).length;

  async function share(l: ShoppingList) {
    const body = shoppingText(l);
    setShared(undefined);
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: l.title, text: body });
        return;
      }
      await navigator.clipboard.writeText(body);
      setShared({ message: 'In die Zwischenablage kopiert.' });
    } catch (e) {
      // Abbrechen im Teilen-Dialog ist kein Fehler.
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setShared({ message: 'Teilen und Kopieren sind hier nicht möglich. Der Text zum Markieren und Kopieren:', text: body });
    }
  }

  return (
    <section>
      <p><Link to={SHOPPING_PATH}>← Einkaufslisten</Link></p>
      <h1>{list.title}</h1>
      {list.recipes.length > 0 && (
        <p className="muted small">
          Rezepte:{' '}
          {list.recipes.map((r, n) => (
            <span key={r.id}>
              {n > 0 && ', '}
              <Link to={recipePath(r.id)}>{r.title}</Link> ({formatNumber(r.portions)} {r.portions === 1 ? 'Portion' : 'Portionen'})
            </span>
          ))}
        </p>
      )}
      <p className="muted small">{done} von {list.items.length} erledigt</p>

      {!list.items.length ? (
        <p className="muted">Die Liste ist leer.</p>
      ) : (
        <ul className="list shopping">
          {orderedItems(list.items).map((i) => (
            <li key={i.id} className={i.checked ? 'done' : undefined}>
              <label className="check">
                <input type="checkbox" checked={i.checked} onChange={(e) => void run(setItemChecked(list.id, i.id, e.target.checked))} />
                <span>
                  {itemLabel(i)}
                  {i.from && i.from.length > 0 && <span className="muted small"> · {i.from.join(', ')}</span>}
                </span>
              </label>
              <button type="button" className="btn small" aria-label={`${itemLabel(i)} entfernen`} onClick={() => void run(removeItem(list.id, i.id))}>✕</button>
            </li>
          ))}
        </ul>
      )}

      <form
        className="field"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          void run(addOwnItem(list.id, text)).then(() => setText(''));
        }}
      >
        <label htmlFor="own-item">Eigener Posten</label>
        <div className="amount">
          <input id="own-item" type="text" value={text} placeholder="z. B. Spülmittel" onChange={(e) => setText(e.target.value)} />
          <button type="submit" className="btn" disabled={!text.trim()}>Hinzufügen</button>
        </div>
      </form>

      {error && <p role="alert" className="error">{error}</p>}
      <div className="actions">
        <Link to={shoppingAddPath(list.id)} className="btn">Rezepte hinzufügen</Link>
        <button type="button" className="btn" onClick={() => void share(list)}>Als Text teilen</button>
        <button type="button" className="btn" disabled={done === 0} onClick={() => void run(removeCheckedItems(list.id))}>Erledigte entfernen</button>
        <button
          type="button"
          className="btn danger"
          onClick={() => {
            if (!window.confirm(`„${list.title}“ löschen?`)) return;
            deleteShoppingList(list.id).then(() => navigate(SHOPPING_PATH, { replace: true }), (e: unknown) => setError(msg(e)));
          }}
        >
          Liste löschen
        </button>
      </div>
      {shared && (
        <div role="status">
          <p className="muted small">{shared.message}</p>
          {shared.text !== undefined && <textarea readOnly rows={Math.min(12, shared.text.split('\n').length + 1)} value={shared.text} aria-label="Liste als Text" onFocus={(e) => e.currentTarget.select()} />}
        </div>
      )}

      <p className="muted small">
        Posten mit Gramm stammen aus Zutaten, die einem Lebensmittel zugeordnet sind (Rohgewicht laut Rezept). Alle anderen Zutaten, auch „nicht berechnete“ wie Salz,
        stehen mit der Menge der Quelle da; verschiedene Einheiten (z. B. EL und ml) werden nicht umgerechnet. „Als Text teilen“ nimmt nur die noch offenen Posten.
      </p>
    </section>
  );
}
