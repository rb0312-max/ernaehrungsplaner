/**
 * Barcode-Prüfung für EAN-13, EAN-8 und UPC-A. UPC-E (komprimierte 8-stellige Form) wird nicht unterstützt: seine Prüfziffer gehört zum erweiterten UPC-A.
 * Prüfziffer nach GS1 General Specifications, Abschnitt "Check digit calculation": von rechts, ohne Prüfziffer,
 * abwechselnd mit 3 und 1 gewichten; Prüfziffer = (10 - Summe mod 10) mod 10.
 */
export function isValidBarcode(code: string): boolean {
  if (!/^\d+$/.test(code) || ![8, 12, 13].includes(code.length)) return false;
  const digits = [...code].map(Number);
  const check = digits.pop()!;
  const sum = digits.reverse().reduce((s, d, i) => s + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

/** Entfernt Leerzeichen und Bindestriche aus einer Eingabe. */
export function cleanBarcode(input: string): string {
  return input.replace(/[\s-]/g, '');
}

/**
 * Einheitliche Form für Suche und Speicherung: UPC-A (12 Ziffern) wird mit führender 0 zu 13 Ziffern.
 * Open Food Facts liefert für 12-stellige Anfragen den 13-stelligen Code (live geprüft am 15.11.2026).
 */
export function normalizeBarcode(code: string): string {
  return code.length === 12 ? `0${code}` : code;
}
