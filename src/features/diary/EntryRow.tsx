import { useState } from 'react';
import { Link } from 'react-router-dom';
import { copyEntryTo, deleteEntry, updateEntry } from '../../db/diaryRepository';
import { MEAL_SLOTS, entryAmounts, isMealSlot, isValidGrams } from '../../domain/diary';
import { isIsoDate } from '../../domain/dates';
import { formatNumber } from '../../domain/foodDetail';
import { parseDecimal } from '../../domain/foodForm';
import type { DiaryEntry, MealSlot } from '../../domain/types';
import { foodPath } from '../foods/paths';
import { recipePath } from '../recipes/paths';

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

type Mode = 'view' | 'edit' | 'copy';

/** Ein Eintrag im Tagebuch: Anzeige, Menge/Mahlzeit ändern, auf anderen Tag kopieren, löschen. */
export function EntryRow({ entry, today }: { entry: DiaryEntry; today: string }) {
  const [mode, setMode] = useState<Mode>('view');
  const [gramsText, setGramsText] = useState(String(entry.grams));
  const [meal, setMeal] = useState<MealSlot>(entry.meal);
  const [date, setDate] = useState(today);
  const [error, setError] = useState<string>();

  const kcal = entryAmounts(entry).kcal;
  const grams = parseDecimal(gramsText);

  async function run(action: () => Promise<void>) {
    setError(undefined);
    try {
      await action();
    } catch (e) {
      setError(msg(e));
    }
  }

  const close = () => setMode('view');

  return (
    <li>
      <div className="row">
        <span>
          {entry.foodId ? <Link to={foodPath(entry.foodId)}>{entry.name}</Link> : entry.recipeId ? <Link to={recipePath(entry.recipeId)}>{entry.name}</Link> : entry.name}{' '}
          <span className="muted">· {formatNumber(entry.grams)} g</span>
        </span>
        <span className="num">{kcal === undefined ? '– kcal' : `${formatNumber(kcal)} kcal`}</span>
      </div>
      {kcal === undefined && <p className="muted small">Energie fehlt in den Werten dieses Eintrags.</p>}

      {mode === 'view' && (
        <div className="actions tight">
          <button type="button" className="btn small" onClick={() => { setGramsText(String(entry.grams)); setMeal(entry.meal); setMode('edit'); }}>Ändern</button>
          <button type="button" className="btn small" onClick={() => { setMeal(entry.meal); setDate(today); setMode('copy'); }}>Kopieren</button>
          <button
            type="button"
            className="btn small danger"
            onClick={() => void run(async () => {
              if (window.confirm(`„${entry.name}“ aus dem Tagebuch löschen?`)) await deleteEntry(entry.id);
            })}
          >
            Löschen
          </button>
        </div>
      )}

      {mode === 'edit' && (
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!isValidGrams(grams)) return;
            void run(async () => { await updateEntry(entry.id, { grams, meal }); close(); });
          }}
        >
          <div className="split2">
            <label>
              Menge (g)
              <input type="text" inputMode="decimal" value={gramsText} onChange={(e) => setGramsText(e.target.value)} aria-invalid={!isValidGrams(grams)} />
            </label>
            <label>
              Mahlzeit
              <select value={meal} onChange={(e) => isMealSlot(e.target.value) && setMeal(e.target.value)}>
                {MEAL_SLOTS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </label>
          </div>
          {!isValidGrams(grams) && <p className="error small">Menge größer 0 eingeben.</p>}
          <div className="actions tight">
            <button type="submit" className="btn small primary" disabled={!isValidGrams(grams)}>Speichern</button>
            <button type="button" className="btn small" onClick={close}>Abbrechen</button>
          </div>
        </form>
      )}

      {mode === 'copy' && (
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!isIsoDate(date)) return;
            void run(async () => { await copyEntryTo(entry.id, date, meal); close(); });
          }}
        >
          <div className="split2">
            <label>
              Kopie am Tag
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={!isIsoDate(date)} />
            </label>
            <label>
              In Mahlzeit
              <select value={meal} onChange={(e) => isMealSlot(e.target.value) && setMeal(e.target.value)}>
                {MEAL_SLOTS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </label>
          </div>
          <div className="actions tight">
            <button type="submit" className="btn small primary" disabled={!isIsoDate(date)}>Kopieren</button>
            <button type="button" className="btn small" onClick={close}>Abbrechen</button>
          </div>
        </form>
      )}
      {error && <p role="alert" className="error small">{error}</p>}
    </li>
  );
}
