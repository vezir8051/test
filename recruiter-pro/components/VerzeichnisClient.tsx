"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BRANCHEN,
  BRANCHE_BY_ID,
  DRINGLICHKEITEN,
  DRINGLICHKEIT_BY_ID,
  KOOPERATIONEN,
  KOOPERATION_BY_ID,
  type Firma,
} from "@/lib/types";

const dringlichkeitStyle: Record<string, string> = {
  sofort: "bg-red-100 text-red-700",
  kurzfristig: "bg-amber-100 text-amber-700",
  saisonal: "bg-sky-100 text-sky-700",
  bedarf: "bg-gray-100 text-gray-600",
};

export default function VerzeichnisClient() {
  const [firmen, setFirmen] = useState<Firma[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [suche, setSuche] = useState("");
  const [gewerke, setGewerke] = useState<string[]>([]);
  const [kooperation, setKooperation] = useState("");
  const [dringlichkeit, setDringlichkeit] = useState("");

  useEffect(() => {
    let aktiv = true;
    fetch("/api/firmen")
      .then((res) => {
        if (!res.ok) throw new Error("Fehler beim Laden");
        return res.json();
      })
      .then((data) => {
        if (aktiv) setFirmen(data.firmen ?? []);
      })
      .catch(() => {
        if (aktiv) setError(true);
      })
      .finally(() => {
        if (aktiv) setLoading(false);
      });
    return () => {
      aktiv = false;
    };
  }, []);

  function toggleGewerk(id: string) {
    setGewerke((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    );
  }

  const gefiltert = useMemo(() => {
    const q = suche.trim().toLowerCase();
    return firmen.filter((f) => {
      if (gewerke.length > 0 && !gewerke.includes(f.gewerk)) return false;
      if (kooperation && f.kooperation !== kooperation) return false;
      if (dringlichkeit && f.dringlichkeit !== dringlichkeit) return false;
      if (q) {
        const haystack =
          `${f.firmenname} ${f.ort} ${f.plz} ${f.ansprechpartner}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [firmen, suche, gewerke, kooperation, dringlichkeit]);

  const hatFilter =
    suche.trim() !== "" ||
    gewerke.length > 0 ||
    kooperation !== "" ||
    dringlichkeit !== "";

  function reset() {
    setSuche("");
    setGewerke([]);
    setKooperation("");
    setDringlichkeit("");
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
          Firmenverzeichnis
        </h1>
        <p className="text-gray-500">
          Betriebe aus Bau, Handwerk und Logistik, die ausdrücklich von
          Personalvermittlern kontaktiert werden möchten. Filtern, anrufen,
          vermitteln – ohne Kaltakquise.
        </p>
      </div>

      {/* Filterleiste */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 mb-8">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Suche (Firma, Ort, PLZ)
            </label>
            <input
              type="text"
              value={suche}
              onChange={(e) => setSuche(e.target.value)}
              placeholder="z. B. Maler, Berlin, 80331 …"
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Kooperation
            </label>
            <select
              value={kooperation}
              onChange={(e) => setKooperation(e.target.value)}
              className="w-full lg:w-56 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Alle</option>
              {KOOPERATIONEN.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Dringlichkeit
            </label>
            <select
              value={dringlichkeit}
              onChange={(e) => setDringlichkeit(e.target.value)}
              className="w-full lg:w-48 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Alle</option>
              {DRINGLICHKEITEN.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Gewerk-Chips */}
        <div className="mt-4 flex flex-wrap gap-2">
          {BRANCHEN.map((b) => {
            const aktiv = gewerke.includes(b.id);
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => toggleGewerk(b.id)}
                className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                  aktiv
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "bg-white border-gray-200 text-gray-600 hover:border-blue-300"
                }`}
              >
                <span className="mr-1">{b.icon}</span>
                {b.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Ergebnis-Kopfzeile */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {loading
            ? "Lädt …"
            : `${gefiltert.length} ${
                gefiltert.length === 1 ? "Betrieb" : "Betriebe"
              } gefunden`}
        </p>
        {hatFilter && (
          <button
            onClick={reset}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Filter zurücksetzen
          </button>
        )}
      </div>

      {/* Inhalte */}
      {error ? (
        <div className="bg-red-50 border border-red-100 text-red-700 rounded-2xl p-8 text-center">
          Das Verzeichnis konnte nicht geladen werden. Bitte später erneut
          versuchen.
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-48 rounded-2xl border border-gray-100 bg-gray-50 animate-pulse"
            />
          ))}
        </div>
      ) : gefiltert.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
          <div className="text-4xl mb-3">🔍</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Keine Treffer
          </h3>
          <p className="text-gray-500 text-sm">
            Für diese Filterkombination gibt es aktuell keine Einträge.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {gefiltert.map((f) => (
            <FirmaCard key={f.id} firma={f} />
          ))}
        </div>
      )}

      <div className="mt-12 bg-blue-50 border border-blue-100 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-gray-900">
            Ihr Betrieb fehlt im Verzeichnis?
          </p>
          <p className="text-sm text-gray-600">
            Kostenlos eintragen und von Personalvermittlern gefunden werden.
          </p>
        </div>
        <Link
          href="/eintragen"
          className="bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
        >
          Firma eintragen
        </Link>
      </div>
    </div>
  );
}

function FirmaCard({ firma }: { firma: Firma }) {
  const branche = BRANCHE_BY_ID[firma.gewerk];
  const koop = KOOPERATION_BY_ID[firma.kooperation];
  const dring = DRINGLICHKEIT_BY_ID[firma.dringlichkeit];
  const telHref = `tel:${firma.telefon.replace(/[^0-9+]/g, "")}`;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 leading-tight">
            {firma.firmenname}
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {branche ? (
              <span className="mr-1">{branche.icon}</span>
            ) : null}
            {branche?.label ?? firma.gewerk} · {firma.plz} {firma.ort}
          </p>
        </div>
        {dring && (
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${
              dringlichkeitStyle[firma.dringlichkeit] ?? "bg-gray-100 text-gray-600"
            }`}
          >
            {dring.label}
          </span>
        )}
      </div>

      {firma.gesucht.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {firma.gesucht.map((g) => (
            <span
              key={g}
              className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md"
            >
              {g}
            </span>
          ))}
        </div>
      )}

      {firma.notiz && (
        <p className="text-sm text-gray-600 mb-4 leading-relaxed">{firma.notiz}</p>
      )}

      <div className="mt-auto pt-4 border-t border-gray-100 space-y-2 text-sm">
        <div className="flex items-center justify-between text-gray-500">
          <span>{firma.ansprechpartner}</span>
          {koop && <span className="text-xs text-gray-400">{koop.label}</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={telHref}
            className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            📞 {firma.telefon}
          </a>
          {firma.email && (
            <a
              href={`mailto:${firma.email}`}
              className="inline-flex items-center gap-1.5 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:border-blue-300 hover:text-blue-600 transition-colors"
            >
              ✉️ E-Mail
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
