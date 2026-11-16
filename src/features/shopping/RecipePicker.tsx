import { useState } from 'react';
import { normalize } from '../../db/blsFoods';
import type { RecipePick } from '../../db/shoppingRepository';
import { formatNumber } from '../../domain/foodDetail';
import { formatInput, parseDecimal } from '../../domain/foodForm';
import { isValidPortions } from '../../domain/shopping';
import type { Recipe } from '../../domain/types';

/** Gewählte Rezepte: Rezept-ID -> Portionen als Eingabetext. */
export type Selection = Record<string, string>;

/** Gewählte Rezepte als Liste für das Anlegen; undefined, wenn eine Portionenangabe ungültig ist. */
export function picksOf(sel: Selection): RecipePick[] | undefined {
  const picks: RecipePick[] = [];
  for (const [recipeId, text] of Object.entries(sel)) {
    const portions = parseDecimal(text);
    if (!isValidPortions(portions)) return undefined;
    picks.push({ recipeId, portions });
  }
  return picks;
}

/** Auswahl von Rezepten mit Portionenzahl (vorbelegt mit den Portionen des Rezepts). */
export function RecipePicker({ recipes, selected, onChange }: { recipes: Recipe[]; selected: Selection; onChange: (s: Selection) => void }) {
  const [query, setQuery] = useState('');
  const words = normalize(query).split(/\s+/).filter(Boolean);
  const shown = recipes.filter((r) => {
    const h = normalize(`${r.title} ${r.tags.join(' ')}`);
    return words.every((w) => h.includes(w));
  });

  function toggle(r: Recipe, on: boolean) {
    const next = { ...selected };
    if (on) next[r.id] = formatInput(r.servings);
    else delete next[r.id];
    onChange(next);
  }

  if (!recipes.length) return <p className="muted">Keine Rezepte zur Auswahl.</p>;
  return (
    <>
      <input type="search" placeholder="Rezepte filtern" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Rezepte filtern" />
      {!shown.length && <p className="muted">Kein Rezept passt zu „{query}“.</p>}
      <ul className="list">
        {shown.map((r) => {
          const on = r.id in selected;
          const portions = parseDecimal(selected[r.id] ?? '');
          return (
            <li key={r.id}>
              <label className="check">
                <input type="checkbox" checked={on} onChange={(e) => toggle(r, e.target.checked)} />
                <span>
                  {r.title}
                  <span className="muted small"> · Rezept für {formatNumber(r.servings)} {r.servings === 1 ? 'Portion' : 'Portionen'}</span>
                </span>
              </label>
              {on && (
                <div className="field">
                  <label htmlFor={`portions-${r.id}`}>Portionen einkaufen für „{r.title}“</label>
                  <input
                    id={`portions-${r.id}`}
                    type="text"
                    inputMode="decimal"
                    value={selected[r.id]}
                    onChange={(e) => onChange({ ...selected, [r.id]: e.target.value })}
                    aria-invalid={!isValidPortions(portions)}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
