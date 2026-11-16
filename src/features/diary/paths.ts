/** Pfade im Bereich Heute (Tagebuch und Gewicht). Das Datum steht im Query-Parameter `datum`. */
export const DIARY_PATH = '/heute';
export const WEIGHT_PATH = '/heute/gewicht';
export const diaryDayPath = (date: string) => `${DIARY_PATH}?datum=${date}`;
