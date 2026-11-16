import { Route, Routes } from 'react-router-dom';
import { ImportView } from './ImportView';
import { RecipeDetail } from './RecipeDetail';
import { RecipeEditor } from './RecipeEditor';
import { ShoppingPage } from '../shopping/ShoppingPage';
import { RecipeList } from './RecipeList';
import { SuggestView } from './SuggestView';

/** Bereich Rezepte: Liste, Detail, Anlegen/Bearbeiten, Import aus dem Koch-Wiki, Vorschläge (PLAN.md, M5), Einkaufslisten (M6). */
export function RecipesPage() {
  return (
    <Routes>
      <Route index element={<RecipeList />} />
      <Route path="neu" element={<RecipeEditor />} />
      <Route path="koch-wiki" element={<ImportView />} />
      <Route path="vorschlaege" element={<SuggestView />} />
      <Route path="einkauf/*" element={<ShoppingPage />} />
      <Route path=":id" element={<RecipeDetail />} />
      <Route path=":id/bearbeiten" element={<RecipeEditor />} />
    </Routes>
  );
}
