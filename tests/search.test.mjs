import test from "node:test";
import assert from "node:assert/strict";
import { matchesQuery } from "../src/lib/search.mjs";

const p = { naam: "Kaassoufflé", omschrijving: "Met kaas" };

test("zoeken negeert hoofdletters en accenten", () => {
  assert.equal(matchesQuery(p, "kaassouffle"), true);
  assert.equal(matchesQuery(p, "KAAS"), true);
});
test("meerdere woorden moeten allemaal voorkomen, ook in de omschrijving", () => {
  assert.equal(matchesQuery(p, "soufflé kaas"), true);
  assert.equal(matchesQuery(p, "soufflé pizza"), false);
});
test("een lege zoekterm laat alles zien", () => {
  assert.equal(matchesQuery(p, "  "), true);
});
