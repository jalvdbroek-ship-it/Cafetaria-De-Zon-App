// Browsercontrole: node tools/check-app.mjs [--shots]   (server moet draaien op http://localhost:4200, of zet BASE)
import { BASE, browser, fail, ok, fresh, shot, report, state } from "./check-setup.mjs";
import { auditPage } from "./check-lib.mjs";
import { flow } from "./check-flow.mjs";
import { more } from "./check-more.mjs";
import { a11y } from "./check-a11y.mjs";

const VIEWPORTS = [[390, 844], [360, 740], [768, 1024]];
const ROUTES = ["home", "menu", "menu/ijs", "mandje", "sparen", "acties", "account", "account/bestellingen", "contact", "privacy", "beheer"];

for (const [w, h] of VIEWPORTS) {
  console.log(`\n== ${w}x${h}: ${ROUTES.length} routes (toegankelijkheid, raakvlakken, overloop)`);
  const { ctx, page, issues } = await fresh(w, h);
  for (const r of ROUTES) {
    await page.goto(`${BASE}#/${r}`);
    await page.waitForSelector(`#view[data-route="/${r}"] h1`, { timeout: 8000 });
    await page.waitForTimeout(250);
    for (const p of await page.evaluate(auditPage)) fail(`${w} #/${r}`, p);
    if (w === 390 && ["home", "menu", "sparen", "account", "contact"].includes(r)) await shot(page, `${w}-${r}`);
    if (w !== 390 && r === "home") await shot(page, `${w}-home`);
  }
  report(issues, `${w}px`);
  await ctx.close();
}
await flow();
await more();
await a11y();
await browser.close();
console.log(state.fails ? `\n${state.fails} probleem/problemen` : "\nAlles groen");
process.exit(state.fails ? 1 : 0);
