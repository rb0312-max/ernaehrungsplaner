import { describe, expect, it } from 'vitest';
import { emptyForm, foodFromForm, formFromFood, formatInput, parseDecimal, validateForm } from './foodForm';
import type { Food } from './types';

describe('parseDecimal', () => {
  it('nimmt Komma und Punkt', () => {
    expect(parseDecimal('12,5')).toBe(12.5);
    expect(parseDecimal('12.5')).toBe(12.5);
    expect(parseDecimal(' 0 ')).toBe(0);
  });
  it('lehnt Leeres, Negatives und Text ab', () => {
    expect(parseDecimal('')).toBeUndefined();
    expect(parseDecimal('-1')).toBeUndefined();
    expect(parseDecimal('abc')).toBeUndefined();
    expect(parseDecimal('1,2,3')).toBeUndefined();
  });
});

describe('Formular für eigene Lebensmittel', () => {
  it('verlangt Name und Energie', () => {
    const r = validateForm(emptyForm());
    expect(r.errors.name).toBeDefined();
    expect(r.errors.kcal).toBeDefined();
  });

  it('leeres Feld bleibt unbekannt, eine eingegebene 0 bleibt 0', () => {
    const form = { ...emptyForm(), name: 'Wasser', values: { kcal: '0', protein: '', fat: '0' } };
    const r = validateForm(form);
    expect(r.errors).toEqual({});
    expect(r.per100).toEqual({ kcal: 0, fat: 0 });
    expect('protein' in r.per100).toBe(false);
  });

  it('meldet ungültige Zahlen und Portion', () => {
    const form = { ...emptyForm(), name: 'X', servingG: '0', values: { kcal: '100', protein: 'viel' } };
    const r = validateForm(form);
    expect(r.errors.protein).toBeDefined();
    expect(r.errors.servingG).toBeDefined();
  });

  it('prüft die Barcode-Form', () => {
    const r = validateForm({ ...emptyForm(), name: 'X', barcode: '12ab', values: { kcal: '1' } });
    expect(r.errors.barcode).toBeDefined();
  });

  it('Food -> Formular -> Food ist verlustfrei', () => {
    const food: Food = {
      id: 'custom:1', source: 'custom', name: 'Müsli', brand: 'Eigen', per100: { kcal: 372.5, protein: 11.2, vitC: 0.7 }, servingG: 40, updatedAt: 1,
    };
    const form = formFromFood(food);
    expect(form.values.kcal).toBe('372,5');
    const result = validateForm(form);
    expect(foodFromForm(form, result, 'custom:1', 1)).toEqual({ ...food, barcode: undefined });
  });

  it('formatInput vermeidet Rundungsartefakte', () => {
    expect(formatInput(0.1 + 0.2)).toBe('0,3');
    expect(formatInput(undefined)).toBe('');
  });
});
