// Meet de grootte van de app (ruw en gzip). Run: node tools/meet-bundel.mjs
import { readFileSync, readdirSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const sum = (files) => files.reduce((a, f) => { const b = readFileSync(f); return [a[0] + b.length, a[1] + gzipSync(b).length]; }, [0, 0]);
const kb = (n) => `${(n / 1024).toFixed(1)} kB`;
const groups = {
  "JavaScript (src/, alle schermen)": walk("src").filter((f) => f.endsWith(".js") || f.endsWith(".mjs")),
  "Kern bij eerste start (app, router, state, shell, dom, datasource, cart, hours, slots, loyalty, validate, money, icons, illustraties, home, sundial, product)": ["app.js", "router.js", "state/app-state.js", "components/shell.js", "lib/dom.js", "lib/datasource.mjs", "lib/cart.mjs", "lib/hours.mjs", "lib/slots.mjs", "lib/loyalty.mjs", "lib/validate.mjs", "lib/money.mjs", "components/icons.js", "components/illustraties.js", "screens/home.js", "components/sundial.js", "components/product.js", "lib/promos.mjs"].map((f) => join("src", f)),
  "CSS": walk("public/css"),
  "Lettertype": ["public/fonts/bricolage.woff2"],
  "Data (menu, site, fotos, config)": ["src/data/menu.json", "src/data/site.json", "src/data/fotos.json", "config/app.json", "config/promos.json"],
};
for (const [name, files] of Object.entries(groups)) { const [r, g] = sum(files); console.log(`${kb(r).padStart(9)} ruw ${kb(g).padStart(9)} gzip  ${name}`); }
const imgs = walk("public/img/foto").filter((f) => f.endsWith("-800.webp"));
console.log(`${kb(imgs.reduce((a, f) => a + statSync(f).size, 0)).padStart(9)} totaal  ${imgs.length} voorbeeldfoto's (800 px, lazy geladen, per scherm een paar)`);
