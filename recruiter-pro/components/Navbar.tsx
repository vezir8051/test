"use client";
import { useState } from "react";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <a href="#" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">RP</span>
          </div>
          <span className="font-bold text-gray-900 text-lg">RecruiterPro</span>
        </a>

        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">Features</a>
          <a href="#vergleich" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">Vergleich</a>
          <a href="#preise" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">Preise</a>
          <a href="#kontakt" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">Kontakt</a>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <a href="#kontakt" className="text-sm text-gray-600 hover:text-gray-900">Anmelden</a>
          <a href="#kontakt" className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Demo anfragen
          </a>
        </div>

        <button onClick={() => setOpen(!open)} className="md:hidden p-2 text-gray-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {open
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 flex flex-col gap-4">
          <a href="#features" className="text-sm text-gray-700" onClick={() => setOpen(false)}>Features</a>
          <a href="#vergleich" className="text-sm text-gray-700" onClick={() => setOpen(false)}>Vergleich</a>
          <a href="#preise" className="text-sm text-gray-700" onClick={() => setOpen(false)}>Preise</a>
          <a href="#kontakt" className="text-sm text-gray-700" onClick={() => setOpen(false)}>Kontakt</a>
          <a href="#kontakt" className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg text-center" onClick={() => setOpen(false)}>
            Demo anfragen
          </a>
        </div>
      )}
    </nav>
  );
}
