// Maakt src/components/cast.js: de figuurtjes uit het social media pakket als SVG-fragmenten voor de app.
// Gebruik: node tools/maak-cast.mjs
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bron = join(root, "..", "..", "cafetaria-de-zon", "social-media", "src", "personages.mjs");
const { char } = await import(pathToFileURL(bron).href);

const lijst = [
  ["zon", "cool", "wave"],
  ["zon", "sleep", "none"],
  ["zon", "happy", "cheer"],
  ["frietje", "happy", "wave"],
  ["frietje", "sad", "hips"],
  ["burg", "cool", "hips"],
  ["snack", "wink", "cheer"],
  ["ijsje", "happy", "wave"],
];
const out = {};
for (const [n, mood, pose] of lijst) out[`${n}-${mood}`] = char(n, { mood, pose }).replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
writeFileSync(join(root, "src/components/cast.js"), "// Gegenereerd door tools/maak-cast.mjs uit het social media pakket. Niet met de hand aanpassen.\nexport const CAST = " + JSON.stringify(out, null, 1) + ";\n");
console.log(`${lijst.length} figuurtjes geschreven`);
