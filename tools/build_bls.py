#!/usr/bin/env python3
"""Erzeugt public/data/bls.json aus dem Bundeslebensmittelschlüssel (BLS) 4.0.

Quelle: Max Rubner-Institut (2025): Bundeslebensmittelschlüssel (BLS), Version 4.0.
        DOI 10.25826/Data20251217-134202-0, Lizenz CC BY 4.0, Download über https://blsdb.de
Aufruf: python3 tools/build_bls.py <Pfad zu BLS_4_0_Daten_2025_DE.xlsx>

Die Reihenfolge/Schlüssel in NUTRIENTS müssen zu src/domain/nutrients.ts passen.
Werte sind je 100 g. Fehlende Werte bleiben null (im BLS: leer = unbekannt, nicht 0).
"""
import json
import sys
from pathlib import Path

import openpyxl

# (App-Schlüssel, BLS-Code, Faktor BLS-Einheit -> App-Einheit)
NUTRIENTS = [
    ("kcal", "ENERCC", 1),
    ("protein", "PROT625", 1),
    ("fat", "FAT", 1),
    ("carbs", "CHO", 1),
    ("fiber", "FIBT", 1),
    ("sugar", "SUGAR", 1),
    ("satFat", "FASAT", 1),
    ("mufa", "FAMS", 1),
    ("pufa", "FAPU", 1),
    ("omega3", "FAPUN3", 1),
    ("omega6", "FAPUN6", 1),
    ("alcohol", "ALC", 1),
    ("water", "WATER", 1),
    ("salt", "NACL", 1),
    ("cholesterol", "CHORL", 1),
    ("vitA", "VITAA", 1),
    ("vitD", "VITD", 1),
    ("vitE", "VITE", 1),
    ("vitK", "VITK", 1),
    ("b1", "THIA", 1),
    ("b2", "RIBF", 1),
    ("niacin", "NIAEQ", 1),
    ("b5", "PANTAC", 1),
    ("b6", "VITB6", 0.001),  # µg -> mg
    ("biotin", "BIOT", 1),
    ("folate", "FOL", 1),
    ("b12", "VITB12", 1),
    ("vitC", "VITC", 1),
    ("sodium", "NA", 1),
    ("chloride", "CLD", 1),
    ("potassium", "K", 1),
    ("calcium", "CA", 1),
    ("magnesium", "MG", 1),
    ("phosphorus", "P", 1),
    ("iron", "FE", 1),
    ("zinc", "ZN", 1),
    ("iodine", "ID", 1),
    ("copper", "CU", 0.001),  # µg -> mg
    ("manganese", "MN", 0.001),  # µg -> mg
    ("fluoride", "FD", 0.001),  # µg -> mg
    ("chromium", "CR", 1),
    ("molybdenum", "MO", 1),
]


def main() -> None:
    src = Path(sys.argv[1])
    out = Path(__file__).resolve().parent.parent / "public" / "data" / "bls.json"
    wb = openpyxl.load_workbook(src, read_only=True, data_only=True)
    ws = wb.worksheets[0]
    rows = ws.iter_rows(values_only=True)
    header = next(rows)

    # Wertspalten heißen "<CODE> <Name> [<Einheit>/100g]"
    col = {}
    for i, h in enumerate(header):
        if isinstance(h, str) and h.endswith("/100g]"):
            col[h.split(" ", 1)[0]] = i
    missing = [code for _, code, _ in NUTRIENTS if code not in col]
    if missing:
        raise SystemExit(f"Spalten fehlen im BLS: {missing}")

    foods = []
    for r in rows:
        code, name_de, name_en = r[0], r[1], r[2]
        if not code or not name_de:
            continue
        values = []
        for _, bls_code, factor in NUTRIENTS:
            v = r[col[bls_code]]
            if isinstance(v, (int, float)):
                v = float(f"{v * factor:.4g}")
                values.append(int(v) if v == int(v) else v)
            else:
                values.append(None)
        foods.append([str(code), str(name_de).strip(), str(name_en or "").strip(), *values])

    out.parent.mkdir(parents=True, exist_ok=True)
    data = {
        "version": "BLS 4.0 (2025)",
        "source": "Max Rubner-Institut (2025): Bundeslebensmittelschlüssel (BLS), Version 4.0. DOI 10.25826/Data20251217-134202-0",
        "license": "CC BY 4.0",
        "nutrients": [k for k, _, _ in NUTRIENTS],
        "foods": foods,
    }
    out.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{len(foods)} Lebensmittel -> {out} ({out.stat().st_size / 1e6:.2f} MB)")


if __name__ == "__main__":
    main()
