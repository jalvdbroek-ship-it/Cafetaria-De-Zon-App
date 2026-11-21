// De Zon-server: PORT=4200 DEZON_ADMIN_PASSWORD=... node server.js  ->  http://localhost:4200/
// Zonder wachtwoord werkt de app en staat het beheer uit. Zie docs/HOSTEN.md.
import { createAppServer } from "./server/app.mjs";

const port = Number(process.env.PORT || 4200);
const host = process.env.HOST || "127.0.0.1";
const server = createAppServer();
server.listen(port, host, () => {
  console.log(`http://${host === "0.0.0.0" ? "localhost" : host}:${port}/`);
  if (!server.ctx.adminEnabled) console.log("Beheer staat uit: zet DEZON_ADMIN_PASSWORD (minimaal 10 tekens) om in te kunnen loggen.");
});
