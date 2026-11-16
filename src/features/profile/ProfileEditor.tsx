import { useState } from 'react';
import { GOAL_DEFAULTS, MACRO_PATTERNS, PAL_LEVELS, splitFor, type EnergyTargets } from '../../domain/energy';
import {
  FASTING_MODES,
  FOOD_FILTERS,
  WEEKDAYS,
  calculatedTarget,
  effectiveKcalAdjust,
  macroKcal,
  profileNotes,
  resetSplit,
  setCustomSplit,
  setEatingWindow,
  setFastingMode,
  setGoal,
  setKcalAdjust,
  setMacroPattern,
  setTargetOverride,
  targetsOf,
  toggleFastDay,
  validateProfile,
  type TargetKey,
} from '../../domain/profile';
import type { FastingMode, Goal, MacroPatternId, Profile, Sex } from '../../domain/types';
import { NumField } from '../../ui/NumField';

interface Props {
  initial: Profile;
  /** true bei Ersteinrichtung und neuen Profilen. */
  isNew: boolean;
  onSave: (p: Profile) => Promise<void>;
  onCancel?: () => void;
}

const finite = (v: number) => (Number.isFinite(v) ? v : undefined);
const nan = (v: number | undefined) => v ?? NaN;

export function ProfileEditor({ initial, isNew, onSave, onCancel }: Props) {
  const [p, setP] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const errors = validateProfile(p);
  const valid = Object.keys(errors).length === 0;
  const dirty = JSON.stringify(p) !== JSON.stringify(initial);
  const targets = targetsOf(p);
  const upd = (f: (cur: Profile) => Profile) => setP(f);

  async function save() {
    setSaving(true);
    setSaveError(undefined);
    try {
      await onSave({ ...p, name: p.name.trim() });
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) void save();
      }}
    >
      <fieldset>
        <legend>Person</legend>
        <div className="field">
          <label htmlFor="pname">Name</label>
          <input id="pname" type="text" value={p.name} onChange={(e) => upd((c) => ({ ...c, name: e.target.value }))} aria-invalid={errors.name ? true : undefined} />
          {errors.name && p.name !== initial.name && <div className="error small">{errors.name}</div>}
        </div>
        <div className="field">
          <label htmlFor="sex">Geschlecht (für die Berechnung)</label>
          <select id="sex" value={p.sex} onChange={(e) => upd((c) => ({ ...c, sex: e.target.value as Sex }))}>
            <option value="m">männlich</option>
            <option value="w">weiblich</option>
          </select>
        </div>
        <NumField label="Geburtsjahr" value={finite(p.birthYear)} step={1} placeholder="z. B. 1990" error={errors.birthYear && !Number.isNaN(p.birthYear) ? errors.birthYear : undefined} onChange={(v) => upd((c) => ({ ...c, birthYear: nan(v) }))} />
        <NumField label="Größe" unit="cm" value={finite(p.heightCm)} step={1} error={errors.heightCm && !Number.isNaN(p.heightCm) ? errors.heightCm : undefined} onChange={(v) => upd((c) => ({ ...c, heightCm: nan(v) }))} />
        <NumField label="Gewicht" unit="kg" value={finite(p.weightKg)} step={0.1} error={errors.weightKg && !Number.isNaN(p.weightKg) ? errors.weightKg : undefined} onChange={(v) => upd((c) => ({ ...c, weightKg: nan(v) }))} />
        <div className="field">
          <label htmlFor="pal">Aktivität im Alltag (PAL)</label>
          <select id="pal" value={p.pal} onChange={(e) => upd((c) => ({ ...c, pal: Number(e.target.value) }))}>
            {PAL_LEVELS.map((l) => (
              <option key={l.value} value={l.value}>
                {String(l.value).replace('.', ',')} · {l.label}
              </option>
            ))}
          </select>
        </div>
        {profileNotes(p).map((n) => (
          <p key={n} className="note small">{n}</p>
        ))}
      </fieldset>

      <fieldset>
        <legend>Ziel und Ernährung</legend>
        <div className="field">
          <label htmlFor="goal">Ziel</label>
          <select id="goal" value={p.goal} onChange={(e) => upd((c) => setGoal(c, e.target.value as Goal))}>
            {(Object.keys(GOAL_DEFAULTS) as Goal[]).map((g) => (
              <option key={g} value={g}>{GOAL_DEFAULTS[g].label}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="pattern">Ernährungsform (Makroverteilung)</label>
          <select id="pattern" value={p.macroPattern} onChange={(e) => upd((c) => setMacroPattern(c, e.target.value as MacroPatternId))}>
            {(Object.keys(MACRO_PATTERNS) as Exclude<MacroPatternId, 'eigene'>[]).map((m) => (
              <option key={m} value={m}>{MACRO_PATTERNS[m].label}</option>
            ))}
            <option value="eigene">Eigene Verteilung</option>
          </select>
          {p.macroPattern !== 'eigene' && <div className="muted small">{MACRO_PATTERNS[p.macroPattern].hint}</div>}
        </div>
        <div className="split">
          {(
            [
              ['proteinPct', 'Protein'],
              ['fatPct', 'Fett'],
              ['carbsPct', 'Kohlenhydrate'],
            ] as const
          ).map(([k, label]) => (
            <NumField key={k} label={`${label} (%)`} value={finite(splitFor(p)[k])} step={1} onChange={(v) => upd((c) => setCustomSplit(c, { ...splitFor(c), [k]: nan(v) }))} />
          ))}
        </div>
        {errors.split && <div className="error small" role="alert">{errors.split}</div>}
        {p.customSplit && p.macroPattern !== 'eigene' && (
          <button type="button" className="link" onClick={() => upd(resetSplit)}>
            Anteile auf {MACRO_PATTERNS[p.macroPattern].label} zurücksetzen
          </button>
        )}
        <div className="field">
          <label htmlFor="filter">Ernährungsweise</label>
          <select id="filter" value={p.foodFilter} onChange={(e) => upd((c) => ({ ...c, foodFilter: e.target.value as Profile['foodFilter'] }))}>
            {(Object.keys(FOOD_FILTERS) as Profile['foodFilter'][]).map((f) => (
              <option key={f} value={f}>{FOOD_FILTERS[f]}</option>
            ))}
          </select>
        </div>
      </fieldset>

      <fieldset>
        <legend>Fasten</legend>
        <div className="field">
          <label htmlFor="fasting">Modus</label>
          <select id="fasting" value={p.fasting.mode} onChange={(e) => upd((c) => setFastingMode(c, e.target.value as FastingMode))}>
            {(Object.keys(FASTING_MODES) as FastingMode[]).map((m) => (
              <option key={m} value={m}>{FASTING_MODES[m]}</option>
            ))}
          </select>
        </div>
        {(p.fasting.mode === '16:8' || p.fasting.mode === '14:10') && (
          <div className="field">
            <label htmlFor="wstart">Essensfenster beginnt um</label>
            <input id="wstart" type="time" value={p.fasting.eatingWindowStart ?? ''} onChange={(e) => upd((c) => setEatingWindow(c, e.target.value || undefined))} />
            {p.fasting.eatingWindowEnd && <div className="muted small">Fenster: {p.fasting.eatingWindowStart}–{p.fasting.eatingWindowEnd} Uhr</div>}
          </div>
        )}
        {p.fasting.mode === 'eigene' && (
          <div className="split2">
            <div className="field">
              <label htmlFor="wstart">von</label>
              <input id="wstart" type="time" value={p.fasting.eatingWindowStart ?? ''} onChange={(e) => upd((c) => setEatingWindow(c, e.target.value || undefined, c.fasting.eatingWindowEnd))} />
            </div>
            <div className="field">
              <label htmlFor="wend">bis</label>
              <input id="wend" type="time" value={p.fasting.eatingWindowEnd ?? ''} onChange={(e) => upd((c) => setEatingWindow(c, c.fasting.eatingWindowStart, e.target.value || undefined))} />
            </div>
          </div>
        )}
        {p.fasting.mode === '5:2' && (
          <div className="field">
            <div id="fastdays">Fastentage</div>
            <div className="chips" role="group" aria-labelledby="fastdays">
              {WEEKDAYS.map(({ day, label }) => (
                <label key={day} className={p.fasting.fastDays?.includes(day) ? 'chip on' : 'chip'}>
                  <input type="checkbox" checked={p.fasting.fastDays?.includes(day) ?? false} onChange={() => upd((c) => toggleFastDay(c, day))} />
                  {label}
                </label>
              ))}
            </div>
            {errors.fastDays && <div className="error small">{errors.fastDays}</div>}
          </div>
        )}
        <p className="muted small">Die Tagesansicht mit Essensfenster folgt mit dem Tracker.</p>
      </fieldset>

      <fieldset>
        <legend>Rechner</legend>
        {targets ? (
          <Calculator p={p} t={targets} upd={upd} />
        ) : (
          <p className="muted">Die berechneten Werte erscheinen, sobald Name, Geburtsjahr, Größe, Gewicht und alle übrigen Angaben gültig sind.</p>
        )}
      </fieldset>

      {saveError && <p className="error" role="alert">{saveError}</p>}
      <div className="actions">
        <button type="submit" className="primary" disabled={!valid || saving || (!isNew && !dirty)}>
          {isNew ? 'Profil anlegen' : dirty ? 'Speichern' : 'Gespeichert'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel}>Abbrechen</button>
        )}
      </div>
    </form>
  );
}

const TARGET_ROWS: { key: TargetKey; field: 'kcal' | 'proteinG' | 'fatG' | 'carbsG'; label: string; unit: string }[] = [
  { key: 'kcal', field: 'kcal', label: 'Tagesziel Energie', unit: 'kcal' },
  { key: 'protein', field: 'proteinG', label: 'Protein', unit: 'g' },
  { key: 'fat', field: 'fatG', label: 'Fett', unit: 'g' },
  { key: 'carbs', field: 'carbsG', label: 'Kohlenhydrate', unit: 'g' },
];

function Calculator({ p, t, upd }: { p: Profile; t: EnergyTargets; upd: (f: (c: Profile) => Profile) => void }) {
  const adjust = effectiveKcalAdjust(p);
  const sign = (n: number) => (n > 0 ? `+${n}` : String(n));
  return (
    <div>
      <dl className="facts">
        <dt>Grundumsatz (Mifflin-St Jeor)</dt>
        <dd>{t.bmr} kcal</dd>
        <dt>Gesamtumsatz (Grundumsatz × {String(p.pal).replace('.', ',')})</dt>
        <dd>{t.tdee} kcal</dd>
      </dl>

      <NumField
        label="Anpassung gegenüber dem Gesamtumsatz"
        unit="kcal"
        step={10}
        value={p.kcalAdjust}
        placeholder={`${sign(GOAL_DEFAULTS[p.goal].kcalAdjust)} (Standard für ${GOAL_DEFAULTS[p.goal].label})`}
        hint={p.targetOverrides.kcal !== undefined ? 'Wirkt nicht, solange das Tagesziel überschrieben ist.' : `Aktuell ${sign(adjust)} kcal. Leer lassen für den Standard.`}
        onChange={(v) => upd((c) => setKcalAdjust(c, v))}
      />

      <h3>Tagesziele</h3>
      <p className="muted small">Leer lassen = berechneter Wert. Eigene Werte lassen sich einzeln zurücksetzen.</p>
      {TARGET_ROWS.map(({ key, field, label, unit }) => {
        const own = p.targetOverrides[key];
        const calc = calculatedTarget(p, key);
        return (
          <div key={key} className="target">
            <NumField label={label} unit={unit} step={1} value={own} placeholder={`${calc} (berechnet)`} hint={own === undefined ? `Aktuell ${t[field]} ${unit}` : `Eigener Wert, berechnet wären ${calc} ${unit}`} onChange={(v) => upd((c) => setTargetOverride(c, key, v))} />
            {own !== undefined && (
              <button type="button" className="link" onClick={() => upd((c) => setTargetOverride(c, key, undefined))}>
                Zurücksetzen
              </button>
            )}
          </div>
        );
      })}
      <p className="muted small">Makros ergeben zusammen {macroKcal(t)} kcal (Ziel: {t.kcal} kcal).</p>
      <p className="muted small">DGE-Empfehlung für Protein bei deinem Gewicht: {t.dgeProteinMinG} g.</p>
      {t.warnings.map((w) => (
        <p key={w} className="note" role="status">{w}</p>
      ))}
      <p className="muted small">Grundumsatzformeln, Zielanpassungen und Makroverteilungen sind Schätzungen bzw. Startwerte, keine ärztliche Beratung.</p>
    </div>
  );
}
