// Browsercontrole van de ECHTE stand: node tools/check-live.mjs [--shots]
// Start zelf een server met een tijdelijke datamap (vaste tijd: woensdag 17:50) en loopt door bestellen, beheer, Jackpot, upload en account.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createAppServer } from "../server/app.mjs";
import { auditPage } from "./check-lib.mjs";

const NOW = new Date("2026-11-18T16:50:00Z");
const dir = mkdtempSync(join(tmpdir(), "dezon-live-"));
const server = createAppServer({ dataDir: dir, adminPassword: "test-beheer-wachtwoord", now: () => NOW, log: () => {} });
await new Promise((r) => server.listen(0, "127.0.0.1", r));
process.env.BASE = `http://localhost:${server.address().port}/`;
const { BASE, browser, fail, ok, fresh, shot, report, state } = await import("./check-setup.mjs");
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const txt = (page, sel) => page.textContent(sel).then((t) => t.trim()).catch(() => "");
const is = (cond, good, bad) => (cond ? ok(good) : fail("live", bad));

async function go(page, hash, ready) { await page.goto(`${BASE}#/${hash}`); await page.waitForSelector(ready || "#view h1", { timeout: 8000 }); await page.waitForTimeout(250); }
async function order(page, product, { name = "Jan" } = {}) {
  await go(page, "menu"); await page.click(`[data-add="${product}"]`);
  await go(page, "mandje/afrekenen", "#co");
  await page.fill("#naam", name); await page.fill("#telefoon", "06 12345678");
  await page.click("#go"); await page.waitForSelector(".order-id");
  return txt(page, ".order-id");
}

try {
  console.log("\n== echte stand: schermen (390x844)");
  const { ctx, page, issues } = await fresh(390, 844);
  await go(page, "home");
  is(await page.evaluate(() => window.__app.live), "app kiest de echte stand via /api/health", "app draait niet in de echte stand");
  is(await page.isHidden(".demo-strip"), "geen demostrook in de echte stand", "demostrook zichtbaar");
  is((await page.locator(".hero").count()) === 1 && (await page.locator(".pill.demo").count()) === 0, "home: hero zonder demolabels", "home toont demolabels of mist hero");
  await shot(page, "390-home");
  await go(page, "menu"); is((await page.locator('.cat').first().getAttribute("id")) === "cat-menus", "menu begint met categorie Menu's", "Menu's niet bovenaan"); await shot(page, "390-menu");

  console.log("\n== gast bestelt, server rekent");
  const id = await order(page, "kroket");
  is(/^ZON-[A-Z2-9]{5}$/.test(id), `bestelnummer ${id}`, `rare id ${id}`);
  is((await txt(page, "#status")).startsWith("Ontvangen"), "status Ontvangen zichtbaar", "geen status");
  is((await page.locator(".demo-banner").count()) === 0, "geen demobanner", "demobanner op echte bestelling");
  await shot(page, "390-bevestiging");

  console.log("\n== beheer");
  await go(page, "beheer", "#pin");
  const noise = issues.length;
  await page.fill("#pin-in", "fout"); await page.click("#pin button");
  await page.waitForFunction(() => document.querySelector("#e-pin")?.textContent.trim());
  is((await txt(page, "#e-pin")).includes("klopt niet"), "fout wachtwoord geweigerd", "fout wachtwoord niet geweigerd");
  issues.splice(noise); // de 401 hierboven is de bedoeling
  await page.fill("#pin-in", "test-beheer-wachtwoord"); await page.click("#pin button"); await page.waitForSelector(".stats");
  is((await txt(page, ".stat.accent strong")) === "1", "dashboard: 1 bestelling vandaag", `dashboard toont ${await txt(page, ".stat.accent strong")}`);
  await shot(page, "390-beheer");
  await go(page, "beheer/bestellingen", "#olist");
  await page.click(`[data-order="${id}"] [data-set="klaar"]`); await page.waitForSelector(`[data-order="${id}"] .pill.status-klaar`);
  ok("bestelling op klaar gezet");
  await go(page, `mandje/klaar/${id}`); is((await txt(page, "#status")).startsWith("Klaar"), "klant ziet status Klaar", "status niet bijgewerkt");

  console.log("\n== Jackpot");
  await go(page, "beheer/jackpot", "#jp");
  is(!(await page.isChecked('#jp [name=enabled]')), "Jackpot staat op de server standaard uit", "Jackpot staat standaard aan");
  await page.check('#jp [name=enabled]'); await page.fill("#jp-min", "5,00"); await page.click("#jp button[type=submit]"); await page.waitForSelector("#jp");
  await page.waitForTimeout(300);
  const id2 = await order(page, "vegaburger");
  is((await page.locator(".jackpot-cta").count()) === 1, "bevestiging biedt een draai aan", "geen Jackpot-aanbod");
  await page.click(".jackpot-cta"); await page.waitForSelector("#spin");
  await shot(page, "390-jackpot");
  await page.click("#spin"); await page.waitForSelector("#prize", { timeout: 9000 });
  const code = await txt(page, "#prize .order-id");
  is(/^JKP-[A-Z2-9]{5}$/.test(code), `prijs met bon ${code}`, `geen geldige bon: ${code}`);
  await shot(page, "390-jackpot-uitslag");
  await page.reload(); await page.waitForSelector("#prize");
  is((await txt(page, "#prize .order-id")) === code, "opnieuw openen toont dezelfde uitslag, geen tweede draai", "uitslag veranderde");
  is((await page.locator("#spin").count()) === 0, "draaiknop weg na de draai", "nog een draai mogelijk");

  console.log("\n== foto uploaden en gebruiken");
  await go(page, "beheer/producten", '[data-id="kroket"] summary');
  await page.click('[data-id="kroket"] summary');
  await page.setInputFiles('[data-id="kroket"] [data-upload]', { name: "kroket.png", mimeType: "image/png", buffer: PNG });
  await page.waitForFunction(() => /uploads\//.test(document.querySelector('[data-id="kroket"] [name=foto]').value));
  await page.click('[data-id="kroket"] [data-save]'); await page.waitForTimeout(400);
  await go(page, "menu", ".prod");
  const src = await page.getAttribute('[data-open="kroket"] img', "src");
  is(/^uploads\/[a-f0-9]{32}\.png$/.test(src || ""), "eigen foto staat bij het product in het menu", `foto-src: ${src}`);
  is((await page.evaluate((s) => fetch(s).then((r) => r.status), src)) === 200, "geüploade foto wordt geserveerd", "foto niet bereikbaar");
  await page.click('[data-id="kroket"]').catch(() => {});

  console.log("\n== account");
  await go(page, "account", "#inlog");
  await shot(page, "390-account");
  await page.click('[data-auth="register"]');
  await page.fill("#r-naam", "Anna de Vries"); await page.fill("#r-tel", "06 98765432"); await page.fill("#r-pw", "wachtwoord-1");
  await page.click("#register button[type=submit]");
  is((await txt(page, "#e-akkoord")).length > 0, "registreren vraagt akkoord met privacy", "geen akkoordmelding");
  await page.check('#register [name=akkoord]'); await page.click("#register button[type=submit]");
  await page.waitForSelector("text=Hoi Anna");
  ok("account gemaakt en ingelogd");
  await shot(page, "390-mijn-de-zon");
  const id3 = await order(page, "kroket", { name: "Anna" });
  await go(page, "account"); is((await page.locator('a.card:has-text("' + id3 + '")').count()) === 1, "bestelling hoort bij het account", "bestelling niet bij account");
  await page.click("#logout"); await page.waitForSelector("#inlog"); ok("uitgelogd");
  console.log("\n== toegankelijkheid en overloop, nieuwe schermen (390px, ingelogd als beheerder)");
  for (const r of ["home", "menu", "account", "privacy", "sparen", "beheer/dashboard", "beheer/bestellingen", "beheer/producten", "beheer/categorieen", "beheer/klanten", "beheer/sparen", "beheer/jackpot", "beheer/acties", "beheer/info"]) {
    await go(page, r);
    if (r === "beheer/info") { const w = await page.evaluate(() => document.querySelector('.hours-edit input[name="o"]').getBoundingClientRect().width); w >= 100 ? ok("#/beheer/info: tijdvelden breed genoeg") : fail("#/beheer/info", `tijdveld te smal (${Math.round(w)}px)`); }
    const probs = await page.evaluate(auditPage);
    probs.length ? probs.forEach((x) => fail(`#/${r}`, x)) : ok(`#/${r}`);
  }
  report(issues, "echte stand 390px");
  await ctx.close();

  for (const [w, h] of [[768, 1024], [1280, 800]]) {
    const c = await fresh(w, h);
    await go(c.page, "home"); await shot(c.page, `${w}-home`);
    await go(c.page, "menu"); await shot(c.page, `${w}-menu`);
    report(c.issues, `${w}px`);
    const over = await c.page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    is(!over, `${w}px: geen horizontale scroll`, `${w}px: horizontale scroll`);
    await c.ctx.close();
  }
} catch (e) { fail("live", e.message.split("\n")[0]); console.error(e); }
await browser.close();
await new Promise((r) => server.close(r)); server.closeAllConnections?.();
rmSync(dir, { recursive: true, force: true });
console.log(state.fails ? `\n${state.fails} probleem/problemen` : "\nAlles groen");
process.exit(state.fails ? 1 : 0);
