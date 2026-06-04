import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { Firma, FirmaInput } from "./types";
import { SEED_FIRMEN } from "./seed";

// Einfacher dateibasierter Store für die MVP-Phase. In Produktion würde hier
// eine echte Datenbank stehen.
//
// Auf serverlosen Hostern (z. B. Vercel) ist das Projektverzeichnis
// schreibgeschützt – dort ist nur /tmp beschreibbar. Lokal wird in ./data
// gespeichert. Alle Dateizugriffe sind so abgesichert, dass das Verzeichnis
// auch ohne beschreibbares Dateisystem funktioniert (Fallback: Seed-Daten).
const DATA_DIR = process.env.VERCEL
  ? path.join("/tmp", "recruiter-pro-data")
  : path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "firmen.json");

async function readAll(): Promise<Firma[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as Firma[];
  } catch {
    // Datei fehlt oder ist beschädigt – mit den Seed-Daten starten.
  }
  return [...SEED_FIRMEN];
}

async function writeAll(firmen: Firma[]): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(firmen, null, 2), "utf-8");
  } catch {
    // Best effort: Auf einem schreibgeschützten Dateisystem (serverless)
    // lässt sich nicht persistieren – das Verzeichnis bleibt trotzdem nutzbar.
  }
}

// Liefert alle Betriebe, neueste zuerst.
export async function getFirmen(): Promise<Firma[]> {
  const firmen = await readAll();
  return firmen.sort((a, b) => b.erstelltAm.localeCompare(a.erstelltAm));
}

// Legt einen neuen Betrieb an und gibt ihn zurück.
export async function addFirma(input: FirmaInput): Promise<Firma> {
  const firmen = await readAll();
  const firma: Firma = {
    ...input,
    id: randomUUID(),
    erstelltAm: new Date().toISOString(),
  };
  firmen.push(firma);
  await writeAll(firmen);
  return firma;
}
