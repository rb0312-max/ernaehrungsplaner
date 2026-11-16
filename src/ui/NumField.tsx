import { useEffect, useId, useState } from 'react';

interface Props {
  label: string;
  /** `undefined` = leer. */
  value: number | undefined;
  /** Wird mit `undefined` aufgerufen, wenn das Feld leer oder ungültig ist. */
  onChange: (v: number | undefined) => void;
  unit?: string;
  step?: number | 'any';
  placeholder?: string;
  hint?: string;
  error?: string;
}

const show = (v: number | undefined) => (v === undefined || !Number.isFinite(v) ? '' : String(v));
const parse = (t: string) => {
  const n = Number(t.replace(',', '.'));
  return t.trim() === '' || !Number.isFinite(n) ? undefined : n;
};

/** Zahlenfeld mit eigenem Text-Zustand, damit Zwischenstände wie "7," beim Tippen nicht verschwinden. */
export function NumField({ label, value, onChange, unit, step = 'any', placeholder, hint, error }: Props) {
  const id = useId();
  const [text, setText] = useState(show(value));
  useEffect(() => {
    // Von außen geänderter Wert (z. B. Zurücksetzen) überschreibt den Text.
    if (parse(text) !== (Number.isFinite(value) ? value : undefined)) setText(show(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="input-unit">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step={step}
          value={text}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          onChange={(e) => {
            setText(e.target.value);
            onChange(parse(e.target.value));
          }}
        />
        {unit && <span className="muted">{unit}</span>}
      </div>
      {hint && !error && <div className="muted small">{hint}</div>}
      {error && <div className="error small" role="alert">{error}</div>}
    </div>
  );
}
