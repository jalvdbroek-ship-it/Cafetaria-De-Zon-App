# Cafetaria De Zon: app (demo)

Installeerbare mobiele app (PWA) voor Cafetaria De Zon, Noordeinde 12, Zwartewaal. **Demo-modus**: er wordt niets
doorgestuurd, geplaatst of betaald. Zonder build-stap en zonder runtime-dependencies (vanilla ES-modules).

## Starten

```
PORT=4200 node server.js      # http://localhost:4200/
npm test                      # logica (node:test)
node tools/check-app.mjs      # browsercontrole (Playwright via de GG Coder-sidecar)
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
