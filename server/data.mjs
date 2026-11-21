// Standaardgegevens en toegang tot de opgeslagen bestanden. Eerste start: zaaien vanuit de voorbeeldbestanden van de app.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const seedFile = (p) => JSON.parse(readFileSync(root + p, "utf8"));
export const DAY_ORDER_LIMIT_CENTS = 25000;

export function seed(store) {
  if (!store.has("menu")) store.write("menu", seedFile("src/data/menu.json"));
  if (!store.has("promos")) store.write("promos", seedFile("config/promos.json"));
  if (!store.has("config")) {
    const c = seedFile("config/app.json");
    // De Jackpot staat op de server standaard uit: eerst de spelregels en de wet laten controleren (docs/HOSTEN.md).
    store.write("config", { pickup: c.pickup, loyalty: c.loyalty, jackpot: { ...c.jackpot, enabled: false } });
  }
  if (!store.has("site")) store.write("site", { hours: seedFile("src/data/site.json").hours });
}

export const siteBase = () => seedFile("src/data/site.json");
export const getMenu = (s) => s.read("menu");
export const getPromos = (s) => s.read("promos");
export const getConfig = (s) => s.read("config");
export const getSite = (s) => ({ ...siteBase(), ...s.read("site", {}) });

// Wat klanten mogen zien: kansen in procenten, geen interne gewichten.
export function publicJackpot(j, odds) {
  return { enabled: Boolean(j.enabled), voorbeeld: j.voorbeeld !== false, minTotal: j.minTotal, geldigDagen: j.geldigDagen, prizes: odds(j.prizes).map((p) => ({ id: p.id, naam: p.naam, percent: p.percent })) };
}
