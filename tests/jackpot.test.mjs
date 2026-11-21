import test from "node:test";
import assert from "node:assert/strict";
import { cryptoInt, drawPrize, odds, qualifies, resolveSpin, jackpotProblem, voucherCode } from "../src/lib/jackpot.mjs";

const J = { enabled: true, minTotal: 1000, geldigDagen: 30, prizes: [
  { id: "saus", naam: "Gratis saus", weight: 60 }, { id: "frites", naam: "Gratis frites", weight: 30 }, { id: "menu", naam: "Gratis menu", weight: 10 }] };
const order = { id: "ZON-ABCDE", total: 1250 };

test("drawPrize volgt de gewichten (grenzen van het bereik)", () => {
  assert.equal(drawPrize(J.prizes, () => 0).id, "saus");
  assert.equal(drawPrize(J.prizes, () => 59).id, "saus");
  assert.equal(drawPrize(J.prizes, () => 60).id, "frites");
  assert.equal(drawPrize(J.prizes, () => 89).id, "frites");
  assert.equal(drawPrize(J.prizes, () => 90).id, "menu");
  assert.equal(drawPrize(J.prizes, () => 99).id, "menu");
});
test("drawPrize met echte crypto-trekking: verdeling ligt dicht bij de kansen", () => {
  const n = 20000, c = { saus: 0, frites: 0, menu: 0 };
  for (let i = 0; i < n; i++) c[drawPrize(J.prizes).id]++;
  assert.ok(Math.abs(c.saus / n - 0.6) < 0.03 && Math.abs(c.frites / n - 0.3) < 0.03 && Math.abs(c.menu / n - 0.1) < 0.02, JSON.stringify(c));
});
test("cryptoInt blijft binnen het bereik en weigert ongeldige invoer", () => {
  for (let i = 0; i < 500; i++) { const v = cryptoInt(7); assert.ok(Number.isInteger(v) && v >= 0 && v < 7); }
  assert.equal(cryptoInt(1), 0);
  assert.throws(() => cryptoInt(0), RangeError);
  assert.throws(() => cryptoInt(1.5), RangeError);
});
test("odds telt op tot 100 procent", () => {
  assert.deepEqual(odds(J.prizes).map((x) => x.percent), [60, 30, 10]);
});
test("qualifies: aan, en minimumbedrag gehaald", () => {
  assert.equal(qualifies(J, 1000), true);
  assert.equal(qualifies(J, 999), false);
  assert.equal(qualifies({ ...J, enabled: false }, 5000), false);
  assert.equal(qualifies(J, "5000"), false);
});
test("resolveSpin: een draai per bestelling, tweede keer dezelfde uitslag", () => {
  const first = resolveSpin(J, order, null, { now: new Date("2026-11-20T10:00:00Z"), randomInt: () => 0 });
  assert.equal(first.isNew, true);
  assert.equal(first.spin.prizeId, "saus");
  assert.match(first.spin.code, /^JKP-[A-Z2-9]{5}$/);
  assert.equal(first.spin.geldigTot, "2026-12-20T10:00:00.000Z");
  const again = resolveSpin(J, order, first.spin, { randomInt: () => 99 });
  assert.equal(again.isNew, false);
  assert.equal(again.spin.prizeId, "saus");
});
test("resolveSpin weigert uit en een te laag bedrag", () => {
  assert.throws(() => resolveSpin({ ...J, enabled: false }, order, null), /uit/);
  assert.throws(() => resolveSpin(J, { id: "x", total: 500 }, null), /niet in aanmerking/);
});
test("jackpotProblem controleert prijzen, kansen en bedragen", () => {
  assert.equal(jackpotProblem(J), null);
  assert.match(jackpotProblem({ ...J, minTotal: -1 }), /Minimum/);
  assert.match(jackpotProblem({ ...J, prizes: [] }), /prijzen/);
  assert.match(jackpotProblem({ ...J, prizes: [{ id: "a", naam: "A", weight: 0 }] }), /Kans/);
  assert.match(jackpotProblem({ ...J, prizes: [J.prizes[0], J.prizes[0]] }), /twee keer/);
  assert.match(jackpotProblem({ ...J, prizes: [{ id: "Bad Id", naam: "A", weight: 1 }] }), /ongeldige code/);
  assert.match(jackpotProblem({ ...J, geldigDagen: 0 }), /geldig/);
});
test("voucherCode gebruikt het voorvoegsel en alleen leesbare tekens", () => {
  assert.match(voucherCode("JKP"), /^JKP-[A-HJ-NP-Z2-9]{5}$/);
});
