// Werkt de offline-lijst (CORE) in sw.js bij na het toevoegen van bestanden. Run: node tools/maak-sw-lijst.mjs
import fs from "node:fs";
import path from "node:path";
let s = fs.readFileSync("sw.js", "utf8");
const a = s.indexOf("const CORE"), b = s.indexOf("];", a) + 2;
const walk = (d) => fs.readdirSync(d).flatMap((f) => { const p = path.join(d, f); return fs.statSync(p).isDirectory() ? walk(p) : [p]; });
const code = [...walk("src"), ...walk("config"), ...walk("public/css")].map((p) => p.split(path.sep).join("/")).sort();
const head = ["./", "index.html", "manifest.webmanifest", "public/fonts/bricolage.woff2", "public/icons/favicon.svg", "public/icons/icon-192.png"];
const fotos = ["frites", "hamburgers", "snacks", "vegetarisch", "ijs", "dranken", "sauzen", "band", "afhalen"].map((n) => `public/img/foto/${n}-800.webp`);
const list = [...head, ...code, ...fotos];
s = s.slice(0, a) + "const CORE = [\n" + list.map((x) => `  "${x}",`).join("\n") + "\n];" + s.slice(b);
fs.writeFileSync("sw.js", s);
