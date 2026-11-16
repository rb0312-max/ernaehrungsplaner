import { describe, expect, it } from 'vitest';
import { DENSITY_RULES, KOCHWIKI_SPOON_RULES, USDA_RULES } from './conversionData';
import { parseIngredientLine } from './ingredientLine';
import { convertToGrams } from './unitConversion';

/** Zutat wie nach dem Import: Zeile gelesen, Schlüssel aus dem Zutat-Link. */
const line = (text: string, key: string) => {
  const p = parseIngredientLine(text);
  return { name: text, key, amount: p.amount, unit: p.unit, rawMeasure: p.rawMeasure };
};
const grams = (text: string, key: string) => convertToGrams(line(text, key))?.grams;

describe('erzeugte Umrechnungsdaten', () => {
  it('sind in sich stimmig', () => {
    expect(DENSITY_RULES.length).toBeGreaterThan(0);
    expect(USDA_RULES.length).toBeGreaterThan(0);
    expect(KOCHWIKI_SPOON_RULES.length).toBeGreaterThan(0);
    for (const r of KOCHWIKI_SPOON_RULES) expect(r.tsp > 0 && r.tbsp > r.tsp).toBe(true);
    for (const r of [...DENSITY_RULES, ...USDA_RULES, ...KOCHWIKI_SPOON_RULES]) {
      expect(r.keys.length).toBeGreaterThan(0);
      for (const k of r.keys) expect(k).toBe(k.toLowerCase());
      for (const pattern of [r.requires, r.excludes]) if (pattern) expect(() => new RegExp(pattern)).not.toThrow();
    }
    // Dichten von Lebensmitteln liegen in der Quelle zwischen 0,5 und 1,5 g/ml; alles andere wäre ein Lesefehler.
    for (const r of DENSITY_RULES) expect(r.gPerMl > 0.5 && r.gPerMl < 1.5).toBe(true);
    for (const r of USDA_RULES) {
      const portions = [r.tbsp, r.tsp, ...Object.values(r.piece ?? {})].filter((p) => p !== undefined);
      expect(portions.length).toBeGreaterThan(0);
      for (const p of portions) expect(p.grams).toBeGreaterThan(0);
    }
  });
});

describe('Flüssigkeiten über die Dichte', () => {
  it('Volumenangaben: ml mal Dichte', () => {
    // Dichten aus conversionData.ts: Milch 1,03, Olivenöl 0,92, Wasser 1.
    expect(grams('250 ml Vollmilch', 'Milch')).toBe(257.5);
    expect(grams('1/8 l Vollmilch', 'Milch')).toBe(128.8);
    expect(grams('1 dl Olivenöl', 'Olivenöl')).toBe(92);
    expect(grams('4 cl brauner Rum', 'Rum')).toBe(38);
    expect(grams('0,75 l Wasser', 'Wasser')).toBe(750);
  });

  it('Löffel: 15 ml bzw. 5 ml mal Dichte', () => {
    const c = convertToGrams(line('2 EL Olivenöl', 'Olivenöl'));
    expect(c).toMatchObject({ grams: 27.6, origin: 'dichte' });
    expect(c?.note).toContain('30 ml');
    expect(c?.note).toContain('0,92 g/ml');
    expect(c?.note).toContain('Olivenöl');
    expect(grams('1 TL Honig', 'Honig')).toBe(7.2);
  });

  it('Bedingungen der Zuordnung: Zitrone nur als Saft, Brühe nicht per Löffel, keine geschlagene Sahne', () => {
    expect(grams('2 EL Zitronensaft', 'Zitrone')).toBe(31.5);
    expect(grams('1 TL abgeriebene Zitronenschale', 'Zitrone')).toBeUndefined();
    expect(grams('250 ml Gemüsebrühe', 'Brühe')).toBe(252.5);
    expect(grams('1/2 l Gemüsebrühe', 'Brühwürfel')).toBe(505);
    expect(grams('1 TL gekörnte Brühe', 'Brühe')).toBeUndefined();
    expect(grams('200 ml Schlagsahne', 'Sahne')).toBe(202);
    expect(grams('3 EL geschlagene Schlagsahne', 'Sahne')).toBeUndefined();
  });

  it('Spannen rechnen mit dem Mittelwert und sagen das', () => {
    const c = convertToGrams(line('2–4 EL Weißweinessig', 'Weißweinessig'));
    expect(c?.grams).toBe(45.5);
    expect(c?.note).toContain('Mittelwert');
  });
});

describe('Mehl und Speisestärke über die Löffeltabelle des Koch-Wiki', () => {
  it('Esslöffel und Teelöffel haben eigene Werte der Tabelle', () => {
    // Tabelle: Mehl 2,5 g je TL, 10 g je EL; Speisestärke 4 g je TL, 10 g je EL.
    const c = convertToGrams(line('3 EL Weizenmehl (Type 405)', 'Weizenmehl'));
    expect(c).toMatchObject({ grams: 30, origin: 'kochwiki' });
    expect(c?.note).toContain('„Mehl“, Löffeltabelle des Koch-Wiki');
    expect(grams('1 TL Mehl', 'Mehl')).toBe(2.5);
    expect(grams('2 TL Stärkemehl', 'Stärkemehl')).toBe(8);
    expect(grams('2 EL Speisestärke', 'Speisestärke')).toBe(20);
  });

  it('andere Mehle, gehäufte Löffel und andere Einheiten bleiben offen', () => {
    expect(grams('2 EL Vollkornmehl', 'Weizenmehl')).toBeUndefined();
    expect(grams('2 EL Mehl, gehäuft', 'Mehl')).toBeUndefined();
    expect(grams('1 Tasse Mehl', 'Mehl')).toBeUndefined();
    expect(grams('2 EL Reismehl', 'Reismehl')).toBeUndefined();
  });
});

describe('feste Zutaten über USDA-Portionsgewichte', () => {
  it('Löffel: Wert der Quelle, sonst über 1 EL = 3 TL', () => {
    const butter = convertToGrams(line('4 EL Butter', 'Butter'));
    expect(butter).toMatchObject({ grams: 56.8, origin: 'usda' });
    expect(butter?.note).toContain('USDA 173410');
    // Butter hat in der Quelle nur den Esslöffel (14,2 g), Zucker nur den Teelöffel (4,2 g).
    const tl = convertToGrams(line('3 TL Butter', 'Butter'));
    expect(tl?.grams).toBe(14.2);
    expect(tl?.note).toContain('1 EL = 3 TL');
    expect(grams('1 EL Zucker', 'Zucker')).toBe(12.6);
    expect(grams('1 TL Salz', 'Salz')).toBe(6);
    expect(grams('1 EL Salz', 'Salz')).toBe(18);
  });

  it('gehäufte Löffel und abweichende Sorten werden nicht umgerechnet', () => {
    expect(grams('2 EL gehäuft Zucker', 'Zucker')).toBeUndefined();
    expect(grams('2 EL Puderzucker', 'Zucker')).toBeUndefined();
    expect(grams('1 TL Senfkörner', 'Senf')).toBeUndefined();
    expect(grams('1 TL schwarze Pfefferkörner', 'Pfeffer')).toBeUndefined();
    expect(grams('1/2 TL frisch gemahlener Pfeffer', 'Pfeffer')).toBe(1.2);
    expect(grams('1 EL Paprikapulver', 'Paprika')).toBe(6.8);
  });

  it('Stück: Größe aus der Zeile, ohne Angabe mittel', () => {
    expect(grams('1 Zwiebel', 'Zwiebel')).toBe(110);
    expect(grams('1 kleine Zwiebel', 'Zwiebel')).toBe(70);
    expect(grams('2 große Zwiebeln', 'Zwiebel')).toBe(300);
    expect(grams('1 mittelgroße Zwiebel', 'Zwiebel')).toBe(110);
    expect(grams('1/2 Zwiebel', 'Zwiebel')).toBe(55);
    expect(convertToGrams(line('1 Zwiebel', 'Zwiebel'))?.note).toContain('„mittel“ angenommen');
    expect(grams('2 Möhren', 'Möhre')).toBe(122);
    expect(grams('1 rote Paprikaschote', 'Paprika')).toBe(119);
    // "klein" ohne Endung ist keine Größe der Zutat.
    expect(grams('3 klein geschnittene Zwiebeln', 'Zwiebel')).toBe(330);
  });

  it('Ei, Eigelb und Eiweiß haben eigene Einträge', () => {
    expect(grams('4 Eier', 'Ei')).toBe(200);
    expect(grams('2 Eier (Klasse "Medium")', 'Ei')).toBe(100);
    expect(grams('2 Eigelb', 'Ei')).toBe(34);
    expect(grams('4 Eiweiß', 'Ei')).toBe(132);
    expect(grams('2 Eier, getrennt in Eigelb und Eiweiß', 'Ei')).toBeUndefined();
    expect(grams('1 großes Bio-Ei', 'Ei')).toBeUndefined();
    expect(grams('2 Eier (Größe "Large")', 'Ei')).toBeUndefined();
  });

  it('Knoblauch nur als Zehe', () => {
    expect(grams('2 Knoblauchzehen', 'Knoblauch')).toBe(6);
    expect(grams('2 Zehen Knoblauch', 'Knoblauch')).toBe(6);
    expect(grams('1 Knoblauch', 'Knoblauch')).toBeUndefined();
    expect(grams('1 Knolle Knoblauch', 'Knoblauch')).toBeUndefined();
    expect(grams('8 große Knoblauchzehen', 'Knoblauch')).toBeUndefined();
  });

  it('keine Umrechnung bei anderer Einheit, Teilmenge in Worten, "Stück" oder unklarer Größe', () => {
    expect(grams('1 große Dose Tomaten', 'Tomate')).toBeUndefined();
    expect(grams('3–4 Cocktailtomaten', 'Tomate')).toBeUndefined();
    expect(grams('1 Zwiebel (ca. 100 g)', 'Zwiebel')).toBeUndefined();
    expect(grams('1 halbe Zwiebel', 'Zwiebel')).toBeUndefined();
    expect(grams('1 Stück Apfel', 'Apfel')).toBeUndefined();
    expect(grams('2 kleine bis mittelgroße Äpfel', 'Apfel')).toBeUndefined();
    expect(grams('2 Frühlingszwiebeln', 'Zwiebel')).toBeUndefined();
    expect(grams('1 weiße Spitzpaprika', 'Paprika')).toBeUndefined();
    expect(grams('1 rote und 1 grüne Paprikaschote', 'Paprika')).toBeUndefined();
    expect(grams('3 EL Butter und 1 EL Rapsöl', 'Butter')).toBeUndefined();
  });

  it('ohne Schlüssel, Menge oder passende Regel gibt es nichts', () => {
    expect(convertToGrams({ name: '2 EL Olivenöl', amount: 2, unit: 'EL' })).toBeUndefined();
    expect(convertToGrams({ name: 'Olivenöl', key: 'Olivenöl' })).toBeUndefined();
    expect(grams('1 Bund Petersilie', 'Petersilie')).toBeUndefined();
    expect(grams('3 EL Roggenmehl', 'Roggenmehl')).toBeUndefined();
    expect(grams('200 g Butter', 'Butter')).toBeUndefined();
  });
});
