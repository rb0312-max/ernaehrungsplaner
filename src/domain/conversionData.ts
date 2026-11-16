// Erzeugt von tools/build_conversions.py aus den Originaldateien. Nicht von Hand ändern.
// Quellen und Zuordnung: siehe Kopf und Tabellen des Skripts.
import type { ConversionSources, DensityRule, KochwikiSpoonRule, UsdaRule } from './unitConversion';

export const CONVERSION_SOURCES: ConversionSources = {
  "swiss": {
    "name": "Schweizer Nährwertdatenbank V 7.1 (01.07.2026)",
    "publisher": "Bundesamt für Lebensmittelsicherheit und Veterinärwesen",
    "url": "https://www.naehrwertdaten.ch"
  },
  "usda": {
    "name": "FoodData Central, SR Legacy (April 2018)",
    "publisher": "U.S. Department of Agriculture, Agricultural Research Service",
    "url": "https://fdc.nal.usda.gov",
    "license": "CC0 1.0"
  },
  "kochwiki": {
    "name": "Koch-Wiki, „Zubereitung:Maße und Gewichte“, Tabelle „Maße und Mengen verschiedener Zutaten“ (Version 398712 vom 2016-11-01)",
    "url": "https://www.kochwiki.org/wiki/Zubereitung:Maße_und_Gewichte",
    "license": "CC BY-SA 3.0"
  }
};

/** Dichte in g/ml aus der Schweizer Nährwertdatenbank, je Zutatenschlüssel des Koch-Wiki. */
export const DENSITY_RULES: DensityRule[] = [
  {
    "keys": [
      "olivenöl"
    ],
    "spoons": true,
    "swissId": 591,
    "swissName": "Olivenöl",
    "gPerMl": 0.92
  },
  {
    "keys": [
      "sonnenblumenöl"
    ],
    "spoons": true,
    "swissId": 598,
    "swissName": "Sonnenblumenöl",
    "gPerMl": 0.92
  },
  {
    "keys": [
      "rapsöl"
    ],
    "spoons": true,
    "swissId": 600,
    "swissName": "Rapsöl",
    "gPerMl": 0.92
  },
  {
    "keys": [
      "erdnussöl"
    ],
    "spoons": true,
    "swissId": 596,
    "swissName": "Erdnussöl",
    "gPerMl": 0.92
  },
  {
    "keys": [
      "sesamöl"
    ],
    "spoons": true,
    "swissId": 14107,
    "swissName": "Sesamöl",
    "gPerMl": 0.92
  },
  {
    "keys": [
      "kürbiskernöl"
    ],
    "spoons": true,
    "swissId": 13404,
    "swissName": "Kürbiskernöl",
    "gPerMl": 0.92
  },
  {
    "keys": [
      "maiskeimöl"
    ],
    "spoons": true,
    "swissId": 412,
    "swissName": "Maiskeimöl",
    "gPerMl": 0.92
  },
  {
    "keys": [
      "sojaöl"
    ],
    "spoons": true,
    "swissId": 603,
    "swissName": "Sojaöl",
    "gPerMl": 0.92
  },
  {
    "keys": [
      "walnussöl"
    ],
    "spoons": true,
    "swissId": 13402,
    "swissName": "Baumnussöl",
    "gPerMl": 0.92
  },
  {
    "keys": [
      "öl",
      "speiseöl"
    ],
    "spoons": true,
    "swissId": 598,
    "swissName": "Sonnenblumenöl",
    "gPerMl": 0.92
  },
  {
    "keys": [
      "milch"
    ],
    "spoons": true,
    "swissId": 1194,
    "swissName": "Milch (Durchschnitt)",
    "gPerMl": 1.03
  },
  {
    "keys": [
      "buttermilch"
    ],
    "spoons": true,
    "swissId": 529,
    "swissName": "Buttermilch",
    "gPerMl": 1.02
  },
  {
    "keys": [
      "kokosmilch"
    ],
    "spoons": true,
    "swissId": 13458,
    "swissName": "Kokosnussmilch",
    "gPerMl": 1.02
  },
  {
    "keys": [
      "sahne"
    ],
    "spoons": true,
    "swissId": 1195,
    "swissName": "Rahm (Durchschnitt)",
    "gPerMl": 1.01,
    "excludes": "geschlagen|steif"
  },
  {
    "keys": [
      "sauerrahm",
      "crème fraîche"
    ],
    "spoons": true,
    "swissId": 574,
    "swissName": "Sauerrahm",
    "gPerMl": 0.98
  },
  {
    "keys": [
      "wasser"
    ],
    "spoons": true,
    "swissId": 47,
    "swissName": "Trinkwasser (Mittelwert Schweiz)",
    "gPerMl": 1
  },
  {
    "keys": [
      "brühe",
      "gemüsebrühe"
    ],
    "spoons": false,
    "swissId": 664,
    "swissName": "Bouillon, Gemüse, zubereitet",
    "gPerMl": 1.01,
    "excludes": "instant|gekörnt|pulver|würfel"
  },
  {
    "keys": [
      "brühwürfel"
    ],
    "spoons": false,
    "swissId": 664,
    "swissName": "Bouillon, Gemüse, zubereitet",
    "gPerMl": 1.01,
    "requires": "brühe|bouillon",
    "excludes": "instant|gekörnt|pulver"
  },
  {
    "keys": [
      "essig",
      "weißweinessig",
      "rotweinessig"
    ],
    "spoons": true,
    "swissId": 1693,
    "swissName": "Essig",
    "gPerMl": 1.01,
    "excludes": "essenz"
  },
  {
    "keys": [
      "balsamico"
    ],
    "spoons": true,
    "swissId": 13455,
    "swissName": "Balsamicoessig",
    "gPerMl": 1.08,
    "excludes": "creme|crema|reduktion"
  },
  {
    "keys": [
      "zitronensaft"
    ],
    "spoons": true,
    "swissId": 605,
    "swissName": "Zitronensaft",
    "gPerMl": 1.05
  },
  {
    "keys": [
      "zitrone"
    ],
    "spoons": true,
    "swissId": 605,
    "swissName": "Zitronensaft",
    "gPerMl": 1.05,
    "requires": "saft"
  },
  {
    "keys": [
      "orangensaft"
    ],
    "spoons": true,
    "swissId": 576,
    "swissName": "Orangensaft",
    "gPerMl": 1.04
  },
  {
    "keys": [
      "apfelsaft"
    ],
    "spoons": true,
    "swissId": 568,
    "swissName": "Apfelsaft",
    "gPerMl": 1.04
  },
  {
    "keys": [
      "ananassaft"
    ],
    "spoons": true,
    "swissId": 13880,
    "swissName": "Ananassaft",
    "gPerMl": 1.05
  },
  {
    "keys": [
      "tomatensaft"
    ],
    "spoons": true,
    "swissId": 564,
    "swissName": "Tomatensaft",
    "gPerMl": 1.02
  },
  {
    "keys": [
      "honig"
    ],
    "spoons": true,
    "swissId": 472,
    "swissName": "Honig (Blütenhonig)",
    "gPerMl": 1.43
  },
  {
    "keys": [
      "ahornsirup"
    ],
    "spoons": true,
    "swissId": 14093,
    "swissName": "Ahornsirup",
    "gPerMl": 1.32
  },
  {
    "keys": [
      "sojasauce"
    ],
    "spoons": true,
    "swissId": 13456,
    "swissName": "Sojasauce",
    "gPerMl": 1.12
  },
  {
    "keys": [
      "ketchup"
    ],
    "spoons": true,
    "swissId": 635,
    "swissName": "Ketchup",
    "gPerMl": 1.14
  },
  {
    "keys": [
      "rum"
    ],
    "spoons": true,
    "swissId": 520,
    "swissName": "Branntwein aus Zuckerrohr (z.B. Rum)",
    "gPerMl": 0.95
  },
  {
    "keys": [
      "brandy",
      "weinbrand",
      "cognac"
    ],
    "spoons": true,
    "swissId": 519,
    "swissName": "Branntwein aus Wein (z.B.Cognac, Brandy)",
    "gPerMl": 0.95
  },
  {
    "keys": [
      "gin",
      "wodka"
    ],
    "spoons": true,
    "swissId": 646,
    "swissName": "Spirituosen 40 vol% (z.B. Vodka, Gin)",
    "gPerMl": 0.95
  },
  {
    "keys": [
      "kirschwasser"
    ],
    "spoons": true,
    "swissId": 644,
    "swissName": "Kirsch",
    "gPerMl": 0.95
  },
  {
    "keys": [
      "rotwein"
    ],
    "spoons": true,
    "swissId": 509,
    "swissName": "Wein rot, 12 vol%",
    "gPerMl": 0.99
  }
];

/** Portionsgewichte in g aus USDA FoodData Central (SR Legacy), je Zutatenschlüssel des Koch-Wiki. */
export const USDA_RULES: UsdaRule[] = [
  {
    "keys": [
      "butter"
    ],
    "fdcId": 173410,
    "description": "Butter, salted",
    "tbsp": {
      "grams": 14.2,
      "label": "1 tbsp"
    }
  },
  {
    "keys": [
      "zucker"
    ],
    "fdcId": 169655,
    "description": "Sugars, granulated",
    "excludes": "puder|staub|braun|roh|vanill|invert|kandis|hagel|gelier|sirup|palm|kokos",
    "tsp": {
      "grams": 4.2,
      "label": "1 tsp"
    }
  },
  {
    "keys": [
      "salz",
      "meersalz"
    ],
    "fdcId": 173468,
    "description": "Salt, table",
    "excludes": "grob|flocken|fleur|kräuter|knoblauch|sellerie",
    "tbsp": {
      "grams": 18,
      "label": "1 tbsp"
    },
    "tsp": {
      "grams": 6,
      "label": "1 tsp"
    }
  },
  {
    "keys": [
      "senf"
    ],
    "fdcId": 172234,
    "description": "Mustard, prepared, yellow",
    "excludes": "körner|korn|saat|samen|pulver|mehl",
    "tsp": {
      "grams": 5,
      "label": "1 tsp or 1 packet"
    }
  },
  {
    "keys": [
      "backpulver"
    ],
    "fdcId": 172803,
    "description": "Leavening agents, baking powder, double-acting, sodium aluminum sulfate",
    "tsp": {
      "grams": 4.6,
      "label": "1 tsp"
    }
  },
  {
    "keys": [
      "pfeffer"
    ],
    "fdcId": 170931,
    "description": "Spices, pepper, black",
    "requires": "gemahlen",
    "excludes": "körner|cayenne|zitrone|rosa|grün",
    "tbsp": {
      "grams": 6.9,
      "label": "1 tbsp, ground"
    },
    "tsp": {
      "grams": 2.3,
      "label": "1 tsp, ground"
    }
  },
  {
    "keys": [
      "paprika"
    ],
    "fdcId": 171329,
    "description": "Spices, paprika",
    "requires": "pulver|edelsüß|rosenscharf",
    "tbsp": {
      "grams": 6.8,
      "label": "1 tbsp"
    },
    "tsp": {
      "grams": 2.3,
      "label": "1 tsp"
    }
  },
  {
    "keys": [
      "butterschmalz"
    ],
    "fdcId": 173412,
    "description": "Butter oil, anhydrous",
    "tbsp": {
      "grams": 12.8,
      "label": "1 tbsp"
    }
  },
  {
    "keys": [
      "tomatenmark"
    ],
    "fdcId": 170459,
    "description": "Tomato products, canned, paste, without salt added (Includes foods for USDA's Food Distribution Program)",
    "tbsp": {
      "grams": 16,
      "label": "1 tbsp"
    }
  },
  {
    "keys": [
      "zimt"
    ],
    "fdcId": 171320,
    "description": "Spices, cinnamon, ground",
    "excludes": "stange|rinde|zucker",
    "tbsp": {
      "grams": 7.8,
      "label": "1 tbsp"
    },
    "tsp": {
      "grams": 2.6,
      "label": "1 tsp"
    }
  },
  {
    "keys": [
      "ei"
    ],
    "fdcId": 171287,
    "description": "Egg, whole, raw, fresh",
    "excludes": "eigelb|dotter|eiweiß|eiweiss|eiklar|wachtel|pulver|likör|large|klasse l",
    "piece": {
      "einheitlich": {
        "grams": 50,
        "label": "1 large"
      }
    }
  },
  {
    "keys": [
      "ei"
    ],
    "fdcId": 172184,
    "description": "Egg, yolk, raw, fresh",
    "requires": "eigelb|dotter",
    "excludes": "eiweiß|eiweiss|eiklar|large|klasse l",
    "piece": {
      "einheitlich": {
        "grams": 17,
        "label": "1 large"
      }
    }
  },
  {
    "keys": [
      "ei"
    ],
    "fdcId": 172183,
    "description": "Egg, white, raw, fresh",
    "requires": "eiweiß|eiweiss|eiklar",
    "excludes": "eigelb|dotter|large|klasse l",
    "piece": {
      "einheitlich": {
        "grams": 33,
        "label": "1 large"
      }
    }
  },
  {
    "keys": [
      "zwiebel"
    ],
    "fdcId": 170000,
    "description": "Onions, raw",
    "excludes": "frühling|lauch|gemüsezwiebel|perl|silber|röst|pulver",
    "piece": {
      "klein": {
        "grams": 70,
        "label": "1 small"
      },
      "mittel": {
        "grams": 110,
        "label": "1 medium (2-1/2\" dia)"
      },
      "gross": {
        "grams": 150,
        "label": "1 large"
      }
    }
  },
  {
    "keys": [
      "knoblauch"
    ],
    "fdcId": 169230,
    "description": "Garlic, raw",
    "requires": "zehe",
    "excludes": "pulver|granulat",
    "units": [
      "Zehe"
    ],
    "piece": {
      "einheitlich": {
        "grams": 3,
        "label": "1 clove"
      }
    }
  },
  {
    "keys": [
      "tomate"
    ],
    "fdcId": 170457,
    "description": "Tomatoes, red, ripe, raw, year round average",
    "excludes": "cocktail|party|kirsch|cherry|dattel|fleischtomate|getrocknet|passiert|mark|ketchup|saft",
    "piece": {
      "klein": {
        "grams": 91,
        "label": "1 small whole (2-2/5\" dia)"
      },
      "mittel": {
        "grams": 123,
        "label": "1 medium whole (2-3/5\" dia)"
      },
      "gross": {
        "grams": 182,
        "label": "1 large whole (3\" dia)"
      }
    }
  },
  {
    "keys": [
      "karotte",
      "möhre"
    ],
    "fdcId": 170393,
    "description": "Carrots, raw",
    "excludes": "baby|saft",
    "piece": {
      "klein": {
        "grams": 50,
        "label": "1 small (5-1/2\" long)"
      },
      "mittel": {
        "grams": 61,
        "label": "1 medium"
      },
      "gross": {
        "grams": 72,
        "label": "1 large (7-1/4\" to 8-/1/2\" long)"
      }
    }
  },
  {
    "keys": [
      "paprika",
      "paprikaschote"
    ],
    "fdcId": 170108,
    "description": "Peppers, sweet, red, raw",
    "excludes": "pulver|spitz|mini|edelsüß|rosenscharf|gewürz|geräuchert|flocken|peperoni|chili",
    "piece": {
      "klein": {
        "grams": 74,
        "label": "1 small"
      },
      "mittel": {
        "grams": 119,
        "label": "1 medium (approx 2-3/4\" long, 2-1/2 dia.)"
      },
      "gross": {
        "grams": 164,
        "label": "1 large (2-1/4 per pound, approx 3-3/4\" long, 3\" dia.)"
      }
    }
  },
  {
    "keys": [
      "apfel"
    ],
    "fdcId": 171688,
    "description": "Apples, raw, with skin (Includes foods for USDA's Food Distribution Program)",
    "excludes": "saft|mus|essig|ring|getrocknet|wein",
    "piece": {
      "klein": {
        "grams": 149,
        "label": "1 small (2-3/4\" dia)"
      },
      "mittel": {
        "grams": 182,
        "label": "1 medium (3\" dia)"
      },
      "gross": {
        "grams": 223,
        "label": "1 large (3-1/4\" dia)"
      }
    }
  }
];

/** Gramm je gestrichenem Teelöffel (5 ml) und Esslöffel (15 ml) aus der Löffeltabelle des Koch-Wiki, gerundete Werte. */
export const KOCHWIKI_SPOON_RULES: KochwikiSpoonRule[] = [
  {
    "keys": [
      "mehl",
      "weizenmehl"
    ],
    "row": "Mehl",
    "tsp": 2.5,
    "tbsp": 10,
    "excludes": "vollkorn|roggen|dinkel|buchweizen|reismehl|maismehl|kichererbsen"
  },
  {
    "keys": [
      "stärkemehl",
      "speisestärke"
    ],
    "row": "Speisestärke",
    "tsp": 4,
    "tbsp": 10
  }
];
