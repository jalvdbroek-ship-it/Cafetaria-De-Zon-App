import test from "node:test";
import assert from "node:assert/strict";
import { SITE_HOURS, NIGHT_HOURS } from "./fixtures.mjs";
import { buildSlots } from "../src/lib/slots.mjs";

const wed = (h, m) => new Date(Date.UTC(2026, 10, 18, h - 1, m));
const labels = (r) => r.slots.map((s) => s.label);

test("woensdag 17:50: eerste slot 18:15 (15 min voorbereiding), laatste 21:45", () => {
  const r = buildSlots(wed(17, 50), SITE_HOURS);
  assert.equal(r.offset, 0);
  assert.equal(r.slots[0].label, "18:15");
  assert.equal(labels(r).at(-1), "21:45");
  assert.equal(r.slots.length, 15);
  assert.equal(r.asap, true);
});
test("slots liggen op kwartieren en hebben een UTC-moment", () => {
  const r = buildSlots(wed(17, 50), SITE_HOURS);
  assert.equal(r.slots[0].at, "2026-11-18T17:15:00.000Z");
  for (const s of r.slots) assert.equal(s.minutes % 15, 0);
});
test("vóór opening begint het eerste slot bij de openingstijd en 'zo snel mogelijk' is niet beschikbaar", () => {
  const r = buildSlots(wed(10, 0), SITE_HOURS);
  assert.equal(r.slots[0].label, "12:30");
  assert.equal(r.offset, 0);
  assert.equal(r.asap, false);
});
test("na het laatste slot schuift het aanbod door naar morgen", () => {
  const r = buildSlots(wed(21, 50), SITE_HOURS);
  assert.equal(r.offset, 1);
  assert.equal(r.dayLabel, "morgen");
  assert.equal(r.slots[0].label, "12:30");
  assert.equal(r.asap, false);
});
test("maandag gesloten: aanbod voor dinsdag", () => {
  const r = buildSlots(new Date(Date.UTC(2026, 10, 16, 12, 0)), SITE_HOURS);
  assert.equal(r.offset, 1);
  assert.equal(r.slots[0].label, "12:30");
});
test("zondagavond laat: aanbod voor dinsdag met dagnaam", () => {
  const r = buildSlots(new Date(Date.UTC(2026, 10, 15, 21, 0)), SITE_HOURS);
  assert.equal(r.offset, 2);
  assert.equal(r.dayLabel, "dinsdag");
});
test("zomertijd: 12:30 is 10:30 UTC", () => {
  const r = buildSlots(new Date("2026-07-01T06:00:00Z"), SITE_HOURS);
  assert.equal(r.slots[0].at, "2026-07-01T10:30:00.000Z");
});
test("sluiting na middernacht: slots lopen door tot 00:45 en eindigen op de volgende kalenderdag", () => {
  const r = buildSlots(new Date(Date.UTC(2026, 10, 20, 22, 40)), NIGHT_HOURS); // vr 23:40 NL
  assert.equal(r.slots[0].label, "00:00");
  assert.equal(labels(r).at(-1), "00:45");
  assert.equal(r.slots.at(-1).at, "2026-11-20T23:45:00.000Z");
});
test("instelbaar interval en voorbereidingstijd", () => {
  const r = buildSlots(wed(17, 50), SITE_HOURS, { intervalMin: 30, leadMin: 30 });
  assert.equal(r.slots[0].label, "18:30");
  assert.equal(labels(r).at(-1), "21:30");
});
test("na middernacht geldt nog het venster van gisteren: za 00:20 geeft slot 00:45", () => {
  const r = buildSlots(new Date(Date.UTC(2026, 10, 20, 23, 20)), NIGHT_HOURS); // za 00:20 NL
  assert.deepEqual(labels(r), ["00:45"]);
  assert.equal(r.offset, 0);
  assert.equal(r.slots[0].at, "2026-11-20T23:45:00.000Z");
});
