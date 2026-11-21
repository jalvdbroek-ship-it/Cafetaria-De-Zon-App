# Wat werkt nu, wat is demo, wat is er nog nodig

De app draait in twee standen. Ze tonen dezelfde schermen; de app kiest zelf via `GET /api/health`.

| Stand | Wanneer | Wat er gebeurt |
| --- | --- | --- |
| **Echt (eigen server)** | `node server.js` draait en de app wordt via die server geopend | Bestellingen, accounts, punten en beheer staan op de server in `data/` |
| **Demo** | Geen server (bijvoorbeeld GitHub Pages) of `DEZON_DEMO=1` | Alles lokaal op het toestel, met label "Demo"; De Zon ontvangt niets |

## 1. Werkt echt (server draait)

| Onderdeel | Toelichting |
| --- | --- |
| Menukaart, zoeken, categorieën (incl. Menu's), opties, mandje | Prijzen in hele centen; mandje blijft op het toestel |
| Bestelling plaatsen | De server rekent prijzen zelf opnieuw uit, controleert opties, uitverkocht, openingstijd en afhaalmoment. Status: ontvangen, in bereiding, klaar, opgehaald, geannuleerd |
| Betalen | **Niet in de app.** Elke bestelling staat op "nog te betalen bij afhalen" (contant of pin) |
| Mijn De Zon | Account maken en inloggen (telefoon of e-mail plus wachtwoord), profiel, bestellingen met status, favorieten, bonnen, account verwijderen |
| Sparen | Een punt per bestede euro (instelbaar). Punten komen pas bij de status "opgehaald", één keer per bestelling. Inwisselen geeft een bon `BON-xxxxx` |
| Jackpot | Per bestelling vanaf het minimumbedrag één draai; de uitslag trekt de server (crypto-trekking). Elke draai levert een bon `JKP-xxxxx` op. **Staat op de server standaard uit** (zie `HOSTEN.md`) |
| Beheer | Overzicht (bestellingen en omzet vandaag, open bestellingen, populair, nieuwe klanten), bestellingen met status, producten (prijs, categorie, uitverkocht, foto-upload), categorieën, klanten, spaarregels, Jackpot en bonnen verzilveren, acties, openingstijden |
| Beveiliging | Beheerwachtwoord uit `DEZON_ADMIN_PASSWORD` (nooit in code), scrypt-hashes, httpOnly-cookies, beperking op inloggen, uploadcontrole op bytes, grootte en pad |
| Altijd | Openingstijden en "nu open" (Nederlandse tijd), afhaalmomenten, bellen en route, offline lezen (service worker), installeren op het beginscherm |

## 2. Demo (zonder server)

| Onderdeel | Wat er echt gebeurt |
| --- | --- |
| Bestelling | `DEMO-xxxx`, alleen op dit toestel. **De Zon ontvangt niets** |
| Account, punten, bonnen | Lokaal, niet fraudebestendig; bonnen zijn niet geldig |
| Jackpot | Zelfde rad, uitslag lokaal en "niet bindend" |
| Beheer | Demo-pincode uit `config/app.json` (geen beveiliging), wijzigingen blijven op het toestel. Export en import als JSON. Foto's uploaden kan niet |

## 3. Nog nodig (niet gebouwd, niet nagebootst)

| Onderdeel | Wat er voor nodig is |
| --- | --- |
| Echt draaien | Een host met Node 20+ en HTTPS (`HOSTEN.md`). GitHub Pages kan de server niet draaien |
| Betalen (iDEAL, pin) | Betaalprovider, contract, webhook. De `payments`-plek is voorbereid in de bestelling (`betaling.methode/status`) |
| Melding in de keuken | Nu alleen de beheerpagina (ververst elke 15 seconden). Geluid, printer of e-mail zijn niet gebouwd |
| E-mail en wachtwoord vergeten | Mailverzending (SMTP of een dienst); er is geen e-mailverificatie |
| Beheer met MFA en meerdere rollen | Nu één beheerwachtwoord |
| Back-ups en herstel | Kopieer de map `data/` (zie `HOSTEN.md`) |
| Juridisch | Privacyverklaring laten controleren (AVG), Jackpot toetsen aan de kansspelregels, algemene voorwaarden |
| Pushmeldingen, App Store, Google Play | Zie `PUBLICEREN.md` |

## Wat is voorbeeld, niet van De Zon

Producten, omschrijvingen, prijzen, optiegroepen, de Menu's, spaarregels, beloningen, Jackpot-prijzen en -kansen, acties en alle foto's.
Bevestigd zijn alleen: adres, telefoon, e-mail, betaalwijzen (contant en pin), openingstijden en de categorieën.
Een product telt als "bevestigd" zodra de eigenaar dat in het beheer aanzet; dan verdwijnt het voorbeeldlabel.
