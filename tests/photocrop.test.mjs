import test from "node:test";
import assert from "node:assert/strict";
import { photoCrop } from "../src/lib/photocrop.mjs";
import menu from "../src/data/menu.json" with { type: "json" };

test("photoCrop: positie blijft tussen 20% en 80% en de zoom tussen 1,15 en 1,55", () => {
  const ids = [...menu.producten.map((p) => p.id), "x", "een-heel-lange-productnaam-met-veel-tekens-erin", "zzzzzzzzzzzzzzzzzzzz"];
  for (const id of ids) {
    const { pos, zoom } = photoCrop(id);
    const [x, y] = pos.split(" ").map((v) => parseFloat(v));
    assert.ok(x >= 20 && x <= 80 && y >= 20 && y <= 80, `${id}: positie ${pos}`);
    assert.ok(zoom >= 1.15 - 1e-9 && zoom <= 1.55 + 1e-9, `${id}: zoom ${zoom}`);
  }
});

test("photoCrop: zelfde id geeft altijd dezelfde uitsnede", () => {
  assert.deepEqual(photoCrop("kroket"), photoCrop("kroket"));
});
