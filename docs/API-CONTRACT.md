# API

De server (`server/`) implementeert dit contract; `src/lib/http-source.mjs` is de client. Geld is altijd in hele centen. Tijden zijn ISO 8601 (UTC).
Alle antwoorden zijn JSON; fouten hebben de vorm `{ "error": "...", "fields": { veld: "melding" } }`. Wijzigende verzoeken (alles behalve GET) moeten
de header `X-Dezon: 1` en `Content-Type: application/json` hebben, en een eventuele `Origin` moet de eigen host zijn.

## Openbaar

| Methode en pad | Doel |
| --- | --- |
| `GET /api/health` | `{ ok, mode: "live", adminEnabled }`; de app kiest hiermee de stand |
| `GET /api/menu`, `/api/promos`, `/api/config` | Menu, actieve acties, tijden en regels (Jackpot met kansen in procenten, zonder gewichten) |
| `POST /api/orders` | Bestelling plaatsen. De server herberekent alles. 201 `{ order, token }`; 409 niet beschikbaar; 422 ongeldig; 429 te vaak |
| `GET /api/orders/{id}` | Header `X-Order-Token` (of inlog) nodig |
| `POST /api/orders/{id}/spin` | Jackpot-draai, eenmalig per bestelling; herhaling geeft dezelfde uitslag |

## Klant (cookie `dezon_sid`, httpOnly, SameSite=Lax)

`POST /api/auth/register` (naam, telefoon, e-mail?, wachtwoord, akkoord), `POST /api/auth/login`, `POST /api/auth/logout`,
`GET|PUT|DELETE /api/me` (verwijderen vraagt het wachtwoord), `GET /api/me/orders`, `GET /api/me/loyalty`, `POST /api/me/loyalty/redeem`,
`GET /api/me/favorites`, `PUT|DELETE /api/me/favorites/{productId}`.

## Beheer (cookie `dezon_admin`, 8 uur)

`POST /api/admin/login|logout`, `GET /api/admin/session|stats|orders|customers|vouchers|jackpot`, `PUT /api/admin/orders/{id}` (status),
`PUT /api/admin/vouchers/{code}`, `PUT /api/admin/menu|promos|site|config`, `POST /api/admin/upload` (`image/webp|jpeg|png`, max 2 MB, geeft `{ url }`).

## Gegevens (in `data/`)

`menu`, `promos`, `config` (pickup, loyalty, jackpot), `site` (uren), `orders`, `customers`, `ledger` (append-only punten per klant), `vouchers`, `spins`, `sessions` (alleen hashes), `uploads/`.

## Veiligheid in het kort

Prijzen en punten worden alleen op de server bepaald. Wachtwoorden: scrypt. Sleuteltjes en sessies: alleen hashes op schijf. Inloggen en bestellen hebben een
beperking per IP; beheer 5 pogingen per 15 minuten. Uploads: type uit de bytes, eigen bestandsnaam, strikt pad. Statische bestanden buiten de app (`server/`, `data/`, `tests/`, `docs/`) zijn niet bereikbaar.
