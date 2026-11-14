import test from "node:test";
import assert from "node:assert/strict";
import { MENU, SITE_HOURS, memoryStorage } from "./fixtures.mjs";
import { LocalDemoSource } from "../src/lib/datasource.mjs";

const config = {
  demo: true, demoPin: "1234",
  loyalty: { pointsPerEuro: 1, rewards: [{ id: "saus", naam: "Gratis saus", punten: 5 }] },
  pickup: { intervalMin: 15, leadMin: 15 },
};
const make = () => new LocalDemoSource({
  menu: MENU, promos: [{ id: "p1", titel: "Test" }], config, site: { hours: SITE_HOURS },
  storage: memoryStorage(), now: () => new Date("2026-11-18T16:50:00Z"),
});
const customer = { naam: "Jan", telefoon: "0612345678", email: "", opmerking: "" };
const lines = [{ key: "frites-middel|", productId: "frites-middel", selection: {}, qty: 2 }];

test("placeOrder maakt een DEMO-bestelling, slaat die lokaal op en geeft punten", async () => {
  const ds = make();
  const order = await ds.placeOrder({ lines, customer, pickup: { asap: true } });
  assert.match(order.id, /^DEMO-[A-Z0-9]{4}$/);
  assert.equal(order.demo, true);
  assert.equal(order.total, 680);
  assert.equal(order.sentToShop, false);
  assert.equal((await ds.listOrders()).length, 1);
  const loy = await ds.getLoyalty();
  assert.equal(loy.balance, 6);
  assert.equal(loy.entries[0].ref, order.id);
});
test("placeOrder weigert een lege bestelling en ongeldige klantgegevens", async () => {
  const ds = make();
  await assert.rejects(ds.placeOrder({ lines: [], customer, pickup: { asap: true } }), /leeg/i);
  await assert.rejects(
    ds.placeOrder({ lines, customer: { ...customer, telefoon: "1" }, pickup: { asap: true } }),
    (e) => e.name === "ValidationError" && Boolean(e.fields.telefoon),
  );
});
test("placeOrder weigert een uitverkocht product", async () => {
  const ds = make();
  await assert.rejects(
    ds.placeOrder({ lines: [{ key: "op|", productId: "op", selection: {}, qty: 1 }], customer, pickup: { asap: true } }),
    /niet beschikbaar/i,
  );
});
test("beheer: prijs aanpassen werkt door in de volgende bestelling; reset herstelt", async () => {
  const ds = make();
  const menu = await ds.getMenu();
  menu.producten.find((p) => p.id === "frites-middel").prijs = 500;
  await ds.saveMenu(menu);
  assert.equal((await ds.placeOrder({ lines, customer, pickup: { asap: true } })).total, 1000);
  await ds.resetAdmin();
  assert.equal((await ds.getMenu()).producten.find((p) => p.id === "frites-middel").prijs, 340);
});
test("inwisselen van een beloning trekt punten af en geeft een demo-bon", async () => {
  const ds = make();
  await ds.placeOrder({ lines, customer, pickup: { asap: true } }); // 6 punten
  const voucher = await ds.redeem("saus");
  assert.match(voucher.code, /^BON-[A-Z0-9]{4}$/);
  assert.equal((await ds.getLoyalty()).balance, 1);
  await assert.rejects(ds.redeem("saus"), /onvoldoende/i);
});
test("account en favorieten blijven bewaard; alles wissen leegt het", async () => {
  const ds = make();
  await ds.saveAccount({ naam: "Jan", telefoon: "0612345678", email: "" });
  await ds.toggleFavorite("softijs");
  assert.deepEqual(await ds.getFavorites(), ["softijs"]);
  await ds.toggleFavorite("softijs");
  assert.deepEqual(await ds.getFavorites(), []);
  assert.equal((await ds.getAccount()).naam, "Jan");
  await ds.clearAll();
  assert.equal((await ds.getAccount()).naam, "");
});
test("importAdmin weigert onzin en accepteert een geldige export", async () => {
  const ds = make();
  await assert.rejects(ds.importAdmin("geen json"), /json/i);
  await assert.rejects(ds.importAdmin(JSON.stringify({ menu: { producten: "nee" } })), /menu/i);
  const exp = JSON.parse(await ds.exportAdmin());
  exp.menu.producten[0].prijs = 999;
  await ds.importAdmin(JSON.stringify(exp));
  assert.equal((await ds.getMenu()).producten[0].prijs, 999);
});
test("klantenkaart-nummer is stabiel, heeft DEMO-vorm en verdwijnt bij wissen", async () => {
  const ds = make();
  const id = await ds.getCardId();
  assert.match(id, /^DEMO-KAART-[A-Z0-9]{6}$/);
  assert.equal(await ds.getCardId(), id);
  await ds.clearAll();
  assert.notEqual(await ds.getCardId(), id);
});
