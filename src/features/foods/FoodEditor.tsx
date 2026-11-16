import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { newId } from '../../db/db';
import { getFood, saveFood } from '../../db/foodRepository';
import { GROUP_LABELS } from '../../domain/foodDetail';
import { emptyForm, foodFromForm, formFromFood, validateForm, type FoodFormValues } from '../../domain/foodForm';
import { NUTRIENTS, type NutrientGroup } from '../../domain/nutrients';
import { foodPath, type EditorState } from './paths';

const GROUPS: NutrientGroup[] = ['makro', 'fett', 'vitamin', 'mineral', 'spurenelement', 'sonstiges'];
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Anlegen (`/neu`, optional mit Vorlage oder Barcode) und Bearbeiten (`/:id/bearbeiten`) eigener Lebensmittel. */
export function FoodEditor() {
  const { id } = useParams();
  const editing = id !== undefined;
  const location = useLocation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const state = location.state as EditorState | null;

  const [form, setForm] = useState<FoodFormValues>(emptyForm());
  const [errors, setErrors] = useState<ReturnType<typeof validateForm>['errors']>({});
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (editing) {
          const f = await getFood(id);
          if (cancelled) return;
          if (!f || f.source !== 'custom') setError('Nur eigene Lebensmittel lassen sich bearbeiten.');
          else setForm(formFromFood(f));
        } else if (state?.copyFromId) {
          const f = await getFood(state.copyFromId);
          if (cancelled) return;
          // Kopie: Barcode nicht übernehmen, damit er nicht doppelt vorkommt.
          if (f) setForm({ ...formFromFood(f), barcode: '' });
        } else {
          setForm({ ...emptyForm(), name: state?.name ?? '', barcode: params.get('barcode') ?? '' });
        }
      } catch (e) {
        if (!cancelled) setError(msg(e));
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editing, id, state, params]);

  const setField = (patch: Partial<FoodFormValues>) => setForm((f) => ({ ...f, ...patch }));
  const setValue = (key: string, v: string) => setForm((f) => ({ ...f, values: { ...f.values, [key]: v } }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const result = validateForm(form);
    setErrors(result.errors);
    if (Object.keys(result.errors).length) return;
    try {
      const foodId = editing ? id : `custom:${newId()}`;
      await saveFood(foodFromForm(form, result, foodId));
      navigate(foodPath(foodId), { replace: true });
    } catch (err) {
      setError(msg(err));
    }
  }

  if (!loaded) return <p className="muted">Lädt …</p>;
  const cancelTo = editing ? foodPath(id) : '/lebensmittel';

  return (
    <section>
      <p><Link to={cancelTo}>← Abbrechen</Link></p>
      <h1>{editing ? 'Lebensmittel bearbeiten' : 'Eigenes Lebensmittel'}</h1>
      {state?.copyFromId && <p className="muted small">Werte aus der Vorlage übernommen. Gespeichert wird als eigenes Lebensmittel.</p>}
      {params.get('barcode') && !editing && (
        <p className="notice">Barcode {params.get('barcode')} wurde bei Open Food Facts nicht (vollständig) gefunden. Werte bitte von der Verpackung eintragen.</p>
      )}
      {error && <p role="alert" className="error">{error}</p>}
      <form onSubmit={submit} noValidate>
        <label>
          Name *
          <input type="text" value={form.name} onChange={(e) => setField({ name: e.target.value })} aria-invalid={!!errors.name} />
          {errors.name && <span className="error">{errors.name}</span>}
        </label>
        <label>
          Marke
          <input type="text" value={form.brand} onChange={(e) => setField({ brand: e.target.value })} />
        </label>
        <label>
          Barcode
          <input type="text" inputMode="numeric" value={form.barcode} onChange={(e) => setField({ barcode: e.target.value })} aria-invalid={!!errors.barcode} />
          {errors.barcode && <span className="error">{errors.barcode}</span>}
        </label>
        <label>
          Portion in g (optional)
          <input type="text" inputMode="decimal" value={form.servingG} onChange={(e) => setField({ servingG: e.target.value })} aria-invalid={!!errors.servingG} />
          {errors.servingG && <span className="error">{errors.servingG}</span>}
        </label>

        <h2>Nährwerte je 100 g</h2>
        <p className="muted small">Pflicht ist nur die Energie. Leere Felder gelten als „keine Angabe“, nicht als 0.</p>
        {GROUPS.map((g) => (
          <details key={g} open={g === 'makro'} className="nutrients">
            <summary>{GROUP_LABELS[g]}</summary>
            {NUTRIENTS.filter((n) => n.group === g).map((n) => (
              <label key={n.key} className="nutrient-field">
                <span>{n.label} ({n.unit}){n.key === 'kcal' && ' *'}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.values[n.key] ?? ''}
                  onChange={(e) => setValue(n.key, e.target.value)}
                  aria-invalid={!!errors[n.key]}
                />
                {errors[n.key] && <span className="error">{errors[n.key]}</span>}
              </label>
            ))}
          </details>
        ))}
        <div className="actions">
          <button type="submit" className="btn primary">Speichern</button>
        </div>
      </form>
    </section>
  );
}
