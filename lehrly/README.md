# Lehrly.ch 🎓

Schweizer Lehrstellenplattform als statische, mobile-first Web-App. Verbindet
Lernende und Betriebe mit KI-Matching, Chat und automatischem Lebenslauf.

## Struktur

```
lehrly/
├── index.html          # Markup aller Screens & Modals
├── css/styles.css      # gesamtes Styling (mobile-first)
├── js/app.js           # Login-Gate, Navigation, Matching, Chat, Modals
├── server.js           # winziger Dev-Server (keine Abhängigkeiten)
└── test/
    ├── click-through.js # klickt jede Interaktion durch (jsdom)
    └── gate-edge.js     # Login-Sonderfälle (Session, Lockout, ...)
```

## Starten

```bash
npm run serve     # http://localhost:5173
# oder einfach index.html im Browser öffnen
```

## Demo-Login

| Benutzername | Passwort      |
|--------------|---------------|
| `admin`      | `Lehrly2025!` |
| `lehrly`     | `Schweiz2025` |

Zugangsdaten stehen oben in `js/app.js` (`LOGINS`). Die Session bleibt 8 h im
`localStorage`.

## Tests

```bash
npm install      # einmalig: jsdom
npm test         # 81 Checks, klickt sich durch die ganze App
```

Die Tests laden die echte `index.html` + `app.js` in jsdom, simulieren jeden
Klick (Login, Navigation, Matching, Filter, Chat, alle Modals) und schlagen bei
jedem JS-Laufzeitfehler fehl.

## Screens

- **Start** – Hero, Live-Matches, Feature-Kacheln
- **Profil** – Lernenden-Formular mit Stärken-Tags & Match-Resultaten
- **Betriebe** – Kandidatenliste mit funktionierenden Filtern
- **Chat** – Konversationsliste + WhatsApp-artige Chat-Ansicht
- **Dashboard** – Statistiken, Aktivitäten, Schnellaktionen
- **Preise** – fünf Pakete (kostenlos bis Enterprise)

## Was gegenüber dem Original gefixt wurde

- Filter-Chips bei den Kandidaten filtern jetzt wirklich (inkl. Leer-Zustand)
- „Nachricht senden" im Kandidaten-Profil öffnet den richtigen Chat
- Live-Cards auf der Startseite sind klickbar
- `localStorage`-Zugriffe sind gegen Inkognito-/Blockier-Fehler abgesichert
- Chat-Eingaben werden gegen HTML-Injection escaped
- ungültiges CSS (`scrollbar-width` ausserhalb eines Selektors) bereinigt
- `alert()`-Platzhalter durch dezente Toast-Hinweise ersetzt
