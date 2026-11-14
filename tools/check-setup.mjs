import { mkdirSync } from "node:fs";
import { loadPlaywright } from "./browser.mjs";

export const BASE = process.env.BASE || "http://localhost:4200/";
export const SHOTS = process.argv.includes("--shots");
export const OUT = new URL("../docs/screenshots/", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
export const WED_EVENING = new Date("2026-11-18T16:50:00Z");
if (SHOTS) mkdirSync(OUT, { recursive: true });

export const state = { fails: 0 };
export const fail = (where, msg) => { state.fails++; console.log(`  FAIL ${where}: ${msg}`); };
export const ok = (msg) => console.log(`  ok   ${msg}`);

const { chromium } = await loadPlaywright();
export const browser = await chromium.launch();

export async function fresh(w, h, { sw = "block" } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: SHOTS ? 2 : 1, serviceWorkers: sw, locale: "nl-NL", timezoneId: "Europe/Amsterdam" });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(WED_EVENING);
  const issues = [];
  page.on("pageerror", (e) => issues.push(`pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error" || (m.type() === "warning" && !/Service Worker/.test(m.text()))) issues.push(`${m.type()}: ${m.text()}`); });
  page.on("requestfailed", (r) => issues.push(`request mislukt: ${r.url()}`));
  page.on("request", (r) => { const u = r.url(); if (!u.startsWith(BASE) && !u.startsWith("data:") && !u.startsWith("blob:")) issues.push(`extern verzoek: ${u}`); });
  return { ctx, page, issues };
}
export const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: `${OUT}${name}.png` }); };
export const report = (issues, label) => (issues.length ? issues.forEach((i) => fail(label, i)) : ok(`${label}: geen console-fouten of externe verzoeken`));
