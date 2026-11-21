import { BASE, fail, ok, fresh, shot, report } from "./check-setup.mjs";
import { auditPage } from "./check-lib.mjs";

export async function more() {
  console.log("\n== beheer: prijs en uitverkocht werken door in het menu");
  {
    const { ctx, page, issues } = await fresh(390, 844);
    await page.goto(`${BASE}#/beheer`); await page.waitForSelector("#pin");
    await page.fill("#pin-in", "9999"); await page.click("#pin button");
    (await page.textContent("#e-pin")).includes("klopt niet") ? ok("foute pincode geweigerd") : fail("beheer", "foute pincode niet geweigerd");
    await page.fill("#pin-in", "1234"); await page.click("#pin button"); await page.waitForSelector("#adm"); await page.goto(`${BASE}#/beheer/producten`); await page.waitForSelector(`[data-id="kroket"] summary`);
    await page.click('[data-id="kroket"] summary'); await page.fill('[data-id="kroket"] [name=prijs]', "9,99");
    await page.check('[data-id="kroket"] [name=uitverkocht]'); await page.click('[data-id="kroket"] [data-save]'); await page.waitForTimeout(300);
    await shot(page, "390-beheer");
    await page.goto(`${BASE}#/menu`); await page.waitForSelector(".prod");
    const label = await page.getAttribute('[data-open="kroket"]', "aria-label");
    /9,99.*uitverkocht/.test(label) ? ok("nieuwe prijs en uitverkocht in menu") : fail("beheer", `menu toont ${label}`);
    (await page.isDisabled('[data-add="kroket"]')) ? ok("uitverkocht product niet bestelbaar") : fail("beheer", "uitverkocht product is bestelbaar");
    report(issues, "beheer");
    await ctx.close();
  }
  console.log("\n== Jackpot in de demo: rad, uitslag, een draai, toegankelijkheid");
  {
    const { ctx, page, issues } = await fresh(390, 844);
    await page.goto(`${BASE}#/menu`); await page.waitForSelector(".prod");
    for (let i = 0; i < 3; i++) await page.click('[data-add="hamburger"]').catch(() => {});
    await page.goto(`${BASE}#/mandje/afrekenen`); await page.waitForSelector("#co");
    await page.fill("#naam", "Jan"); await page.fill("#telefoon", "06 12345678"); await page.click("#go"); await page.waitForSelector(".order-id");
    await page.waitForSelector(".jackpot-cta"); ok("bevestiging biedt Jackpot-draai aan");
    await page.click(".jackpot-cta"); await page.waitForSelector("#spin");
    for (const p of await page.evaluate(auditPage)) fail("jackpot", p);
    await page.click("#spin"); await page.waitForSelector("#prize", { timeout: 9000 });
    (await page.textContent("#prize")).includes("Demo, niet bindend") ? ok("uitslag is als demo gelabeld") : fail("jackpot", "uitslag zonder demolabel");
    (await page.textContent("#prize .order-id")).match(/^JKP-/) ? ok("demo-bon JKP-") : fail("jackpot", "geen bon");
    await page.reload(); await page.waitForSelector("#prize");
    (await page.locator("#spin").count()) === 0 ? ok("na de draai geen tweede draai") : fail("jackpot", "tweede draai mogelijk");
    await page.goto(`${BASE}#/account`); await page.waitForSelector("#view h1");
    (await page.textContent("#view")).includes("JKP-") ? ok("bon staat bij Mijn De Zon") : fail("jackpot", "bon niet bij Mijn De Zon");
    report(issues, "jackpot demo");
    await ctx.close();
  }
  console.log("\n== offline na eerste load");
  {
    const { ctx, page } = await fresh(390, 844, { sw: "allow" });
    await page.goto(`${BASE}#/home`); await page.waitForSelector("#view h1");
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForTimeout(1500);
    await ctx.setOffline(true);
    await page.reload(); await page.waitForSelector("#view h1", { timeout: 8000 }).catch(() => {});
    const home = await page.textContent("#view h1").catch(() => "");
    home.startsWith("Goede") ? ok("home laadt offline") : fail("offline", `h1 = "${home}"`);
    await page.evaluate(() => { location.hash = "#/sparen"; }); await page.waitForSelector("#view h1:has-text('Sparen')", { timeout: 5000 }).catch(() => {});
    (await page.textContent("#view h1").catch(() => "")).startsWith("Sparen") ? ok("sparen laadt offline (scherm uit cache)") : fail("offline", "sparen niet beschikbaar");
    await ctx.setOffline(false);
    await ctx.close();
  }
  console.log("\n== prestaties (390x844, lokaal, zonder netwerkdemping)");
  {
    for (const r of ["home", "menu"]) {
      const { ctx, page } = await fresh(390, 844);
      await page.addInitScript(() => { window.__lcp = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true }); });
      await page.goto(`${BASE}#/${r}`); await page.waitForSelector("#view h1"); await page.waitForTimeout(1200);
      const lcp = Math.round(await page.evaluate(() => window.__lcp));
      lcp && lcp < 2500 ? ok(`LCP #/${r}: ${lcp} ms`) : fail("lcp", `#/${r}: ${lcp} ms`);
      await ctx.close();
    }
  }
}
