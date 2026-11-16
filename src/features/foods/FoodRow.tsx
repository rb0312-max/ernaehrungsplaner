import { Link } from 'react-router-dom';
import { formatNumber } from '../../domain/foodDetail';
import type { Food } from '../../domain/types';
import { foodPath, type DetailState } from './paths';

export const SOURCE_LABEL: Record<Food['source'], string> = { bls: 'BLS', off: 'Open Food Facts', custom: 'Eigenes' };
/** Kurzform für Listen, damit das Etikett auf dem Handy nicht umbricht. */
const SOURCE_SHORT: Record<Food['source'], string> = { bls: 'BLS', off: 'OFF', custom: 'Eigenes' };

/** Ein Treffer in einer Liste: Name, Quelle und Kurzwerte je 100 g. `unsaved` gibt das Produkt per Router-Zustand mit. */
export function FoodRow({ food, unsaved, favorite }: { food: Food; unsaved?: boolean; favorite?: boolean }) {
  const state: DetailState | undefined = unsaved ? { food } : undefined;
  return (
    <li>
      <Link to={foodPath(food.id)} state={state} className="rowlink">
        <div className="row">
          <span>
            {favorite && <span aria-label="Favorit">★ </span>}
            {food.name} {food.brand && <span className="muted">· {food.brand}</span>}
          </span>
          <span className="badge">{SOURCE_SHORT[food.source]}</span>
        </div>
        <div className="muted small">
          je 100 g: {formatNumber(food.per100.kcal)} kcal · E {formatNumber(food.per100.protein)} g · F {formatNumber(food.per100.fat)} g · KH{' '}
          {formatNumber(food.per100.carbs)} g
        </div>
      </Link>
    </li>
  );
}
