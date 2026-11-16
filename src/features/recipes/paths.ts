/** Pfade im Bereich Rezepte (Hash-Routing, siehe App.tsx). */
import type { Recipe } from '../../domain/types';

export const RECIPES_PATH = '/rezepte';
export const RECIPE_NEW_PATH = '/rezepte/neu';
export const RECIPE_IMPORT_PATH = '/rezepte/koch-wiki';
export const RECIPE_SUGGEST_PATH = '/rezepte/vorschlaege';
export const recipePath = (id: string) => `/rezepte/${encodeURIComponent(id)}`;
export const recipeEditPath = (id: string) => `${recipePath(id)}/bearbeiten`;

/** Zustand, der dem Formular über den Router mitgegeben wird. */
export interface RecipeEditorState {
  /** Noch nicht gespeicherter Entwurf aus dem Koch-Wiki. */
  draft?: Recipe;
}
