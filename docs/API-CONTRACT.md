# API-contract voor een echte koppeling

De app praat nu met `LocalDemoSource` (`src/lib/datasource.mjs`). Voor een echte koppeling schrijf je een
`HttpSource` met **dezelfde methoden**; de schermen blijven ongewijzigd. Dit contract is een voorstel, geen bestaande
dienst. Geld is altijd in hele centen (integer). Tijden zijn ISO 8601 (UTC) met `Europe/Amsterdam` voor weergave.

## Methoden en endpoints

| DataSource-methode | Endpoint | Opmerking |
| --- | --- | --- |
| `getMenu()` | `GET /api/menu` | Categorieen, producten, optiegroepen. Cache-vriendelijk |
| `getPromos()` | `GET /api/promos` | Alleen actieve acties |
| `getConfig()`, `getSite()` | `GET /api/config` | Openingstijden, afhaalinstellingen, spaarregels |
| `placeOrder(order)` | `POST /api/orders` | Server **herberekent** prijzen; de client mag niets bepalen. Antwoord 201 met bestelling; 409 bij uitverkocht; 422 bij ongeldige velden |
| `listOrders()` | `GET /api/me/orders` | Alleen eigen bestellingen |
| `getLoyalty()` | `GET /api/me/loyalty` | Saldo en regels, op de server berekend |
| `redeem(rewardId)` | `POST /api/me/loyalty/redeem` | Server controleert saldo; geeft eenmalige bon |
| `getAccount()`, `saveAccount()` | `GET`/`PUT /api/me` | Profiel |
| `toggleFavorite(id)` | `PUT`/`DELETE /api/me/favorites/{productId}` | |
| beheer | zie `BEHEER-UITBREIDING.md` | Aparte rol en route-prefix `/api/admin` |

## Datamodel

```
Product      { id, categorie, naam, omschrijving, prijs (centen), opties[groupId], uitverkocht, uitgelicht, bevestigd }
Optiegroep   { id, naam, type: "single"|"multi", verplicht, max?, opties: [{ id, naam, prijs (centen) }] }
Bestelling   { id, status: "ontvangen"|"in bereiding"|"klaar"|"opgehaald"|"geannuleerd", createdAt,
               regels: [{ productId, naam, qty, selection: { groupId: [optionId] }, unit, total }], total,
               klant: { naam, telefoon, email?, opmerking? }, afhalen: { asap | at }, betaling: { methode, status } }
Klant        { id, naam, telefoon, email, kaartnummer, aangemaakt }
Actie        { id, titel, tekst, vanaf?, tot?, actief, knop? }
Spaarregel   { pointsPerEuro, rewards: [{ id, naam, punten }] }
Spaarmutatie { id, klantId, type: "earn"|"redeem", points, ref, createdAt }   // append-only grootboek
```

## Authenticatie en veiligheid

- Klanten: sessiecookie (`httpOnly`, `Secure`, `SameSite=Lax`) of een OIDC-inlog; **geen token in localStorage**.
- Beheer: aparte rol met MFA; nooit een pincode in een clientbestand.
- Bestelling plaatsen werkt ook als gast (naam en telefoon), met rate limiting en een eenvoudige bot-controle.
- Alle invoer opnieuw valideren op de server (de client-validatie in `validate.mjs` is alleen gebruiksgemak).
- CORS alleen voor de eigen oorsprong. Geen sleutels in code; geheimen in omgevingsvariabelen van de server.
- Bestelstatus via polling of server-sent events; pushmeldingen alleen na expliciete toestemming.
- Spaarpunten alleen op de server schrijven (grootboek), nooit door de client.

## Overstappen

1. Implementeer `HttpSource` met dezelfde methoden als `LocalDemoSource`.
2. Maak in `src/app.js` de bron te kiezen (nu wordt `LocalDemoSource` direct aangemaakt).
3. Haal de demo-aanduidingen pas weg als bestellingen echt bij De Zon aankomen: de strook `.demo-strip` in `index.html`,
   `demoBanner` (`src/components/order.js`), de labels `pill demo` en de knoptekst "Demo-bestelling opslaan".
   De vlag `demo` in `config/app.json` stuurt dit nu nog niet aan.
