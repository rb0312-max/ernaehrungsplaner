import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { deleteFood, getFavoriteIds, getFood, markUsed, refreshFromOff, saveFood, toggleFavorite } from '../../db/foodRepository';
import { useActiveProfile } from '../profile/ProfileContext';
import { formatNumber, nutrientSections, toGrams, type AmountUnit } from '../../domain/foodDetail';
import { parseDecimal } from '../../domain/foodForm';
import type { Food } from '../../domain/types';
import { AddToDiary } from '../diary/AddToDiary';
import { SOURCE_LABEL } from './FoodRow';
import { NEW_PATH, editPath, foodPath, type DetailState, type EditorState } from './paths';

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function FoodDetail() {
  const { id = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const profileId = useActiveProfile().id;
  const stateFood = (location.state as DetailState | null)?.food;

  const [food, setFood] = useState<Food | undefined>();
  const [saved, setSaved] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [info, setInfo] = useState<string>();
  const [amountText, setAmountText] = useState('100');
  const [unit, setUnit] = useState<AmountUnit>('g');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const stored = await getFood(id);
      const f = stored ?? (stateFood?.id === id ? stateFood : undefined);
      setFood(f);
      setSaved(stored !== undefined);
      setFavorite((await getFavoriteIds(profileId)).includes(id));
      if (stored) await markUsed(profileId, id);
    } catch (e) {
      setError(msg(e));
    } finally {
      setLoading(false);
    }
  }, [id, stateFood, profileId]);

  useEffect(() => {
    void load();
  }, [load]);

  const amount = parseDecimal(amountText);
  const grams = amount === undefined ? undefined : toGrams(amount, unit, food?.servingG);
  const sections = useMemo(() => (food && grams !== undefined ? nutrientSections(food.per100, grams) : undefined), [food, grams]);

  async function run(action: () => Promise<void>) {
    setError(undefined);
    setInfo(undefined);
    try {
      await action();
    } catch (e) {
      setError(msg(e));
    }
  }

  if (loading) return <p className="muted">Lädt …</p>;
  if (!food) {
    return (
      <section>
        <h1>Nicht gefunden</h1>
        {error && <p role="alert" className="error">{error}</p>}
        <p className="muted">Dieses Lebensmittel gibt es nicht (mehr). Bei Online-Treffern: nach dem Neuladen der Seite die Suche wiederholen.</p>
        <Link to="/lebensmittel" className="btn">Zur Suche</Link>
      </section>
    );
  }

  const isBls = food.source === 'bls';
  const copyState: EditorState = { copyFromId: food.id };

  return (
    <section>
      <p><Link to="/lebensmittel">← Suche</Link></p>
      <h1>{food.name}</h1>
      <p className="muted">
        {SOURCE_LABEL[food.source]}
        {food.brand && ` · ${food.brand}`}
        {food.barcode && ` · Barcode ${food.barcode}`}
        {!isBls && saved && ` · Stand ${new Date(food.updatedAt).toLocaleDateString('de-DE')}`}
      </p>
      {food.nameEn && <p className="muted small">Englisch: {food.nameEn}</p>}
      {!saved && !isBls && <p className="notice">Noch nicht gespeichert (Treffer der Online-Suche).</p>}

      <div className="actions">
        {!saved && !isBls && (
          <button type="button" className="btn primary" onClick={() => run(async () => { await saveFood(food); await markUsed(profileId, food.id); navigate(foodPath(food.id), { replace: true }); await load(); })}>
            Speichern
          </button>
        )}
        {(saved || isBls) && (
          <button type="button" className="btn" aria-pressed={favorite} onClick={() => run(async () => setFavorite(await toggleFavorite(profileId, food.id)))}>
            {favorite ? '★ Favorit' : '☆ Favorit'}
          </button>
        )}
        {food.source === 'custom' && <Link to={editPath(food.id)} className="btn">Bearbeiten</Link>}
        {(isBls || food.source === 'off') && (
          <Link to={NEW_PATH} state={copyState} className="btn">Als eigenes kopieren</Link>
        )}
        {food.source === 'off' && saved && (
          <button
            type="button"
            className="btn"
            onClick={() =>
              run(async () => {
                const r = await refreshFromOff(food);
                if (r.status === 'updated') {
                  setInfo('Werte aktualisiert.');
                  await load();
                } else {
                  setInfo(r.status === 'not_found' ? 'Das Produkt ist bei Open Food Facts nicht mehr vorhanden. Lokale Werte bleiben unverändert.' : 'Open Food Facts hat für das Produkt keine Nährwerte. Lokale Werte bleiben unverändert.');
                }
              })
            }
          >
            Aktualisieren
          </button>
        )}
        {saved && !isBls && (
          <button
            type="button"
            className="btn danger"
            onClick={() =>
              run(async () => {
                if (!window.confirm(`„${food.name}“ löschen? Bestehende Tagebucheinträge bleiben erhalten.`)) return;
                await deleteFood(food.id);
                navigate('/lebensmittel', { replace: true });
              })
            }
          >
            Löschen
          </button>
        )}
      </div>
      {error && <p role="alert" className="error">{error}</p>}
      {info && <p role="status" className="notice">{info}</p>}

      <h2>Menge</h2>
      <div className="amount">
        <input
          type="text"
          inputMode="decimal"
          value={amountText}
          onChange={(e) => setAmountText(e.target.value)}
          aria-label="Menge"
          aria-invalid={amount === undefined}
        />
        <select
          value={unit}
          onChange={(e) => {
            // Menge zurücksetzen: "100" Portionen wären sonst ein Versehen.
            const u = e.target.value as AmountUnit;
            setUnit(u);
            setAmountText(u === 'g' ? '100' : '1');
          }}
          aria-label="Einheit"
        >
          <option value="g">g</option>
          {food.servingG && <option value="portion">Portion ({formatNumber(food.servingG)} g)</option>}
        </select>
      </div>
      {amount === undefined && <p className="error">Bitte eine Zahl eingeben.</p>}
      {unit === 'portion' && grams !== undefined && <p className="muted small">= {formatNumber(grams)} g</p>}
      {!food.servingG && <p className="muted small">Keine Portionsgröße bekannt. Umrechnung nur in Gramm.</p>}

      <AddToDiary
        food={food}
        grams={grams !== undefined && grams > 0 ? grams : undefined}
        ensureSaved={async () => {
          if (!saved && !isBls) {
            await saveFood(food);
            setSaved(true);
          }
        }}
      />

      {sections && (
        <>
          <p className="muted small">„–“ bedeutet: keine Angabe in der Quelle, nicht 0.</p>
          {sections.map((s) => (
            <details key={s.group} open={s.group === 'makro'} className="nutrients">
              <summary>
                {s.label}
                {s.unknown > 0 && <span className="muted small"> · {s.unknown} von {s.rows.length} ohne Angabe</span>}
              </summary>
              <table>
                <thead>
                  <tr>
                    <th scope="col">Nährstoff</th>
                    <th scope="col" className="num">je 100 g</th>
                    <th scope="col" className="num">{formatNumber(grams)} g</th>
                  </tr>
                </thead>
                <tbody>
                  {s.rows.map((r) => (
                    <tr key={r.def.key} className={r.per100 === undefined ? 'unknown' : undefined}>
                      <th scope="row">{r.def.label}</th>
                      <td className="num">{formatNumber(r.per100)} {r.per100 !== undefined && r.def.unit}</td>
                      <td className="num">{formatNumber(r.amount)} {r.amount !== undefined && r.def.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {s.rows.some((r) => r.def.forms) && (
                <ul className="muted small forms">
                  {s.rows.filter((r) => r.def.forms).map((r) => (
                    <li key={r.def.key}>{r.def.label}: {r.def.forms}</li>
                  ))}
                </ul>
              )}
            </details>
          ))}
        </>
      )}
    </section>
  );
}
