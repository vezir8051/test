import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { Firma, FirmaInput } from "./types";
import { SEED_FIRMEN } from "./seed";

// Einfacher dateibasierter Store für die MVP-Phase. Persistiert die Einträge
// in data/firmen.json. In Produktion würde hier eine echte Datenbank stehen.
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "firmen.json");

async function ensureFile(): Promise<void> {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(
      DATA_FILE,
      JSON.stringify(SEED_FIRMEN, null, 2),
      "utf-8",
    );
  }
}

async function readAll(): Promise<Firma[]> {
  await ensureFile();
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Firma[]) : [];
  } catch {
    // Bei beschädigter Datei auf die Seed-Daten zurückfallen.
    return [...SEED_FIRMEN];
  }
}

async function writeAll(firmen: Firma[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(firmen, null, 2), "utf-8");
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
