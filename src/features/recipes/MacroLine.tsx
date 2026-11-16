import { formatNumber } from '../../domain/foodDetail';
import type { NutrientValues } from '../../domain/nutrients';

/** Kurzwerte in einer Zeile; unbekannte Werte als „–“. */
export function MacroLine({ values, basis }: { values: NutrientValues; basis: string }) {
  return (
    <>
      {basis}: {formatNumber(values.kcal)} kcal · E {formatNumber(values.protein)} g · F {formatNumber(values.fat)} g · KH {formatNumber(values.carbs)} g
    </>
  );
}

export const RECIPE_SOURCE_LABEL = { kochwiki: 'Koch-Wiki', custom: 'Eigenes' } as const;
