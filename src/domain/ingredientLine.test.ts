import { describe, expect, it } from 'vitest';
import { gramsOf, parseIngredientLine, parseQuantity } from './ingredientLine';

describe('parseQuantity', () => {
  it('liest ganze Zahlen, Dezimalzahlen und Brüche', () => {
    expect(parseQuantity('2')).toBe(2);
    expect(parseQuantity('1,5')).toBe(1.5);
    expect(parseQuantity('1/8')).toBe(0.125);
    expect(parseQuantity('1 1/2')).toBe(1.5);
    expect(parseQuantity('½')).toBe(0.5);
    expect(parseQuantity('1½')).toBe(1.5);
    expect(parseQuantity('1/0')).toBeUndefined();
    expect(parseQuantity('ein')).toBeUndefined();
  });
});

describe('parseIngredientLine', () => {
  it('Gewichtsangaben werden in Gramm umgerechnet', () => {
    const p = parseIngredientLine('300 g griffiges Mehl (Typ 700)');
    expect(p).toMatchObject({ amount: 300, unit: 'g', rawMeasure: '300 g', rest: 'griffiges Mehl (Typ 700)' });
    expect(gramsOf(p)).toBe(300);
    expect(gramsOf(parseIngredientLine('1 kg Weiß- oder Rotkohl'))).toBe(1000);
    expect(gramsOf(parseIngredientLine('500 mg Safran'))).toBe(0.5);
  });

  it('Spannen: Mittelwert, als Spanne markiert, Wortlaut bleibt erhalten', () => {
    const p = parseIngredientLine('100–150 g Emmentaler');
    expect(p).toMatchObject({ amount: 125, isRange: true, unit: 'g', rawMeasure: '100–150 g' });
    expect(parseIngredientLine('4 bis 6 Eier')).toMatchObject({ amount: 5, isRange: true, unit: 'Stück' });
    expect(parseIngredientLine('1-2 EL Mayonnaise')).toMatchObject({ amount: 1.5, unit: 'EL', rest: 'Mayonnaise' });
    // Minuszeichen U+2212, kommt im Koch-Wiki vor.
    expect(parseIngredientLine('etwa 30−50 g frischen Ingwer')).toMatchObject({ amount: 40, isRange: true, unit: 'g', rest: 'frischen Ingwer' });
  });

  it('Löffel, Volumen und Stück bekommen keine Gramm', () => {
    for (const line of ['2 EL Olivenöl', '1 TL Zucker', '150 ml Milch', '2 cl Gin', '1/8 l Sahne', '2 Eier', '1 Prise Salz', '1 Bd Petersilie']) {
      expect(gramsOf(parseIngredientLine(line)), line).toBeUndefined();
    }
    expect(parseIngredientLine('1/8 l Sahne')).toMatchObject({ amount: 0.125, unit: 'l', rest: 'Sahne' });
    expect(parseIngredientLine('1 Pr Zucker')).toMatchObject({ unit: 'Prise', rest: 'Zucker' });
    expect(parseIngredientLine('4 große Scheiben Toastbrot')).toMatchObject({ amount: 4, unit: 'Stück', rest: 'große Scheiben Toastbrot' });
  });

  it('ohne Zahl bleibt alles Text', () => {
    expect(parseIngredientLine('Salz')).toEqual({ rest: 'Salz' });
    expect(parseIngredientLine('frisch gemahlener Pfeffer')).toEqual({ rest: 'frisch gemahlener Pfeffer' });
  });

  it('überliest "etwa" und "ca." und verwechselt Wortanfänge nicht mit Einheiten', () => {
    expect(parseIngredientLine('etwa 200 g Butter')).toMatchObject({ amount: 200, unit: 'g', rest: 'Butter' });
    expect(parseIngredientLine('ca. 2 EL Öl')).toMatchObject({ amount: 2, unit: 'EL' });
    // "Glasnudeln" beginnt mit "Glas", ist aber keine Einheit.
    expect(parseIngredientLine('2 Glasnudelnester')).toMatchObject({ amount: 2, unit: 'Stück', rest: 'Glasnudelnester' });
    expect(parseIngredientLine('1 l Wasser')).toMatchObject({ unit: 'l', rest: 'Wasser' });
    expect(parseIngredientLine('3 Lorbeerblätter')).toMatchObject({ unit: 'Stück', rest: 'Lorbeerblätter' });
  });
});
