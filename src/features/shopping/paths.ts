/** Pfade der Einkaufslisten; sie liegen im Bereich Rezepte (Hash-Routing, siehe RecipesPage.tsx). */
export const SHOPPING_PATH = '/rezepte/einkauf';
export const SHOPPING_NEW_PATH = '/rezepte/einkauf/neu';
export const shoppingListPath = (id: string) => `${SHOPPING_PATH}/${encodeURIComponent(id)}`;
export const shoppingAddPath = (id: string) => `${shoppingListPath(id)}/rezepte`;

/** Zustand für die Auswahl: dieses Rezept ist vorausgewählt. */
export interface ShoppingNewState {
  recipeId?: string;
}
