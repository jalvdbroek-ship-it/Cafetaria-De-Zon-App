import test from "node:test";
import assert from "node:assert/strict";
import { dayStats, popularProducts, sameDay } from "../src/lib/stats.mjs";

const now = new Date("2026-11-18T20:00:00Z"); // woensdag 21:00 in Nederland
const o = (id, iso, total, status, lines) => ({ id, createdAt: iso, total, status, lines });
const orders = [
  o("a", "2026-11-18T11:30:00Z", 700, "opgehaald", [{ productId: "frites", naam: "Frites", qty: 2 }]),
  o("b", "2026-11-18T18:00:00Z", 450, "ontvangen", [{ productId: "frites", naam: "Frites", qty: 1 }, { productId: "kroket", naam: "Kroket", qty: 3 }]),
  o("c", "2026-11-18T19:00:00Z", 999, "geannuleerd", [{ productId: "kroket", naam: "Kroket", qty: 9 }]),
  o("d", "2026-11-17T12:00:00Z", 300, "klaar", [{ productId: "kroket", naam: "Kroket", qty: 1 }]),
];

test("dayStats telt vandaag, laat geannuleerd weg en telt open bestellingen overal", () => {
  const s = dayStats(orders, [{ aangemaakt: "2026-11-18T09:00:00Z" }, { aangemaakt: "2026-11-01T09:00:00Z" }], now);
  assert.equal(s.ordersToday, 2);
  assert.equal(s.revenueToday, 1150);
  assert.equal(s.open, 2);
  assert.deepEqual(s.popular.map((p) => [p.productId, p.qty]), [["frites", 3], ["kroket", 3]]);
  assert.equal(s.newCustomers, 1);
});
test("de dag wisselt om middernacht Nederlandse tijd, niet UTC", () => {
  assert.equal(sameDay("2026-11-18T23:30:00Z", new Date("2026-11-19T00:30:00+01:00")), true);
  assert.equal(sameDay("2026-11-18T22:30:00Z", new Date("2026-11-19T00:30:00+01:00")), false);
});
test("popularProducts sorteert op aantal en negeert geannuleerd", () => {
  assert.deepEqual(popularProducts(orders, 1), [{ productId: "kroket", qty: 4 }]);
});
