import { lazy, Suspense, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { resolveBarcode } from '../../db/foodRepository';
import { cleanBarcode, isValidBarcode } from '../../domain/barcode';
import { NEW_PATH, foodPath, type EditorState } from './paths';

const BarcodeScanner = lazy(() => import('./BarcodeScanner'));
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Scan oder manuelle Eingabe -> lokal suchen -> Open Food Facts -> sonst Formular mit vorausgefülltem Barcode. */
export function ScanPage() {
  const navigate = useNavigate();
  const [manual, setManual] = useState('');
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();
  const [failed, setFailed] = useState<string>();
  const handling = useRef(false);

  async function handle(code: string) {
    if (handling.current) return; // der Scanner meldet denselben Code mehrfach
    handling.current = true;
    setBusy(code);
    setError(undefined);
    setFailed(undefined);
    try {
      const r = await resolveBarcode(code);
      if (r.status === 'local' || r.status === 'fetched') navigate(foodPath(r.food.id), { replace: true });
      else {
        const state: EditorState = { name: r.status === 'incomplete' ? r.name : undefined };
        navigate(`${NEW_PATH}?barcode=${encodeURIComponent(code)}`, { replace: true, state });
      }
    } catch (e) {
      setError(msg(e));
      setFailed(code);
    } finally {
      setBusy(undefined);
      handling.current = false;
    }
  }

  function submitManual(e: React.FormEvent) {
    e.preventDefault();
    const code = cleanBarcode(manual);
    if (!isValidBarcode(code)) {
      setError('Ungültiger Barcode (EAN-13, EAN-8 oder UPC-A mit korrekter Prüfziffer).');
      return;
    }
    void handle(code);
  }

  return (
    <section>
      <p><Link to="/lebensmittel">← Suche</Link></p>
      <h1>Barcode scannen</h1>
      {busy ? (
        <p role="status">Suche Produkt {busy} …</p>
      ) : (
        <Suspense fallback={<p className="muted">Scanner wird geladen …</p>}>
          <BarcodeScanner onDetect={handle} />
        </Suspense>
      )}
      {error && <p role="alert" className="error">{error}</p>}
      {failed && (
        <div className="actions">
          <button type="button" className="btn" onClick={() => handle(failed)}>Erneut versuchen</button>
          <Link to={`${NEW_PATH}?barcode=${encodeURIComponent(failed)}`} className="btn">Manuell anlegen</Link>
        </div>
      )}
      <form onSubmit={submitManual}>
        <label>
          Oder Barcode eintippen
          <input type="text" inputMode="numeric" value={manual} onChange={(e) => setManual(e.target.value)} placeholder="z. B. 4006381333931" />
        </label>
        <div className="actions">
          <button type="submit" className="btn" disabled={!!busy}>Suchen</button>
        </div>
      </form>
    </section>
  );
}
