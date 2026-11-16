import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadBls } from '../../db/blsFoods';
import { CONVERSION_SOURCES as SRC } from '../../domain/conversionData';
import { KOCHWIKI_LICENSE } from '../../services/kochWiki';

const CC_BY = 'https://creativecommons.org/licenses/by/4.0/';
const ODBL = 'https://opendatacommons.org/licenses/odbl/1-0/';

/** Läuft die App installiert (eigenes Fenster) statt im Browser-Tab? */
function isInstalled(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** Quellen und Lizenzen, Installationshinweis, Hinweise zur Genauigkeit. */
export function InfoView() {
  // Quellenangabe der BLS steht in der Datendatei und wird von dort übernommen.
  const [bls, setBls] = useState<string>();
  useEffect(() => {
    void loadBls().then((i) => setBls(i.meta.source), () => setBls(undefined));
  }, []);

  return (
    <section>
      <p><Link to="/profil">← Profil</Link></p>
      <h1>Info</h1>

      <h2>App installieren</h2>
      <p>{isInstalled() ? 'Die App läuft gerade installiert.' : 'Die App läuft gerade im Browser.'}</p>
      <ul>
        <li>iPhone/iPad: in Safari das Teilen-Symbol öffnen und „Zum Home-Bildschirm“ wählen.</li>
        <li>Android: im Chrome-Menü „App installieren“ bzw. „Zum Startbildschirm hinzufügen“ wählen.</li>
      </ul>
      <p className="muted small">Kamera (Barcode-Scan) und Installation funktionieren nur über eine HTTPS-Adresse. Nach dem ersten Laden läuft die App auch offline; online gebraucht werden nur die Open-Food-Facts- und Koch-Wiki-Suche.</p>

      <h2>Quellen und Lizenzen</h2>
      <div className="card">
        <p><strong>Lebensmittel: Bundeslebensmittelschlüssel (BLS)</strong></p>
        <p className="small">{bls ?? 'Max Rubner-Institut: Bundeslebensmittelschlüssel (BLS), Version 4.0, https://blsdb.de'} · <a href={CC_BY} target="_blank" rel="noreferrer">CC BY 4.0</a></p>
        <p className="muted small">Die Daten wurden für die App in ein anderes Dateiformat umgewandelt und auf 42 Nährstoffe gekürzt.</p>
      </div>
      <div className="card">
        <p><strong>Verpackte Produkte: Open Food Facts</strong></p>
        <p className="small"><a href="https://world.openfoodfacts.org" target="_blank" rel="noreferrer">world.openfoodfacts.org</a>, Daten unter der <a href={ODBL} target="_blank" rel="noreferrer">Open Database License (ODbL)</a>. Produkte werden bei Barcode-Scan oder Online-Suche abgerufen und lokal gespeichert. Die Angaben stammen von Nutzern und können falsch oder unvollständig sein.</p>
      </div>
      <div className="card">
        <p><strong>Referenzwerte: Deutsche Gesellschaft für Ernährung (DGE)</strong></p>
        <p className="small"><a href="https://www.dge.de/wissenschaft/referenzwerte/" target="_blank" rel="noreferrer">dge.de/wissenschaft/referenzwerte</a>. Zahlen von der DGE-Seite übernommen, nur Erwachsene ab 19 Jahren; Schwangere, Stillende und Jugendliche fehlen.</p>
      </div>
      <div className="card">
        <p><strong>Rezepte: Koch-Wiki</strong></p>
        <p className="small"><a href="https://www.kochwiki.org" target="_blank" rel="noreferrer">kochwiki.org</a>, Texte unter <a href={KOCHWIKI_LICENSE.url} target="_blank" rel="noreferrer">{KOCHWIKI_LICENSE.name}</a>. Rezepte werden nur auf Knopfdruck abgerufen und lokal gespeichert. Jedes importierte Rezept nennt Seite, Autoren (Versionsgeschichte) und Lizenz und vermerkt Änderungen. Bilder werden nicht übernommen. Wer ein importiertes Rezept weitergibt, muss es unter derselben Lizenz tun; das gilt für die Rezepttexte, nicht für den App-Code.</p>
      </div>
      <div className="card">
        <p><strong>Mengenumrechnung beim Rezeptimport</strong></p>
        <p className="small">
          Dichten: {SRC.swiss.name}, {SRC.swiss.publisher}, <a href={SRC.swiss.url} target="_blank" rel="noreferrer">naehrwertdaten.ch</a>.
          Löffel- und Stückgewichte: {SRC.usda.publisher}. {SRC.usda.name}, <a href={SRC.usda.url} target="_blank" rel="noreferrer">fdc.nal.usda.gov</a>, {SRC.usda.license}.
          Mehl und Speisestärke je Löffel: {SRC.kochwiki.name}, <a href={SRC.kochwiki.url} target="_blank" rel="noreferrer">kochwiki.org</a>, {SRC.kochwiki.license}.
        </p>
        <p className="muted small">Umgerechnete Gramm sind Vorschläge und im Rezept gekennzeichnet. Die USDA-Werte sind US-Größen („US-Daten, bitte prüfen“).</p>
      </div>

      <h2>Hinweise</h2>
      <ul>
        <li>Grundumsatz und Zielanpassungen sind Schätzungen und übliche Startwerte, keine offiziellen Vorgaben.</li>
        <li>Nährwerte von Rezepten hängen von Zuordnung und Gramm ab und gelten für rohe Zutaten ohne Garverlust.</li>
        <li>Fehlt ein Nährwert in der Quelle, gilt er als unbekannt, nicht als 0.</li>
        <li>Die App ersetzt keine ärztliche oder ernährungsmedizinische Beratung.</li>
      </ul>
    </section>
  );
}
