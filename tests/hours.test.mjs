import test from "node:test";
import assert from "node:assert/strict";
import { SITE_HOURS, NIGHT_HOURS } from "./fixtures.mjs";
import { amsterdamParts, openStatus, formatMinutes, sunFraction, zonedToDate } from "../src/lib/hours.mjs";

// 18 nov 2026 is een woensdag; wintertijd = UTC+1
const wed = (h, m) => new Date(Date.UTC(2026, 10, 18, h - 1, m));

test("amsterdamParts geeft Nederlandse dag en minuten, ook in zomertijd", () => {
  assert.deepEqual(amsterdamParts(wed(17, 50)), { y: 2026, m: 11, d: 18, dow: 3, minutes: 17 * 60 + 50 });
  const summer = amsterdamParts(new Date("2026-07-01T22:30:00Z")); // 00:30 CEST op donderdag
  assert.equal(summer.dow, 4);
  assert.equal(summer.minutes, 30);
});
test("open vanaf openingstijd, dicht op sluitingstijd", () => {
  assert.equal(openStatus(wed(12, 29), SITE_HOURS).open, false);
  assert.equal(openStatus(wed(12, 30), SITE_HOURS).open, true);
  assert.equal(openStatus(wed(21, 59), SITE_HOURS).open, true);
  assert.equal(openStatus(wed(22, 0), SITE_HOURS).open, false);
  assert.equal(openStatus(wed(15, 0), SITE_HOURS).closesAt, 22 * 60);
});
test("maandag is gesloten; volgende opening is dinsdag 12:30", () => {
  const mon = new Date(Date.UTC(2026, 10, 16, 12, 0));
  const s = openStatus(mon, SITE_HOURS);
  assert.equal(s.open, false);
  assert.deepEqual(s.next, { offset: 1, dow: 2, minutes: 12 * 60 + 30 });
});
test("zondagavond na sluiting: volgende opening is over twee dagen", () => {
  const sunLate = new Date(Date.UTC(2026, 10, 15, 21, 0)); // 22:00 NL
  assert.deepEqual(openStatus(sunLate, SITE_HOURS).next, { offset: 2, dow: 2, minutes: 12 * 60 + 30 });
});
test("woensdag vóór opening: vandaag om 12:30", () => {
  assert.deepEqual(openStatus(wed(9, 0), SITE_HOURS).next, { offset: 0, dow: 3, minutes: 12 * 60 + 30 });
});
test("sluitingstijd na middernacht: vrijdag 23:30 en zaterdag 00:30 zijn open", () => {
  const fri = new Date(Date.UTC(2026, 10, 20, 22, 30)); // vr 23:30 NL
  const sat = new Date(Date.UTC(2026, 10, 20, 23, 30)); // za 00:30 NL
  assert.equal(openStatus(fri, NIGHT_HOURS).open, true);
  const s = openStatus(sat, NIGHT_HOURS);
  assert.equal(s.open, true);
  assert.equal(s.closesAt, 60);
  assert.equal(openStatus(new Date(Date.UTC(2026, 10, 21, 0, 30)), NIGHT_HOURS).open, false); // za 01:30
});
test("formatMinutes en sunFraction", () => {
  assert.equal(formatMinutes(750), "12:30");
  assert.equal(formatMinutes(25 * 60), "01:00");
  assert.equal(sunFraction(wed(12, 30), SITE_HOURS), 0);
  assert.equal(sunFraction(wed(17, 15), SITE_HOURS), 0.5);
  assert.equal(sunFraction(wed(23, 0), SITE_HOURS), null);
});
test("zonedToDate zet Nederlandse klok om naar UTC in winter en zomer", () => {
  assert.equal(zonedToDate(2026, 11, 18, 12 * 60 + 30).toISOString(), "2026-11-18T11:30:00.000Z");
  assert.equal(zonedToDate(2026, 7, 1, 12 * 60 + 30).toISOString(), "2026-07-01T10:30:00.000Z");
});
