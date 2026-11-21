import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createStore } from "../server/store.mjs";
import { hashPassword, verifyPassword, createLimiter, parseCookies, passwordProblem, createSessions, safeEqual } from "../server/auth.mjs";
import { detectImage, uploadPath, saveUpload } from "../server/upload.mjs";

const tmp = () => mkdtempSync(join(tmpdir(), "dezon-u-"));

test("store: schrijven is atomisch (geen tmp-bestanden) en lezen geeft een kopie", () => {
  const d = tmp(), s = createStore(d);
  s.write("a", { x: 1 });
  const v = s.read("a", null); v.x = 99;
  assert.equal(s.read("a", null).x, 1);
  assert.deepEqual(readdirSync(d), ["a.json"]);
  assert.equal(createStore(d).read("a").x, 1);
  assert.throws(() => s.write("../x", {}), /Ongeldige/);
  rmSync(d, { recursive: true });
});
test("store: een beschadigd bestand wordt niet stil overschreven", () => {
  const d = tmp(); writeFileSync(join(d, "kapot.json"), "{ niet json");
  assert.throws(() => createStore(d).read("kapot", {}), /beschadigd/);
  rmSync(d, { recursive: true });
});
test("wachtwoorden: hash is gezouten en klopt alleen bij het juiste wachtwoord", async () => {
  const a = await hashPassword("geheim-123"), b = await hashPassword("geheim-123");
  assert.notEqual(a, b);
  assert.equal(await verifyPassword("geheim-123", a), true);
  assert.equal(await verifyPassword("geheim-124", a), false);
  assert.equal(await verifyPassword("x", "onzin"), false);
  assert.equal(passwordProblem("kort") !== null, true);
  assert.equal(passwordProblem("lang-genoeg"), null);
  assert.equal(safeEqual("abc", "abc"), true);
  assert.equal(safeEqual("abc", "abcd"), false);
});
test("limiter: blokkeert na het maximum en laat na het venster weer toe", () => {
  let t = 0; const l = createLimiter({ max: 2, windowMs: 1000, now: () => t });
  l.hit("k"); l.hit("k");
  assert.equal(l.check("k").allowed, false);
  assert.equal(l.check("andere").allowed, true);
  t = 1500;
  assert.equal(l.check("k").allowed, true);
});
test("sessies verlopen en bewaren alleen een hash van het sleuteltje", () => {
  const d = tmp(), store = createStore(d); let t = 1000;
  const se = createSessions(store, { now: () => t });
  const tok = se.create("customer", "k1", 500);
  assert.equal(se.get(tok).customerId, "k1");
  assert.equal(JSON.stringify(store.read("sessions", {})).includes(tok), false);
  t = 2000;
  assert.equal(se.get(tok), null);
  assert.equal(se.get(undefined), null);
  rmSync(d, { recursive: true });
});
test("cookies lezen", () => {
  assert.deepEqual(parseCookies("a=1; dezon_sid=abc%3D; leeg"), { a: "1", dezon_sid: "abc=" });
});
test("upload: bestandstype uit de bytes, veilige paden", () => {
  assert.equal(detectImage(Buffer.from("RIFF\0\0\0\0WEBPVP8 ")), "webp");
  assert.equal(detectImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0])), "jpg");
  assert.equal(detectImage(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>")), null);
  assert.equal(detectImage(Buffer.from("GIF89a000000000000")), null);
  const d = tmp();
  const ok = saveUpload(d, Buffer.from("RIFF\0\0\0\0WEBPVP8 "));
  assert.ok(uploadPath(d, ok.name));
  for (const bad of ["../x.png", ".." + String.fromCharCode(92) + "x.png", "a.png", `${"a".repeat(32)}.svg`, `${"a".repeat(32)}.png/../x`, ""]) assert.equal(uploadPath(d, bad), null, bad);
  rmSync(d, { recursive: true });
});
