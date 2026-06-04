import Link from "next/link";

const schritte = [
  {
    nr: "1",
    titel: "Betriebe tragen sich ein",
    text: "Maler, Schreiner, Bau- und Logistikfirmen hinterlegen kostenlos, dass sie für Zeitarbeit oder Vermittlung offen sind.",
  },
  {
    nr: "2",
    titel: "Vermittler durchsuchen",
    text: "Mit dem Abo filtern Personalvermittler nach Gewerk, Region und Dringlichkeit – statt blind Hunderte Betriebe anzurufen.",
  },
  {
    nr: "3",
    titel: "Nur warme Kontakte",
    text: "Jeder Anruf trifft auf einen Betrieb, der kontaktiert werden möchte. Keine Kaltakquise, kein Klinkenputzen, keine Absagen.",
  },
];

export default function Konzept() {
  return (
    <section id="konzept" className="py-24 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
            Das Telefonbuch für Personalvermittler
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Schluss mit Kaltakquise
          </h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Ein durchsuchbares Verzeichnis aus Bau, Handwerk und Logistik – nur
            mit Betrieben, die ausdrücklich kontaktiert werden möchten.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-14">
          {schritte.map((s) => (
            <div
              key={s.nr}
              className="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm"
            >
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center mb-4">
                {s.nr}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {s.titel}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/verzeichnis"
            className="bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 text-center"
          >
            Verzeichnis durchsuchen
          </Link>
          <Link
            href="/eintragen"
            className="bg-white text-gray-900 px-8 py-4 rounded-xl text-lg font-semibold border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-center"
          >
            Firma kostenlos eintragen
          </Link>
        </div>
      </div>
    </section>
  );
}
