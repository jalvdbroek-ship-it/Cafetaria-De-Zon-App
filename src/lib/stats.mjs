import { amsterdamParts } from "./hours.mjs";

export const STATUSES = ["ontvangen", "in bereiding", "klaar", "opgehaald", "geannuleerd"];
export const OPEN_STATUSES = ["ontvangen", "in bereiding", "klaar"];

const dayKey = (d) => { const t = amsterdamParts(d); return `${t.y}-${String(t.m).padStart(2, "0")}-${String(t.d).padStart(2, "0")}`; };
export const sameDay = (iso, now) => dayKey(new Date(iso)) === dayKey(now);

// Kerncijfers van vandaag (Nederlandse dag). Geannuleerde bestellingen tellen niet mee voor aantal, omzet of populair.
export function dayStats(orders, customers, now, { top = 5 } = {}) {
  const today = orders.filter((o) => sameDay(o.createdAt, now) && o.status !== "geannuleerd");
  const sold = new Map();
  for (const o of today) for (const l of o.lines) {
    const cur = sold.get(l.productId) || { productId: l.productId, naam: l.naam, qty: 0 };
    cur.qty += l.qty;
    sold.set(l.productId, cur);
  }
  return {
    ordersToday: today.length,
    revenueToday: today.reduce((s, o) => s + o.total, 0),
    open: orders.filter((o) => OPEN_STATUSES.includes(o.status)).length,
    popular: [...sold.values()].sort((a, b) => b.qty - a.qty || a.naam.localeCompare(b.naam, "nl")).slice(0, top),
    newCustomers: customers.filter((c) => sameDay(c.aangemaakt, now)).length,
  };
}

// Populairste producten over alle bestellingen (voor "Populair" op Home), zonder geannuleerde.
export function popularProducts(orders, limit = 6) {
  const sold = new Map();
  for (const o of orders) if (o.status !== "geannuleerd") for (const l of o.lines) sold.set(l.productId, (sold.get(l.productId) || 0) + l.qty);
  return [...sold.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([productId, qty]) => ({ productId, qty }));
}
