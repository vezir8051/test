"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BETRIEBSGROESSEN,
  BRANCHEN,
  DRINGLICHKEITEN,
  KOOPERATIONEN,
  QUALIFIKATIONEN,
} from "@/lib/types";

type FormState = {
  firmenname: string;
  gewerk: string;
  ansprechpartner: string;
  telefon: string;
  email: string;
  plz: string;
  ort: string;
  betriebsgroesse: string;
  gesucht: string[];
  kooperation: string;
  dringlichkeit: string;
  notiz: string;
  einwilligung: boolean;
};

const initialState: FormState = {
  firmenname: "",
  gewerk: "",
  ansprechpartner: "",
  telefon: "",
  email: "",
  plz: "",
  ort: "",
  betriebsgroesse: BETRIEBSGROESSEN[0],
  gesucht: [],
  kooperation: "beides",
  dringlichkeit: "bedarf",
  notiz: "",
  einwilligung: false,
};

const inputClass =
  "w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function EintragenClient() {
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key as string]) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  }

  function toggleGesucht(q: string) {
    setForm((prev) => ({
      ...prev,
      gesucht: prev.gesucht.includes(q)
        ? prev.gesucht.filter((g) => g !== q)
        : [...prev.gesucht, q],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    try {
      const res = await fetch("/api/firmen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.status === 201) {
        setSent(true);
        return;
      }
      const data = await res.json().catch(() => ({}));
      setErrors(data.errors ?? { _form: "Eintrag fehlgeschlagen." });
    } catch {
      setErrors({ _form: "Netzwerkfehler. Bitte später erneut versuchen." });
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-10 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Eintrag eingegangen!
          </h1>
          <p className="text-gray-500 mb-2">
            <strong>{form.firmenname}</strong> wurde aufgenommen. Zur Bestätigung
            (Double-Opt-in) erhalten Betriebe in der Live-Version eine E-Mail –
            erst danach wird der Eintrag für Vermittler sichtbar.
          </p>
          <p className="text-gray-500 mb-8 text-sm">
            Sie können sich jederzeit wieder austragen lassen.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/verzeichnis"
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              Zum Verzeichnis
            </Link>
            <button
              onClick={() => {
                setForm(initialState);
                setSent(false);
              }}
              className="border border-gray-200 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:border-blue-300 hover:text-blue-600 transition-colors"
            >
              Weiteren Betrieb eintragen
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
          Firma kostenlos eintragen
        </h1>
        <p className="text-gray-500">
          Tragen Sie Ihren Betrieb ein, wenn Sie offen dafür sind, von
          Personalvermittlern und Zeitarbeitsfirmen kontaktiert zu werden – so
          erreichen Sie nur passende Angebote, ohne ständige Kaltakquise.
        </p>
      </div>

      {errors._form && (
        <div className="mb-6 bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 text-sm">
          {errors._form}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6"
      >
        <Field label="Firmenname *" error={errors.firmenname}>
          <input
            type="text"
            value={form.firmenname}
            onChange={(e) => update("firmenname", e.target.value)}
            placeholder="Mustermann Bau GmbH"
            className={inputClass}
          />
        </Field>

        <Field label="Gewerk *" error={errors.gewerk}>
          <select
            value={form.gewerk}
            onChange={(e) => update("gewerk", e.target.value)}
            className={`${inputClass} bg-white`}
          >
            <option value="">Bitte wählen …</option>
            {BRANCHEN.map((b) => (
              <option key={b.id} value={b.id}>
                {b.icon} {b.label}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Ansprechpartner *" error={errors.ansprechpartner}>
            <input
              type="text"
              value={form.ansprechpartner}
              onChange={(e) => update("ansprechpartner", e.target.value)}
              placeholder="Max Mustermann"
              className={inputClass}
            />
          </Field>
          <Field label="Telefon *" error={errors.telefon}>
            <input
              type="tel"
              value={form.telefon}
              onChange={(e) => update("telefon", e.target.value)}
              placeholder="030 1234567"
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="E-Mail (optional)" error={errors.email}>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="info@mustermann-bau.de"
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <Field label="PLZ *" error={errors.plz}>
            <input
              type="text"
              inputMode="numeric"
              value={form.plz}
              onChange={(e) => update("plz", e.target.value)}
              placeholder="10115"
              maxLength={5}
              className={inputClass}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Ort *" error={errors.ort}>
              <input
                type="text"
                value={form.ort}
                onChange={(e) => update("ort", e.target.value)}
                placeholder="Berlin"
                className={inputClass}
              />
            </Field>
          </div>
        </div>

        <Field label="Betriebsgröße">
          <select
            value={form.betriebsgroesse}
            onChange={(e) => update("betriebsgroesse", e.target.value)}
            className={`${inputClass} bg-white`}
          >
            {BETRIEBSGROESSEN.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </Field>

        <div>
          <span className="block text-sm font-medium text-gray-700 mb-2">
            Gesuchte Mitarbeiter
          </span>
          <div className="flex flex-wrap gap-2">
            {QUALIFIKATIONEN.map((q) => {
              const aktiv = form.gesucht.includes(q);
              return (
                <button
                  key={q}
                  type="button"
                  onClick={() => toggleGesucht(q)}
                  className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                    aktiv
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-white border-gray-200 text-gray-600 hover:border-blue-300"
                  }`}
                >
                  {q}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Gewünschte Kooperation">
            <select
              value={form.kooperation}
              onChange={(e) => update("kooperation", e.target.value)}
              className={`${inputClass} bg-white`}
            >
              {KOOPERATIONEN.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Dringlichkeit">
            <select
              value={form.dringlichkeit}
              onChange={(e) => update("dringlichkeit", e.target.value)}
              className={`${inputClass} bg-white`}
            >
              {DRINGLICHKEITEN.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Notiz (optional)">
          <textarea
            rows={3}
            value={form.notiz}
            onChange={(e) => update("notiz", e.target.value)}
            placeholder="z. B. saisonaler Bedarf, bevorzugte Einsatzorte, Besonderheiten …"
            className={`${inputClass} resize-none`}
          />
        </Field>

        <div
          className={`rounded-xl border p-4 ${
            errors.einwilligung
              ? "border-red-200 bg-red-50"
              : "border-gray-200 bg-gray-50"
          }`}
        >
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.einwilligung}
              onChange={(e) => update("einwilligung", e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">
              Ich willige ein, dass die angegebenen Kontaktdaten im Verzeichnis
              gespeichert und Personalvermittlern zur Kontaktaufnahme angezeigt
              werden. Die Einwilligung ist jederzeit widerrufbar (DSGVO). *
            </span>
          </label>
          {errors.einwilligung && (
            <p className="text-sm text-red-600 mt-2 ml-7">
              {errors.einwilligung}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? "Wird eingetragen …" : "Kostenlos eintragen"}
        </button>
        <p className="text-xs text-gray-400 text-center">
          Der Eintrag ist und bleibt für Betriebe kostenlos.
        </p>
      </form>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>
      {children}
      {error && <p className="text-sm text-red-600 mt-1.5">{error}</p>}
    </div>
  );
}
