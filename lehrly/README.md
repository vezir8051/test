# Lehrly.ch 🎓

Schweizer Lehrstellenplattform als statische, mobile-first Web-App. Verbindet
Lernende und Betriebe mit KI-Matching, Chat und automatischem Lebenslauf.

## Struktur

```
lehrly/
├── index.html          # Markup aller Screens & Modals
├── css/styles.css      # gesamtes Styling (mobile-first)
├── js/app.js           # Navigation, Matching, Chat, Modals
├── server.js           # winziger Dev-Server (keine Abhängigkeiten)
└── test/
    └── click-through.js # klickt jede Interaktion durch (jsdom)
```

## Starten

```bash
npm run serve     # http://localhost:5173
# oder einfach index.html im Browser öffnen
```

Die App startet **direkt** auf der Startseite – kein Login nötig.

### Agentation (visuelles Agent-Feedback)

Die Toolbar von [`agentation`](https://www.npmjs.com/package/agentation) ist eingebaut,
aber **gated**: Sie lädt nur, wenn die URL den Parameter `?annotate` enthält.

```
https://…/                 → normale Seite, keine Toolbar
https://…/?annotate        → Toolbar unten rechts: Elemente anklicken & annotieren
```

React/ReactDOM/agentation werden buildless per Import-Map vom ESM-CDN geladen
(`index.html`), der Loader steht in `js/agentation.js`. Normale Besucher sind
nicht betroffen.

## Tests

```bash
npm install      # einmalig: jsdom
npm test         # 64 Checks, klickt sich durch die ganze App
```

Die Tests laden die echte `index.html` + `app.js` in jsdom, simulieren jeden
Klick (Navigation, Matching, Filter, Chat, alle Modals) und schlagen bei
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
