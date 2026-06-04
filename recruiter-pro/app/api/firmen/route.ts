import type { NextRequest } from "next/server";
import { getFirmen, addFirma } from "@/lib/store";
import { validateFirmaInput } from "@/lib/types";

// Das Verzeichnis ändert sich bei jeder Eintragung – nicht cachen.
export const dynamic = "force-dynamic";

// GET /api/firmen – liefert alle Betriebe für das Verzeichnis.
export async function GET() {
  const firmen = await getFirmen();
  return Response.json({ firmen });
}

// POST /api/firmen – trägt einen neuen Betrieb ein.
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { errors: { _form: "Ungültige Anfrage." } },
      { status: 400 },
    );
  }

  const result = validateFirmaInput(body);
  if (!result.valid) {
    return Response.json({ errors: result.errors }, { status: 400 });
  }

  const firma = await addFirma(result.value);
  return Response.json({ firma }, { status: 201 });
}
