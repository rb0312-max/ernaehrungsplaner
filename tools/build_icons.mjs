// Erzeugt die PNG-Icons aus der Form in public/icons/icon.svg (Playwright/Chromium).
// Aufruf: node tools/build_icons.mjs   (Playwright ist in der Cloud-Umgebung vorinstalliert)
// - icon-192.png, icon-512.png: wie das SVG (abgerundetes Quadrat), Purpose "any"
// - icon-maskable-512.png: Vollfläche, Motiv verkleinert (Sicherheitszone für Android-Masken)
// - apple-touch-icon.png (180): Vollfläche ohne Transparenz, iOS rundet selbst
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');

const GREEN = '#1f7a4d';
// Motiv (Apfel) in der 512er-Zeichenfläche, Mitte etwa bei (256, 228); Pfade aus icon.svg.
const GLYPH = '<path d="M256 120c-70 0-124 56-124 132 0 78 52 140 124 140s124-62 124-140c0-76-54-132-124-132z" fill="#fff"/><path d="M256 120c10-34 34-52 66-56-4 34-26 54-66 56z" fill="#bfe8cf"/>';
const scaled = (s) => `<g transform="translate(256 256) scale(${s}) translate(-256 -228)">${GLYPH}</g>`;
const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">${body}</svg>`;

const ANY = svg(`<rect width="512" height="512" rx="96" fill="${GREEN}"/>${GLYPH}`);
const MASKABLE = svg(`<rect width="512" height="512" fill="${GREEN}"/>${scaled(0.8)}`);
const APPLE = svg(`<rect width="512" height="512" fill="${GREEN}"/>${scaled(0.9)}`);

const jobs = [
  ['icon-192.png', ANY, 192],
  ['icon-512.png', ANY, 512],
  ['icon-maskable-512.png', MASKABLE, 512],
  ['apple-touch-icon.png', APPLE, 180],
];

const browser = await chromium.launch();
for (const [file, markup, size] of jobs) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<body style="margin:0;background:transparent"><div style="width:${size}px;height:${size}px">${markup.replace('width="512" height="512"', `width="${size}" height="${size}"`)}</div></body>`);
  writeFileSync(new URL(`../public/icons/${file}`, import.meta.url), await page.screenshot({ omitBackground: true }));
  await page.close();
}
await browser.close();
