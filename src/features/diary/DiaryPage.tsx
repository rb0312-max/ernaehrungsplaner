import { Route, Routes } from 'react-router-dom';
import { DayView } from './DayView';
import { WeightView } from './WeightView';

/** Bereich Heute: Tagebuch und Gewichtsverlauf (PLAN.md, M3). */
export function DiaryPage() {
  return (
    <Routes>
      <Route index element={<DayView />} />
      <Route path="gewicht" element={<WeightView />} />
    </Routes>
  );
}
