# Ernährungsplaner

PWA (Vite, React, TypeScript, Dexie). Plan, Architektur, Datenquellen und Meilensteine stehen in `PLAN.md`: vor jeder Arbeit lesen, nach jedem Meilenstein den Abschnitt "Stand" aktualisieren.

## Befehle

- `npm run dev` Entwicklungsserver
- `npm test` Tests (vitest)
- `npm run typecheck` Typprüfung
- `npm run build` Produktions-Build nach `dist/`
- `python3 tools/build_bls.py <BLS-Excel>` erzeugt `public/data/bls.json` neu
- `python3 tools/build_conversions.py <Schweizer_Nahrwertdatenbank.xlsx> <USDA-SR-Legacy-Verzeichnis> <masse.json>` erzeugt `src/domain/conversionData.ts` neu (Dichten, Portionsgewichte)

## Regeln

- Oberfläche und Kommentare auf Deutsch, kurz und sachlich.
- Keine Nährwerte, Referenzwerte oder Formeln erfinden oder aus dem Gedächtnis ergänzen. Jede Zahl braucht eine Quelle im Kommentar. Bei Unklarheit den Nutzer fragen.
- Fehlender Nährwert = unbekannt, nie 0.
- Logik gehört nach `src/domain/` (ohne Browser-APIs, mit Tests), Oberfläche nach `src/features/`.
- Mobil zuerst: jede Ansicht in Handy-Breite prüfen (Playwright ist vorinstalliert).
- Live-Tests gegen externe APIs in der Cloud-Umgebung brauchen `NODE_USE_ENV_PROXY=1`; sie gehören nicht in die Testsuite.

## Zusammenarbeit mit dem Nutzer

- Dem Nutzer jedes Mal ausdrücklich sagen, wenn ein Chat-Wechsel sinnvoll ist: nach jedem abgeschlossenen und gepushten Meilenstein. Vorher prüfen, dass alles committet und gepusht ist.
- Sagen, wenn ein Modellwechsel sinnvoll wird (siehe `PLAN.md`, Abschnitt 9).
- Kurz, sachlich, nichts erfinden; bei Unklarheiten nachfragen.
