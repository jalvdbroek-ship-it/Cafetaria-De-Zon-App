import { html, $ } from "../lib/dom.js";
import { icon } from "../components/icons.js";
import { figuur } from "../components/cast-ui.js";
import { demoBanner, orderLines, formatPickup } from "../components/order.js";

const STATUS_TEXT = { ontvangen: "Ontvangen. De Zon gaat ermee aan de slag.", "in bereiding": "In bereiding.", klaar: "Klaar om op te halen.", opgehaald: "Opgehaald. Eet smakelijk!", geannuleerd: "Geannuleerd. Bel De Zon als je vragen hebt." };

export default {
  title: "Bestelling",
  async render(app, id) {
    const order = (await app.ds.listOrders()).find((o) => o.id === id);
    const { site } = app.data;
    if (!order) return html`<h1>Bestelling niet gevonden</h1><div class="state"><p class="muted">Deze bestelling staat niet meer op dit toestel.</p><a class="btn" href="#/menu">Naar het menu</a></div>`;
    const info = await app.ds.jackpotInfo();
    const spin = order.spin || (await app.ds.getSpin(id));
    const canSpin = info.enabled && order.jackpotMogelijk && !spin && order.status !== "geannuleerd";
    return html`
      ${app.demo ? demoBanner("Dit is een demo. De Zon heeft deze bestelling niet ontvangen en er is niets betaald.") : ""}
      <section class="card sun stack center done-card">
        ${figuur("zon-happy", "done-fig")}
        <p class="eyebrow">${app.demo ? "Demo-bestelnummer" : "Bestelnummer"}</p>
        <h1 class="order-id num">${order.id}</h1>
        <p>Afhalen: <strong>${formatPickup(order)}</strong></p>
        <p class="small">op ${site.street}, ${site.city}</p>
        ${app.live ? html`<p class="status" id="status" role="status"><strong>${STATUS_TEXT[order.status] || order.status}</strong></p>` : ""}
      </section>
      ${canSpin ? html`<a class="jackpot-cta" href="#/jackpot/${order.id}"><span class="jp-ic">${icon("star")}</span><span class="grow"><strong>Je mag draaien aan de Jackpot</strong><span class="small block">Elke draai wint iets. Probeer het rad.</span></span>${icon("chevron")}</a>` : ""}
      ${spin ? html`<a class="jackpot-cta won" href="#/jackpot/${order.id}"><span class="jp-ic">${icon("star")}</span><span class="grow"><strong>Je Jackpot-prijs: ${spin.naam}</strong><span class="small block num">Code ${spin.code}</span></span>${icon("chevron")}</a>` : ""}
      <section class="stack"><h2>Je bestelling</h2>${orderLines(order)}
        ${app.live ? html`<p class="small">Betalen doe je bij het afhalen (contant of pin). Er is nog niets betaald.</p>` : ""}
        ${app.demo && order.pointsEarned ? html`<p class="small"><span class="pill demo">Demo</span> Je kreeg ${order.pointsEarned} ${order.pointsEarned === 1 ? "punt" : "punten"} op je demo-spaarkaart.</p>` : ""}
        ${app.live && order.pointsExpected ? html`<p class="small">Na het ophalen krijg je ${order.pointsExpected} ${order.pointsExpected === 1 ? "punt" : "punten"} op je spaarkaart.</p>` : ""}
        ${app.live && !order.pointsExpected && !app.loggedIn ? html`<p class="small">Wil je punten sparen? <a href="#/account">Maak een account</a> voor je volgende bestelling.</p>` : ""}
      </section>
      ${app.demo ? html`<section class="nodig-card"><h3>Echt bestellen <span class="pill nodig">Koppeling nodig</span></h3>
        <p>Wil je echt iets halen? Bel De Zon, dan hoor je of het kan en hoe laat.</p>
        <a class="btn" href="tel:${site.phone}">${icon("phone")} Bel ${site.phoneDisplay}</a></section>` : html`<a class="btn secondary" href="tel:${site.phone}">${icon("phone")} Bel De Zon: ${site.phoneDisplay}</a>`}
      <div class="two"><a class="btn secondary" href="#/menu">Naar het menu</a><a class="btn secondary" href="#/account/bestellingen">Mijn bestellingen</a></div>`;
  },
  mount(root, app, id) {
    if (!app.live) return;
    // Status ververst zichzelf; zo zie je zonder herladen dat je bestelling klaar is.
    const t = setInterval(async () => {
      const o = (await app.ds.listOrders().catch(() => [])).find((x) => x.id === id);
      const el = $("#status", root);
      if (o && el) el.innerHTML = `<strong>${STATUS_TEXT[o.status] || o.status}</strong>`;
    }, 20000);
    return () => clearInterval(t);
  },
};
