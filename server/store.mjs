// JSON-bestanden in een datamap, atomisch geschreven (tmp-bestand + rename), met een cache in het geheugen.
// Eén proces tegelijk: geen locking tussen processen.
import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync } from "node:fs";
import { join } from "node:path";

const NAME = /^[a-z][a-z0-9-]{0,40}$/;
const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

export function createStore(dir) {
  mkdirSync(dir, { recursive: true });
  const cache = new Map();
  const file = (name) => {
    if (!NAME.test(name)) throw new Error(`Ongeldige bestandsnaam: ${name}`);
    return join(dir, `${name}.json`);
  };
  return {
    dir,
    read(name, fallback) {
      if (!cache.has(name)) {
        const f = file(name);
        let v;
        try { v = existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : undefined; } catch { throw new Error(`${name}.json is beschadigd; herstel het uit een back-up`); }
        cache.set(name, v);
      }
      const v = cache.get(name);
      return clone(v === undefined ? fallback : v);
    },
    has: (name) => existsSync(file(name)),
    write(name, value) {
      const f = file(name), tmp = `${f}.${process.pid}.tmp`;
      writeFileSync(tmp, JSON.stringify(value, null, 2), { mode: 0o600 });
      renameSync(tmp, f);
      cache.set(name, clone(value));
    },
    // Lees, pas aan (fn mag muteren of een nieuwe waarde teruggeven), schrijf. Synchroon: geen race tussen lezen en schrijven.
    update(name, fallback, fn) {
      const cur = this.read(name, fallback);
      const next = fn(cur) ?? cur;
      this.write(name, next);
      return next;
    },
  };
}
