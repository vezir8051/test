export default function Hero() {
  return (
    <section className="pt-32 pb-20 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
          Die moderne Alternative zu zvoove
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
          Personalvermittlung{" "}
          <span className="text-blue-600">vollautomatisiert</span>
          <br />und einfacher als je zuvor
        </h1>

        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
          RecruiterPro vereint Bewerberverwaltung, automatisiertes Matching,
          digitale Verträge und KI-Auswertungen in einer einzigen Plattform —
          ohne den Aufwand von zvoove.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <a
            href="#kontakt"
            className="bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
          >
            Kostenlose Demo starten
          </a>
          <a
            href="#features"
            className="bg-white text-gray-900 px-8 py-4 rounded-xl text-lg font-semibold border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            Mehr erfahren
          </a>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
          {[
            { value: "80%", label: "weniger manuelle Arbeit" },
            { value: "3x", label: "schnellere Vermittlung" },
            { value: "500+", label: "zufriedene Recruiter" },
            { value: "99.9%", label: "Systemverfügbarkeit" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="text-3xl font-bold text-blue-600 mb-1">{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
