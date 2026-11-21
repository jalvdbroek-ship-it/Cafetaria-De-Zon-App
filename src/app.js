import { LocalDemoSource } from "./lib/datasource.mjs";
import { HttpSource, probeServer } from "./lib/http-source.mjs";
import { createApp } from "./state/app-state.js";
import { mountShell, mountOverlays, fatal } from "./components/shell.js";
import { startRouter } from "./router.js";

const root = document.getElementById("app");
const getJson = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} ${r.status}`);
  return r.json();
};

function pickStorage() {
  try {
    localStorage.setItem("dezon.v1.test", "1");
    localStorage.removeItem("dezon.v1.test");
    return { storage: localStorage, persistent: true };
  } catch {
    const m = new Map();
    return { persistent: false, storage: { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) } };
  }
}

function pickSession() {
  try { sessionStorage.setItem("dezon.v1.test", "1"); sessionStorage.removeItem("dezon.v1.test"); return sessionStorage; } catch { return undefined; }
}

// Met de echte server (bereikbaar via /api/health) praat de app daarmee; anders draait de demo op dit toestel.
async function pickSource({ storage, session }) {
  const health = await probeServer();
  if (health) return new HttpSource({ storage, session });
  const [menu, promos, config, site] = await Promise.all([getJson("src/data/menu.json"), getJson("config/promos.json"), getJson("config/app.json"), getJson("src/data/site.json")]);
  return new LocalDemoSource({ menu, promos, config, site, storage, session });
}

async function boot() {
  try {
    const { storage, persistent } = pickStorage();
    const [ds, fotos] = await Promise.all([pickSource({ storage, session: pickSession() }), getJson("src/data/fotos.json")]);
    const app = await createApp({ ds });
    app.fotos = fotos;
    app.loggedIn = Boolean(await ds.me?.().catch(() => null));
    document.documentElement.dataset.mode = ds.mode;
    document.querySelector(".demo-strip").hidden = ds.mode === "live";
    document.documentElement.classList.toggle("rm", (await ds.getSettings()).reduceMotion);
    app.persistent = persistent;
    root.hidden = false;
    document.getElementById("boot")?.remove();
    mountOverlays(app);
    const setTab = mountShell(app);
    if (!persistent) app.toast("Opslaan op dit toestel is uit: je mandje blijft niet bewaard.", "error");
    await startRouter(app, setTab);
    document.querySelector(".skip").addEventListener("click", (e) => { e.preventDefault(); document.getElementById("view").focus(); });
    document.body.tabIndex = -1;
    document.body.focus({ preventScroll: true });
    document.body.removeAttribute("tabindex");
    if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
    window.__app = app;
  } catch (e) {
    console.error(e);
    fatal(root, "Er ging iets mis bij het laden. Controleer je verbinding en probeer het opnieuw.");
  }
}
boot();
