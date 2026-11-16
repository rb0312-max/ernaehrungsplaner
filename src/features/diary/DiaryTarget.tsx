import { createContext, useContext, useMemo, useState } from 'react';
import type { MealSlot } from '../../domain/types';

/** Ziel für das nächste Hinzufügen (Mahlzeit und Tag), gesetzt über „Hinzufügen“ im Tagebuch. Gilt für einen Eintrag, danach wieder leer. */
export interface DiaryTarget {
  meal: MealSlot;
  date: string;
}

interface Ctx {
  target: DiaryTarget | undefined;
  setTarget: (t: DiaryTarget | undefined) => void;
}

const DiaryTargetContext = createContext<Ctx>({ target: undefined, setTarget: () => {} });

export function DiaryTargetProvider({ children }: { children: React.ReactNode }) {
  const [target, setTarget] = useState<DiaryTarget>();
  const value = useMemo(() => ({ target, setTarget }), [target]);
  return <DiaryTargetContext.Provider value={value}>{children}</DiaryTargetContext.Provider>;
}

export const useDiaryTarget = (): Ctx => useContext(DiaryTargetContext);
