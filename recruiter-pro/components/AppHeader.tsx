import Link from "next/link";

// Schlanker Header für die Funktionsseiten (Verzeichnis / Eintragen).
// Die Landingpage nutzt weiterhin die Navbar mit Anker-Navigation.
export default function AppHeader() {
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">RP</span>
          </div>
          <span className="font-bold text-gray-900 text-lg">RecruiterPro</span>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/verzeichnis"
            className="text-sm text-gray-600 hover:text-blue-600 transition-colors px-2 py-2"
          >
            Verzeichnis
          </Link>
          <Link
            href="/eintragen"
            className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Firma eintragen
          </Link>
        </nav>
      </div>
    </header>
  );
}
