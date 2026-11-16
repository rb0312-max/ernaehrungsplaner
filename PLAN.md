# Projektplan Ernährungsplaner

Stand: 15.11.2026. Dieses Dokument ist die Arbeitsgrundlage für alle weiteren Sitzungen.

## 1. Ziel

Eine App für zwei Personen (weitere Profile möglich) mit:

1. Lebensmitteldatenbank, aktualisierbar, mit eigener Eingabe und Barcode-Scan
2. Kalorien- und Makrorechner
3. Übersicht der Vitamine und Mineralstoffe mit Tagesmengen (vom Nutzer anpassbar)
4. Kalorientracker
5. Rezeptvorschlägen passend zu Gericht oder Makros, mit Einkaufsliste
6. wählbaren Zielen und Ernährungsformen (Keto, Low Carb, High Carb, Fasten usw.), individuell anpassbar

## 2. Getroffene Entscheidungen (vom Nutzer bestätigt)

| Thema | Entscheidung |
|---|---|
| Plattform | Web-App / PWA, auf dem Handy installierbar |
| Daten | Lokal pro Gerät (IndexedDB), mehrere Profile, Export/Import als Datei, kein Server |
| Scannen | Barcode über Kamera, Werte aus Open Food Facts |
| Rezepte | Eigene Rezeptdatenbank in der App. Import aus dem Koch-Wiki (kochwiki.org, CC BY-SA 3.0) per Online-Suche zur Laufzeit, nichts davon liegt im Repository. Dazu BLS-Gerichte für Vorschläge und eigene Rezepte. Entschieden am 15.11.2026; TheMealDB und eine mitgelieferte Rezeptdatei wurden verworfen |
| Referenzwerte | DGE-Werte als Vorgabe, pro Profil überschreibbar und zurücksetzbar |

## 3. Stand (Meilensteine M0 bis M7 erledigt)

### M0

- Projektgerüst: Vite, React, TypeScript, Dexie, PWA (Service Worker, offline-fähig), Hash-Routing
- BLS 4.0 vollständig eingebunden: 7.140 Lebensmittel, 42 Nährstoffe je 100 g (`public/data/bls.json`)
- Lokale Suche über BLS und gespeicherte Lebensmittel, im Browser getestet
- Open-Food-Facts-Anbindung (Barcode-Abfrage, Textsuche, Abbildung der Nährwerte), live gegen die API getestet
- DGE-Referenzwerte für Erwachsene ab 19, von den DGE-Seiten abgelesen, mit Überschreibung pro Profil
- Energierechner: Grundumsatz (Mifflin-St Jeor), Gesamtumsatz (PAL), Zielanpassung, Makroverteilung je Ernährungsform
- Datenbankschema für Profile, Lebensmittel, Tagebuch, Gewicht, Rezepte, Einkaufslisten, Einstellungen; Export/Import-Funktionen
- 15 Tests, Typprüfung und Build laufen fehlerfrei

### M1 Lebensmittel (erledigt am 15.11.2026)

- Suche: Synonyme (`domain/synonyms.ts`, Zielwörter per Test gegen die BLS-Namen geprüft), Favoriten und zuletzt verwendete zuerst (`domain/foodRanking.ts`), ohne Suchbegriff Liste von Favoriten und Zuletzt-Verwendeten
- Detailansicht: alle 42 Nährstoffe gruppiert, Menge in g oder Portion (nur bei bekannter Portionsgröße), unbekannte Werte als „–“, Vitaminformen
- Eigene Lebensmittel: anlegen, bearbeiten, löschen; BLS- und OFF-Einträge als eigenes kopieren; leeres Feld = unbekannt, Pflicht nur Name und kcal (`domain/foodForm.ts`)
- Barcode: Kamera-Scan (`@zxing/browser`, EAN-13/EAN-8/UPC-A, Prüfziffer nach GS1, wird erst beim Öffnen geladen) und manuelle Eingabe; Ablauf lokal, dann Open Food Facts, sonst Formular mit Barcode (`resolveBarcode()`)
- Open Food Facts: Knopf „Online suchen“, Treffer ansehen und speichern, gespeicherte Produkte einzeln aktualisieren
- 45 Tests, Typprüfung und Build laufen fehlerfrei. Browser-Test in 390 px Breite (Playwright, Fake-Kamera mit EAN-13-Bild): Suche, Detail, Anlegen/Bearbeiten/Löschen, Scan, Online-Suche, Aktualisieren

Befunde und Grenzen aus M1:

- Open Food Facts liefert für 12-stellige UPC-A den 13-stelligen Code (live geprüft); `normalizeBarcode()` stellt 0 voran, sonst würde ein gescanntes Produkt lokal nicht wiedergefunden.
- UPC-E (komprimierte 8-stellige Form) wird nicht gescannt: seine Prüfziffer gehört zum erweiterten UPC-A.
- Bei Drosselung antwortet Open Food Facts im Browser ohne CORS-Header; der Browser meldet nur „Failed to fetch“. Die App zeigt dann „nicht erreichbar … zu viele Anfragen“. Die Textsuche ist auf ca. 10 pro Minute begrenzt.
- Favoriten und „zuletzt verwendet“ gelten pro Profil: Schlüssel `favoriteFoodIds:<profileId>` und `recentFoodIds:<profileId>` in `settings` (Schlüssel in `db.ts`); Löschen eines Profils oder Lebensmittels räumt sie auf. „Verwendet“ heißt bisher: Detailansicht geöffnet oder gespeichert. `addFoodEntry()` (M3) ruft `markUsed(profileId, id)` beim Tagebucheintrag auf.
- Online-Treffer sind nur über den Router-Zustand geöffnet; nach Neuladen der Seite müssen sie erneut gesucht oder gespeichert werden.
- Nicht getestet: Scan mit echter Handykamera und unter iOS (im Test nur Chromium mit Fake-Kamera).
- M5 muss beim Löschen eines Lebensmittels bedenken, dass Rezepte per `foodId` darauf verweisen können (heute gibt es keine Rezepte).

### M2 Profile, Ziele, Rechner (erledigt am 15.11.2026)

- Ersteinrichtung beim ersten Start (ohne Profil zeigt die App nur das Anlegeformular); Profile anlegen, wechseln, löschen (mit Tagebuch, Gewichtsverlauf, Einkaufslisten des Profils)
- Profilformular: Name, Geschlecht, Geburtsjahr, Größe, Gewicht, PAL, Ziel, Ernährungsform (mit eigener Makroverteilung in %), Ernährungsweise, Fasten (16:8, 14:10, 5:2 mit zwei Fastentagen, eigenes Essensfenster)
- Rechner live im Formular: Grundumsatz, Gesamtumsatz, Tagesziel, Makros in g, Warnungen aus `energyTargets()`, Abgleich Makro-kcal gegen Kalorienziel
- Überschreibbar: Kalorien-Anpassung, Tagesziel, Protein, Fett, Kohlenhydrate, Makroanteile; jeweils Zurücksetzen auf den berechneten Wert (leeres Feld = berechnet). Ein Zielwechsel setzt die Kalorien-Anpassung auf den Standard des neuen Ziels zurück
- Neu: `src/domain/profile.ts` (Prüfung, Überschreibungen, Fasten-Helfer), `src/db/profileRepository.ts`, `src/features/profile/`, `src/ui/NumField.tsx`
- Nicht im Formular (Vorgabe im Profil, Oberfläche folgt in M4): Phytatzufuhr (Zink), Postmenopause (Eisen)
- Unter 19 Jahren: nur Hinweis, keine Sperre
- 16 neue Tests (zusammen mit M1: 61), Typprüfung und Build laufen fehlerfrei; im Browser in 375 px Breite durchgespielt (Anlegen, Überschreiben, Zurücksetzen, Fasten, Profilwechsel, Löschen, Neuladen)

### M3 Tracker (erledigt am 15.11.2026)

- Startseite ist jetzt „Heute“ (`/heute`). Tagesansicht: Datum per Pfeile oder Datumsfeld (`?datum=YYYY-MM-DD`), Einträge nach Mahlzeit (Frühstück, Mittagessen, Abendessen, Snacks), Summe je Mahlzeit
- Eintragen: „+ Hinzufügen“ je Mahlzeit führt in die Lebensmittelsuche (Hinweiszeile mit Mahlzeit und Tag, „Abbrechen“); Scan und Suche enden in der Detailansicht, dort Abschnitt „Zum Tagebuch“ (Mahlzeit, Tag, Menge aus der Mengenwahl in g oder Portion). Unbekannte Online-Treffer werden dabei zuerst gespeichert. Das Ziel (Mahlzeit/Tag) gilt für einen Eintrag (`features/diary/DiaryTarget.tsx`)
- Eintrag ändern (Menge in g, Mahlzeit), löschen, auf anderen Tag und in andere Mahlzeit kopieren. Einträge speichern Name und Nährwerte als Kopie (`domain/diary.ts`)
- Tagessummen gegen Ziele aus `targetsOf()`: Energie mit Restanzeige bzw. Überschreitung, Protein, Fett, Kohlenhydrate mit Balken. Einträge ohne Angabe zu einem Wert werden gezählt und genannt („Summe unvollständig“); sind alle unbekannt, steht „–“ statt 0 (`knownTotal()`)
- Gewicht (`/heute/gewicht`): ein Wert je Tag (neuer Wert ersetzt den alten), Liniendiagramm (SVG, Achse nur über die Messspanne, nicht ab 0), erster/letzter Wert, Änderung, Minimum/Maximum, Löschen. „Als Profilgewicht übernehmen“ setzt das Profilgewicht, damit die Ziele neu berechnet werden; das passiert nie automatisch
- Fasten: Essensfenster (16:8, 14:10, eigene Zeiten, auch über Mitternacht) mit „jetzt offen/geschlossen“ nur am heutigen Tag; bei 5:2 Hinweis „Fastentag“ nach Wochentag (`domain/fasting.ts`)
- Neu: `domain/dates.ts`, `domain/diary.ts`, `domain/fasting.ts`, `domain/weight.ts`, `db/diaryRepository.ts`, `features/diary/`
- 29 neue Tests (zusammen 90), Typprüfung und Build laufen fehlerfrei; Browser-Test in 390 px Breite (Playwright): Profil mit 16:8 anlegen, Eintrag über Suche, Ändern, Kopieren auf morgen, Datum wechseln, Löschen, Gewicht eintragen und übernehmen, Neuladen, kein horizontaler Überlauf

Befunde und Grenzen aus M3:

- Eintrag „über Rezept“ fehlt: Es gibt noch keine Rezepte. `DiaryEntry.recipeId` ist im Typ vorhanden; der Weg kommt mit M5.
- Fastentage bei 5:2: Das Tagesziel bleibt unverändert, die App zeigt nur den Hinweis. Entscheidung des Nutzers (15.11.2026): Fastentage brauchen keine Kalorienvorgabe, es bleibt dabei.
- Essensfenster ohne Prüfung: Einträge haben keine Uhrzeit, ob ein Eintrag im Fenster liegt, wird nicht geprüft.
- Mengen im Tagebuch nur in g; die Portion wird beim Eintragen in Gramm umgerechnet.
- Kopieren: einzelne Einträge, keine ganzen Mahlzeiten oder Tage.
- Das Datumsfeld zeigt das Format des Browsers (z. B. MM/TT/JJJJ bei englischer Spracheinstellung).
- Nicht getestet: echtes Handy, iOS.

### M4 Vitamine und Mineralstoffe (erledigt am 15.11.2026)

- Ansicht „Nährstoffe“ (`src/features/nutrients/`): 29 Nährstoffe mit DGE-Wert (Vitamine, Mineralstoffe, Spurenelemente, Ballaststoffe), je Zeile Art des Werts (Empfohlene Zufuhr, Schätzwert, Richtwert, Eigener Wert), Formen/Bezugsgröße, DGE-Hinweis, Obergrenze der DGE-Spanne
- Ist-Werte aus dem Tagebuch: Tag oder Wochenschnitt (7 Tage bis zum gewählten Datum), Datum wechselbar (`domain/intake.ts`, `diaryBetween()` in `db/diaryRepository.ts`, Datumshelfer aus M3)
- Wochenschnitt teilt durch die Tage mit Einträgen, nicht durch 7 (Entscheidung von mir, nicht aus einer Quelle): ein Tag ohne Eintrag ist nicht erfasst. Die Ansicht nennt „x von 7 Tagen erfasst“.
- Fehlende Daten: Nährstoff bei keinem Eintrag angegeben = „unbekannt“; bei einem Teil der Einträge = „mind.“-Wert mit Hinweis, bei wie vielen Einträgen die Angabe fehlt
- Jeder Referenzwert einzeln überschreibbar (ohne Runden) und zurücksetzbar; „Alle zurücksetzen“ lässt Energie-/Makroziele unberührt (`setReferenceOverride`, `resetAllReferenceOverrides`)
- Oberfläche für Phytatzufuhr (Zink) und Postmenopause (Eisen, nur bei Frauen; „automatisch“ = ab 51)
- Erläuterungen zu Empfehlung/Schätzwert/Richtwert und Anwendungshinweise (Wochendurchschnitt genügt, keine Mangeldiagnose) sinngemäß nach den DGE-FAQ, https://www.dge.de/gesunde-ernaehrung/faq/referenzwerte/ (abgerufen 15.11.2026), Quelle im Code-Kommentar
- 19 neue Tests (zusammen: 80), Typprüfung und Build laufen fehlerfrei. Browser-Test in 375 px Breite (Playwright): Wochen-/Tagesansicht mit Testeinträgen, fehlende Werte, Obergrenze, Überschreiben, Zurücksetzen, Zink/Phytat, Neuladen, kein horizontaler Überlauf

Grenzen aus M4:

- Ohne Tagebucheinträge zeigt die Ansicht nur die Tagesmengen.
- M4 und M3 entstanden parallel auf getrennten Branches und wurden zusammengeführt (Konflikte in `dates.ts`, `diaryRepository.ts`, Tests, `styles.css`, `PLAN.md`; es gilt `dates.ts` aus M3, CSS-Klasse der Nährstoffbalken heißt `.nbar`). Nach dem Zusammenführen im Browser (375 px) geprüft: Haferflocken und Banane über den Tracker eintragen, in „Nährstoffe“ stimmen die Summen (B1 0,442 mg, Magnesium 94,3 mg nachgerechnet gegen `bls.json`), Vitamin C als „mind.“ weil Haferflocken keine Angabe haben. 105 Tests zusammen.
- Zeitraum ist fest 7 Tage; keine Prozent-Bewertung (niedrig/ausreichend), nur der Anteil am Referenzwert.
- Selen fehlt im BLS; erscheint nur bei Produkten aus Open Food Facts oder eigener Eingabe.
- Bei Richtwerten mit Untergrenze (Ballaststoffe, Fluorid) und Obergrenze (Fett, Cholesterin, die hier nicht geführt werden) wird nur die DGE-Spanne bei Schätzwerten als Obergrenze markiert.
- `isoDate()` in `db.ts` ist jetzt ein Alias auf `toIsoDate()` aus `domain/dates.ts`.

### M5 Rezepte (erledigt am 15.11.2026)

- Bereich „Rezepte“ (`src/features/recipes/`): Liste mit Filter, Detail, Anlegen/Bearbeiten, Löschen, Koch-Wiki-Suche, Vorschläge
- Eigene Rezepte: Zutaten mit Lebensmittel aus BLS, Open Food Facts oder eigenen (Suche im Formular), Gramm, Portionen, Ernährungsweise, Zubereitung. Nährwerte je Portion werden aus den Zutaten gerechnet (`domain/recipe.ts`)
- Zutaten speichern eine Kopie von Name und Nährwerten des Lebensmittels. Ein gelöschtes oder geändertes Lebensmittel verändert gespeicherte Rezepte nicht (erledigt den Punkt aus M1)
- Drei Zustände je Zutat: zugeordnet (Lebensmittel und Gramm), „nicht berechnen“ (bewusst, z. B. Salz nach Geschmack), offen. Ein Rezept mit offenen Zutaten lässt sich speichern, aber nicht ins Tagebuch eintragen
- Koch-Wiki: Suche nur auf Knopfdruck über die MediaWiki-Schnittstelle (`services/kochWiki.ts`), Auslesen des Wikitexts (`domain/kochwikiParse.ts`): Portionen, Zutatenzeilen, Zubereitung, Kategorien als Schlagwörter. Bilder werden nicht übernommen. Ein schon importiertes Rezept öffnet das gespeicherte
- Namensnennung am Rezept: Link zur Seite, zur Versionsgeschichte (Autoren), zur Lizenz; Vermerk, wenn Name, Zutatentext oder Zubereitung geändert wurden (`Recipe.modified`)
- Zutaten-Zuordnung beim Import: Schlüssel ist das Ziel des Zutat-Links im Wiki (z. B. „Olivenöl“). Zuerst die gemerkte Zuordnung des Nutzers, sonst ein BLS-Grundlebensmittel, das genau mit diesem Wort beginnt (bevorzugt „roh“, nie ein Gericht), gekennzeichnet als „Vorschlag, bitte prüfen“. Kein passender Name = kein Vorschlag
- Gramm beim Import: nur aus Gewichtsangaben der Quelle (mg, g, kg). Für EL, TL, ml, Stück, Bund usw. gibt es keine geprüfte Umrechnung; der Nutzer trägt Gramm ein. Die App merkt sich Gramm je Einheit und Lebensmittel sowie die Zuordnung (`settings`, Schlüssel `recipeLearned`) und setzt sie beim nächsten Import ein
- Tagebuch: „+ Rezept“ je Mahlzeit, Eintrag in Portionen. Gespeichert werden Gramm Rohgewicht und Werte je 100 g als Kopie; Nährstoffe, die bei einer Zutat fehlen, bleiben im Eintrag unbekannt
- Einordnung: Energieanteile von Protein, Fett, Kohlenhydraten (4/9/4 kcal je g aus `energy.ts`); Etikett ist die Ernährungsform, deren Startwerte am nächsten liegen
- Vorschläge (`/rezepte/vorschlaege`): eigene Rezepte (je Portion) und 2.050 BLS-Gerichte (je 100 g), sortiert nach Nähe zur Verteilung der heute noch offenen Makros, sonst zur Verteilung des Profils; Filter nach Gerichtname; Hinweis, wenn eine Portion über den restlichen kcal liegt
- Ernährungsweise: Rezepte tragen omnivor/pescetarisch/vegetarisch/vegan oder keine Angabe. Beim Import nur aus Kategorien, die mit „Vegan…“ oder „Vegetarisch…“ beginnen. Einträge ohne Angabe (auch alle BLS-Gerichte) sind bei nicht-omnivoren Profilen ausgeblendet, per Häkchen einblendbar
- Neu: `domain/recipe.ts`, `domain/ingredientLine.ts`, `domain/kochwikiParse.ts`, `services/kochWiki.ts`, `db/recipeRepository.ts`, `features/recipes/`; `Recipe`/`RecipeIngredient` in `types.ts` erweitert (Quelle `kochwiki` statt `mealdb`), Dexie-Schema unverändert
- 41 neue Tests (zusammen 146), Typprüfung und Build laufen fehlerfrei. Browser-Tests in 390 und 375 px (Playwright, echte Koch-Wiki-Antworten): Suche, Entwurf prüfen, speichern, ins Tagebuch, eigenes Rezept, Vorschläge mit BLS-Gerichten, zweiter Import mit gemerkter Zuordnung, veganes Profil, geänderter Import, Löschen, Neuladen, kein horizontaler Überlauf

Festlegungen von mir in M5 (keine Quelle, bei Bedarf ändern):

- Spannen in der Quelle („100–150 g“, „4 bis 6 Personen“): bei Zutaten ist der Mittelwert vorbelegt, bei Portionen die erste Zahl; der Wortlaut steht daneben.
- „Am nächsten an Low Carb“ usw. ist der kleinste Abstand zu den Startwerten in `MACRO_PATTERNS`, keine Einstufung mit Grenzwerten.
- Sortierung der Vorschläge nur nach Makroverteilung, nicht nach Kalorienmenge.

Befunde und Grenzen aus M5:

- Der Import braucht Handarbeit: In der Stichprobe (40 Rezepte, 333 Zutatenzeilen) hatte nur etwa jede sechste Zeile eine Gewichtsangabe. Alles andere muss beim ersten Mal gewogen oder geschätzt eingetragen werden; danach hilft das Gemerkte.
- Automatische Vorschläge können danebenliegen (z. B. „Zitronensaft“ verweist im Wiki auf „Zitrone“ und bekommt „Zitrone roh“). Deshalb die Kennzeichnung bis zur Bestätigung.
- Nährwerte beziehen sich auf rohe Zutaten ohne Garverlust; das Portionsgewicht ist das Rohgewicht der berechneten Zutaten.
- Gemerkte Zuordnungen lassen sich nur überschreiben (neu zuordnen und speichern), nicht einzeln ansehen oder löschen.
- Wird ein Rezept gelöscht, bleibt der Tagebucheintrag; sein Link führt dann auf „Nicht gefunden“.
- Das Koch-Wiki hat laut eigener Statistik nur 4 aktive Nutzer (15.11.2026). Fällt es aus, bleiben gespeicherte Rezepte nutzbar, nur die Suche geht nicht mehr.
- Die Koch-Wiki-Suche ist eine Volltextsuche; Treffer ohne Rezeptvorlage werden beim Öffnen abgewiesen.
- Rezepte aus Unterseiten mit mehreren Teilrezepten werden als eine Zutatenliste gelesen.
- Nicht getestet: echtes Handy, iOS, Abruf aus dem Browser ohne Testumleitung (im Test holt Node die echten Antworten; der CORS-Kopf `access-control-allow-origin: *` wurde mit curl geprüft).

### M5b Mengenumrechnung beim Rezeptimport (erledigt am 15.11.2026; USDA-Liste vom Nutzer am 15.11.2026 freigegeben)

- Beim Import werden fehlende Gramm vorbelegt. Reihenfolge: Gewichtsangabe der Quelle, gemerkter Wert des Nutzers, Umrechnung (`prefillGrams()` in `domain/recipe.ts`). Jede Zutat trägt die Herkunft (`gramsOrigin`: quelle, gemerkt, dichte, usda, kochwiki) und bei Umrechnungen die Herleitung im Wortlaut (`gramsNote`); beides steht unter dem Mengenfeld. Ein geänderter Wert verliert die Herkunft
- Flüssigkeiten (ml, cl, dl, l, EL, TL): Volumen mal Dichte. EL 15 ml, TL 5 ml (gestrichen) nach der Koch-Wiki-Seite „Zubereitung:Maße und Gewichte“ (Version 398712 vom 01.11.2016). Dichten aus der Schweizer Nährwertdatenbank V 7.1: 35 Zuordnungen von Koch-Wiki-Schlüsseln (Öle, Milch, Sahne, Wasser, Brühe, Essig, Säfte, Honig, Sirup, Sojasauce, Ketchup, Spirituosen, Rotwein)
- Einheit der Dichte bestätigt: g/ml, laut https://www.naehrwertdaten.ch/de/interpretation-von-naehrwertangaben/ („Eine Dichte >1 g/ml bedeutet z. B., dass 100 ml mehr als 100 g wiegen“, abgerufen 15.11.2026)
- Feste Zutaten: USDA FoodData Central, SR Legacy (Liste vom Nutzer freigegeben). Löffel: Butter, Zucker, Salz/Meersalz, Senf, Backpulver, Pfeffer gemahlen, Paprikapulver, Butterschmalz, Tomatenmark, Zimt. Stück: Ei, Eigelb, Eiweiß, Zwiebel, Knoblauchzehe, Tomate, Karotte/Möhre, Paprikaschote, Apfel. In der Oberfläche als „US-Daten, bitte prüfen“ gekennzeichnet, mit Knopf „Menge passt“; jede Zahl mit `fdc_id` in `conversionData.ts`
- Mehl und Speisestärke per Löffel: Löffeltabelle der Koch-Wiki-Seite „Zubereitung:Maße und Gewichte“ (Mehl 2,5 g je TL, 10 g je EL; Speisestärke 4 g je TL, 10 g je EL), Entscheidung des Nutzers vom 15.11.2026, weil die USDA dafür keinen Löffelwert nennt. Im Hinweis als „Koch-Wiki, gerundet“ gekennzeichnet. Schlüssel: Mehl, Weizenmehl, Stärkemehl, Speisestärke; andere Mehle (Vollkorn, Roggen, Dinkel u. a.) bleiben offen. Der Rest der Tabelle wird nicht genutzt
- Zuordnung über den Zutatenschlüssel des Koch-Wiki (Ziel des Zutat-Links), nicht über das zugeordnete Lebensmittel. Bedingungen je Eintrag (Wörter, die in der Zeile stehen müssen oder nicht dürfen), z. B. „Zitrone“ nur mit „saft“ als Zitronensaft, „Knoblauch“ nur als Zehe, „Zucker“ nicht bei Puder- oder braunem Zucker
- Auswahl der Zutaten nach einer Stichprobe: 398 zufällige Koch-Wiki-Rezepte, 3.804 Zutatenzeilen, davon 2.986 mit Menge. Mit Gramm vorbelegt waren vorher 790 (26 %), jetzt 1.762 (59 %): 424 über Dichte, 527 über USDA, 21 über die Koch-Wiki-Löffeltabelle
- Daten werden erzeugt, nicht abgetippt: `python3 tools/build_conversions.py <Schweizer_Nahrwertdatenbank.xlsx> <USDA-Verzeichnis> <masse.json>` schreibt `src/domain/conversionData.ts` (`masse.json` = Antwort der Koch-Wiki-Schnittstelle für die Maßseite, Abruf steht im Kopf des Skripts). Von Hand gepflegt ist nur die Zuordnungstabelle im Skript; es bricht ab, wenn ein Eintrag fehlt, anders heißt oder die Portion nicht hat
- Unverändert gespeicherte Umrechnungen werden nicht als Wert des Nutzers gemerkt; beim nächsten Import wird neu gerechnet und wieder gekennzeichnet
- Neu: `domain/unitConversion.ts`, `domain/conversionData.ts` (erzeugt), `tools/build_conversions.py`; geändert: `types.ts` (`gramsOrigin`, `gramsNote`), `recipe.ts`, `kochwikiParse.ts`, `ingredientLine.ts`, `recipeRepository.ts`, `RecipeEditor.tsx`, `RecipeDetail.tsx`. Dexie-Schema unverändert
- 19 neue Tests (zusammen 165), Typprüfung und Build laufen fehlerfrei. Browser-Test in 390 und 375 px (Playwright, echte Koch-Wiki-Antworten): Import von vier Rezepten, Vorbelegung über Dichte, USDA und Koch-Wiki-Löffeltabelle, Herkunftshinweise, „Menge passt“, Überschreiben, Speichern, Detailansicht, Neuladen, kein horizontaler Überlauf

Festlegungen von mir in M5b (bei Bedarf ändern; die ersten vier lagen dem Nutzer bei der Freigabe der Liste vor):

- Ei: USDA „large“ (50 g ohne Schale), nicht „medium“ (44 g). Begründung: Im Koch-Wiki ist Gewichtsklasse M üblich; ein Rezept dort nennt für M „53–63 g, ohne Schale also auch ca. 50 g“. Größenwörter ändern den Wert nicht; bei „groß“ oder „Large“ wird nicht umgerechnet
- Stück ohne Größenangabe: „mittel“. „kleine/große/mittlere“ in der Zeile wählt den USDA-Wert small/large/medium. Nennt die Zeile mehrere Größen, wird nicht umgerechnet
- Nennt die USDA nur einen Löffel (Butter nur EL, Zucker nur TL), wird der andere über 1 EL = 3 TL gerechnet (Verhältnis laut Koch-Wiki-Seite); der Hinweis sagt das
- Nicht umgerechnet wird bei: gehäuften Löffeln, „2 Stück …“, Teilmengen in Worten („1 halbe“), einer weiteren Einheit in der Zeile („1 große Dose Tomaten“, „1 Zwiebel (ca. 100 g)“), einer zweiten Menge („3 EL Butter und 1 EL Öl“)
- „Öl“/„Speiseöl“ ohne Sorte: Dichte von Sonnenblumenöl (17 von 18 Ölen der Datenbank haben 0,92 g/ml). Essig, Weißwein- und Rotweinessig: Eintrag „Essig“. Sahne: „Rahm (Durchschnitt)“. Rote, grüne und gelbe Paprikaschote: Eintrag für rote
- Gramm werden auf 0,1 g gerundet; USDA-Löffelwerte werden nicht von US-Löffel (14,8 ml) auf 15 ml umgerechnet

Befunde und Grenzen aus M5b:

- Die Koch-Wiki-Seite „Zubereitung:Maße und Gewichte“ enthält entgegen dem früheren Stand dieses Plans auch Gewichte: eine Tabelle „g im Teelöffel (5 ml) / g im Esslöffel (15 ml)“ für 17 Zutaten (u. a. Butter 5/15, Mehl 2,5/10, Öl 4/12, Salz 6/15, Speisestärke 4/10, Zucker 5/15, Tomatenmark 5/15) und eine Tabelle Volumen zu Gewicht für 6 Zutaten. Gerundete Werte, von Nutzern geschrieben, in sich nicht einheitlich (Öl 4 g je TL, aber 12 g je EL). Eingebaut sind auf Entscheidung des Nutzers nur Mehl und Speisestärke
- Mehl und Speisestärke haben in der USDA keinen Löffelwert (nur „cup“); deshalb die Koch-Wiki-Werte
- Schreibfehler der Quelle werden gelesen, wie sie dastehen: „11/2 EL Mehl“ (gemeint 1 1/2) ergibt 5,5 EL. Der Wortlaut steht im Hinweis unter dem Feld
- Ohne Umrechnung bleiben: Zeilen ohne Zutat-Link (in der Stichprobe 181 Zeilen mit Menge), Prise, Bund, Scheibe, Dose, Päckchen, Schalotte (USDA nennt kein Stückgewicht), Zitrone, Chili, Kräuter, die meisten Gewürze, Wein (im Koch-Wiki nicht als Zutat verlinkt)
- Die Umrechnung hängt am Zutat-Link, nicht am Lebensmittel: Wer „Sahne“ einem anderen Lebensmittel zuordnet, bekommt trotzdem die Dichte von Rahm. Eigene Rezepte (ohne Import) werden nicht umgerechnet
- USDA-Werte sind US-Größen (Apfel mittel 182 g, Tomate mittel 123 g); deshalb die Kennzeichnung
- Rezepte, die vor M5b gespeichert wurden, haben keine Herkunftsangabe; sie zeigen die bisherigen Hinweise
- In der Cloud-Umgebung ist `naehrwertdaten.ch` ohne `www.` gesperrt; der Download-Link der Seite zeigt dorthin. Mit `https://www.naehrwertdaten.ch/wp-content/uploads/2026/07/Schweizer_Nahrwertdatenbank.xlsx` geht es
- Nicht getestet: echtes Handy, iOS

### M6 Einkaufslisten (erledigt am 15.11.2026)

- Einkaufslisten liegen im Bereich Rezepte (`/rezepte/einkauf`, Knopf „Einkaufslisten“ in der Rezeptliste; ein sechster Tab hätte in 375 px nicht gepasst, nicht geprüft). Übersicht je Profil, neueste zuerst; „Auf Einkaufsliste“ im Rezeptdetail wählt das Rezept vor
- Neue Liste: Name (vorbelegt „Einkauf <Datum>“), Rezepte mit Portionenzahl (vorbelegt mit den Portionen des Rezepts, Mengen werden mit Wunschportionen / Rezeptportionen skaliert); ohne Rezepte entsteht eine leere Liste für eigene Posten. Rezepte lassen sich später hinzufügen (ein Rezept nur einmal je Liste); gleiche Posten werden addiert und wieder als offen markiert
- Zusammenfassen (`domain/shopping.ts`): Zutaten mit Lebensmittel und Gramm je Lebensmittel (Summe in g, ab 1000 g als kg angezeigt). Alle anderen Zutaten als Textposten mit der Menge der Quelle; gleicher Name (Groß-/Kleinschreibung egal) und gleiche Einheit werden addiert, verschiedene Einheiten bleiben getrennte Posten (keine Umrechnung von EL, ml, Stück). Gewichte mg/kg werden in g umgerechnet. Der Zutatentext wird beim Anlegen neu gelesen, nicht die gespeicherte Menge der Zutat
- Posten zeigen, aus welchen Rezepten sie stammen. Abhaken (erledigte Posten rutschen ans Ende), eigene Posten, Posten entfernen, Erledigte entfernen, Liste löschen
- „Als Text teilen“: Teilen-Dialog des Geräts (`navigator.share`), sonst Zwischenablage, sonst Textfeld zum Kopieren. Enthält nur die noch offenen Posten
- Posten und Rezepttitel sind Kopien: Löschen oder Ändern eines Rezepts verändert die Liste nicht. Profil löschen entfernt seine Listen (war schon angelegt)
- `ShoppingItem`/`ShoppingList` in `types.ts` geändert (`recipeIds` ersetzt durch `recipes` mit Portionen, `note` durch `from`, neu `id`, `amount`, `unit`, `own`); Dexie-Schema unverändert, es gab noch keine gespeicherten Listen
- Neu: `domain/shopping.ts`, `db/shoppingRepository.ts`, `features/shopping/`
- 18 neue Tests (zusammen 164), Typprüfung und Build laufen fehlerfrei. Browser-Test in 375 px Breite (Playwright, Testdaten direkt in IndexedDB): Vorauswahl aus dem Rezept, Portionen ändern, Liste anlegen (1,3 kg Tomate aus zwei Rezepten, 7 EL Olivenöl nachgerechnet), Abhaken, eigener Posten, Teilen per Zwischenablage, Neuladen, Entfernen, Löschen, leere Liste, kein horizontaler Überlauf, keine Konsolenfehler

Festlegungen von mir in M6 (keine Quelle, bei Bedarf ändern):

- „Nicht berechnete“ Zutaten (z. B. Salz) kommen als Textposten auf die Liste: Sie werden nur für die Nährwerte ignoriert, eingekauft werden müssen sie trotzdem. Entfernen lässt sich jeder Posten.
- Der Text zum Teilen enthält nur offene Posten.
- Wird ein schon abgehakter Posten durch ein weiteres Rezept größer, ist er wieder offen.

Befunde und Grenzen aus M6:

- Posten werden nach exakt gleichem Text zusammengefasst: „Zwiebel“ und „Zwiebeln“ oder „natives Olivenöl“ und „Olivenöl“ bleiben getrennt. Absichtlich, damit nichts Verschiedenes zusammengelegt wird.
- Gramm-Posten tragen den Namen des zugeordneten Lebensmittels (z. B. „Zitrone roh“ für „Zitronensaft“ aus einer automatischen Zuordnung) und das Rohgewicht laut Rezept; das ist nicht die Packungsgröße.
- Offene Zutaten ohne Menge der Quelle (z. B. „Salz“) stehen ohne Menge da. Ändert der Nutzer später den Zutatentext im Rezept, ändert sich die Liste nicht.
- Seit M5b können Gramm einer Zutat aus Umrechnungen stammen (Dichte, USDA, Koch-Wiki-Tabelle). Die Liste zeigt die Gramm, nicht deren Herkunft.
- Listen sind pro Gerät und Profil; Austausch nur über Export/Import (M7) oder „Als Text teilen“.
- Nicht getestet: echtes Handy, iOS, Teilen-Dialog (`navigator.share`; im Test nur der Zwischenablage-Weg).

### M7 Abschluss (Code erledigt am 15.11.2026; Veröffentlichung wartet auf den Nutzer)

- Sicherung (`/profil/sicherung`, Link unten im Profil): Export aller Tabellen als JSON-Datei `ernaehrung-sicherung-<Datum>.json` (Download), Import mit Vorschau (Datei, Erstelldatum, Anzahl je Tabelle). Auf einem Gerät mit Daten Wahl zwischen „Zusammenführen“ (gleiche IDs werden überschrieben, alles andere bleibt, das aktive Profil des Geräts bleibt) und „Ersetzen“ (vorher alles löschen, mit Rückfrage). Einspielen in einer Transaktion: bei einem Fehler bleibt der alte Stand. Bei der Ersteinrichtung (ohne Profil) steht der Import unter dem Profilformular, damit ein zweites Gerät die Daten übernehmen kann
- Dateiformat: Kennung `ernaehrung-backup`, Versionsnummer `BACKUP_VERSION` (zählt das Dateiformat, nicht das Dexie-Schema). Neuere Versionen, fremde Dateien, fehlende Schlüsselfelder werden abgelehnt, unbekannte Tabellen ignoriert. Geprüft wird nur die Form der Datensätze, nicht ihr Inhalt. Die alten, ungenutzten `exportAll()`/`importAll()` in `db.ts` sind entfallen
- Info-Seite (`/profil/info`): Quellen und Lizenzen (BLS mit der Quellenangabe aus `bls.json`, Open Food Facts, DGE, Koch-Wiki, Mengenumrechnung mit Schweizer Nährwertdatenbank, USDA und Koch-Wiki-Maßseite aus `CONVERSION_SOURCES`), Installationshinweis (zeigt, ob die App installiert läuft), Hinweise zur Genauigkeit
- PNG-Icons (`tools/build_icons.mjs`, rendert aus der Form der `icon.svg` mit Chromium): 192 und 512 px, maskable 512 px (Motiv in der Sicherheitszone), `apple-touch-icon.png` 180 px; Manifest und `index.html` eingebunden, Icon-Pfad in `index.html` relativ (war absolut und hätte unter GitHub Pages im Unterordner gefehlt)
- Veröffentlichung vorbereitet: `.github/workflows/pages.yml` (Push auf `main` oder von Hand: `npm ci`, Tests, Build, Deploy auf GitHub Pages). Es läuft erst, wenn der Nutzer in den Repository-Einstellungen unter Pages die Quelle „GitHub Actions“ wählt und der Stand auf `main` liegt. Der Branch dieser Sitzung wurde mit dem Branch von M5b/M6 (`busy-goodall-mz3jlf`) zusammengeführt, weil `main` beides noch nicht enthielt
- Neu: `domain/backup.ts`, `db/backupRepository.ts`, `features/about/`, `tools/build_icons.mjs`, `.github/workflows/pages.yml`
- 11 neue Tests (zusammen 194 inkl. M5b und M6), Typprüfung und Build laufen fehlerfrei. Browser-Test in 390 px Breite (Playwright, gebauter Stand): ungültige Datei, Import bei Ersteinrichtung, Export (Dateiname, Inhalt), Zusammenführen, Ersetzen, Info-Seite, kein horizontaler Überlauf, keine Konsolenfehler

Befunde und Grenzen aus M7:

- Die Versionen der Actions im Workflow (`checkout@v4`, `setup-node@v4`, `upload-pages-artifact@v3`, `deploy-pages@v4`) stammen aus meinem Wissen, die aktuellen Versionen waren in der Sitzung nicht abrufbar (kein GitHub-Zugriff für `gh`). Der erste Lauf ist ungeprüft; Fehler zeigt der Actions-Reiter
- Die Sicherungsdatei ist unverschlüsselt und enthält Gesundheitsdaten (Hinweis steht in der Oberfläche)
- Es gibt keine Erinnerung an Sicherungen und keinen Zeitstempel der letzten Sicherung
- Mit „Zusammenführen“ gewinnt bei gleicher ID immer die Datei, auch wenn der lokale Eintrag neuer ist
- Lizenztexte der Bibliotheken (React, Dexie, zxing usw.) sind nicht in der App aufgeführt und nicht geprüft
- Das Format der Installationsschritte (Menünamen in Safari und Chrome) ist allgemein beschrieben, nicht auf aktuellen Geräten geprüft
- Nicht getestet: echtes Handy, iOS (Download und Dateiauswahl, Installation, Icons), Android-Maske der Icons

## 4. Architektur

```
tools/build_bls.py        BLS-Excel -> public/data/bls.json
tools/build_conversions.py  Schweizer Nährwertdatenbank + USDA SR Legacy + Koch-Wiki-Maßseite -> src/domain/conversionData.ts
public/data/bls.json      Grunddaten (statisch, vom Service Worker offline vorgehalten)
src/domain/               reine Logik ohne Browser-APIs, vollständig getestet
  nutrients.ts            Nährstoffliste (Schlüssel, Einheit, OFF-Feld), scale(), sum()
  types.ts                Profile, Food, DiaryEntry, Recipe, ShoppingList ...
  referenceValues.ts      DGE-Werte, referenceFor(profil)
  energy.ts               Grundumsatz, Ziele, Makroverteilung, Ernährungsformen
  intake.ts               Zufuhr aus dem Tagebuch, Vergleich mit Referenzwerten
  foodDetail.ts           Gruppierung der Nährwerte, Mengenumrechnung, Zahlenformat
  foodForm.ts             Formular eigener Lebensmittel <-> Food, Prüfung
  foodRanking.ts          Favoriten / zuletzt verwendet in der Trefferreihenfolge
  dates.ts                Kalenderdaten (YYYY-MM-DD), Verschieben, Wochentag
  diary.ts                Tagebucheinträge, Mahlzeiten, Tagessummen, Fortschritt
  fasting.ts              Essensfenster, Fastentage
  weight.ts               Gewichtsprüfung, Kennzahlen, Diagrammgeometrie
  barcode.ts              Prüfziffer (EAN-13/8, UPC-A), Normalisierung
  synonyms.ts             Suchsynonyme
  recipe.ts               Rezept-Nährwerte, Zutatenzustände, Makroverteilung, Vorschläge, gemerkte Zuordnungen
  shopping.ts             Einkaufslisten: Zutaten aus Rezepten zusammenfassen, Mengen skalieren, Text zum Teilen
  ingredientLine.ts       Zutatenzeile lesen (Menge, Einheit), Gramm nur aus Gewichtsangaben
  unitConversion.ts       Volumen, Löffel, Stück -> Gramm (Regeln; Dichte, USDA-Portionsgewicht, Koch-Wiki-Löffeltabelle)
  conversionData.ts       Dichten und Portionsgewichte, erzeugt von tools/build_conversions.py
  backup.ts               Sicherungsformat, Prüfung beim Import
  kochwikiParse.ts        Wikitext des Koch-Wiki -> Rezeptentwurf
src/db/
  db.ts                   Dexie-Schema
  backupRepository.ts     Sicherung erzeugen, prüfen, einspielen (zusammenführen/ersetzen)
  blsFoods.ts             BLS laden, Suche
  foodRepository.ts       ein Zugriffspunkt für BLS + Open Food Facts + eigene Lebensmittel
  diaryRepository.ts      Tagebuch und Gewichtsverlauf
  recipeRepository.ts     Rezepte, gemerkte Zuordnungen, Entwurf aus dem Koch-Wiki, Kandidaten für Vorschläge
  shoppingRepository.ts   Einkaufslisten anlegen, Rezepte hinzufügen, abhaken, eigene Posten
src/services/             externe Quellen (openFoodFacts.ts, kochWiki.ts)
src/features/<bereich>/   Oberfläche je Bereich
src/ui/                   gemeinsame Bausteine, styles.css
```

Regeln:

- Fehlender Nährwert bedeutet unbekannt, nie 0. `sum()` liefert deshalb zusätzlich, wie viele Einträge je Nährstoff keine Angabe haben; die Oberfläche muss das anzeigen.
- Lebensmittel-IDs: `bls:<Code>`, `off:<Barcode>`, `custom:<uuid>`. BLS-Einträge sind schreibgeschützt; zum Ändern als eigenes Lebensmittel kopieren.
- Tagebucheinträge und Rezeptzutaten speichern eine Kopie von Name und Nährwerten, damit alte Tage und Rezepte stabil bleiben.
- Mengen werden automatisch in Gramm umgerechnet, wenn die Quelle ein Gewicht nennt oder `conversionData.ts` einen Wert für Zutat und Einheit hat. Keine Löffel-, Stück- oder Dichtewerte ohne Quelle; neue Werte nur über `tools/build_conversions.py` aus den Originaldateien. Jede vorbelegte Menge nennt ihre Herkunft.
- Berechnete Ziele kommen aus `energyTargets()` und `referenceFor()`; eigene Werte liegen in `Profile.targetOverrides`.
- Neue Nährwerte, Referenzwerte oder Formeln nur mit Quelle im Code-Kommentar. Nichts schätzen oder aus dem Gedächtnis ergänzen.
- Schemaänderungen in Dexie über eine neue `version(n)`, bestehende Versionen nicht ändern.

## 5. Datenquellen

| Quelle | Inhalt | Lizenz / Bedingungen | Grenzen |
|---|---|---|---|
| BLS 4.0, Max Rubner-Institut, blsdb.de | Grundlebensmittel und Gerichte, 138 Nährstoffe | CC BY 4.0, Namensnennung nötig | Kein Selen. Einzelne Werte fehlen (z. B. Vitamin C bei 420, Jod bei 912 Lebensmitteln) |
| Open Food Facts | verpackte Produkte per Barcode | ODbL, Quelle nennen | Nicht lückenlos. Vitamine/Mineralstoffe oft nicht gepflegt (0 wird als unbekannt behandelt). Suche zeitweise überlastet (503) |
| DGE-Referenzwerte, dge.de | Tagesmengen | Zahlen mit Quellenangabe übernommen | Nur Erwachsene ab 19. Schwangere, Stillende, Jugendliche fehlen |
| Koch-Wiki, kochwiki.org | Rezepte auf Deutsch (11.434 Inhaltsseiten laut Statistik), Abruf zur Laufzeit | CC BY-SA 3.0 (Seitenfuß, Schnittstelle, Seite „Koch-Wiki:Lizenzbestimmungen“, geprüft 15.11.2026): Namensnennung, Lizenzhinweis, Änderungen kennzeichnen, Weitergabe unter gleicher Lizenz. Gilt für die Rezepttexte, nicht für den App-Code | Keine Nährwerte. Mengen oft in EL, Stück, Bund. Bilder haben eigene Lizenzen und werden nicht übernommen. `robots.txt` sperrt `/index.php?` für Bots; die App nutzt nur `/w/api.php` |

### 5a. Rezeptquellen (geprüft an der Quelle am 15.11.2026)

| Quelle | Befund | Entscheidung |
|---|---|---|
| Koch-Wiki | siehe Tabelle oben. Einheitliche Vorlage (Menge, Zeit, Schwierigkeit), Zutaten mit Verweis auf Zutatenseiten, Schnittstelle erlaubt Browserabfragen (`origin=*`) | Gewählt |
| BLS 4.0, Gerichte (Codes X und Y) | 2.050 zubereitete Gerichte mit Nährwerten, schon in `bls.json`. Keine Zutaten, keine Zubereitung, keine Angabe zur Ernährungsweise | Gewählt für Vorschläge |
| Wikibooks Kochbuch (de) | CC BY-SA 4.0 (Seitenfuß). 640 Seiten in „Kochbuch/ Alle Rezepte“. Freitext ohne feste Vorlage, Portionen nur in der Überschrift. Die Schnittstelle drosselte anonyme Abfragen | Nicht gewählt (kleiner, schwerer auszulesen). Später möglich |
| TheMealDB | Keine offene Lizenz. Nutzungsbedingungen vom 01.07.2025: Inhalte der Schnittstelle dürfen kopiert und verändert werden; Testschlüssel nur für Entwicklung und Lernzwecke; Veröffentlichung in einem App-Store nur als zahlender Unterstützer; Quelle nennen. Englisch, Mengen in cup/pound, keine Nährwerte, keine Portionen | Verworfen |
| LMU Open Nutrition Dataset | Projektseite nennt „open dataset for scientific use“ in Entwicklung; keine Lizenz, kein Download | Derzeit nicht nutzbar |
| Rezepte-Wiki (rezeptewiki.org) | Server brach die Verbindung ab, nicht prüfbar | Offen |
| Open Tandoor Data | ODbL/DbCL. 163 Umrechnungen, überwiegend US-Cup; nur 27 Stück-, 15 EL- und 20 TL-Angaben, Quellen teils „My pantry“ | Nicht verwendet |
| Kaggle-Datensätze | Nicht geprüft, englisch, Herkunft unklar | Nicht empfohlen |
| fictive-kin/openrecipes, dspray95/open-recipe | Keine offenen Rezeptdaten | Ungeeignet |
| Spoonacular, Edamam | Kommerziell, API-Schlüssel | Passt nicht zu „ohne Server, ohne Kosten“ |

### 5b. Quellen für Mengenumrechnung (geprüft an der Quelle am 15.11.2026)

Anlass: Beim Rezeptimport nennt nur etwa jede sechste Zutatenzeile ein Gewicht. Gesucht waren Quellen für Löffel, Volumen und Stück.

| Quelle | Inhalt | Bedingungen | Grenzen |
|---|---|---|---|
| Koch-Wiki, „Zubereitung:Maße und Gewichte“ (https://www.kochwiki.org/wiki/Zubereitung:Maße_und_Gewichte, Version vom 01.11.2016) | Löffel als Volumen: EL gestrichen 15 ml, TL 5 ml, Barlöffel 5 ml; cl 10 ml, dl 100 ml; Tropfen 1/30 ml, Spritzer ca. 0,6 ml, Schuss ca. 25 ml; Blatt (Gelatine) ca. 2 g; Pfund 500 g; Achtel 125 ml, Viertel 250 ml. Tasse ist dort mehrdeutig (75/125/250 ml) | CC BY-SA 3.0 | Von Nutzern geschrieben. Passt als Definition für die Rezepte derselben Quelle; die Volumen von EL und TL sind eingebaut (M5b). Die Seite enthält außerdem Gewichte je Löffel für 17 Zutaten und Volumen zu Gewicht für 6 Zutaten (gerundet, nicht einheitlich); davon sind nur die Löffelwerte für Mehl und Speisestärke eingebaut, siehe Stand M5b |
| Schweizer Nährwertdatenbank V 7.1 vom 01.07.2026, Bundesamt für Lebensmittelsicherheit und Veterinärwesen (https://www.naehrwertdaten.ch/de/downloads/, Datei `Schweizer_Nahrwertdatenbank.xlsx`, Blatt „Generische Lebensmittel“, Spalte „Dichte“, Kopfzeile in Zeile 3) | Dichte für 126 von 1.216 Lebensmitteln: Fette und Öle (28), alkoholhaltige Getränke (24), Milch und Milchprodukte (19), alkoholfreie Getränke (18), Süßes (11) u. a. Beispiele: Öle 0,92; Milch 1,5 % 1,03; Essig 1,01; Balsamico 1,08; Honig 1,43; Bouillon zubereitet 1,01; Sojasauce 1,12; Kokosnussmilch 1,02; Trinkwasser 1 | Laut Downloadseite kostenlos; Verwendung „unter Angabe eines Quellenvermerks auch für kommerzielle … Zwecke“ erlaubt | Nur Flüssiges und Zähflüssiges. Die Spalte nennt keine Einheit; bestätigt ist g/ml (Seite „Interpretation von Nährwertangaben“, siehe Stand M5b) |
| USDA FoodData Central, SR Legacy, Stand April 2018 (https://fdc.nal.usda.gov/download-datasets, Datei `FoodData_Central_sr_legacy_food_csv_2018-04.zip`, Tabellen `food.csv` und `food_portion.csv` mit `amount`, `modifier`, `gram_weight`) | 14.449 Portionsgewichte für 7.793 Lebensmittel. Löffel: Zucker 1 tsp 4,2 g; Salz 1 tsp 6 g, 1 tbsp 18 g; Butter 1 tbsp 14,2 g; Olivenöl 1 tbsp 13,5 g; Honig 1 tbsp 21 g. Stück: Zwiebel klein/mittel/groß 70/110/150 g; Knoblauchzehe 3 g; Tomate mittel 123 g; Möhre mittel 61 g; Ei medium 44 g, large 50 g (ohne Schale) | Gemeinfrei, CC0 1.0 (Lizenzhinweis auf der Startseite). Quellenangabe erbeten: U.S. Department of Agriculture, Agricultural Research Service. FoodData Central. fdc.nal.usda.gov | US-Daten: US-Esslöffel (14,8 statt 15 ml), US-Größen und -Sorten (Kartoffel mittel 213 g). Weizenmehl hat dort nur „cup“ (125 g), keinen Löffelwert. Löffelwerte gelten für gestrichene Löffel |
| BLS 4.0 | Auf blsdb.de keine Portions- oder Stückgewichte gefunden; die Excel-Datei wurde dafür nicht erneut geprüft | – | – |
| Nationale Verzehrsstudie II, Ergebnisbericht Teil 2 (MRI) | Erwähnt Portionsgrößencodes, enthält keine Liste | – | Nicht nutzbar |
| Bundeszentrum für Ernährung | Keine Tabelle gefunden. Ratgeberseiten nennen Werte ohne Herkunft und widersprechen sich | – | Nicht nutzbar |

Eine deutsche amtliche Quelle für Stückgewichte wurde nicht gefunden.

BLS aktualisieren: neue Excel-Datei von blsdb.de laden, `python3 tools/build_bls.py <Datei>` ausführen, Tests laufen lassen.

## 6. Meilensteine

Reihenfolge so gewählt, dass nach jedem Schritt etwas Benutzbares entsteht. Jeder Meilenstein endet mit Tests, Typprüfung, Build und einem Browser-Test in Handy-Ansicht.

**M1 Lebensmittel vervollständigen (erledigt)**
- Detailansicht mit allen Nährwerten (gruppiert), Mengenumrechnung
- Eigenes Lebensmittel anlegen, bearbeiten, löschen; BLS-Eintrag als eigenes kopieren
- Barcode-Scan mit `@zxing/browser` (EAN-13, EAN-8, UPC), Kamera braucht HTTPS; Treffer speichern; nicht gefunden: Formular mit vorausgefülltem Barcode
- Knopf "Online suchen" für die Open-Food-Facts-Textsuche (nicht bei jedem Tastendruck, wegen Limit)
- Gespeicherte Produkte einzeln aktualisieren
- Suchqualität: Synonyme (z. B. "Ei" findet "Hühnerei"), zuletzt verwendete und Favoriten zuerst

**M2 Profile, Ziele, Rechner (erledigt)**
- Profile anlegen und wechseln; Ersteinrichtung beim ersten Start
- Eingaben: Geschlecht, Geburtsjahr, Größe, Gewicht, Aktivität, Ziel, Ernährungsform, Ernährungsweise (omnivor bis vegan), Fasten
- Rechner zeigt Grundumsatz, Gesamtumsatz, Tagesziel, Makros in g; Warnungen aus `energyTargets()`
- Alle Werte überschreibbar, mit Rücksetzen auf den berechneten Wert

**M3 Tracker (erledigt)**
- Tagesansicht nach Mahlzeiten, Eintrag über Suche, Scan oder Rezept, Menge in g oder Portion
- Tagessummen gegen Ziele (kcal, Makros), Datum wechseln, Eintrag kopieren
- Gewichtsverlauf
- Fasten: Essensfenster anzeigen (16:8, 14:10, eigene Zeiten), Fastentage bei 5:2

**M4 Vitamine und Mineralstoffe (erledigt)**
- Übersicht mit Tagesmenge, Art des Werts (Empfehlung, Schätzwert, Richtwert), Formen, Hinweisen
- Ist-Werte für Tag und Wochenschnitt aus dem Tracker, mit Anzeige fehlender Daten
- Jeden Referenzwert anpassen und zurücksetzen

**M5 Rezepte (erledigt)**
- Eigene Rezepte (Zutaten aus der Lebensmitteldatenbank, Portionen), Nährwerte je Portion berechnet
- Import aus dem Koch-Wiki: Online-Suche, Übernahme in die lokale Rezeptdatenbank mit Quellen- und Lizenzangabe
- Zutaten-Zuordnung: Zutat auf Lebensmittel, Mengenangabe auf Gramm; nicht zuordenbare Zutaten sichtbar markieren, `nutritionComplete` setzen
- Einordnung nach Ernährungsform aus den berechneten Makros, nicht aus Kategorienamen
- Vorschläge: passend zu Ernährungsform, Ernährungsweise und den noch offenen Makros des Tages; dazu BLS-Gerichte

**M5b Mengenumrechnung beim Rezeptimport (erledigt, siehe Abschnitt 3)**
- Flüssigkeiten (ml, cl, dl, l, EL, TL): Volumen nach der Koch-Wiki-Seite mal Dichte aus der Schweizer Nährwertdatenbank. Vorher die Einheit der Dichte-Spalte bestätigen
- Feste Zutaten per Löffel und Stückgewichte: USDA-Werte für eine kurze Liste häufiger Zutaten, in der Oberfläche als „US-Daten, bitte prüfen“ gekennzeichnet. Jede Zahl mit USDA-Nummer (`fdc_id`) im Code. Die Zuordnung deutscher Zutaten zu USDA-Einträgen ist eine Auswahl; die Liste vor dem Einbau dem Nutzer zeigen
- Reihenfolge beim Vorbelegen: Gewichtsangabe der Quelle, dann gemerkter Wert des Nutzers, dann Umrechnung. Ein vorbelegter Wert nennt seine Herkunft und bleibt überschreibbar
- Daten aus den Originaldateien erzeugen (Skript unter `tools/`, wie `build_bls.py`), nicht abtippen. Quellen in die spätere Lizenzseite (M7) aufnehmen
- Zu klären beim Einbau: Zuordnung der Schweizer und der USDA-Einträge zu den Zutatenschlüsseln des Koch-Wiki bzw. zu BLS-Lebensmitteln; Umgang mit „klein/mittel/groß“ und mit gehäuften Löffeln; Kommentar in `domain/ingredientLine.ts` anpassen (dort steht, es gebe keine geprüfte Quelle)

**M6 Einkaufslisten (erledigt)**
- Aus einem oder mehreren Rezepten mit Portionenzahl, gleiche Zutaten zusammenfassen (Zutaten haben `foodId`, `grams`, Quelltext `name`/`rawMeasure`; offene Zutaten ohne Gramm als Textposten übernehmen)
- Abhaken, eigene Posten, Liste als Text teilen

**M7 Abschluss (Code erledigt)**
- Export/Import in der Oberfläche, Seite mit Quellen und Lizenzen (auch Schweizer Nährwertdatenbank mit Quellenvermerk, USDA FoodData Central, Koch-Wiki-Maßseite; Angaben in `CONVERSION_SOURCES`)
- App-Icons als PNG (iOS), Installationshinweis
- Veröffentlichung (siehe offene Punkte)

## 7. Offene Punkte für den Nutzer

1. **Veröffentlichung (offen, Nutzer).** Das Repository `rb0312-max/Ernaehrung` existiert, der Workflow liegt bereit (M7). Nötig: Branch auf `main` zusammenführen und in den Repository-Einstellungen unter Pages die Quelle „GitHub Actions“ wählen. Adresse danach vermutlich `https://rb0312-max.github.io/Ernaehrung/` (aus Kontoname und Repository abgeleitet, nicht geprüft). Kamera und Installation brauchen diese HTTPS-Adresse; danach auf einem echten Handy testen.
2. **Rezeptquelle.** Entschieden am 15.11.2026: Koch-Wiki zur Laufzeit plus BLS-Gerichte (Abschnitt 5a). Umrechnungen für Löffel, Volumen und Stück: Quellen geprüft (Abschnitt 5b), als M5b eingebaut. USDA-Liste freigegeben; aus der Löffeltabelle des Koch-Wiki nur Mehl und Speisestärke (beides 15.11.2026).
3. **Geräteabgleich.** Bei lokaler Datenhaltung sieht jedes Gerät nur die eigenen Daten; Austausch nur über Export/Import.
4. **Personengruppen.** Schwangerschaft, Stillzeit und unter 19 Jahren sind bei den Referenzwerten nicht abgedeckt.

## 8. Hinweise zur Genauigkeit

- Grundumsatzformeln sind Schätzungen; die Zielanpassungen (z. B. minus 500 kcal beim Abnehmen) und die Makroverteilungen der Ernährungsformen sind übliche Startwerte, keine offiziellen Vorgaben.
- Nährwerte von Rezepten hängen von der Zutaten-Zuordnung und den eingetragenen Gramm ab, gelten für rohe Zutaten ohne Garverlust und sind in der App als Schätzung gekennzeichnet.
- Die App ersetzt keine ärztliche oder ernährungsmedizinische Beratung.

## 9. Arbeitsweise: Modell und Chat

- Ein Chat pro Meilenstein. Nach jedem abgeschlossenen, getesteten und gepushten Meilenstein dem Nutzer ausdrücklich sagen, dass jetzt der Wechsel in einen neuen Chat sinnvoll ist.
- Cloud-Umgebung: Für dieses Repository gibt es die Umgebung „Ernaehrung“ (erlaubte Hosts: Open Food Facts, TheMealDB, DGE, naehrwertdaten.ch, blsdb.de, de.wikibooks.org, kochwiki.org, rezeptewiki.org, ifi.lmu.de, fdc.nal.usda.gov, mri.bund.de). Neue Sitzungen dort starten, sonst sind die Rezeptquellen gesperrt.
- Modell: M1 bis M4, M6 und M7 sind Oberflächenarbeit nach Plan und für ein günstigeres Modell geeignet. Für M5 und M5b (Rezeptimport, Zutaten-Zuordnung, Quellenwahl, Umrechnungen) und für jede neue Datenquelle, Referenzwerte oder Formeln dem Nutzer ein stärkeres Modell empfehlen.
