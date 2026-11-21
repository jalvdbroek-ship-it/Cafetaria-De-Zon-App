import { html } from "../../lib/dom.js";

const dateFmt = new Intl.DateTimeFormat("nl-NL", { timeZone: "Europe/Amsterdam", day: "numeric", month: "short", year: "numeric" });

export default {
  async render(app) {
    const list = await app.ds.adminCustomers();
    return html`
      <p class="small muted">${app.demo ? "In de demo is er alleen het profiel van dit toestel." : "Klanten met een account. Wachtwoorden zijn niet zichtbaar (alleen een beveiligde hash staat op de server)."}</p>
      ${list.length ? html`<ul class="stack">${list.map((c) => html`
        <li class="card stack"><div class="spread"><strong>${c.naam}</strong><span class="small muted">sinds ${dateFmt.format(new Date(c.aangemaakt))}</span></div>
          <p><a href="tel:${c.telefoon}">${c.telefoon}</a>${c.email ? html` · <a href="mailto:${c.email}">${c.email}</a>` : ""}</p>
          <p class="small muted num">${c.bestellingen} ${c.bestellingen === 1 ? "bestelling" : "bestellingen"} · ${c.punten} punten${c.cardId ? ` · kaart ${c.cardId}` : ""}</p></li>`)}</ul>` : html`<p class="muted">Nog geen klanten.</p>`}`;
  },
};
