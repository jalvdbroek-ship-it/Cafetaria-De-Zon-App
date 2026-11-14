// Haalt de getekende categorie-illustraties uit de websitebron en schrijft src/components/illustraties.js.
import { readFileSync, writeFileSync } from "node:fs";
const svg = readFileSync(new URL("./bron/illustraties.svg", import.meta.url), "utf8");
const out = {};
for (const m of svg.matchAll(/<symbol id="ill-([a-z]+)" viewBox="([^"]+)">([\s\S]*?)<\/symbol>/g)) if (m[1] !== "zon") out[m[1]] = m[3];
const body = `// Gegenereerd door tools/maak-illustraties.mjs uit de websitebron. Niet met de hand aanpassen.
export const ILL = ${JSON.stringify(out, null, 2)};
`;
writeFileSync(new URL("../src/components/illustraties.js", import.meta.url), body);
console.log(Object.keys(out).join(", "));
