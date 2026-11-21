// Foto's voor producten: alleen webp, jpg en png, maximaal 2 MB, type uit de bytes (niet uit naam of header), eigen bestandsnaam.
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { HttpError } from "./http.mjs";

export const MAX_UPLOAD = 2 * 1024 * 1024;
export const UPLOAD_NAME = /^[a-f0-9]{32}\.(webp|jpg|png)$/;
export const MIME = { webp: "image/webp", jpg: "image/jpeg", png: "image/png" };

export function detectImage(buf) {
  if (buf.length < 12) return null;
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.toString("latin1", 0, 4) === "RIFF" && buf.toString("latin1", 8, 12) === "WEBP") return "webp";
  return null;
}

export function saveUpload(dir, buf) {
  if (!buf.length) throw new HttpError(422, "Het bestand is leeg.");
  if (buf.length > MAX_UPLOAD) throw new HttpError(413, "De foto is groter dan 2 MB.");
  const ext = detectImage(buf);
  if (!ext) throw new HttpError(415, "Alleen webp, jpg en png zijn toegestaan.");
  mkdirSync(dir, { recursive: true });
  const name = `${randomBytes(16).toString("hex")}.${ext}`;
  writeFileSync(join(dir, name), buf, { flag: "wx", mode: 0o644 });
  return { name, url: `uploads/${name}`, type: MIME[ext] };
}

// Geeft het pad van een bestaand upload-bestand terug, of null. Alleen de eigen naamvorm is toegestaan: geen mappen, geen "..".
export function uploadPath(dir, name) {
  if (!UPLOAD_NAME.test(name)) return null;
  const base = resolve(dir), file = resolve(base, name);
  return file.startsWith(base + sep) ? file : null;
}
