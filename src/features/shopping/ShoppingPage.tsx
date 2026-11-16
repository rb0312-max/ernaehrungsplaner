import { Route, Routes } from 'react-router-dom';
import { AddRecipesView, NewListView } from './PickViews';
import { ListView } from './ListView';
import { ListsView } from './ListsView';

/** Einkaufslisten: Übersicht, neue Liste aus Rezepten, Liste abhaken, Rezepte nachträglich hinzufügen (PLAN.md, M6). */
export function ShoppingPage() {
  return (
    <Routes>
      <Route index element={<ListsView />} />
      <Route path="neu" element={<NewListView />} />
      <Route path=":id" element={<ListView />} />
      <Route path=":id/rezepte" element={<AddRecipesView />} />
    </Routes>
  );
}
