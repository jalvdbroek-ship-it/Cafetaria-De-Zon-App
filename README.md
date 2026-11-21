# Cafetaria De Zon: app

Installeerbare mobiele app (PWA) voor Cafetaria De Zon, Noordeinde 12, Zwartewaal. Bestellen om af te halen, sparen, Jackpot en beheer.
Zonder build-stap en zonder runtime-dependencies: vanilla ES-modules en een kleine Node-server.

De app draait in **twee standen** (de app kiest zelf):

- **Echt**, met `node server.js`: bestellingen, accounts, punten en beheer staan op de server. Betalen gebeurt bij het afhalen.
- **Demo**, zonder server (bijvoorbeeld GitHub Pages): alles lokaal op het toestel, duidelijk gelabeld. De Zon ontvangt niets. Online: https://jalvdbroek-ship-it.github.io/Cafetaria-De-Zon-App/ (beheer in de demo: `#/beheer`, pincode uit `config/app.json`).

## Starten

```
DEZON_ADMIN_PASSWORD="een-lang-wachtwoord" PORT=4200 node server.js   # http://127.0.0.1:4200/
DEZON_DEMO=1 PORT=4200 node server.js                                  # demo-stand (alleen statisch)
npm test                      # unit- en servertests (node:test)
node tools/check-app.mjs      # browsercontrole; BASE=http://localhost:4200/ (localhost, niet 127.0.0.1: de service worker eist dat)
node tools/check-live.mjs     # browsercontrole van de echte stand (start zelf een server met testgegevens)
npm run contrast              # kleurcontrast van de tokens
npm run sw-lijst              # offline-lijst bijwerken na nieuwe bestanden (een test bewaakt dit)
```

Zonder `DEZON_ADMIN_PASSWORD` werkt de app maar staat het beheer uit. Alles over echt draaien: `docs/HOSTEN.md`.

## Mappen

| Map | Inhoud |
| --- | --- |
| `server/` | Node-server: opslag (JSON in `data/`), inloggen en sessies, API, uploads |
| `src/lib` | Pure logica: geld, mandje, spaarpunten, Jackpot, statistieken, afhaalslots, openingstijden; `datasource.mjs` (demo) en `http-source.mjs` (server) met dezelfde methoden |
| `src/screens`, `src/components` | Schermen (incl. `admin/`) en herbruikbare onderdelen |
| `src/data`, `config` | Bevestigde sitegegevens, voorbeeldmenu, spaar- en Jackpot-voorbeeldregels |
| `public` | Lettertype, voorbeeldfoto's, iconen, stijlen (`design.css` is het huidige ontwerp) |
| `data/` | Wordt door de server gemaakt; bevat alle echte gegevens. Niet in git |
| `docs` | `WERKT-NU.md`, `HOSTEN.md`, `API-CONTRACT.md`, `BEHEER-UITBREIDING.md`, `PUBLICEREN.md`, `ONDERZOEK.md` |
| `tests`, `tools` | Tests en controlescripts |

Lees eerst `docs/WERKT-NU.md`: wat echt werkt, wat demo is en wat er nog nodig is.
