import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { menuProblem } from "../src/lib/datasource.mjs";

const menu = JSON.parse(readFileSync(new URL("../src/data/menu.json", import.meta.url), "utf8"));

test("het meegeleverde voorbeeldmenu is geldig en volledig als voorbeeld gemarkeerd", () => {
  assert.equal(menuProblem(menu), null);
  assert.equal(menu.producten.length, 32);
  assert.ok(menu.producten.every((p) => p.bevestigd === false));
});
test("prijzen zijn hele centen en komen overeen met het website-voorbeeldmenu", () => {
  const frites = menu.producten.find((p) => p.id === "frites-middel");
  assert.equal(frites.prijs, 340);
  assert.equal(menu.producten.find((p) => p.id === "ijscoupe").prijs, 450);
});
