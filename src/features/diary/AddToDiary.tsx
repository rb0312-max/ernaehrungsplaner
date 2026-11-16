import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isoDate } from '../../db/db';
import { addFoodEntry } from '../../db/diaryRepository';
import { MEAL_SLOTS, isMealSlot, isValidGrams } from '../../domain/diary';
import { isIsoDate } from '../../domain/dates';
import { formatNumber } from '../../domain/foodDetail';
import type { Food, MealSlot } from '../../domain/types';
import { useActiveProfile } from '../profile/ProfileContext';
import { diaryDayPath } from './paths';
import { useDiaryTarget } from './DiaryTarget';

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

interface Props {
  food: Food;
  /** Menge in Gramm aus der Mengenwahl der Detailansicht; `undefined` = ungültig. */
  grams: number | undefined;
  /** Speichert das Lebensmittel zuerst, falls es noch nicht lokal vorliegt (Treffer der Online-Suche). */
  ensureSaved: () => Promise<void>;
}

/** „Zum Tagebuch hinzufügen“ in der Detailansicht: Mahlzeit und Tag wählen, Menge kommt aus der Mengenwahl darüber. */
export function AddToDiary({ food, grams, ensureSaved }: Props) {
  const profileId = useActiveProfile().id;
  const navigate = useNavigate();
  const { target, setTarget } = useDiaryTarget();
  const [meal, setMeal] = useState<MealSlot>(target?.meal ?? 'fruehstueck');
  const [date, setDate] = useState(target?.date ?? isoDate());
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const ok = isValidGrams(grams) && isIsoDate(date);

  async function add() {
    if (!isValidGrams(grams) || !isIsoDate(date)) return;
    setBusy(true);
    setError(undefined);
    try {
      await ensureSaved();
      await addFoodEntry(profileId, food, grams, meal, date);
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
      <div className="split2">
        <div className="field">
          <label htmlFor="add-meal">Mahlzeit</label>
          <select id="add-meal" value={meal} onChange={(e) => isMealSlot(e.target.value) && setMeal(e.target.value)}>
            {MEAL_SLOTS.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="add-date">Tag</label>
          <input id="add-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={!isIsoDate(date)} />
        </div>
      </div>
      {error && <p role="alert" className="error">{error}</p>}
      <div className="actions">
        <button type="button" className="btn primary" disabled={!ok || busy} onClick={() => void add()}>
          {ok ? `${formatNumber(grams)} g hinzufügen` : 'Menge prüfen'}
        </button>
      </div>
    </>
  );
}
