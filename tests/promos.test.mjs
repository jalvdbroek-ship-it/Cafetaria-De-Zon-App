import test from "node:test";
import assert from "node:assert/strict";
import { activePromos } from "../src/lib/promos.mjs";

const now = new Date("2026-11-18T16:50:00Z"); // 18 nov 2026, 17:50 NL
const promos = [
  { id: "a", actief: true },
  { id: "b", actief: false },
  { id: "c", actief: true, tot: "2026-11-18" },
  { id: "d", actief: true, tot: "2026-11-17" },
  { id: "e", actief: true, vanaf: "2026-11-19" },
  { id: "f" },
];

test("activePromos verbergt uitgezette, verlopen en nog niet begonnen acties", () => {
  assert.deepEqual(activePromos(promos, now).map((p) => p.id), ["a", "c", "f"]);
});
test("de einddatum telt nog mee tot het eind van die dag (Nederlandse tijd)", () => {
  const late = new Date("2026-11-18T22:30:00Z"); // 23:30 NL
  assert.ok(activePromos(promos, late).some((p) => p.id === "c"));
  const next = new Date("2026-11-18T23:30:00Z"); // 00:30 NL op 19 nov
  assert.ok(!activePromos(promos, next).some((p) => p.id === "c"));
});
