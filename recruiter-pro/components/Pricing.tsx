const plans = [
  {
    name: "Starter",
    price: "49",
    desc: "Für kleine Agenturen und Einzelvermittler",
    features: [
      "Bis zu 3 Nutzer",
      "500 Kandidatenprofile",
      "KI-Matching Basis",
      "E-Mail-Automatisierung",
      "2 Stellenbörsen-Integrationen",
      "E-Mail-Support",
    ],
    highlight: false,
    cta: "Jetzt starten",
  },
  {
    name: "Professional",
    price: "149",
    desc: "Für wachsende Personalagenturen",
    features: [
      "Bis zu 15 Nutzer",
      "Unbegrenzte Kandidatenprofile",
      "KI-Matching Premium",
      "E-Mail & SMS Automatisierung",
      "Alle Stellenbörsen-Integrationen",
      "Digitale Signatur",
      "Echtzeit-Analytics",
      "Priority-Support",
    ],
    highlight: true,
    cta: "14 Tage kostenlos testen",
  },
  {
    name: "Enterprise",
    price: "Individuell",
    desc: "Für große Unternehmen mit speziellen Anforderungen",
    features: [
      "Unbegrenzte Nutzer",
      "Dedizierter Account Manager",
      "Custom Integrationen & API",
      "SLA-Garantie",
      "On-Premise-Option",
      "Schulungen & Onboarding",
    ],
    highlight: false,
    cta: "Angebot anfragen",
  },
];

export default function Pricing() {
  return (
    <section id="preise" className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Einfache, faire Preise
          </h2>
          <p className="text-lg text-gray-500">
            Keine versteckten Kosten. Monatlich kündbar.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl p-8 border-2 flex flex-col ${
                plan.highlight
                  ? "border-blue-600 bg-blue-600 text-white shadow-2xl shadow-blue-200 scale-105"
                  : "border-gray-100 bg-white text-gray-900"
              }`}
            >
              {plan.highlight && (
                <div className="text-xs font-bold bg-white/20 text-white px-3 py-1 rounded-full w-fit mb-4">
                  BELIEBTESTER PLAN
                </div>
              )}
              <h3 className={`text-xl font-bold mb-1 ${plan.highlight ? "text-white" : "text-gray-900"}`}>
                {plan.name}
              </h3>
              <p className={`text-sm mb-6 ${plan.highlight ? "text-blue-100" : "text-gray-500"}`}>
                {plan.desc}
              </p>

              <div className="mb-8">
                {plan.price === "Individuell" ? (
                  <span className="text-3xl font-extrabold">{plan.price}</span>
                ) : (
                  <>
                    <span className="text-4xl font-extrabold">{plan.price}€</span>
                    <span className={`text-sm ml-1 ${plan.highlight ? "text-blue-200" : "text-gray-400"}`}>/Monat</span>
                  </>
                )}
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <span className={`mt-0.5 flex-shrink-0 ${plan.highlight ? "text-blue-200" : "text-blue-500"}`}>✓</span>
                    <span className={plan.highlight ? "text-blue-50" : "text-gray-600"}>{f}</span>
                  </li>
                ))}
              </ul>

              <a
                href="#kontakt"
                className={`block text-center py-3 px-6 rounded-xl font-semibold transition-colors ${
                  plan.highlight
                    ? "bg-white text-blue-600 hover:bg-blue-50"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
