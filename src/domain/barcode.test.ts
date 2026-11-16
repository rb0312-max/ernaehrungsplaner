import { describe, expect, it } from 'vitest';
import { cleanBarcode, isValidBarcode, normalizeBarcode } from './barcode';

describe('Barcode-Prüfziffer (GS1)', () => {
  it('erkennt gültige EAN-13, EAN-8 und UPC-A', () => {
    expect(isValidBarcode('4006381333931')).toBe(true); // EAN-13
    expect(isValidBarcode('73513537')).toBe(true); // EAN-8
    expect(isValidBarcode('036000291452')).toBe(true); // UPC-A
  });

  it('lehnt falsche Prüfziffer, falsche Länge und Nicht-Ziffern ab', () => {
    expect(isValidBarcode('4006381333932')).toBe(false);
    expect(isValidBarcode('123456')).toBe(false);
    expect(isValidBarcode('40063813339a1')).toBe(false);
    expect(isValidBarcode('')).toBe(false);
  });

  it('entfernt Leerzeichen und Bindestriche', () => {
    expect(cleanBarcode('4006 3813-33931')).toBe('4006381333931');
  });

  it('macht aus UPC-A einen 13-stelligen Code, lässt andere unverändert', () => {
    expect(normalizeBarcode('036000291452')).toBe('0036000291452');
    expect(isValidBarcode(normalizeBarcode('036000291452'))).toBe(true);
    expect(normalizeBarcode('4006381333931')).toBe('4006381333931');
    expect(normalizeBarcode('73513537')).toBe('73513537');
  });
});
