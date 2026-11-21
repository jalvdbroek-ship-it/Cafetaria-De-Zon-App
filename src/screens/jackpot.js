import { html, $, reducedMotion } from "../lib/dom.js";
import { icon } from "../components/icons.js";
import { wheelSvg, targetRotation } from "../components/wheel.js";

const dateFmt = new Intl.DateTimeFormat("nl-NL", { timeZone: "Europe/Amsterdam", day: "numeric", month: "long", year: "numeric" });

const result = (app, spin) => html`
  <section class="card sun stack center prize" aria-labelledby="prijs-kop" tabindex="-1" id="prize">
    <p class="eyebrow">Je hebt gewonnen</p>
    <h2 id="prijs-kop">${spin.naam}</h2>
    <p class="card order-id num">${spin.code}</p>
    <p class="small">Laat deze code zien bij het afhalen. Geldig tot ${dateFmt.format(new Date(spin.geldigTot))}. Eén keer te gebruiken, niet inwisselbaar voor geld.</p>
    ${app.demo ? html`<p><span class="pill demo">Demo, niet bindend</span> Deze bon is niet geldig bij De Zon.</p>` : ""}
  </section>`;

const rules = (info) => html`
  <section class="stack" aria-labelledby="regels">
    <h2 id="regels">Spelregels en kansen</h2>
    <ul class="bullets small">
      <li>Bij een bestelling vanaf ${(info.minTotal / 100).toFixed(2).replace(".", ",")} euro mag je één keer draaien.</li>
      <li>Elke draai levert een prijs op. Een prijs is een bon voor een product, geen geld.</li>
      <li>Een bon is ${info.geldigDagen} dagen geldig en één keer te gebruiken.</li>
      <li>De uitslag wordt ${info.demo ? "op dit toestel" : "door de server"} bepaald met een willekeurige trekking. Het rad draait alleen mee.</li>
    </ul>
    <ul class="odds">${info.prizes.map((p, i) => html`<li><span class="num">${i + 1}.</span><span class="grow">${p.naam}</span><span class="num">${p.percent.toLocaleString("nl-NL")}%</span></li>`)}</ul>
    ${info.voorbeeld ? html`<p class="small"><span class="pill voorbeeld">Voorbeeld</span> Prijzen en kansen zijn een voorbeeld en nog geen regeling van De Zon.</p>` : ""}
  </section>`;

export default {
  title: "Jackpot",
  async render(app, orderId) {
    const info = { ...(await app.ds.jackpotInfo()), demo: app.demo };
    const order = (await app.ds.listOrders()).find((o) => o.id === orderId);
    const back = html`<a class="link back" href="#/mandje/klaar/${orderId}">${icon("back")} Bestelling</a>`;
    if (!order) return html`${back}<h1>Jackpot</h1><div class="state"><p class="muted">Deze bestelling staat niet op dit toestel.</p><a class="btn" href="#/menu">Naar het menu</a></div>`;
    const spin = await app.ds.getSpin(orderId);
    app.jackpotCtx = { info, orderId, spin };
    if (!spin && !(info.enabled && order.jackpotMogelijk)) {
      return html`${back}<h1>Jackpot</h1><div class="state"><p class="muted">${info.enabled ? "Deze bestelling komt niet in aanmerking voor een draai." : "De Jackpot staat nu uit."}</p><a class="btn" href="#/menu">Naar het menu</a></div>${rules(info)}`;
    }
    return html`${back}
      <h1>Jackpot</h1>
      <p>${spin ? "Je hebt voor deze bestelling al gedraaid." : "Draai het rad. Elke draai wint iets."}</p>
      ${wheelSvg(info.prizes)}
      <div id="out" aria-live="polite">${spin ? result(app, spin) : ""}</div>
      ${spin ? "" : html`<button class="btn block big" id="spin">Draai het rad</button>`}
      <p class="field-error" id="e-spin" role="alert"></p>
      ${rules(info)}`;
  },
  mount(root, app, orderId) {
    const { info, spin } = app.jackpotCtx;
    const wheel = $("#wheel", root), btn = $("#spin", root);
    const land = (s, animate) => {
      const i = Math.max(0, info.prizes.findIndex((p) => p.id === s.prizeId));
      const deg = targetRotation(i, info.prizes.length, { jitter: (Math.random() - 0.5) * 2 });
      wheel.style.transition = animate ? "transform 4.6s cubic-bezier(0.12, 0.7, 0.1, 1)" : "none";
      wheel.style.transform = `rotate(${deg}deg)`;
    };
    if (spin) land(spin, false);
    if (!btn) return;
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      $("#e-spin", root).textContent = "";
      try {
        const { spin: s } = await app.ds.spin(orderId);
        const show = () => { $("#out", root).innerHTML = result(app, s).s; btn.remove(); $("#prize", root)?.focus({ preventScroll: false }); };
        if (reducedMotion()) { land(s, false); show(); }
        else { land(s, true); wheel.addEventListener("transitionend", show, { once: true }); setTimeout(() => { if ($("#spin", root)) show(); }, 5200); }
      } catch (e) { btn.disabled = false; $("#e-spin", root).textContent = e.message; }
    });
  },
};
