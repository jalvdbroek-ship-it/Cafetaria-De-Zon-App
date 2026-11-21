import { html, $ } from "../../lib/dom.js";
import { formatEuro } from "../../lib/money.mjs";
import { formatPickup, formatDate } from "../../components/order.js";
import { STATUSES } from "../../lib/stats.mjs";

let filter = "open";
const FINAL = ["opgehaald", "geannuleerd"];

const card = (app, o) => html`
  <li class="card stack" data-order="${o.id}">
    <div class="spread"><strong class="num">${o.id}</strong><span class="pill status-${o.status.replace(" ", "-")}">${o.status}</span></div>
    <p class="small muted">${formatDate(o.createdAt)} · afhalen: ${formatPickup(o)}</p>
    <p>${o.customer.naam} · <a href="tel:${o.customer.telefoon}">${o.customer.telefoon}</a></p>
    <p>${o.lines.map((l) => `${l.qty}× ${l.naam}${l.optionNames?.length ? ` (${l.optionNames.join(", ")})` : ""}`).join(", ")}</p>
    ${o.customer.opmerking ? html`<p class="small">Opmerking: ${o.customer.opmerking}</p>` : ""}
    ${o.spin ? html`<p class="small">Jackpot: ${o.spin.naam} (<span class="num">${o.spin.code}</span>)</p>` : ""}
    <div class="spread"><strong class="num">${formatEuro(o.total)}</strong><span class="small muted">${app.live ? "Nog te betalen bij afhalen" : "Demo"}</span></div>
    ${FINAL.includes(o.status) ? "" : html`<div class="status-btns" role="group" aria-label="Status van ${o.id}">${STATUSES.filter((s) => s !== o.status).map((s) => html`<button class="btn ${s === "geannuleerd" ? "danger" : "secondary"} sm" data-set="${s}">${s === "geannuleerd" ? "Annuleer" : `Zet op ${s}`}</button>`)}</div>`}
  </li>`;

async function load(app) {
  const all = await app.ds.adminOrders();
  return filter === "open" ? all.filter((o) => !FINAL.includes(o.status)) : all;
}

export default {
  async render(app) {
    const list = await load(app);
    return html`
      <div class="chips" role="group" aria-label="Filter"><button class="chip" data-filter="open" aria-pressed="${filter === "open"}">Open</button><button class="chip" data-filter="alle" aria-pressed="${filter === "alle"}">Alle</button></div>
      <p class="small muted">${app.live ? "Nieuwe bestellingen verschijnen vanzelf (ververst elke 15 seconden). Spaarpunten gaan naar de klant zodra je een bestelling op opgehaald zet." : "Hier staan alleen demo-bestellingen van dit toestel."}</p>
      <ul class="stack" id="olist">${list.length ? list.map((o) => card(app, o)) : html`<li class="muted">Geen bestellingen in deze lijst.</li>`}</ul>`;
  },
  mount(root, app) {
    const refresh = async () => { const el = $("#olist", root); if (el && !el.contains(document.activeElement)) el.innerHTML = (await load(app).then((l) => (l.length ? l.map((o) => card(app, o)) : html`<li class="muted">Geen bestellingen in deze lijst.</li>`))).toString(); };
    const onClick = async (e) => {
      const f = e.target.closest("[data-filter]");
      if (f) { filter = f.dataset.filter; return app.rerender({ keepScroll: true }); }
      const b = e.target.closest("[data-set]");
      if (!b) return;
      const id = b.closest("[data-order]").dataset.order;
      b.disabled = true;
      try { await app.ds.adminSetStatus(id, b.dataset.set); app.toast(`${id}: ${b.dataset.set}`); app.rerender({ focus: `[data-order="${id}"]` }); }
      catch (err) { b.disabled = false; app.toast(err.message, "error"); }
    };
    root.addEventListener("click", onClick);
    const t = app.live ? setInterval(() => refresh().catch(() => {}), 15000) : 0;
    return () => { root.removeEventListener("click", onClick); clearInterval(t); };
  },
};
