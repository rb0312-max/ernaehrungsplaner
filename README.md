# Ernährungsplaner

Lebensmitteldatenbank, Kalorientracker, Nährstoffübersicht, Rezepte und Einkaufslisten als installierbare Web-App. Alle Daten bleiben auf dem Gerät.

Stand und Planung: [PLAN.md](PLAN.md).

## Starten

```bash
npm install
```

```bash
npm run dev
```

## Datenquellen

- Max Rubner-Institut (2025): Bundeslebensmittelschlüssel (BLS), Version 4.0. DOI 10.25826/Data20251217-134202-0, CC BY 4.0
- Open Food Facts, https://world.openfoodfacts.org, Open Database License (ODbL)
- Referenzwerte: Deutsche Gesellschaft für Ernährung (DGE), https://www.dge.de/wissenschaft/referenzwerte/
- Rezepte: Koch-Wiki, https://www.kochwiki.org, Texte unter CC BY-SA 3.0 (Abruf zur Laufzeit)
- Dichten: Schweizer Nährwertdatenbank, Bundesamt für Lebensmittelsicherheit und Veterinärwesen, https://www.naehrwertdaten.ch
- Portionsgewichte: U.S. Department of Agriculture, Agricultural Research Service. FoodData Central (SR Legacy, 2018). fdc.nal.usda.gov, CC0 1.0
- Koch-Wiki, https://www.kochwiki.org, Rezepttexte unter CC BY-SA 3.0 (Abruf zur Laufzeit)
- Mengenumrechnung: Schweizer Nährwertdatenbank V 7.1 (BLV), USDA FoodData Central SR Legacy (CC0), Koch-Wiki „Zubereitung:Maße und Gewichte“. Einzelheiten und Links: Info-Seite der App und `PLAN.md`

## Veröffentlichung

`.github/workflows/pages.yml` baut und veröffentlicht bei jedem Push auf `main` auf GitHub Pages. Einmalig: Repository, Settings, Pages, Source „GitHub Actions“.

## Icons

```bash
node tools/build_icons.mjs
```
