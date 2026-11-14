import test from "node:test";
import assert from "node:assert/strict";
import { pointsForOrder, balance, progress, redeemReward, earn } from "../src/lib/loyalty.mjs";

const rule = { pointsPerEuro: 1 };
const rewards = [
  { id: "saus", naam: "Gratis saus", punten: 50 },
  { id: "frites", naam: "Gratis frites klein", punten: 100 },
  { id: "burger", naam: "Gratis hamburger", punten: 200 },
];

test("pointsForOrder: hele euro's tellen, centen niet", () => {
  assert.equal(pointsForOrder(999, rule), 9);
  assert.equal(pointsForOrder(1000, rule), 10);
  assert.equal(pointsForOrder(99, rule), 0);
  assert.equal(pointsForOrder(1250, { pointsPerEuro: 2 }), 24);
  assert.equal(pointsForOrder(-500, rule), 0);
});
test("balance telt verdiend en ingewisseld op", () => {
  const e = [{ type: "earn", points: 40 }, { type: "earn", points: 30 }, { type: "redeem", points: 50 }];
  assert.equal(balance(e), 20);
  assert.equal(balance([]), 0);
});
test("progress wijst de volgende beloning en de voortgang aan", () => {
  const p = progress(30, rewards);
  assert.equal(p.next.id, "saus");
  assert.equal(p.remaining, 20);
  assert.equal(p.fraction, 0.6);
  assert.deepEqual(progress(120, rewards).available.map((r) => r.id), ["saus", "frites"]);
  assert.equal(progress(120, rewards).next.id, "burger");
  assert.equal(progress(500, rewards).next, null);
});
test("redeemReward trekt punten af en weigert bij een te laag saldo", () => {
  const e = [{ type: "earn", points: 120 }];
  const after = redeemReward(e, rewards[1], new Date("2026-11-14T10:00:00Z"), "BON-ABCD");
  assert.equal(balance(after), 20);
  assert.equal(after.at(-1).type, "redeem");
  assert.throws(() => redeemReward(after, rewards[2], new Date()), /onvoldoende/i);
});
test("earn voegt een regel toe met de bestelreferentie", () => {
  const after = earn([], 12, new Date("2026-11-14T10:00:00Z"), "DEMO-1234");
  assert.equal(after[0].points, 12);
  assert.equal(after[0].ref, "DEMO-1234");
  assert.deepEqual(earn([], 0, new Date(), "x"), []);
});
