import { useEffect, useRef, useState } from 'react';
import type { DecodeHintType as HintType } from '@zxing/library';
import { isValidBarcode } from '../../domain/barcode';

/** Fehlertext für typische Kameraprobleme. */
function cameraError(e: unknown): string {
  const name = e instanceof DOMException ? e.name : '';
  if (!window.isSecureContext || !navigator.mediaDevices) return 'Die Kamera steht nur über HTTPS (oder localhost) zur Verfügung.';
  if (name === 'NotAllowedError') return 'Kamerazugriff wurde nicht erlaubt. Bitte in den Browsereinstellungen freigeben.';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'Keine Kamera gefunden.';
  if (name === 'NotReadableError') return 'Die Kamera wird bereits von einer anderen App verwendet.';
  return `Kamera konnte nicht gestartet werden${e instanceof Error ? `: ${e.message}` : '.'}`;
}

/**
 * Kamera-Scanner mit @zxing/browser für EAN-13, EAN-8 und UPC-A. Nur Codes mit gültiger Prüfziffer werden gemeldet.
 * Die Bibliothek wird erst beim Öffnen geladen, damit sie nicht in jedem Start enthalten ist.
 */
export default function BarcodeScanner({ onDetect }: { onDetect: (code: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string>();
  const onDetectRef = useRef(onDetect);
  onDetectRef.current = onDetect;

  useEffect(() => {
    let cancelled = false;
    let stop: (() => void) | undefined;
    (async () => {
      try {
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
          import('@zxing/browser'),
          import('@zxing/library'),
        ]);
        const hints = new Map<HintType, unknown>([
          [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A]],
        ]);
        const reader = new BrowserMultiFormatReader(hints);
        const controls = await reader.decodeFromConstraints({ video: { facingMode: 'environment' } }, video.current ?? undefined, (result) => {
          const text = result?.getText();
          if (text && isValidBarcode(text)) onDetectRef.current(text);
        });
        if (cancelled) controls.stop();
        else stop = () => controls.stop();
      } catch (e) {
        if (!cancelled) setError(cameraError(e));
      }
    })();
    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);

  return (
    <div className="scanner">
      {error ? <p role="alert" className="error">{error}</p> : <video ref={video} muted playsInline aria-label="Kamerabild" />}
    </div>
  );
}
