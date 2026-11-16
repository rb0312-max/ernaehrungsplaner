import { Route, Routes } from 'react-router-dom';
import { FoodDetail } from './FoodDetail';
import { FoodEditor } from './FoodEditor';
import { ScanPage } from './ScanPage';
import { SearchView } from './SearchView';

/** Bereich Lebensmittel: Suche, Detail, Anlegen/Bearbeiten, Scan (PLAN.md, M1). */
export function FoodsPage() {
  return (
    <Routes>
      <Route index element={<SearchView />} />
      <Route path="neu" element={<FoodEditor />} />
      <Route path="scan" element={<ScanPage />} />
      <Route path=":id" element={<FoodDetail />} />
      <Route path=":id/bearbeiten" element={<FoodEditor />} />
    </Routes>
  );
}
