import test from "node:test";
import assert from "node:assert/strict";
import { formatEuro, toCents, parseEuroInput } from "../src/lib/money.mjs";

const plain = (s) => s.replace(/\u00a0/g, " ");

test("formatEuro toont centen met komma", () => {
  assert.equal(plain(formatEuro(450)), "€ 4,50");
  assert.equal(plain(formatEuro(0)), "€ 0,00");
  assert.equal(plain(formatEuro(12345)), "€ 123,45");
});
test("toCents rondt drijvende komma correct af", () => {
  assert.equal(toCents(4.6), 460);
  assert.equal(toCents(1.15), 115);
  assert.equal(toCents(0.6), 60);
});
test("parseEuroInput leest komma en punt, weigert onzin en negatieven", () => {
  assert.equal(parseEuroInput("4,5"), 450);
  assert.equal(parseEuroInput("4.50"), 450);
  assert.equal(parseEuroInput("€ 3,40"), 340);
  assert.equal(parseEuroInput("abc"), null);
  assert.equal(parseEuroInput("-1"), null);
  assert.equal(parseEuroInput(""), null);
});
