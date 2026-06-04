export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">RP</span>
              </div>
              <span className="font-bold text-white text-lg">RecruiterPro</span>
            </div>
            <p className="text-sm leading-relaxed max-w-xs">
              Die moderne, automatisierte Software für Personalvermittler —
              schneller, einfacher und intelligenter als die Konkurrenz.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Produkt</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#preise" className="hover:text-white transition-colors">Preise</a></li>
              <li><a href="#vergleich" className="hover:text-white transition-colors">Vergleich</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Unternehmen</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#kontakt" className="hover:text-white transition-colors">Kontakt</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Datenschutz</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Impressum</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 text-xs text-center">
          © {new Date().getFullYear()} RecruiterPro. Alle Rechte vorbehalten.
        </div>
      </div>
    </footer>
  );
}
