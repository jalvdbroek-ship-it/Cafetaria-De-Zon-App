import test from "node:test";
import assert from "node:assert/strict";
import { MENU } from "./fixtures.mjs";
import { indexMenu, lineKey, unitPrice, validateSelection, cartReducer, priceCart, emptyCart } from "../src/lib/cart.mjs";

const idx = indexMenu(MENU);

test("unitPrice telt gekozen opties op in centen", () => {
  const p = idx.products.get("frites-middel");
  assert.equal(unitPrice(p, idx.groups, {}), 340);
  assert.equal(unitPrice(p, idx.groups, { saus: ["mayo", "pinda"] }), 340 + 60 + 70);
});
test("lineKey is onafhankelijk van de volgorde van opties", () => {
  assert.equal(lineKey("a", { saus: ["pinda", "mayo"] }), lineKey("a", { saus: ["mayo", "pinda"] }));
  assert.notEqual(lineKey("a", { saus: ["mayo"] }), lineKey("a", { saus: ["pinda"] }));
});
test("validateSelection eist verplichte groepen en respecteert max", () => {
  const ijs = idx.products.get("softijs");
  assert.deepEqual(validateSelection(ijs, idx.groups, {}), ["houder"]);
  assert.deepEqual(validateSelection(ijs, idx.groups, { houder: ["hoorn"] }), []);
  const fr = idx.products.get("frites-middel");
  assert.deepEqual(validateSelection(fr, idx.groups, { saus: ["mayo", "pinda", "curry"] }), ["saus"]);
  assert.deepEqual(validateSelection(fr, idx.groups, { saus: ["bestaatniet"] }), ["saus"]);
});
test("zelfde product met dezelfde opties wordt één regel met hoger aantal", () => {
  let s = emptyCart();
  s = cartReducer(s, { type: "add", productId: "frites-middel", selection: { saus: ["mayo"] } });
  s = cartReducer(s, { type: "add", productId: "frites-middel", selection: { saus: ["mayo"] } });
  s = cartReducer(s, { type: "add", productId: "frites-middel", selection: {} });
  assert.equal(s.lines.length, 2);
  assert.equal(s.lines[0].qty, 2);
});
test("dec haalt de regel weg bij aantal 0, remove en clear werken", () => {
  let s = cartReducer(emptyCart(), { type: "add", productId: "frites-klein", selection: {}, qty: 2 });
  const key = s.lines[0].key;
  s = cartReducer(s, { type: "dec", key });
  assert.equal(s.lines[0].qty, 1);
  s = cartReducer(s, { type: "dec", key });
  assert.equal(s.lines.length, 0);
  s = cartReducer(s, { type: "add", productId: "frites-klein", selection: {} });
  s = cartReducer(s, { type: "remove", key });
  assert.equal(s.lines.length, 0);
  s = cartReducer(s, { type: "add", productId: "frites-klein", selection: {} });
  assert.equal(cartReducer(s, { type: "clear" }).lines.length, 0);
});
test("aantal per regel is begrensd op 20", () => {
  let s = cartReducer(emptyCart(), { type: "add", productId: "frites-klein", selection: {}, qty: 19 });
  s = cartReducer(s, { type: "add", productId: "frites-klein", selection: {}, qty: 5 });
  assert.equal(s.lines[0].qty, 20);
});
test("priceCart: totaal in centen, aantal, optienamen", () => {
  let s = emptyCart();
  s = cartReducer(s, { type: "add", productId: "frites-middel", selection: { saus: ["mayo"] }, qty: 2 });
  s = cartReducer(s, { type: "add", productId: "softijs", selection: { houder: ["bakje"] } });
  const r = priceCart(s, idx);
  assert.equal(r.subtotal, 2 * 400 + 250);
  assert.equal(r.count, 3);
  assert.deepEqual(r.lines[0].optionNames, ["Mayonaise"]);
  assert.equal(r.lines[0].total, 800);
});
test("priceCart sluit uitverkochte of onbekende producten uit het totaal", () => {
  const s = { lines: [
    { key: "op|", productId: "op", selection: {}, qty: 1 },
    { key: "weg|", productId: "weg", selection: {}, qty: 1 },
    { key: "frites-klein|", productId: "frites-klein", selection: {}, qty: 1 },
  ] };
  const r = priceCart(s, idx);
  assert.equal(r.subtotal, 280);
  assert.equal(r.count, 1);
  assert.deepEqual(r.unavailable.sort(), ["op|", "weg|"]);
});
test("add weigert een ongeldige keuze en een uitverkocht product", () => {
  assert.throws(() => cartReducer(emptyCart(), { type: "add", productId: "softijs", selection: {} }, idx), /keuze/i);
  assert.throws(() => cartReducer(emptyCart(), { type: "add", productId: "op", selection: {} }, idx), /uitverkocht/i);
});
