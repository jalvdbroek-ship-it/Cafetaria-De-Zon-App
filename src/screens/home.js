import { html, reducedMotion } from "../lib/dom.js";
import { formatEuro } from "../lib/money.mjs";
import { icon } from "../components/icons.js";
import { sundial, animateSun } from "../components/sundial.js";
import { productCard, bindProducts, photo } from "../components/product.js";
import { amsterdamParts, weekRows } from "../lib/hours.mjs";
import { progress } from "../lib/loyalty.mjs";
import { activePromos } from "../lib/promos.mjs";

const greeting = (h) => (h < 5 ? "Goedenacht" : h < 12 ? "Goedemorgen" : h < 18 ? "Goedemiddag" : "Goedenavond");

export default {
  title: "Home",
  async render(app) {
    const { menu, site, promos, config } = app.data;
    const now = app.now();
    const t = amsterdamParts(now);
    const account = await app.ds.getAccount();
    const loy = await app.ds.getLoyalty();
    const jp = await app.ds.jackpotInfo();
    const name = account.naam.trim().split(/\s+/)[0];
    const featured = menu.producten.filter((p) => p.uitgelicht && !p.uitverkocht).slice(0, 8);
    const promo = activePromos(promos, now)[0];
    const prog = progress(loy.balance, config.loyalty.rewards);
    const week = weekRows(site.hours);
    return html`
      <section class="hero" aria-labelledby="hero-kop">
        ${photo(app, "sfeer", { cls: "hero-photo", eager: true })}
        <div class="hero-body">
          <p class="eyebrow on-photo">${site.city}</p>
          <h1 id="hero-kop">${greeting(Math.floor(t.minutes / 60))}${name ? `, ${name}` : ""}</h1>
          <p class="hero-sub">Frites, snacks, hamburgers en ijs. Bestel vooraf en haal af aan ${site.street}.</p>
          <div class="hero-cta">
            <a class="btn big" href="#/menu">Bestel nu</a>
            <a class="btn big ghost" href="#/menu/menus">Menu's</a>
          </div>
        </div>
      </section>
      <div id="dial">${sundial(now, site.hours)}</div>
      ${promo ? html`
      <section class="deal" aria-labelledby="actie">
        <p class="deal-tag">Aanbieding van de week${promo.voorbeeld ? html` <span class="pill voorbeeld">Voorbeeld</span>` : ""}</p>
        <h2 id="actie">${promo.titel}</h2>
        <p>${promo.tekst}</p>
        <a class="btn dark sm" href="${promo.knop?.href || "#/acties"}">${promo.knop?.label || "Meer acties"}</a>
      </section>` : ""}
      <section class="stack" aria-labelledby="populair">
        <div class="spread"><h2 id="populair">Populair</h2>${menu.producten.some((p) => !p.bevestigd) ? html`<span class="pill voorbeeld">Voorbeeldkaart</span>` : ""}</div>
        <ul class="rail">${featured.map((p) => productCard(app, p))}</ul>
        <a class="link" href="#/menu">Hele menukaart</a>
      </section>
      ${jp.enabled ? html`
      <section class="jackpot-block" aria-labelledby="jp-kop">
        <span class="jp-ic big">${icon("star")}</span>
        <div class="stack">
          <h2 id="jp-kop">Jackpot</h2>
          <p>Bestel vanaf ${formatEuro(jp.minTotal)} en draai aan het rad. Elke draai wint een bon${jp.voorbeeld ? "" : "."}${jp.voorbeeld ? html` <span class="pill voorbeeld">Voorbeeld</span>` : ""}</p>
          <a class="btn sm" href="#/menu">Bestel en draai</a>
        </div>
      </section>` : ""}
      <section class="card stack spaar" aria-labelledby="sparen-kop">
        <div class="spread"><h2 id="sparen-kop">Spaarkaart</h2>${app.demo ? html`<span class="pill demo">Demo</span>` : ""}</div>
        ${app.live && loy.guest ? html`<p>Spaar een punt per bestede euro en wissel in voor een gratis saus, frites of hamburger.</p><a class="btn secondary sm" href="#/account">Account maken of inloggen</a>`
        : html`<p>Je hebt <strong class="num">${loy.balance}</strong> ${loy.balance === 1 ? "punt" : "punten"}.${prog.next ? ` Nog ${prog.remaining} voor "${prog.next.naam}".` : " Je kunt alle beloningen inwisselen."}</p>
        <div class="meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(prog.fraction * 100)}" aria-label="Voortgang naar volgende beloning"><span style="width:${Math.round(prog.fraction * 100)}%"></span></div>
        <a class="btn secondary sm" href="#/sparen">Naar mijn spaarkaart</a>`}
      </section>
      <section class="card stack" aria-labelledby="tijden">
        <h2 id="tijden">Openingstijden</h2>
        <table class="hours"><tbody>${week.map((r) => html`<tr ${r.dow === t.dow ? 'aria-current="date"' : ""}><th scope="row">${r.dag}</th><td class="num">${r.open ? `${r.open} – ${r.close}` : "Gesloten"}</td></tr>`)}</tbody></table>
        <div class="two">
          <a class="btn secondary" href="tel:${site.phone}">${icon("phone")} Bel De Zon</a>
          <a class="btn secondary" href="${site.routeUrl}" target="_blank" rel="noopener">${icon("pin")} Route</a>
        </div>
      </section>
      ${app.demo ? html`<section class="nodig-card" aria-labelledby="echt"><h2 id="echt">Echt bestellen <span class="pill nodig">Koppeling nodig</span></h2>
        <p>Bestellen in deze demo bereikt De Zon niet. Voor een echte bestelling bel je ${site.phoneDisplay} of loop je langs op ${site.street}.</p></section>` : ""}`;
  },
  mount(root, app) {
    const { site } = app.data;
    animateSun(root, app.now(), site.hours, reducedMotion());
    const t = setInterval(() => { root.querySelector("#dial").innerHTML = sundial(app.now(), site.hours, { intro: false }).s; }, 30000);
    const un = bindProducts(root, app);
    return () => { clearInterval(t); un(); };
  },
};
