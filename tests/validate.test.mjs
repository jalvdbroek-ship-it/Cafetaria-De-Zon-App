import test from "node:test";
import assert from "node:assert/strict";
import { validateCheckout, normalizePhone } from "../src/lib/validate.mjs";

const ok = { naam: "Jan de Vries", telefoon: "06 12345678", email: "", opmerking: "" };

test("geldige gegevens geven geen fouten", () => {
  assert.deepEqual(validateCheckout(ok), {});
  assert.deepEqual(validateCheckout({ ...ok, email: "jan@example.nl" }), {});
  assert.deepEqual(validateCheckout({ ...ok, telefoon: "+31 6 12345678" }), {});
  assert.deepEqual(validateCheckout({ ...ok, telefoon: "0181-663669" }), {});
});
test("naam is verplicht en niet te lang", () => {
  assert.ok(validateCheckout({ ...ok, naam: " " }).naam);
  assert.ok(validateCheckout({ ...ok, naam: "a".repeat(61) }).naam);
});
test("telefoon moet een Nederlands nummer lijken", () => {
  assert.ok(validateCheckout({ ...ok, telefoon: "" }).telefoon);
  assert.ok(validateCheckout({ ...ok, telefoon: "12345" }).telefoon);
  assert.ok(validateCheckout({ ...ok, telefoon: "abcdefghij" }).telefoon);
});
test("e-mail is optioneel maar moet geldig zijn als ingevuld; opmerking max 140", () => {
  assert.ok(validateCheckout({ ...ok, email: "geen-mail" }).email);
  assert.ok(validateCheckout({ ...ok, opmerking: "x".repeat(141) }).opmerking);
});
test("normalizePhone geeft één vorm", () => {
  assert.equal(normalizePhone("06 12345678"), "0612345678");
  assert.equal(normalizePhone("+31 6 12345678"), "0612345678");
  assert.equal(normalizePhone("0031612345678"), "0612345678");
});
