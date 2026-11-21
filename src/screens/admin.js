import { html, $ } from "../lib/dom.js";
import { icon } from "../components/icons.js";

const SECTIONS = [
  ["dashboard", "Overzicht", () => import("./admin/dashboard.js")],
  ["bestellingen", "Bestellingen", () => import("./admin/orders.js")],
  ["producten", "Producten", () => import("./admin/products.js")],
  ["categorieen", "Categorieën", () => import("./admin/categories.js")],
  ["klanten", "Klanten", () => import("./admin/customers.js")],
  ["sparen", "Spaarregels", () => import("./admin/loyalty.js")],
  ["jackpot", "Jackpot", () => import("./admin/jackpot.js")],
  ["acties", "Acties", () => import("./admin/promos.js")],
  ["info", "Tijden", () => import("./admin/info.js")],
  ["data", "Export en reset", () => import("./admin/data.js"), "demo"],
];

const demoWarning = html`<p class="demo-banner" role="note"><span><strong>Demo-beheer, geen echte beveiliging</strong>De pincode staat in config/app.json en wijzigingen worden alleen op dit toestel bewaard. De Zon ziet ze niet.</span></p>`;

let sub = null;

export default {
  title: "Beheer",
  async render(app, section) {
    const back = html`<a class="link back" href="#/account">${icon("back")} Mijn De Zon</a>`;
    if (!(await app.ds.isAdmin())) {
      return html`${back}<h1>Beheer</h1>${app.demo ? demoWarning : ""}
        <form id="pin" class="stack" novalidate>
          <div class="field"><label for="pin-in">${app.demo ? "Demo-pincode" : "Beheerwachtwoord"}</label>
            ${app.demo ? html`<input id="pin-in" type="password" inputmode="numeric" autocomplete="off" maxlength="12">` : html`<input id="pin-in" type="password" autocomplete="current-password" maxlength="200">`}
            <p class="field-error" id="e-pin" role="alert"></p></div>
          <button class="btn" type="submit">${app.demo ? "Ontgrendel" : "Inloggen"}</button>
        </form>`;
    }
    const list = SECTIONS.filter((s) => s[3] !== "demo" || app.demo);
    const cur = list.find((s) => s[0] === section) || list[0];
    sub = (await cur[2]()).default;
    return html`${back}<h1>Beheer</h1>${app.demo ? demoWarning : ""}
      <nav class="chips" aria-label="Beheer-onderdelen">${list.map(([id, label]) => html`<a class="chip" href="#/beheer/${id}" ${id === cur[0] ? 'aria-current="true"' : ""}>${label}</a>`)}</nav>
      <div id="adm">${await sub.render(app)}</div>
      <button class="link" id="lock">${app.demo ? "Vergrendel beheer" : "Uitloggen uit beheer"}</button>`;
  },
  mount(root, app) {
    const pin = $("#pin", root);
    if (pin) {
      pin.addEventListener("submit", async (e) => {
        e.preventDefault();
        const err = $("#e-pin", root), input = $("#pin-in", root);
        err.textContent = ""; input.removeAttribute("aria-invalid");
        try {
          if (await app.ds.adminLogin(input.value)) app.rerender({ focus: "h1" });
          else { err.textContent = app.demo ? "Deze pincode klopt niet." : "Dit wachtwoord klopt niet."; input.setAttribute("aria-invalid", "true"); }
        } catch (x) { err.textContent = x.message; }
      });
      return;
    }
    $("#lock", root).addEventListener("click", async () => { await app.ds.adminLogout(); app.rerender({ focus: "h1" }); });
    return sub?.mount?.($("#adm", root), app);
  },
};
