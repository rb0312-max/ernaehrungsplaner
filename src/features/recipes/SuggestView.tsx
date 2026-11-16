import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { normalize } from '../../db/blsFoods';
import { isoDate } from '../../db/db';
import { listDay } from '../../db/diaryRepository';
import { listCandidates } from '../../db/recipeRepository';
import { knownTotal, summarize } from '../../domain/diary';
import { splitFor } from '../../domain/energy';
import { formatNumber } from '../../domain/foodDetail';
import { FOOD_FILTERS, targetsOf } from '../../domain/profile';
import { remainingSplit, suggest } from '../../domain/recipe';
import { foodPath } from '../foods/paths';
import { useActiveProfile } from '../profile/ProfileContext';
import { MacroLine } from './MacroLine';
import { RECIPES_PATH, recipePath } from './paths';

const LIMIT = 40;
const pct = (v: number) => `${Math.round(v)} %`;
type Kind = 'recipes' | 'dishes';

/** Vorschläge: gespeicherte Rezepte und BLS-Gerichte, sortiert nach Nähe zu den heute noch offenen Makros. */
export function SuggestView() {
  const profile = useActiveProfile();
  const today = isoDate();
  const entries = useLiveQuery(() => listDay(profile.id, today), [profile.id, today]);
  const candidates = useLiveQuery(listCandidates);
  const [kind, setKind] = useState<Kind>('recipes');
  const [includeUnknown, setIncludeUnknown] = useState(false);
  const [query, setQuery] = useState('');

  const targets = targetsOf(profile);
  const summary = entries && summarize(entries);
  const eaten = summary && { kcal: knownTotal(summary, 'kcal'), protein: knownTotal(summary, 'protein'), fat: knownTotal(summary, 'fat'), carbs: knownTotal(summary, 'carbs') };
  const open = targets && eaten ? remainingSplit(targets, eaten) : undefined;
  const target = open ?? splitFor(profile);
  const remainingKcal = targets && eaten ? targets.kcal - (eaten.kcal ?? 0) : undefined;

  const result = useMemo(() => {
    if (!candidates) return undefined;
    const words = normalize(query).split(/\s+/).filter(Boolean);
    const pool = candidates[kind].filter((c) => {
      const h = normalize(c.title);
      return words.every((w) => h.includes(w));
    });
    return suggest(pool, { filter: profile.foodFilter, target, remainingKcal, includeUnknownDiet: includeUnknown });
    // `target` ist ein neues Objekt je Durchlauf; seine drei Zahlen stehen einzeln in der Liste.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidates, kind, query, profile.foodFilter, target.proteinPct, target.fatPct, target.carbsPct, remainingKcal, includeUnknown]);

  const strict = profile.foodFilter !== 'omnivor';

  return (
    <section>
      <p><Link to={RECIPES_PATH}>← Rezepte</Link></p>
      <h1>Vorschläge</h1>
      <section className="card" aria-label="Grundlage der Vorschläge">
        {targets && eaten && open ? (
          <p>
            Heute noch offen: {remainingKcal !== undefined && `${formatNumber(Math.max(0, remainingKcal))} kcal · `}
            Protein {formatNumber(Math.max(0, targets.proteinG - (eaten.protein ?? 0)))} g · Fett {formatNumber(Math.max(0, targets.fatG - (eaten.fat ?? 0)))} g · Kohlenhydrate{' '}
            {formatNumber(Math.max(0, targets.carbsG - (eaten.carbs ?? 0)))} g
          </p>
        ) : (
          <p>{targets ? 'Die Makroziele für heute sind erreicht.' : 'Kein Tagesziel berechenbar.'} Sortiert wird nach der Verteilung deiner Ernährungsform.</p>
        )}
        <p className="muted small">
          Gesucht: Protein {pct(target.proteinPct)}, Fett {pct(target.fatPct)}, Kohlenhydrate {pct(target.carbsPct)} der Energie. Oben steht, was dieser Verteilung am nächsten kommt.
          Ernährungsweise: {FOOD_FILTERS[profile.foodFilter]}.
        </p>
      </section>

      <div className="chips" role="group" aria-label="Quelle">
        <button type="button" className={kind === 'recipes' ? 'chip on' : 'chip'} aria-pressed={kind === 'recipes'} onClick={() => setKind('recipes')}>Meine Rezepte</button>
        <button type="button" className={kind === 'dishes' ? 'chip on' : 'chip'} aria-pressed={kind === 'dishes'} onClick={() => setKind('dishes')}>BLS-Gerichte</button>
      </div>
      <div className="field">
        <input type="search" placeholder="Nach Gericht filtern, z. B. Suppe" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Nach Gericht filtern" />
      </div>
      {strict && (
        <label className="check">
          <input type="checkbox" checked={includeUnknown} onChange={(e) => setIncludeUnknown(e.target.checked)} />
          Auch Einträge ohne Angabe zur Ernährungsweise zeigen
        </label>
      )}
      {kind === 'dishes' && (
        <p className="muted small">
          Gerichte aus dem Bundeslebensmittelschlüssel: Werte je 100 g, ohne Zutatenliste, Zubereitung und Angabe zur Ernährungsweise.
          {strict && !includeUnknown && ' Deshalb sind sie bei deiner Ernährungsweise ausgeblendet, solange das Häkchen oben nicht gesetzt ist.'}
        </p>
      )}

      {!result ? (
        <p className="muted">Lädt …</p>
      ) : (
        <>
          {result.hiddenUnknownDiet > 0 && <p className="muted small">{result.hiddenUnknownDiet} Einträge ohne Angabe zur Ernährungsweise ausgeblendet.</p>}
          {!result.items.length && (
            <p className="muted">
              {kind === 'recipes' && !candidates?.recipes.length ? 'Noch keine Rezepte gespeichert.' : 'Nichts Passendes gefunden.'}
            </p>
          )}
          <ul className="list">
            {result.items.slice(0, LIMIT).map((s) => (
              <li key={s.id}>
                <Link to={s.kind === 'recipe' ? recipePath(s.id) : foodPath(s.id)} className="rowlink">
                  <div className="row">
                    <span>{s.title}</span>
                    <span className="badge">{s.pattern.label}</span>
                  </div>
                  <div className="muted small">
                    <MacroLine values={s.values} basis={s.kind === 'recipe' ? 'je Portion' : 'je 100 g'} />
                  </div>
                  <div className="muted small">
                    Energie: E {pct(s.shares.proteinPct)} · F {pct(s.shares.fatPct)} · KH {pct(s.shares.carbsPct)}
                    {s.incomplete && ' · Werte unvollständig'}
                    {s.overKcal && ' · eine Portion liegt über dem Rest von heute'}
                    {s.dietOk === undefined && ' · Ernährungsweise nicht angegeben'}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          {result.items.length > LIMIT && <p className="muted small">{LIMIT} von {result.items.length} angezeigt. Filter eingeben, um einzugrenzen.</p>}
        </>
      )}
      <p className="muted small">
        Das Etikett rechts nennt die Ernährungsform, deren Startwerte in der App der Verteilung am nächsten liegen. Es ist ein Vergleich, keine offizielle Einstufung.
        BLS-Gerichte: Max Rubner-Institut, Bundeslebensmittelschlüssel 4.0 (CC BY 4.0).
      </p>
    </section>
  );
}
