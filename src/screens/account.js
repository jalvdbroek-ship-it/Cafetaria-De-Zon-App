import { html, $ } from "../lib/dom.js";
import { formatEuro } from "../lib/money.mjs";
import { icon } from "../components/icons.js";
import { productRow, bindProducts } from "../components/product.js";
import { confirmSheet } from "../components/confirm.js";
import { progress } from "../lib/loyalty.mjs";
import { validateCheckout } from "../lib/validate.mjs";
import { formatPickup } from "../components/order.js";

const nav = (href, ic, label, sub) => html`<li><a class="navrow" href="${href}">${icon(ic)}<span class="grow"><strong>${label}</strong>${sub ? html`<span class="small muted block">${sub}</span>` : ""}</span>${icon("chevron")}</a></li>`;
const field = (id, name, label, type, extra = "") => html`<div class="field"><label for="${id}">${label}</label><input id="${id}" name="${name}" type="${type}" ${extra}><p class="field-error" id="e-${id}" role="alert"></p></div>`;

const authCard = html`
  <section class="card stack" aria-labelledby="inlog">
    <h2 id="inlog">Inloggen of account maken</h2>
    <p class="small muted">Met een account spaar je punten en zie je je bestellingen op elk toestel.</p>
    <div class="chips" role="group" aria-label="Kies"><button class="chip" data-auth="login" aria-pressed="true">Inloggen</button><button class="chip" data-auth="register" aria-pressed="false">Account maken</button></div>
    <form id="login" class="stack" novalidate>
      ${field("l-id", "id", "Telefoonnummer of e-mailadres", "text", 'autocomplete="username" inputmode="email"')}
      ${field("l-pw", "wachtwoord", "Wachtwoord", "password", 'autocomplete="current-password"')}
      <p class="field-error" id="e-login" role="alert"></p>
      <button class="btn" type="submit">Inloggen</button>
    </form>
    <form id="register" class="stack" hidden novalidate>
      ${field("r-naam", "naam", "Naam", "text", 'autocomplete="name" maxlength="60"')}
      ${field("r-tel", "telefoon", "Telefoonnummer", "tel", 'autocomplete="tel" inputmode="tel"')}
      ${field("r-mail", "email", "E-mailadres (optioneel)", "email", 'autocomplete="email"')}
      ${field("r-pw", "wachtwoord", "Wachtwoord (minimaal 8 tekens)", "password", 'autocomplete="new-password" minlength="8"')}
      <label class="check"><input type="checkbox" name="akkoord"><span class="grow">Ik heb de <a href="#/privacy">privacyverklaring</a> gelezen en ga ermee akkoord dat De Zon mijn naam, telefoon en bestellingen bewaart voor mijn account.</span></label>
      <p class="field-error" id="e-akkoord" role="alert"></p>
      <p class="field-error" id="e-register" role="alert"></p>
      <button class="btn" type="submit">Account maken</button>
    </form>
  </section>`;

export default {
  title: "Mijn De Zon",
  async render(app) {
    const acc = await app.ds.getAccount();
    const loy = await app.ds.getLoyalty();
    const orders = await app.ds.listOrders();
    const favs = (await app.ds.getFavorites()).map((id) => app.data.idx.products.get(id)).filter(Boolean);
    const settings = await app.ds.getSettings();
    const prog = progress(loy.balance, app.data.config.loyalty.rewards);
    const open = loy.vouchers.filter((v) => v.status !== "verzilverd");
    app.loggedIn = Boolean(acc.loggedIn);
    return html`
      <h1>Mijn De Zon</h1>
      ${acc.loggedIn ? html`<section class="card sun stack" aria-label="Mijn spaarkaart"><p class="eyebrow">Spaarkaart ${acc.cardId}</p><p><strong>Hoi ${acc.naam.split(" ")[0]}</strong>, je hebt <strong class="num">${loy.balance}</strong> ${loy.balance === 1 ? "punt" : "punten"}.</p>
        <div class="meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(prog.fraction * 100)}" aria-label="Voortgang naar volgende beloning"><span style="width:${Math.round(prog.fraction * 100)}%"></span></div>
        <p class="small">${prog.next ? `Nog ${prog.remaining} voor "${prog.next.naam}".` : "Je kunt alle beloningen inwisselen."}</p></section>`
        : app.live ? authCard : html`<section class="card sun stack"><p><strong>${loy.balance}</strong> ${loy.balance === 1 ? "punt" : "punten"} op dit toestel <span class="pill demo">Demo</span></p><a class="btn secondary sm" href="#/sparen">Naar mijn spaarkaart</a></section>`}
      <ul class="navlist">
        ${nav("#/account/bestellingen", "receipt", "Mijn bestellingen", orders.length ? `${orders.length} ${orders.length === 1 ? "bestelling" : "bestellingen"}${app.live ? `, laatste: ${orders[0].status}` : " (demo)"}` : "Nog geen bestellingen")}
        ${nav("#/sparen", "card", "Sparen en beloningen", "Punten, beloningen, bonnen")}
        ${nav("#/acties", "tag", "Acties", app.demo ? "Voorbeeldacties" : "")}
        ${nav("#/contact", "pin", "Contact en route", "Adres, openingstijden, bellen")}
        ${nav("#/privacy", "lock", "Privacy", "Wat er bewaard wordt")}
      </ul>
      ${open.length ? html`<section class="stack" aria-labelledby="bon"><h2 id="bon">Mijn bonnen</h2><ul class="stack">${open.slice(0, 5).map((v) => html`<li class="card soft spread"><span>${v.naam}</span><strong class="num">${v.code}</strong></li>`)}</ul></section>` : ""}
      <section class="stack" aria-labelledby="gesch"><h2 id="gesch">Laatste bestellingen</h2>
        ${orders.length ? html`<ul class="stack">${orders.slice(0, 3).map((o) => html`<li><a class="card spread" href="#/mandje/klaar/${o.id}"><span><strong class="num">${o.id}</strong><span class="small muted block">${formatPickup(o)}${app.live ? ` · ${o.status}` : ""}</span></span><strong class="num">${formatEuro(o.total)}</strong></a></li>`)}</ul>` : html`<p class="muted">Hier komen je bestellingen.</p>`}</section>
      <form id="prof" class="stack" novalidate aria-labelledby="prof-kop">
        <div class="spread"><h2 id="prof-kop">Mijn gegevens</h2>${acc.loggedIn ? "" : html`<span class="pill demo">Op dit toestel</span>`}</div>
        <div class="field"><label for="a-naam">Naam</label><input id="a-naam" name="naam" type="text" autocomplete="name" maxlength="60" value="${acc.naam}"><p class="field-error" id="e-naam" role="alert"></p></div>
        <div class="field"><label for="a-tel">Telefoonnummer</label><input id="a-tel" name="telefoon" type="tel" inputmode="tel" autocomplete="tel" value="${acc.telefoon}"><p class="field-error" id="e-telefoon" role="alert"></p></div>
        <div class="field"><label for="a-mail">E-mailadres</label><input id="a-mail" name="email" type="email" inputmode="email" autocomplete="email" value="${acc.email}"><p class="field-error" id="e-email" role="alert"></p></div>
        <button class="btn" type="submit">Bewaar gegevens</button>
      </form>
      <section class="stack" aria-labelledby="fav"><h2 id="fav">Favorieten</h2>
        ${favs.length ? html`<ul class="plist">${favs.map((p) => productRow(app, p))}</ul>` : html`<p class="muted">Tik op het hartje bij een product om het hier te bewaren.</p>`}</section>
      ${app.demo ? html`<section class="nodig-card" aria-labelledby="inlog2"><h3 id="inlog2">Inloggen <span class="pill nodig">Koppeling nodig</span></h3>
        <p>Een echt account met wachtwoord werkt alleen met de De Zon-server. In deze demo staan je gegevens alleen op dit toestel.</p></section>` : ""}
      <section class="stack" aria-labelledby="inst"><h2 id="inst">Instellingen</h2>
        <p class="small muted">Taal: Nederlands</p>
        <label class="check"><input type="checkbox" id="rm" ${settings.reduceMotion ? "checked" : ""}><span class="grow">Beweging beperken <span class="small muted block">Zet animaties uit. Dit volgt ook de instelling van je toestel.</span></span></label>
        ${acc.loggedIn ? html`<button class="btn secondary" id="logout">${icon("logout")} Uitloggen</button><button class="btn danger" id="delacc">Verwijder mijn account</button>` : ""}
        <button class="btn danger" id="wipe">Wis mijn gegevens op dit toestel</button>
      </section>
      <p class="small muted">De Zon-app, versie 0.2${app.demo ? ", demo" : ""}</p>
      <a class="btn secondary sm" href="#/beheer">${app.demo ? "Beheer (demo)" : "Beheer"}</a>`;
  },
  mount(root, app) {
    const un = bindProducts(root, app);
    const setErr = (form, n, m) => { const e = $(`#e-${n}`, form), f = form.elements[n]; if (e) e.textContent = m || ""; if (f?.setAttribute) { if (m) f.setAttribute("aria-invalid", "true"); else f.removeAttribute("aria-invalid"); } };
    const showFields = (form, err, map = {}) => {
      if (!err.fields) { const t = $("[id^=e-login],[id^=e-register]", form); if (t) t.textContent = err.message; return; }
      for (const [k, v] of Object.entries(err.fields)) { const id = map[k] || k; const e = $(`#e-${id}`, form); if (e) e.textContent = v; }
    };
    const prof = $("#prof", root);
    prof.addEventListener("submit", async (e) => {
      e.preventDefault();
      for (const n of ["naam", "telefoon", "email"]) setErr(prof, n, "");
      try { await app.ds.saveAccount(Object.fromEntries(new FormData(prof))); app.toast("Gegevens bewaard"); }
      catch (err) {
        if (!err.fields) return app.toast(err.message, "error");
        for (const [k, v] of Object.entries(err.fields)) setErr(prof, k, v);
        prof.elements[Object.keys(err.fields)[0]]?.focus();
      }
    });
    $("#rm", root).addEventListener("change", async (e) => {
      await app.ds.saveSettings({ reduceMotion: e.target.checked });
      document.documentElement.classList.toggle("rm", e.target.checked);
    });
    const login = $("#login", root), reg = $("#register", root);
    if (login) {
      root.addEventListener("click", (e) => {
        const b = e.target.closest("[data-auth]");
        if (!b) return;
        for (const c of root.querySelectorAll("[data-auth]")) c.setAttribute("aria-pressed", String(c === b));
        login.hidden = b.dataset.auth !== "login"; reg.hidden = b.dataset.auth !== "register";
        (login.hidden ? reg : login).querySelector("input")?.focus();
      });
      login.addEventListener("submit", async (e) => {
        e.preventDefault();
        $("#e-login", login).textContent = "";
        const d = Object.fromEntries(new FormData(login));
        try { await app.ds.login({ id: d.id, wachtwoord: d.wachtwoord }); app.toast("Je bent ingelogd"); app.rerender({ focus: "h1" }); }
        catch (err) { $("#e-login", login).textContent = err.message; }
      });
      reg.addEventListener("submit", async (e) => {
        e.preventDefault();
        for (const n of ["r-naam", "r-tel", "r-mail", "r-pw", "akkoord", "register"]) { const el = $(`#e-${n}`, reg); if (el) el.textContent = ""; }
        const d = Object.fromEntries(new FormData(reg));
        const bad = { ...validateCheckout({ naam: d.naam, telefoon: d.telefoon, email: d.email }) };
        delete bad.opmerking;
        const map = { naam: "r-naam", telefoon: "r-tel", email: "r-mail" };
        for (const [k, v] of Object.entries(bad)) $(`#e-${map[k]}`, reg).textContent = v;
        if ((d.wachtwoord || "").length < 8) { $("#e-r-pw", reg).textContent = "Gebruik minimaal 8 tekens."; bad.wachtwoord = true; }
        if (d.akkoord !== "on") { $("#e-akkoord", reg).textContent = "Ga akkoord met de privacyverklaring om een account te maken."; bad.akkoord = true; }
        if (Object.keys(bad).length) { reg.querySelector("[aria-invalid], input")?.focus(); return; }
        try { await app.ds.register({ naam: d.naam, telefoon: d.telefoon, email: d.email, wachtwoord: d.wachtwoord, akkoord: d.akkoord === "on" }); app.toast("Account gemaakt"); app.rerender({ focus: "h1" }); }
        catch (err) {
          if (err.fields) showFields(reg, err, { naam: "r-naam", telefoon: "r-tel", email: "r-mail", wachtwoord: "r-pw" });
          else $("#e-register", reg).textContent = err.message;
        }
      });
    }
    $("#logout", root)?.addEventListener("click", async () => { await app.ds.logout(); app.toast("Je bent uitgelogd"); app.rerender({ focus: "h1" }); });
    $("#delacc", root)?.addEventListener("click", () => {
      app.openSheet(html`<h2>Account verwijderen?</h2><p>Je account, punten en favorieten worden gewist. Oude bestellingen blijven bij De Zon bewaard, zonder je naam en telefoonnummer. Dit kan niet ongedaan worden.</p>
        <form id="del" class="stack" novalidate><div class="field"><label for="del-pw">Je wachtwoord</label><input id="del-pw" type="password" name="wachtwoord" autocomplete="current-password"><p class="field-error" id="e-del" role="alert"></p></div>
        <button class="btn danger" type="submit">Verwijder mijn account</button><button class="btn secondary" type="button" data-close>Annuleren</button></form>`, {
        label: "Account verwijderen",
        onMount(sheet) {
          $("#del", sheet).addEventListener("submit", async (e) => {
            e.preventDefault();
            try { await app.ds.deleteAccount($("#del-pw", sheet).value); app.closeSheet(); app.toast("Je account is verwijderd"); app.rerender({ focus: "h1" }); }
            catch (err) { $("#e-del", sheet).textContent = err.message; }
          });
        },
      });
    });
    $("#wipe", root).addEventListener("click", async () => {
      if (!(await confirmSheet(app, { title: "Alles wissen?", text: "Je gegevens, bestellingen, punten, favorieten en mandje worden van dit toestel gewist. Je account op de server blijft bestaan; log daarvoor in en kies ‘Verwijder mijn account’. Dit kan niet ongedaan worden.", yes: "Alles wissen" }))) return;
      await app.ds.clearAll();
      app.cart = app.ds.loadCart();
      app.emit("cart");
      document.documentElement.classList.remove("rm");
      app.toast("Je gegevens zijn gewist");
      app.rerender({ focus: "h1" });
    });
    return un;
  },
};
