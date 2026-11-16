#!/usr/bin/env python3
"""Erzeugt src/domain/conversionData.ts: Dichten und Portionsgewichte für die Mengenumrechnung beim Rezeptimport.

Quellen (Originaldateien, nicht im Repository):
  1. Schweizer Nährwertdatenbank, Bundesamt für Lebensmittelsicherheit und Veterinärwesen,
     https://www.naehrwertdaten.ch/de/downloads/, Datei Schweizer_Nahrwertdatenbank.xlsx,
     Blatt "Generische Lebensmittel", Spalte "Dichte" (Kopfzeile in Zeile 3).
     Einheit der Dichte: g/ml, laut https://www.naehrwertdaten.ch/de/interpretation-von-naehrwertangaben/
     ("Eine Dichte >1 g/ml bedeutet z. B., dass 100 ml mehr als 100 g wiegen", abgerufen 15.11.2026).
     Verwendung laut Downloadseite kostenlos, unter Angabe eines Quellenvermerks.
  2. USDA FoodData Central, SR Legacy (April 2018), https://fdc.nal.usda.gov/download-datasets,
     Datei FoodData_Central_sr_legacy_food_csv_2018-04.zip (entpackt), Tabellen food.csv und food_portion.csv.
     Gemeinfrei (CC0 1.0). Quellenangabe: U.S. Department of Agriculture, Agricultural Research Service.
     FoodData Central. fdc.nal.usda.gov

  3. Koch-Wiki, Seite "Zubereitung:Maße und Gewichte" (https://www.kochwiki.org/wiki/Zubereitung:Maße_und_Gewichte,
     CC BY-SA 3.0), Tabelle "Maße und Mengen verschiedener Zutaten": Gramm je Teelöffel (5 ml) und Esslöffel (15 ml),
     gerundete Werte für gestrichene Messlöffel. Nur für Mehl und Speisestärke verwendet (Entscheidung des Nutzers
     vom 15.11.2026), weil die USDA dafür keinen Löffelwert nennt. Die Seite wird als Antwort der Schnittstelle gespeichert:
     curl -G -o masse.json https://www.kochwiki.org/w/api.php --data-urlencode "action=query" \
       --data-urlencode "prop=revisions" --data-urlencode "rvprop=content|timestamp|ids" --data-urlencode "rvslots=main" \
       --data-urlencode "titles=Zubereitung:Maße und Gewichte" --data-urlencode "format=json" --data-urlencode "formatversion=2"

Aufruf: python3 tools/build_conversions.py <Schweizer_Nahrwertdatenbank.xlsx> <Verzeichnis der entpackten USDA-CSV> <masse.json>

Die Zahlen kommen ausschließlich aus den Dateien. Von Hand gepflegt ist nur die Zuordnung unten:
welcher Zutatenschlüssel des Koch-Wiki (Ziel des Zutat-Links) zu welchem Eintrag gehört. Das Skript bricht ab,
wenn ein Eintrag fehlt, anders heißt als erwartet oder die verlangte Portion nicht hat.

Auswahl der Zutaten: Stichprobe von 398 Koch-Wiki-Rezepten (3.804 Zutatenzeilen, 15.11.2026), häufigste Zutaten
mit Volumen-, Löffel- oder Stückangabe ohne Gewicht.

`requires` / `excludes`: Wörter (regulärer Ausdruck, klein geschrieben), die in der Zutatenzeile stehen müssen
bzw. nicht stehen dürfen. Sie verhindern, dass z. B. "Zitrone" ohne "saft" als Zitronensaft gerechnet wird.
"""
import csv
import json
import re
import sys
from pathlib import Path

import openpyxl

# ---------------------------------------------------------------------------------------------------------
# Flüssigkeiten: Koch-Wiki-Schlüssel -> Eintrag der Schweizer Nährwertdatenbank (ID, erwarteter Name).
# spoons=False: nur Volumenangaben (ml, cl, dl, l), nicht EL/TL (bei Brühe kann der Löffel Pulver meinen).
# ---------------------------------------------------------------------------------------------------------
DENSITIES = [
    dict(keys=["Olivenöl"], id=591, name="Olivenöl"),
    dict(keys=["Sonnenblumenöl"], id=598, name="Sonnenblumenöl"),
    dict(keys=["Rapsöl"], id=600, name="Rapsöl"),
    dict(keys=["Erdnussöl"], id=596, name="Erdnussöl"),
    dict(keys=["Sesamöl"], id=14107, name="Sesamöl"),
    dict(keys=["Kürbiskernöl"], id=13404, name="Kürbiskernöl"),
    dict(keys=["Maiskeimöl"], id=412, name="Maiskeimöl"),
    dict(keys=["Sojaöl"], id=603, name="Sojaöl"),
    # "Baumnuss" hat in der Datenbank das Synonym "Walnuss" (ID 271).
    dict(keys=["Walnussöl"], id=13402, name="Baumnussöl"),
    # Ohne Sortenangabe: in der Kategorie "Fette und Öle/Öle" haben 17 von 18 Einträgen 0,92 g/ml (nur Palmöl 0,89);
    # stellvertretend steht Sonnenblumenöl.
    dict(keys=["Öl", "Speiseöl"], id=598, name="Sonnenblumenöl"),
    dict(keys=["Milch"], id=1194, name="Milch (Durchschnitt)"),
    dict(keys=["Buttermilch"], id=529, name="Buttermilch"),
    dict(keys=["Kokosmilch"], id=13458, name="Kokosnussmilch"),
    # Koch-Wiki nennt "Rahm/Sahne" gleichbedeutend; geschlagene Sahne hat ein anderes Volumen.
    dict(keys=["Sahne"], id=1195, name="Rahm (Durchschnitt)", excludes="geschlagen|steif"),
    dict(keys=["Sauerrahm", "Crème fraîche"], id=574, name="Sauerrahm"),
    dict(keys=["Wasser"], id=47, name="Trinkwasser (Mittelwert Schweiz)"),
    # Fleisch-, Geflügel- und Gemüsebouillon haben alle 1,01 g/ml. "Brühwürfel" nur, wenn die Zeile die Brühe nennt.
    dict(keys=["Brühe", "Gemüsebrühe"], id=664, name="Bouillon, Gemüse, zubereitet", spoons=False, excludes="instant|gekörnt|pulver|würfel"),
    dict(keys=["Brühwürfel"], id=664, name="Bouillon, Gemüse, zubereitet", spoons=False, requires="brühe|bouillon", excludes="instant|gekörnt|pulver"),
    dict(keys=["Essig", "Weißweinessig", "Rotweinessig"], id=1693, name="Essig", excludes="essenz"),
    dict(keys=["Balsamico"], id=13455, name="Balsamicoessig", excludes="creme|crema|reduktion"),
    dict(keys=["Zitronensaft"], id=605, name="Zitronensaft"),
    dict(keys=["Zitrone"], id=605, name="Zitronensaft", requires="saft"),
    dict(keys=["Orangensaft"], id=576, name="Orangensaft"),
    dict(keys=["Apfelsaft"], id=568, name="Apfelsaft"),
    dict(keys=["Ananassaft"], id=13880, name="Ananassaft"),
    dict(keys=["Tomatensaft"], id=564, name="Tomatensaft"),
    dict(keys=["Honig"], id=472, name="Honig (Blütenhonig)"),
    dict(keys=["Ahornsirup"], id=14093, name="Ahornsirup"),
    dict(keys=["Sojasauce"], id=13456, name="Sojasauce"),
    dict(keys=["Ketchup"], id=635, name="Ketchup"),
    dict(keys=["Rum"], id=520, name="Branntwein aus Zuckerrohr (z.B. Rum)"),
    dict(keys=["Brandy", "Weinbrand", "Cognac"], id=519, name="Branntwein aus Wein (z.B.Cognac, Brandy)"),
    dict(keys=["Gin", "Wodka"], id=646, name="Spirituosen 40 vol% (z.B. Vodka, Gin)"),
    dict(keys=["Kirschwasser"], id=644, name="Kirsch"),
    dict(keys=["Rotwein"], id=509, name="Wein rot, 12 vol%"),
]

# ---------------------------------------------------------------------------------------------------------
# Feste Zutaten: Koch-Wiki-Schlüssel -> USDA-Eintrag (fdc_id, erwartete Beschreibung) und Portionen.
# Portionen stehen als (amount, modifier) genau wie in food_portion.csv.
#   tbsp / tsp: gestrichener US-Esslöffel (14,8 ml) / US-Teelöffel
#   piece: Stückgewicht nach Größe: klein, mittel, gross; "einheitlich" = die Quelle nennt nur ein Stückgewicht
#          bzw. es wird bewusst nur eines verwendet
#   units: Einheiten, die neben einer Zahl ohne Einheit als Stück gelten (z. B. "Zehe")
# ---------------------------------------------------------------------------------------------------------
USDA = [
    # Löffel
    dict(keys=["Butter"], fdc_id=173410, description="Butter, salted", tbsp=("1", "tbsp")),
    dict(keys=["Zucker"], fdc_id=169655, description="Sugars, granulated", tsp=("1", "tsp"),
         excludes="puder|staub|braun|roh|vanill|invert|kandis|hagel|gelier|sirup|palm|kokos"),
    dict(keys=["Salz", "Meersalz"], fdc_id=173468, description="Salt, table", tsp=("1", "tsp"), tbsp=("1", "tbsp"),
         excludes="grob|flocken|fleur|kräuter|knoblauch|sellerie"),
    dict(keys=["Senf"], fdc_id=172234, description="Mustard, prepared, yellow", tsp=("1", "tsp or 1 packet"),
         excludes="körner|korn|saat|samen|pulver|mehl"),
    dict(keys=["Backpulver"], fdc_id=172803, description="Leavening agents, baking powder, double-acting, sodium aluminum sulfate",
         tsp=("1", "tsp")),
    dict(keys=["Pfeffer"], fdc_id=170931, description="Spices, pepper, black", tsp=("1", "tsp, ground"), tbsp=("1", "tbsp, ground"),
         requires="gemahlen", excludes="körner|cayenne|zitrone|rosa|grün"),
    dict(keys=["Paprika"], fdc_id=171329, description="Spices, paprika", tsp=("1", "tsp"), tbsp=("1", "tbsp"),
         requires="pulver|edelsüß|rosenscharf"),
    dict(keys=["Butterschmalz"], fdc_id=173412, description="Butter oil, anhydrous", tbsp=("1", "tbsp")),
    dict(keys=["Tomatenmark"], fdc_id=170459,
         description="Tomato products, canned, paste, without salt added (Includes foods for USDA's Food Distribution Program)",
         tbsp=("1", "tbsp")),
    dict(keys=["Zimt"], fdc_id=171320, description="Spices, cinnamon, ground", tsp=("1", "tsp"), tbsp=("1", "tbsp"),
         excludes="stange|rinde|zucker"),
    # Stück
    # Ei: "large" (50 g ohne Schale). Im Koch-Wiki ist Gewichtsklasse M üblich; ein Rezept dort nennt für M
    # "53–63 g, ohne Schale also auch ca. 50 g". USDA "medium" wäre 44 g.
    dict(keys=["Ei"], fdc_id=171287, description="Egg, whole, raw, fresh", piece=dict(einheitlich=("1", "large")),
         excludes="eigelb|dotter|eiweiß|eiweiss|eiklar|wachtel|pulver|likör|large|klasse l"),
    dict(keys=["Ei"], fdc_id=172184, description="Egg, yolk, raw, fresh", piece=dict(einheitlich=("1", "large")),
         requires="eigelb|dotter", excludes="eiweiß|eiweiss|eiklar|large|klasse l"),
    dict(keys=["Ei"], fdc_id=172183, description="Egg, white, raw, fresh", piece=dict(einheitlich=("1", "large")),
         requires="eiweiß|eiweiss|eiklar", excludes="eigelb|dotter|large|klasse l"),
    dict(keys=["Zwiebel"], fdc_id=170000, description="Onions, raw",
         piece=dict(klein=("1", "small"), mittel=("1", 'medium (2-1/2" dia)'), gross=("1", "large")),
         excludes="frühling|lauch|gemüsezwiebel|perl|silber|röst|pulver"),
    dict(keys=["Knoblauch"], fdc_id=169230, description="Garlic, raw", piece=dict(einheitlich=("1", "clove")),
         requires="zehe", units=["Zehe"], excludes="pulver|granulat"),
    dict(keys=["Tomate"], fdc_id=170457, description="Tomatoes, red, ripe, raw, year round average",
         piece=dict(klein=("1", 'small whole (2-2/5" dia)'), mittel=("1", 'medium whole (2-3/5" dia)'), gross=("1", 'large whole (3" dia)')),
         excludes="cocktail|party|kirsch|cherry|dattel|fleischtomate|getrocknet|passiert|mark|ketchup|saft"),
    dict(keys=["Karotte", "Möhre"], fdc_id=170393, description="Carrots, raw",
         piece=dict(klein=("1", 'small (5-1/2" long)'), mittel=("1", "medium"), gross=("1", 'large (7-1/4" to 8-/1/2" long)')),
         excludes="baby|saft"),
    # Rote und grüne Paprika haben in der Quelle dieselben Stückgewichte; es steht der Eintrag für rote.
    dict(keys=["Paprika", "Paprikaschote"], fdc_id=170108, description="Peppers, sweet, red, raw",
         piece=dict(klein=("1", "small"), mittel=("1", "medium (approx 2-3/4\" long, 2-1/2 dia.)"),
                    gross=("1", "large (2-1/4 per pound, approx 3-3/4\" long, 3\" dia.)")),
         excludes="pulver|spitz|mini|edelsüß|rosenscharf|gewürz|geräuchert|flocken|peperoni|chili"),
    dict(keys=["Apfel"], fdc_id=171688, description="Apples, raw, with skin (Includes foods for USDA's Food Distribution Program)",
         piece=dict(klein=("1", 'small (2-3/4" dia)'), mittel=("1", 'medium (3" dia)'), gross=("1", 'large (3-1/4" dia)')),
         excludes="saft|mus|essig|ring|getrocknet|wein"),
]

# ---------------------------------------------------------------------------------------------------------
# Löffelgewichte aus dem Koch-Wiki: Koch-Wiki-Schlüssel -> Zeile der Tabelle "Maße und Mengen verschiedener Zutaten".
# ---------------------------------------------------------------------------------------------------------
KOCHWIKI_SPOONS = [
    dict(keys=["Mehl", "Weizenmehl"], row="Mehl", excludes="vollkorn|roggen|dinkel|buchweizen|reismehl|maismehl|kichererbsen"),
    dict(keys=["Stärkemehl", "Speisestärke"], row="Speisestärke"),
]
KOCHWIKI_TABLE = "Maße und Mengen verschiedener Zutaten"


def load_kochwiki(path: Path):
    """Liest die Löffeltabelle: Zeilen der Form "|Mehl||2,5||10" (Zutat, g je TL, g je EL)."""
    page = json.loads(path.read_text(encoding="utf-8"))["query"]["pages"][0]
    revision = page["revisions"][0]
    text = revision["slots"]["main"]["content"]
    start = text.index(f"=== {KOCHWIKI_TABLE} ===")
    table = text[start:text.index("|}", start)]
    rows = {}
    for m in re.finditer(r"^\|([^|\n]+?)\s*\|\|\s*([\d,]+|--)\s*\|\|\s*([\d,]+)", table, re.M):
        tsp = None if m.group(2) == "--" else float(m.group(2).replace(",", "."))
        rows[m.group(1).strip()] = (tsp, float(m.group(3).replace(",", ".")))
    return page["title"], revision["revid"], revision["timestamp"][:10], rows


def load_swiss(path: Path):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb["Generische Lebensmittel"]
    rows = ws.iter_rows(values_only=True)
    title = str(next(rows)[0]).strip()
    next(rows)
    header = list(next(rows))
    col = {name: header.index(name) for name in ("ID", "Name", "Dichte")}
    foods = {}
    for r in rows:
        if r[col["ID"]] is None:
            continue
        foods[int(r[col["ID"]])] = (str(r[col["Name"]]).strip(), r[col["Dichte"]])
    return title, foods


def load_usda(folder: Path):
    with open(folder / "food.csv", encoding="utf-8", newline="") as f:
        foods = {int(r["fdc_id"]): r["description"] for r in csv.DictReader(f)}
    portions = {}
    with open(folder / "food_portion.csv", encoding="utf-8", newline="") as f:
        for r in csv.DictReader(f):
            portions.setdefault(int(r["fdc_id"]), {})[(r["amount"], r["modifier"])] = float(r["gram_weight"])
    return foods, portions


def number(v: float):
    v = float(f"{v:.6g}")
    return int(v) if v == int(v) else v


def main() -> None:
    if len(sys.argv) != 4:
        raise SystemExit(__doc__)
    swiss_title, swiss = load_swiss(Path(sys.argv[1]))
    usda_foods, usda_portions = load_usda(Path(sys.argv[2]))
    kw_title, kw_revid, kw_date, kw_rows = load_kochwiki(Path(sys.argv[3]))

    densities = []
    for d in DENSITIES:
        if d["id"] not in swiss:
            raise SystemExit(f"Schweizer Eintrag {d['id']} fehlt")
        name, density = swiss[d["id"]]
        if name != d["name"]:
            raise SystemExit(f"Schweizer Eintrag {d['id']} heißt „{name}“, erwartet „{d['name']}“")
        if not isinstance(density, (int, float)):
            raise SystemExit(f"Schweizer Eintrag {d['id']} „{name}“ hat keine Dichte")
        rule = dict(keys=[k.lower() for k in d["keys"]], spoons=d.get("spoons", True), swissId=d["id"], swissName=name, gPerMl=number(density))
        for opt in ("requires", "excludes"):
            if opt in d:
                rule[opt] = d[opt]
        densities.append(rule)

    def portion(u, spec):
        amount, modifier = spec
        grams = usda_portions.get(u["fdc_id"], {}).get((amount, modifier))
        if grams is None:
            raise SystemExit(f"USDA {u['fdc_id']}: Portion „{amount} {modifier}“ fehlt")
        return dict(grams=number(grams), label=f"{amount} {modifier}")

    usda = []
    for u in USDA:
        if usda_foods.get(u["fdc_id"]) != u["description"]:
            raise SystemExit(f"USDA {u['fdc_id']} heißt „{usda_foods.get(u['fdc_id'])}“, erwartet „{u['description']}“")
        rule = dict(keys=[k.lower() for k in u["keys"]], fdcId=u["fdc_id"], description=u["description"])
        for opt in ("requires", "excludes", "units"):
            if opt in u:
                rule[opt] = u[opt]
        for spoon in ("tbsp", "tsp"):
            if spoon in u:
                rule[spoon] = portion(u, u[spoon])
        if "piece" in u:
            rule["piece"] = {size: portion(u, spec) for size, spec in u["piece"].items()}
        usda.append(rule)

    spoons = []
    for k in KOCHWIKI_SPOONS:
        if k["row"] not in kw_rows:
            raise SystemExit(f"Koch-Wiki-Tabelle: Zeile „{k['row']}“ fehlt")
        tsp, tbsp = kw_rows[k["row"]]
        if tsp is None:
            raise SystemExit(f"Koch-Wiki-Tabelle: Zeile „{k['row']}“ hat keinen Teelöffelwert")
        rule = dict(keys=[x.lower() for x in k["keys"]], row=k["row"], tsp=number(tsp), tbsp=number(tbsp))
        if "excludes" in k:
            rule["excludes"] = k["excludes"]
        spoons.append(rule)

    sources = dict(
        swiss=dict(
            name=swiss_title.replace(" – Generische Lebensmittel", ""),
            publisher="Bundesamt für Lebensmittelsicherheit und Veterinärwesen",
            url="https://www.naehrwertdaten.ch",
        ),
        usda=dict(
            name="FoodData Central, SR Legacy (April 2018)",
            publisher="U.S. Department of Agriculture, Agricultural Research Service",
            url="https://fdc.nal.usda.gov",
            license="CC0 1.0",
        ),
        kochwiki=dict(
            name=f"Koch-Wiki, „{kw_title}“, Tabelle „{KOCHWIKI_TABLE}“ (Version {kw_revid} vom {kw_date})",
            url="https://www.kochwiki.org/wiki/Zubereitung:Maße_und_Gewichte",
            license="CC BY-SA 3.0",
        ),
    )

    def ts(value) -> str:
        return json.dumps(value, ensure_ascii=False, indent=2)

    out = Path(__file__).resolve().parent.parent / "src" / "domain" / "conversionData.ts"
    out.write_text(
        "// Erzeugt von tools/build_conversions.py aus den Originaldateien. Nicht von Hand ändern.\n"
        "// Quellen und Zuordnung: siehe Kopf und Tabellen des Skripts.\n"
        "import type { ConversionSources, DensityRule, KochwikiSpoonRule, UsdaRule } from './unitConversion';\n\n"
        f"export const CONVERSION_SOURCES: ConversionSources = {ts(sources)};\n\n"
        "/** Dichte in g/ml aus der Schweizer Nährwertdatenbank, je Zutatenschlüssel des Koch-Wiki. */\n"
        f"export const DENSITY_RULES: DensityRule[] = {ts(densities)};\n\n"
        "/** Portionsgewichte in g aus USDA FoodData Central (SR Legacy), je Zutatenschlüssel des Koch-Wiki. */\n"
        f"export const USDA_RULES: UsdaRule[] = {ts(usda)};\n\n"
        "/** Gramm je gestrichenem Teelöffel (5 ml) und Esslöffel (15 ml) aus der Löffeltabelle des Koch-Wiki, gerundete Werte. */\n"
        f"export const KOCHWIKI_SPOON_RULES: KochwikiSpoonRule[] = {ts(spoons)};\n",
        encoding="utf-8",
    )
    print(f"{len(densities)} Dichten, {len(usda)} USDA-Einträge, {len(spoons)} Koch-Wiki-Löffelwerte -> {out}")


if __name__ == "__main__":
    main()
