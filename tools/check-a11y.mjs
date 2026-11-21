import { BASE, fail, ok, fresh, shot } from "./check-setup.mjs";

export async function a11y() {
  console.log("\n== toegankelijkheid: toetsenbord, reduced motion, manifest");
  {
    const { ctx, page } = await fresh(390, 844);
    await page.goto(`${BASE}#/menu`); await page.waitForSelector(".prod");
    await page.keyboard.press("Tab");
    (await page.evaluate(() => document.activeElement.className)) === "skip" ? ok("eerste Tab-stop is 'Naar de inhoud'") : fail("toetsenbord", "eerste Tab-stop is niet de skip-link");
    await page.keyboard.press("Enter");
    const after = await page.evaluate(() => [location.hash, document.activeElement.id]);
    after[0] === "#/menu" && after[1] === "view" ? ok("skip-link zet de focus op de inhoud zonder de route te wijzigen") : fail("toetsenbord", `skip-link: ${after}`);
    await page.focus('[data-open="softijs"]'); await page.keyboard.press("Enter"); await page.waitForSelector("#sheet[open]");
    const inside = await page.evaluate(() => document.getElementById("sheet").contains(document.activeElement));
    inside ? ok("focus gaat naar de sheet bij openen") : fail("toetsenbord", "focus blijft buiten de sheet");
    await page.keyboard.press("Escape"); await page.waitForFunction(() => !document.querySelector("#sheet[open]"));
    (await page.evaluate(() => document.activeElement?.dataset?.open)) === "softijs" ? ok("Escape sluit de sheet en zet de focus terug") : fail("toetsenbord", "focus niet teruggezet na sluiten");
    await ctx.close();
  }
  {
    const ctx = await (await import("./check-setup.mjs")).browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce", serviceWorkers: "block" });
    const page = await ctx.newPage();
    await page.goto(`${BASE}#/sparen`); await page.waitForSelector(".flip");
    const dur = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector(".face")).transitionDuration));
    dur < 0.01 ? ok("reduced motion: kaartdraai heeft geen animatie") : fail("reduced motion", `transition ${dur}s`);
    await page.click("#flip-btn");
    (await page.evaluate(() => getComputedStyle(document.querySelector(".back")).opacity)) === "1" ? ok("reduced motion: keerzijde zichtbaar via opacity") : fail("reduced motion", "keerzijde niet zichtbaar");
    await page.goto(`${BASE}#/home`); await page.waitForSelector(".sun-wob");
    (await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector(".sun-wob")).animationDuration))) < 0.01 ? ok("reduced motion: zonnestralen staan stil") : fail("reduced motion", "zon draait nog");
    await ctx.close();
  }
  {
    const { ctx, page } = await fresh(390, 844);
    await page.goto(BASE);
    const m = await page.evaluate(async () => { const r = await fetch(document.querySelector("link[rel=manifest]").href); return r.ok ? r.json() : null; });
    const needed = m && m.display === "standalone" && m.start_url && m.icons?.some((i) => i.sizes === "512x512" && i.purpose === "maskable") && m.icons?.some((i) => i.sizes === "192x192");
    needed ? ok("manifest: standalone, 192- en 512-iconen (ook maskable)") : fail("manifest", "onvolledig");
    for (const i of m.icons) { const r = await page.request.get(new URL(i.src, BASE).href); r.ok() ? null : fail("manifest", `${i.src} ${r.status()}`); }
    await ctx.close();
  }
}
