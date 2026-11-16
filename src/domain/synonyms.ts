/**
 * Suchsynonyme: Suchwort (normalisiert, siehe normalize() in db/blsFoods.ts) -> zusätzliche Suchwörter.
 * Enthält nur Wortzuordnungen, keine Nährwerte. Jedes Zielwort kommt in den BLS-Namen vor
 * (geprüft in synonyms.test.ts gegen public/data/bls.json), die Zuordnung der Wörter stammt aus dem
 * allgemeinen Sprachgebrauch (regionale Namen, Schreibvarianten) und ist bewusst knapp gehalten.
 */
export const SYNONYMS: Record<string, string[]> = {
  ei: ['huehnerei'],
  eier: ['huehnerei'],
  topfen: ['quark'],
  paradeiser: ['tomate'],
  karfiol: ['blumenkohl'],
  marille: ['aprikose'],
  erdapfel: ['kartoffel'],
  rotkraut: ['rotkohl'],
  blaubeere: ['heidelbeere'],
  courgette: ['zucchini'],
  eierfrucht: ['aubergine'],
  truthahn: ['pute'],
  huehnchen: ['haehnchen'],
  mohrrube: ['moehre'],
  yoghurt: ['joghurt'],
  jogurt: ['joghurt'],
  schrippe: ['broetchen'],
  eierschwamm: ['pfifferling'],
  brokkoli: ['broccoli'],
  nudeln: ['teigwaren'],
  spaghetti: ['teigwaren'],
  rindfleisch: ['rind'],
  schweinefleisch: ['schwein'],
};

/** Alternativen zu einem normalisierten Suchwort (ohne das Wort selbst). */
export function expandWord(word: string): string[] {
  return SYNONYMS[word] ?? [];
}
