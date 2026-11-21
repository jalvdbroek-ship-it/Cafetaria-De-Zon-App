// Snelle controle: node tools/shot.mjs <route> [breedte] [bestandsnaam] [ISO-tijd], bijvoorbeeld: node tools/shot.mjs menu 390 menu -> docs/screenshots/tmp/
import { mkdirSync } from "node:fs";
import { loadPlaywright } from "./browser.mjs";

const [route = "home", width = "390", name = "shot", time] = process.argv.slice(2);
const { chromium } = await loadPlaywright();
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: +width, height: 844 }, deviceScaleFactor: 2, serviceWorkers: "block" });
const page = await ctx.newPage();
if (time) await page.clock.install({ time: new Date(time) });
const problems = [];
page.on("console", (m) => { if (["error", "warning"].includes(m.type())) problems.push(`${m.type()}: ${m.text()}`); });
page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
await page.goto(`${process.env.BASE || "http://localhost:4200/"}#/${route}`);
await page.waitForSelector("#view h1", { timeout: 5000 });
await page.waitForTimeout(1400);
mkdirSync(new URL("../docs/screenshots/tmp/", import.meta.url), { recursive: true });
await page.screenshot({ path: new URL(`../docs/screenshots/tmp/${name}.png`, import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1"), fullPage: false });
console.log("hash", await page.evaluate(() => location.hash)); console.log("scrollwidth", await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]));
console.log(problems.length ? problems.join("\n") : "geen console-problemen");
await browser.close();
