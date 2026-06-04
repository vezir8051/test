const features = [
  {
    icon: "🤖",
    title: "KI-gestütztes Matching",
    desc: "Unsere KI gleicht Kandidatenprofile automatisch mit offenen Stellen ab und schlägt die besten Matches in Sekunden vor — kein manuelles Durchsuchen mehr.",
  },
  {
    icon: "📋",
    title: "Digitale Verträge & eSign",
    desc: "Arbeitsverträge, Überlassungsverträge und Einverständniserklärungen direkt in der Plattform erstellen, versenden und rechtssicher digital signieren.",
  },
  {
    icon: "📊",
    title: "Echtzeit-Dashboards",
    desc: "Alle KPIs auf einen Blick: Besetzungsquote, Time-to-Fill, Kandidatenpipeline und Umsatz — jederzeit aktuell und exportierbar.",
  },
  {
    icon: "📬",
    title: "Automatisierte Kommunikation",
    desc: "E-Mail- und SMS-Sequenzen für Kandidaten und Kunden automatisch auslösen — von der Eingangsbestätigung bis zur Erinnerung an Vorstellungsgespräche.",
  },
  {
    icon: "🗂️",
    title: "Zentrale Kandidatendatenbank",
    desc: "DSGVO-konformes Kandidatenmanagement mit vollständiger Dokumentenverwaltung, Qualifikationsprofilen und Aktivitätshistorie.",
  },
  {
    icon: "🔗",
    title: "Stellenbörsen-Integration",
    desc: "Stellen mit einem Klick auf Indeed, StepStone, LinkedIn und mehr veröffentlichen. Bewerbungen laufen automatisch in RecruiterPro ein.",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Alles was Personalvermittler brauchen
          </h2>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            Von der ersten Bewerbung bis zur erfolgreichen Vermittlung —
            RecruiterPro automatisiert jeden Schritt.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f) => (
            <div
              key={f.title}
              className="p-7 rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-50 transition-all group"
            >
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                {f.title}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
