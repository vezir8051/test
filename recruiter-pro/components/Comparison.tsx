const rows = [
  { feature: "Automatisches KI-Matching", us: true, them: false },
  { feature: "Moderne, intuitive Oberfläche", us: true, them: false },
  { feature: "Digitale Signatur integriert", us: true, them: false },
  { feature: "Stellenbörsen-Integration (1-Klick)", us: true, them: false },
  { feature: "Echtzeit-Analytics & Reporting", us: true, them: true },
  { feature: "Automatisierte E-Mail/SMS-Sequenzen", us: true, them: false },
  { feature: "DSGVO-konform", us: true, them: true },
  { feature: "API & Drittanbieter-Integrationen", us: true, them: true },
  { feature: "Onboarding in unter 1 Stunde", us: true, them: false },
  { feature: "Faire, transparente Preise", us: true, them: false },
];

export default function Comparison() {
  return (
    <section id="vergleich" className="py-24 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            RecruiterPro vs. zvoove
          </h2>
          <p className="text-lg text-gray-500">
            Warum immer mehr Recruiter wechseln
          </p>
        </div>

        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
          <div className="grid grid-cols-3 bg-gray-900 text-white">
            <div className="p-4 text-sm font-medium">Feature</div>
            <div className="p-4 text-sm font-semibold text-blue-400 text-center">RecruiterPro</div>
            <div className="p-4 text-sm font-medium text-gray-400 text-center">zvoove</div>
          </div>

          {rows.map((row, i) => (
            <div
              key={row.feature}
              className={`grid grid-cols-3 border-t border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
            >
              <div className="p-4 text-sm text-gray-700">{row.feature}</div>
              <div className="p-4 text-center">
                {row.us
                  ? <span className="inline-flex items-center justify-center w-6 h-6 bg-green-100 text-green-600 rounded-full text-xs font-bold">✓</span>
                  : <span className="inline-flex items-center justify-center w-6 h-6 bg-red-100 text-red-400 rounded-full text-xs font-bold">✕</span>}
              </div>
              <div className="p-4 text-center">
                {row.them
                  ? <span className="inline-flex items-center justify-center w-6 h-6 bg-green-100 text-green-600 rounded-full text-xs font-bold">✓</span>
                  : <span className="inline-flex items-center justify-center w-6 h-6 bg-red-100 text-red-400 rounded-full text-xs font-bold">✕</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
