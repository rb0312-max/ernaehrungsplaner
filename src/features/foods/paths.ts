/** Pfade innerhalb des Bereichs Lebensmittel (Hash-Routing, siehe App.tsx). */
export const foodPath = (id: string) => `/lebensmittel/${encodeURIComponent(id)}`;
export const editPath = (id: string) => `${foodPath(id)}/bearbeiten`;
export const NEW_PATH = '/lebensmittel/neu';
export const SCAN_PATH = '/lebensmittel/scan';

/** Zustand, der beim Öffnen von Detail/Formular über den Router mitgegeben wird. */
export interface DetailState {
  /** Noch nicht gespeichertes Produkt (Treffer der Online-Suche). */
  food?: import('../../domain/types').Food;
}
export interface EditorState {
  /** Lebensmittel, dessen Werte als Vorlage übernommen werden (Kopie als eigenes Lebensmittel). */
  copyFromId?: string;
  name?: string;
}
