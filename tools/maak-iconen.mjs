// Maakt de PWA-iconen (PNG) uit het zonnelogo met Playwright. Run: node tools/maak-iconen.mjs
import { writeFileSync } from "node:fs";
import { loadPlaywright } from "./browser.mjs";

const sun = (size, pad, radius) => `<!doctype html><body style="margin:0;background:transparent">
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 48 48">
<rect width="48" height="48" rx="${radius}" fill="#F7B500"/>
<g transform="translate(${pad} ${pad}) scale(${(48 - 2 * pad) / 48})"><circle cx="24" cy="24" r="9" fill="#2B1B10"/>
<g stroke="#2B1B10" stroke-width="3.5" stroke-linecap="round"><path d="M24 5v5M24 38v5M5 24h5M38 24h5M11 11l3.5 3.5M33.5 33.5L37 37M11 37l3.5-3.5M33.5 14.5L37 11"/></g></g></svg>`;

const { chromium } = await loadPlaywright();
const browser = await chromium.launch();
const jobs = [["icon-192.png", 192, 0, 10], ["icon-512.png", 512, 0, 10], ["icon-maskable-512.png", 512, 7, 0]];
for (const [name, size, pad, radius] of jobs) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(sun(size, pad, radius));
  writeFileSync(new URL(`../public/icons/${name}`, import.meta.url), await page.screenshot({ omitBackground: true, type: "png" }));
  await page.close();
}
await browser.close();
console.log("iconen klaar");
