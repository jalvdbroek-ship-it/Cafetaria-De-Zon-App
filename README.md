# Cafetaria De Zon: app (demo)

Installeerbare mobiele app (PWA) voor Cafetaria De Zon, Noordeinde 12, Zwartewaal. **Demo-modus**: er wordt niets
doorgestuurd, geplaatst of betaald. Zonder build-stap en zonder runtime-dependencies (vanilla ES-modules).

## Starten

```
PORT=4200 node server.js      # http://localhost:4200/
npm test                      # logica (node:test)
node tools/check-app.mjs      # browsercontrole (Playwright via de GG Coder-sidecar); --shots maakt screenshots in docs/screenshots
npm run contrast              # kleurcontrast van de tokens
node tools/meet-bundel.mjs    # bundelgrootte
```

## Mappen

| Map | Inhoud |
| --- | --- |
| `src/lib` | Pure logica: geld, mandje, spaarpunten, afhaalslots, openingstijden, datasource |
| `src/screens`, `src/components` | Schermen en herbruikbare onderdelen |
| `src/state` | Kleine store (mandje, UI) |
| `src/data` | Bevestigde sitegegevens, voorbeeldmenu, foto-info |
| `config` | `app.json` (spaarregels, afhaaltijden, demo-vlag), `promos.json` |
| `public` | Lettertype, voorbeeldfoto's, iconen |
| `docs` | Onderzoek, wat werkt nu, API-contract, publiceren |
| `tests`, `tools` | Tests en controlescripts |

Lees `docs/WERKT-NU.md` voor wat echt werkt, wat demo is en wat een koppeling nodig heeft.

## Meer

- `docs/ONDERZOEK.md` bronnen, bevestigd en voorbeeld
- `docs/WERKT-NU.md` de drie lagen
- `docs/API-CONTRACT.md` en `docs/BEHEER-UITBREIDING.md` de weg naar een echte koppeling
- `docs/PUBLICEREN.md` hosting, Capacitor, App Store en Google Play (niets gepubliceerd)
- `DESIGN.md` ontwerp en zelfbeoordeling

Demo-beheer: `#/beheer`, pincode in `config/app.json` (geen echte beveiliging).
Na het toevoegen van bestanden onder `src/`: `npm run sw-lijst` (een test bewaakt de offline-lijst).
