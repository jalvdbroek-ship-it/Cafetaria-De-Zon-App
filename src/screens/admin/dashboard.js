import { html } from "../../lib/dom.js";
import { formatEuro } from "../../lib/money.mjs";
import { formatPickup } from "../../components/order.js";

export default {
  async render(app) {
    const [st, orders] = await Promise.all([app.ds.adminStats(), app.ds.adminOrders("open")]);
    const open = orders.filter((o) => ["ontvangen", "in bereiding", "klaar"].includes(o.status)).slice(0, 5);
    return html`
      <section class="stats" aria-label="Vandaag">
        <div class="stat accent"><strong class="num">${st.ordersToday}</strong><span>Bestellingen vandaag</span></div>
        <div class="stat"><strong class="num">${formatEuro(st.revenueToday)}</strong><span>Omzet vandaag</span></div>
        <div class="stat"><strong class="num">${st.open}</strong><span>Open bestellingen</span></div>
        <div class="stat"><strong class="num">${st.newCustomers}</strong><span>Nieuwe klanten vandaag</span></div>
      </section>
      <p class="small muted">Omzet is het bestelde bedrag; er is nog niets in de app betaald. Geannuleerde bestellingen tellen niet mee.</p>
      <section class="stack" aria-labelledby="pop"><h2 id="pop">Populairst vandaag</h2>
        ${st.popular.length ? html`<ol class="odds">${st.popular.map((p, i) => html`<li><span class="num">${i + 1}.</span><span class="grow">${p.naam}</span><span class="num">${p.qty}×</span></li>`)}</ol>` : html`<p class="muted">Nog geen bestellingen vandaag.</p>`}</section>
      <section class="stack" aria-labelledby="nu"><div class="spread"><h2 id="nu">Open bestellingen</h2><a class="link" href="#/beheer/bestellingen">Alle bestellingen</a></div>
        ${open.length ? html`<ul class="stack">${open.map((o) => html`<li class="card spread"><span><strong class="num">${o.id}</strong><span class="small muted block">${o.customer.naam} · ${formatPickup(o)}</span></span><span class="pill status-${o.status.replace(" ", "-")}">${o.status}</span></li>`)}</ul>` : html`<p class="muted">Geen open bestellingen.</p>`}</section>`;
  },
};
