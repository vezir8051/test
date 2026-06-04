// Geteilte Typen und Konstanten – reines Modul ohne Server-Abhängigkeiten,
// damit es sowohl in Client- als auch in Server-Komponenten importiert werden kann.

export type Branche = {
  id: string;
  label: string;
  icon: string;
};

// Gewerke / Branchen mit Fokus auf Bau, Handwerk und Logistik.
export const BRANCHEN: Branche[] = [
  { id: "maler", label: "Maler & Lackierer", icon: "🎨" },
  { id: "schreiner", label: "Schreiner & Tischler", icon: "🪚" },
  { id: "zimmerer", label: "Zimmerer & Holzbau", icon: "🪵" },
  { id: "maurer", label: "Maurer & Hochbau", icon: "🧱" },
  { id: "elektro", label: "Elektrotechnik", icon: "⚡" },
  { id: "sanitaer", label: "Sanitär, Heizung, Klima", icon: "🔧" },
  { id: "dachdecker", label: "Dachdecker", icon: "🏠" },
  { id: "geruestbau", label: "Gerüstbau", icon: "🚧" },
  { id: "bodenleger", label: "Bodenleger & Estrich", icon: "🧱" },
  { id: "trockenbau", label: "Trockenbau", icon: "🧰" },
  { id: "metallbau", label: "Metallbau & Schweißen", icon: "🔩" },
  { id: "garten", label: "Garten- & Landschaftsbau", icon: "🌳" },
  { id: "logistik", label: "Logistik & Lager", icon: "📦" },
  { id: "reinigung", label: "Gebäudereinigung", icon: "🧽" },
];

export const BRANCHE_BY_ID: Record<string, Branche> = Object.fromEntries(
  BRANCHEN.map((b) => [b.id, b]),
);

// Gesuchte Qualifikationsstufen.
export const QUALIFIKATIONEN = [
  "Helfer",
  "Facharbeiter / Geselle",
  "Vorarbeiter",
  "Meister",
  "Azubi",
] as const;

export type Kooperation = { id: string; label: string };

// Art der gewünschten Zusammenarbeit mit dem Personalvermittler.
export const KOOPERATIONEN: Kooperation[] = [
  { id: "zeitarbeit", label: "Zeitarbeit / Arbeitnehmerüberlassung" },
  { id: "vermittlung", label: "Personalvermittlung" },
  { id: "beides", label: "Beides" },
];

export const KOOPERATION_BY_ID: Record<string, Kooperation> =
  Object.fromEntries(KOOPERATIONEN.map((k) => [k.id, k]));

export type Dringlichkeit = { id: string; label: string };

export const DRINGLICHKEITEN: Dringlichkeit[] = [
  { id: "sofort", label: "Sofort" },
  { id: "kurzfristig", label: "Kurzfristig (1–4 Wochen)" },
  { id: "saisonal", label: "Saisonal" },
  { id: "bedarf", label: "Bei Bedarf" },
];

export const DRINGLICHKEIT_BY_ID: Record<string, Dringlichkeit> =
  Object.fromEntries(DRINGLICHKEITEN.map((d) => [d.id, d]));

export const BETRIEBSGROESSEN = [
  "1–5 Mitarbeiter",
  "6–20 Mitarbeiter",
  "21–50 Mitarbeiter",
  "über 50 Mitarbeiter",
] as const;

// Ein Eintrag im Telefonbuch: ein Betrieb, der aktiv von
// Personalvermittlern / Zeitarbeitsfirmen kontaktiert werden möchte.
export type Firma = {
  id: string;
  firmenname: string;
  gewerk: string; // Branche-ID
  ansprechpartner: string;
  telefon: string;
  email: string;
  plz: string;
  ort: string;
  betriebsgroesse: string;
  gesucht: string[]; // gesuchte Qualifikationen
  kooperation: string; // Kooperation-ID
  dringlichkeit: string; // Dringlichkeit-ID
  notiz: string;
  erstelltAm: string; // ISO-Datum
};

// Felder, die beim Eintragen vom Betrieb kommen (ohne id / erstelltAm).
export type FirmaInput = Omit<Firma, "id" | "erstelltAm">;

export type ValidationResult =
  | { valid: true; value: FirmaInput }
  | { valid: false; errors: Record<string, string> };

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

// Validiert und bereinigt die Eingaben aus dem Eintragungsformular.
// Die DSGVO-Einwilligung wird separat geprüft, weil sie nicht gespeichert,
// sondern als Voraussetzung für den Eintrag verlangt wird.
export function validateFirmaInput(input: unknown): ValidationResult {
  const data = (input ?? {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};

  const firmenname = str(data.firmenname);
  if (!firmenname) errors.firmenname = "Bitte den Firmennamen angeben.";

  const gewerk = str(data.gewerk);
  if (!BRANCHE_BY_ID[gewerk]) errors.gewerk = "Bitte ein Gewerk auswählen.";

  const ansprechpartner = str(data.ansprechpartner);
  if (!ansprechpartner)
    errors.ansprechpartner = "Bitte einen Ansprechpartner angeben.";

  const telefon = str(data.telefon);
  if (!telefon) {
    errors.telefon = "Bitte eine Telefonnummer angeben.";
  } else if (!/[0-9]{4,}/.test(telefon.replace(/[\s/()+-]/g, ""))) {
    errors.telefon = "Bitte eine gültige Telefonnummer angeben.";
  }

  const email = str(data.email);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Bitte eine gültige E-Mail-Adresse angeben.";
  }

  const plz = str(data.plz);
  if (!/^[0-9]{5}$/.test(plz)) errors.plz = "Bitte eine 5-stellige PLZ angeben.";

  const ort = str(data.ort);
  if (!ort) errors.ort = "Bitte den Ort angeben.";

  const einwilligung = data.einwilligung === true;
  if (!einwilligung)
    errors.einwilligung = "Ohne Einwilligung ist kein Eintrag möglich.";

  const betriebsgroesse = str(data.betriebsgroesse);
  const kooperationRaw = str(data.kooperation);
  const kooperation = KOOPERATION_BY_ID[kooperationRaw] ? kooperationRaw : "beides";
  const dringlichkeitRaw = str(data.dringlichkeit);
  const dringlichkeit = DRINGLICHKEIT_BY_ID[dringlichkeitRaw]
    ? dringlichkeitRaw
    : "bedarf";

  const gesucht = Array.isArray(data.gesucht)
    ? data.gesucht
        .map((g) => str(g))
        .filter((g): g is string =>
          (QUALIFIKATIONEN as readonly string[]).includes(g),
        )
    : [];

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    value: {
      firmenname,
      gewerk,
      ansprechpartner,
      telefon,
      email,
      plz,
      ort,
      betriebsgroesse,
      gesucht,
      kooperation,
      dringlichkeit,
      notiz: str(data.notiz),
    },
  };
}
