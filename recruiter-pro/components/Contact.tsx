"use client";
import { useState } from "react";

export default function Contact() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", company: "", message: "" });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <section id="kontakt" className="py-24 bg-gradient-to-br from-blue-600 to-indigo-700">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Demo anfragen
          </h2>
          <p className="text-blue-100 text-lg">
            Wir zeigen Ihnen RecruiterPro persönlich — kostenlos und unverbindlich.
          </p>
        </div>

        {sent ? (
          <div className="bg-white rounded-2xl p-10 text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Vielen Dank!</h3>
            <p className="text-gray-500">Wir melden uns innerhalb von 24 Stunden bei Ihnen.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 shadow-2xl space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Name *</label>
                <input
                  required
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Max Mustermann"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">E-Mail *</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="max@beispiel.de"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Unternehmen</label>
              <input
                type="text"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                placeholder="Ihre Personalagentur GmbH"
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nachricht</label>
              <textarea
                rows={4}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Was interessiert Sie besonders? Wie viele Recruiter nutzen Sie aktuell?"
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              Demo anfragen
            </button>
            <p className="text-xs text-gray-400 text-center">
              Keine Weitergabe Ihrer Daten. Wir melden uns innerhalb von 24h.
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
