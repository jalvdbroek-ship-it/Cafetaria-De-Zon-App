# Wat werkt nu, wat is demo, wat heeft een koppeling nodig

De app kent drie lagen. Elke laag heeft een eigen label in de app, zodat niemand een demo voor echt aanziet.

## 1. Werkt echt (geen label)

| Onderdeel | Toelichting |
| --- | --- |
| Menukaart bladeren, zoeken, categorieen | Zoeken negeert hoofdletters en accenten |
| Productopties, aantallen, mandje, totaal | Bedragen in hele centen; bewaard op het toestel |
| Openingstijden en "nu open" | Nederlandse tijd, ook zomer- en wintertijd en sluiting na middernacht |
| Afhaalmomenten | Kwartieren binnen openingstijden, voorbereidingstijd instelbaar |
| Bellen, route, mailen | Links naar je belapp, Google Maps en mailapp |
| Favorieten en instellingen | Alleen op dit toestel |
| Offline lezen | Na het eerste bezoek werkt de app zonder verbinding (service worker) |
| Installeren op het beginscherm | Manifest en iconen aanwezig; zie `PUBLICEREN.md` |

## 2. Demo (label "Demo")

| Onderdeel | Wat er echt gebeurt |
| --- | --- |
| Bestelling plaatsen | De knop zegt "Demo-bestelling opslaan". Er wordt alleen een bestelling met nummer `DEMO-xxxx` op dit toestel bewaard. **De Zon ontvangt niets.** Elk bestelscherm toont een blauwe demobanner |
| Spaarpunten | Per bestede euro een punt (voorbeeldregel). Staan alleen op dit toestel, dus niet fraudebestendig |
| Klantenkaart | De "QR" is een decoratieve code, geen echte QR |
| Beloningen en bonnen | Een bon `BON-xxxx` is niet geldig bij De Zon |
| Acties | Voorbeeldteksten, beheerbaar in het demo-beheer |
| Account | Een lokaal profiel, geen inlog |
| Beheerpaneel (`#/beheer`) | Demo-pincode (staat in `config/app.json`, dus geen beveiliging). Wijzigingen blijven op dit toestel. Export en import als JSON |

## 3. Koppeling nodig (label "Koppeling nodig", niet nagebootst)

| Onderdeel | Wat er voor nodig is |
| --- | --- |
| Echte bestellingen bij De Zon | Een server of bestelplatform, en een manier om bestellingen bij de kassa te laten aankomen (zie `API-CONTRACT.md`) |
| Betalen (iDEAL, pin) | Betaalprovider, contract en webhook |
| Accounts en inloggen | Server met e-mailverificatie of een inlogdienst |
| Centrale spaarpunten | Database en herkenning aan de kassa |
| Beheer met echte opslag en beveiliging | Zie `BEHEER-UITBREIDING.md` |
| Pushmeldingen | Pushdienst en toestemming |
| App Store en Google Play | Zie `PUBLICEREN.md` |

## Wat is voorbeeld, niet van De Zon

Alle producten, omschrijvingen, prijzen, optiegroepen, de spaarregels, de beloningen, de acties en de 11 foto's.
Bevestigd zijn alleen: adres, telefoon, e-mail, betaalwijzen (contant en pin), openingstijden en de categorieen.
Een product wordt "bevestigd" via het beheer of via `bevestigd: true` in `src/data/menu.json`.
