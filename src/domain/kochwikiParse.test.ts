import { describe, expect, it } from 'vitest';
import { dietFromCategories, ingredientKey, looksLikeRecipe, parseKochwiki, stripWiki } from './kochwikiParse';

// Eigener Beispieltext im Aufbau der Koch-Wiki-Seiten (keine Kopie eines dortigen Rezepts).
const PAGE = `{{Rezept|
 | Menge         = 4 bis 6 Personen
 | Zeit          = Zubereitung: 25 Minuten
 | Schwierigkeit = leicht
 | Alkohol       = nein
 | Bild          = Kein Bild.png
|}}
[[Datei:Beispiel.jpg|thumb|296px|Ein [[Zutat:Tomate|Bild]] mit Beschriftung]]
'''Testgericht''' ist ein Beispiel.

== Zutaten ==
* 200–250 g [[Zutat:Mozzarella|Mozzarella]]
* 4 mittelgroße [[Zutat:Tomate|Tomaten]]
* [[Zutat:Salz|Salz]] ''(am besten [[Zutat:Meersalz|Meersalz]])''
* 2 EL [[Zutat:Olivenöl|Olivenöl]],
* {{B|1|8}} l [[Zutat:Sahne|Schlagrahm]]
* 2 cl [[Zutat:Gin|Gin]] {{Alkohol}}
* frischer Salat nach Jahreszeit
=== Für die Sauce ===
* 1 kg [[Zutat:Weißkohl|Weiß-]] oder [[Zutat:Rotkohl|Rotkohl]]
;optional
* …

== Kochgeschirr ==
* 1 [[Zubereitung:Topf|Kochtopf]]

== Zubereitung ==
* Die Tomaten [[Zubereitung:putzen|putzen]] und würfeln.
* Bei {{Grad|180}} {{OberUnterhitze}} zehn Minuten backen.<ref>Quelle</ref>
[[Datei:Schritt.jpg|thumb|Schritt]]
=== Sauce ===
# Alles verrühren.

== Beilagen ==
* …

[[Kategorie:Vegetarische Hauptspeise]]
`;

describe('stripWiki', () => {
  it('lässt den sichtbaren Text stehen', () => {
    expect(stripWiki("* 2 EL [[Zutat:Olivenöl|natives Olivenöl]] ''(kalt gepresst)''")).toBe('* 2 EL natives Olivenöl (kalt gepresst)');
    expect(stripWiki('[[Mayonnaise]] oder [[:Kategorie:Minzen|Minze]]')).toBe('Mayonnaise oder Minze');
    expect(stripWiki('{{B|1|8}} l bei {{G|200}} z.&#8239;B. {{Alkohol}}')).toBe('1/8 l bei 200 °C z. B.');
    expect(stripWiki('[[Zutat:Zucker]]<br />fein')).toBe('Zucker fein');
  });
  it('findet den Zutatenschlüssel', () => {
    expect(ingredientKey('* 4 [[Zutat:Brötchen|Semmel]]')).toBe('Brötchen');
    expect(ingredientKey('* frischer Salat')).toBeUndefined();
  });
});

describe('parseKochwiki', () => {
  const r = parseKochwiki('Testgericht', PAGE, ['Kategorie:Vegetarische Hauptspeise', 'Kategorie:Schwierigkeit leicht', 'Kategorie:Rezepte ohne Alkohol', 'Kategorie:Mozzarella']);

  it('liest Kopfangaben; bei einer Spanne zählt die erste Zahl, der Wortlaut bleibt', () => {
    expect(r).toMatchObject({ title: 'Testgericht', servings: 4, servingsNote: '4 bis 6 Personen', time: 'Zubereitung: 25 Minuten', difficulty: 'leicht', diet: 'vegetarisch' });
    expect(r.tags).toEqual(['Vegetarische Hauptspeise', 'Mozzarella']);
  });

  it('liest Zutaten samt Unterabschnitt, ohne Kochgeschirr und Platzhalter', () => {
    expect(r.ingredients.map((i) => i.name)).toEqual([
      '200–250 g Mozzarella', '4 mittelgroße Tomaten', 'Salz (am besten Meersalz)', '2 EL Olivenöl', '1/8 l Schlagrahm', '2 cl Gin', 'frischer Salat nach Jahreszeit', '1 kg Weiß- oder Rotkohl',
    ]);
    expect(r.ingredients[0]).toMatchObject({ key: 'Mozzarella', amount: 225, unit: 'g', grams: 225, rawMeasure: '200–250 g' });
    expect(r.ingredients[1]).toMatchObject({ key: 'Tomate', amount: 4, unit: 'Stück' });
    expect(r.ingredients[1].grams).toBeUndefined();
    // Herkunft: nur Gewichtsangaben der Quelle sind hier schon gesetzt.
    expect(r.ingredients[0].gramsOrigin).toBe('quelle');
    expect(r.ingredients[1].gramsOrigin).toBeUndefined();
    expect(r.ingredients[2]).toMatchObject({ key: 'Salz' });
    expect(r.ingredients[2].amount).toBeUndefined();
    expect(r.ingredients[4]).toMatchObject({ key: 'Sahne', amount: 0.125, unit: 'l' });
    expect(r.ingredients[6].key).toBeUndefined();
    expect(r.ingredients[7]).toMatchObject({ key: 'Weißkohl', grams: 1000 });
  });

  it('liest die Zubereitung ohne Bilder und Fußnoten', () => {
    expect(r.instructions).toBe('Die Tomaten putzen und würfeln.\nBei 180 °C zehn Minuten backen.\nSauce:\nAlles verrühren.');
  });

  it('ohne Zahl bei "Menge" bleiben die Portionen offen', () => {
    expect(parseKochwiki('X', '{{Rezept|\n | Menge = nach Bedarf\n|}}\n== Zutaten ==\n* Salz\n').servings).toBeUndefined();
  });
});

describe('Hilfen', () => {
  it('Ernährungsweise nur aus eindeutigen Kategorien', () => {
    expect(dietFromCategories(['Kategorie:Vegane Vorspeisen', 'Kategorie:Vegetarische Rezepte'])).toBe('vegan');
    expect(dietFromCategories(['Kategorie:Deutsche Küche'])).toBeUndefined();
  });
  it('erkennt Rezeptseiten', () => {
    expect(looksLikeRecipe(PAGE)).toBe(true);
    expect(looksLikeRecipe('Eine Übersicht über [[Suppen]].')).toBe(false);
  });
});
