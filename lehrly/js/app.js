/* ════════════════════════════════════════════════════════════════════
   Lehrly — Berufsbildungs-Register (hell, seriös-institutionell).
   Vanilla-JS-SPA: Hash-Routing, heller Top-Header mit Rollen-Umschalter
   (Für Lernende / Für Betriebe), Such-/Filter-first-Listen, zweispaltige
   Detailseiten, mehrstufige Formulare, Chat, Dashboard, Preise, CV.
   Keine Rail, kein Cmd-K, keine Stack-Panes. Event-Delegation,
   localStorage try/catch, prefers-reduced-motion-Guard.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // ───────────────────────── Helpers ─────────────────────────
  var $ = function (id) { return document.getElementById(id); };
  var qs = function (s, r) { return (r || document).querySelector(s); };
  var qsa = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  var prefersReduced = (function () {
    try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch (e) { return false; }
  })();

  // localStorage mit try/catch (Origin-/Privacy-sicher)
  var store = {
    get: function (k, def) {
      try { var v = window.localStorage.getItem('lehrly:' + k); return v == null ? def : JSON.parse(v); }
      catch (e) { return def; }
    },
    set: function (k, v) {
      try { window.localStorage.setItem('lehrly:' + k, JSON.stringify(v)); } catch (e) {}
    }
  };

  // ───────────────────────── State ─────────────────────────
  var App = {
    role: store.get('role', 'lernende'),
    route: 'start',
    param: null,
    matched: store.get('matched', false),
    gemerkt: store.get('gemerkt', []),
    profile: store.get('profile', { vorname: '', nachname: '', kanton: '', beruf: '', plz: '' }),
    strengths: store.get('strengths', {}),
    schnupperErf: store.get('schnupperErf', ''),
    betrieb: store.get('betrieb', { firma: '', branche: '', ort: '' }),
    inserate: store.get('inserate', []),
    bewerbungen: store.get('bewerbungen', []),
    einladungen: store.get('einladungen', []),
    chats: {},                 // konversations-id -> [{me, text, time}]
    stellenFilters: { branche: 'all', region: 'all', typ: 'all', lehrjahr: 'all', sort: 'score', q: '', ort: '', nurGemerkt: false },
    poolFilters: { region: 'all', note: 'all', feld: 'all', q: '' },
    savedSearches: store.get('savedSearches', [])
  };
  window.App = App;

  function persist() {
    store.set('role', App.role);
    store.set('matched', App.matched);
    store.set('gemerkt', App.gemerkt);
    store.set('profile', App.profile);
    store.set('strengths', App.strengths);
    store.set('schnupperErf', App.schnupperErf);
    store.set('betrieb', App.betrieb);
    store.set('inserate', App.inserate);
    store.set('bewerbungen', App.bewerbungen);
    store.set('einladungen', App.einladungen);
    store.set('savedSearches', App.savedSearches);
  }

  // ───────────────────────── Daten ─────────────────────────
  var STELLEN = [
    { id: 'zkb-kauffrau', beruf: 'Kauffrau/Kaufmann EFZ', betrieb: 'Zürcher Kantonalbank', betriebKurz: 'ZKB', ort: 'Zürich', region: 'zurich', branche: 'banken', typ: 'efz', pensum: '100%', beginn: 'August 2026', lehrjahr: '2026', score: 92,
      grund: 'passt zu Berufswunsch, Region Zürich (Pendeldistanz kurz) und deinem Anforderungsprofil',
      beschreibung: 'Eine kaufmännische Grundbildung im Bankumfeld mit Einblick in Beratung, Zahlungsverkehr und Backoffice. Du arbeitest in einem strukturierten Lehrbetrieb mit klarer Begleitung.',
      anforderungen: ['Abgeschlossene Sekundarschule (Niveau A/E)', 'Freude an Kontakt mit Menschen', 'Sorgfältige, zuverlässige Arbeitsweise', 'Gute Deutsch- und Mathematik-Noten'],
      bietet: ['Strukturierte Ausbildung mit Praxisbegleitung', 'Überbetriebliche Kurse', 'Übernahmechancen nach dem Abschluss'], loehne: [800, 1000, 1200], verifiziert: true },
    { id: 'sbb-informatiker', beruf: 'Informatiker/in EFZ', betrieb: 'SBB AG', betriebKurz: 'SBB', ort: 'Bern', region: 'bern', branche: 'it', typ: 'efz', pensum: '100%', beginn: 'August 2026', lehrjahr: '2026', score: 87,
      grund: 'passt zu IT-Berufswunsch und gewählten Stärken (logisches Denken)',
      beschreibung: 'Fachrichtung Applikationsentwicklung in einem grossen Schweizer Infrastruktur-Betrieb. Du lernst moderne Entwicklung im Team und arbeitest an echten Projekten mit.',
      anforderungen: ['Logisch-analytisches Denken', 'Interesse an Technik und Programmierung', 'Gute Mathematik-Noten', 'Teamfähigkeit'],
      bietet: ['Moderne Entwicklungsumgebung', 'Mentoring durch erfahrene Fachleute', 'Jobticket / ÖV-Vergünstigung', 'Lehrabschluss mit Perspektive'], loehne: [750, 950, 1150], verifiziert: true },
    { id: 'usz-fage', beruf: 'Fachfrau/Fachmann Gesundheit EFZ', betrieb: 'UniversitätsSpital Zürich', betriebKurz: 'USZ', ort: 'Zürich', region: 'zurich', branche: 'gesundheit', typ: 'efz', pensum: '100%', beginn: 'August 2027', lehrjahr: '2027', score: 78,
      grund: 'passt zu Region Zürich und sozialem Stärkenprofil',
      beschreibung: 'Eine vielseitige Ausbildung in Pflege und Betreuung im Spitalumfeld. Du übernimmst Verantwortung und arbeitest eng mit dem Pflegeteam.',
      anforderungen: ['Einfühlungsvermögen und Belastbarkeit', 'Zuverlässigkeit', 'Bereitschaft für Schichtarbeit', 'Gute Deutschkenntnisse'],
      bietet: ['Begleitete Praxisausbildung', 'Vielseitige Einsätze', 'Interne Weiterbildungen', 'Sicherer Lehrbetrieb'], loehne: [760, 990, 1320], verifiziert: false },
    { id: 'migros-detail', beruf: 'Detailhandelsfachfrau/-mann EFZ', betrieb: 'Migros Ostschweiz', betriebKurz: 'Migros', ort: 'Winterthur', region: 'zurich', branche: 'detailhandel', typ: 'efz', pensum: '100%', beginn: 'August 2026', lehrjahr: '2026', score: 71,
      grund: 'passt zu Region und Beratungsstärke',
      beschreibung: 'Kundenberatung, Warenpräsentation und Verkauf in einer grossen Filiale. Du lernst den gesamten Detailhandels-Alltag kennen.',
      anforderungen: ['Freude am Kundenkontakt', 'Gepflegtes Auftreten', 'Flexibilität', 'Rechnerisches Verständnis'],
      bietet: ['Einblick in alle Abteilungen', 'Personalrabatt', 'Klare Lernzielkontrolle', 'Übernahme möglich'], loehne: [700, 950, 1300], verifiziert: true },
    { id: 'bosch-poly', beruf: 'Polymechaniker/in EFZ', betrieb: 'Bosch Schweiz', betriebKurz: 'Bosch', ort: 'Solothurn', region: 'bern', branche: 'technik', typ: 'efz', pensum: '100%', beginn: 'August 2027', lehrjahr: '2027', score: 66,
      grund: 'passt zu technischem Interesse',
      beschreibung: 'Präzisionsmechanik, CNC und Montage in einem industriellen Lehrbetrieb mit eigener Lehrwerkstatt.',
      anforderungen: ['Handwerkliches Geschick', 'Technisches Verständnis', 'Genauigkeit', 'Gute Mathematik-Noten'],
      bietet: ['Eigene Lehrwerkstatt', 'Moderne Maschinen', 'Strukturierte Ausbildung', 'Weiterbildungsmöglichkeiten'], loehne: [750, 1000, 1250], verifiziert: true },
    { id: 'coop-eba', beruf: 'Detailhandelsassistent/in EBA', betrieb: 'Coop Genossenschaft', betriebKurz: 'Coop', ort: 'Luzern', region: 'zentral', branche: 'detailhandel', typ: 'eba', pensum: '100%', beginn: 'August 2026', lehrjahr: '2026', score: 60,
      grund: 'passt zu EBA-Profil und praktischer Veranlagung',
      beschreibung: 'Zweijährige praxisnahe Grundbildung im Verkauf mit individueller Begleitung.',
      anforderungen: ['Freude am Verkauf', 'Zuverlässigkeit', 'Teamgeist', 'Praktische Veranlagung'],
      bietet: ['Enge Begleitung', 'Praxisnaher Unterricht', 'Anschlusslösung EFZ möglich', 'Personalrabatt'], loehne: [700, 950], verifiziert: false }
  ];

  var KANDIDATEN = [
    { id: 'k-lena', name: 'Lena M.', beruf: 'Kauffrau EFZ', berufFeld: 'Kaufmännisch / KV', region: 'zurich', ort: 'Zürich', feld: 'kv', noteAvg: 5.2, score: 91, staerken: ['Organisation', 'Kommunikation', 'Zuverlässigkeit'], freigegeben: true, zeugnisGeprueft: true,
      noten: [['Deutsch', 5.0], ['Mathematik', 5.5], ['Französisch', 4.8], ['Englisch', 5.5]] },
    { id: 'k-noah', name: 'Noah B.', beruf: 'Informatiker EFZ', berufFeld: 'Informatik / ICT', region: 'zurich', ort: 'Zürich', feld: 'informatik', noteAvg: 5.6, score: 88, staerken: ['Logik', 'Genauigkeit', 'Selbstständigkeit'], freigegeben: true, zeugnisGeprueft: true,
      noten: [['Mathematik', 6.0], ['Deutsch', 5.0], ['Physik', 5.5], ['Englisch', 5.8]] },
    { id: 'k-sara', name: 'Sara K.', beruf: 'Fachfrau Gesundheit EFZ', berufFeld: 'Gesundheit / Pflege', region: 'bern', ort: 'Bern', feld: 'gesundheit', noteAvg: 4.9, score: 74, staerken: ['Empathie', 'Belastbarkeit', 'Teamarbeit'], freigegeben: false, zeugnisGeprueft: true,
      noten: [['Deutsch', 5.0], ['Mathematik', 4.5], ['Biologie', 5.5], ['Englisch', 4.6]] },
    { id: 'k-tim', name: 'Tim R.', beruf: 'Detailhandel EFZ', berufFeld: 'Detailhandel', region: 'zurich', ort: 'Winterthur', feld: 'kv', noteAvg: 4.6, score: 67, staerken: ['Kundenkontakt', 'Flexibilität'], freigegeben: false, zeugnisGeprueft: false,
      noten: [['Deutsch', 4.5], ['Mathematik', 4.8], ['Französisch', 4.2], ['Englisch', 4.9]] }
  ];

  // Anzeigename: Klarname nur bei Freigabe, sonst Initiale + Hinweis.
  function kandName(k, anon) {
    return k.freigegeben ? k.name : k.name.charAt(0) + '. ' + (anon || '(anonym)');
  }
  // Schluessel fuer Aktionen/Dialoge: nie Klarname eines anonymen Profils.
  function kandKey(k) {
    return k.freigegeben ? k.name : k.name.charAt(0) + '. (anonymisiert)';
  }
  // Standort: exakter Ort nur bei Freigabe, sonst nur Region.
  var REGION_LABEL = { zurich: 'Region Zürich', bern: 'Region Bern', zentral: 'Zentralschweiz' };
  function kandRegion(k) {
    return k.freigegeben ? k.ort : (REGION_LABEL[k.region] || 'Region Schweiz');
  }

  var BERUFSFELDER = [
    { id: 'kv', label: 'Kaufmännisch / KV' }, { id: 'informatik', label: 'Informatik / ICT' },
    { id: 'gesundheit', label: 'Gesundheit / Pflege' }, { id: 'detailhandel', label: 'Detailhandel' },
    { id: 'technik', label: 'Technik / Mechanik' }, { id: 'bau', label: 'Bau / Gewerbe' },
    { id: 'gastro', label: 'Gastronomie / Hotellerie' }, { id: 'soziales', label: 'Soziales / Betreuung' }
  ];

  var KONVERSATIONEN = {
    lernende: [
      { id: 'c-zkb', partner: 'Zürcher Kantonalbank', kontext: 'Kauffrau EFZ', time: '10:24', preview: 'Gerne laden wir Sie zum Schnuppern ein.', msgs: [
        { me: false, text: 'Guten Tag Lena, vielen Dank für Ihre Bewerbung.', time: '10:20' },
        { me: false, text: 'Gerne laden wir Sie zum Schnuppern ein.', time: '10:24' } ] },
      { id: 'c-sbb', partner: 'SBB AG', kontext: 'Informatiker EFZ', time: 'Gestern', preview: 'Haben Sie noch Fragen zur Stelle?', msgs: [
        { me: false, text: 'Guten Tag, schön dass Sie sich interessieren.', time: 'Gestern' },
        { me: false, text: 'Haben Sie noch Fragen zur Stelle?', time: 'Gestern' } ] },
      { id: 'c-usz', partner: 'UniversitätsSpital Zürich', kontext: 'FaGe EFZ', time: 'Mo', preview: 'Ihre Bewerbung ist eingegangen.', msgs: [
        { me: false, text: 'Ihre Bewerbung ist eingegangen.', time: 'Mo' } ] }
    ],
    betrieb: [
      { id: 'b-lena', partner: 'Lena M.', kontext: 'Kauffrau EFZ', time: '09:10', preview: 'Sehr gerne, vielen Dank!', msgs: [
        { me: false, text: 'Guten Tag, vielen Dank für die Einladung!', time: '09:05' },
        { me: false, text: 'Sehr gerne, vielen Dank!', time: '09:10' } ] },
      { id: 'b-noah', partner: 'Noah B.', kontext: 'Informatiker EFZ', time: 'Gestern', preview: 'Wann darf ich vorbeikommen?', msgs: [
        { me: false, text: 'Wann darf ich vorbeikommen?', time: 'Gestern' } ] }
    ]
  };

  // Kennzahlen aus echten Datenarrays (ehrliche Trust-Zahlen statt Fantasiewerte).
  function uniqueCount(list, key) {
    var seen = {};
    list.forEach(function (x) { seen[x[key]] = true; });
    return Object.keys(seen).length;
  }
  function berufeCount() { return uniqueCount(STELLEN, 'beruf'); }
  function regionenCount() { return uniqueCount(STELLEN, 'region'); }

  // ───────────────────────── Sprache (Du/Sie) ─────────────────────────
  function lang() {
    return App.role === 'lernende'
      ? { anrede: 'du', findCta: 'Lehrstelle finden', applyCta: 'Jetzt bewerben' }
      : { anrede: 'Sie', findCta: 'Kandidaten finden', applyCta: 'Zum Schnuppern einladen' };
  }
  window.lang = lang;

  // ───────────────────────── Routen-Definition ─────────────────────────
  var NAV = {
    lernende: [
      { route: 'start', label: 'Start', icon: 'i-home' },
      { route: 'stellen', label: 'Stellen finden', icon: 'i-stelle' },
      { route: 'profil', label: 'Mein Profil', icon: 'i-profil' },
      { route: 'chat', label: 'Nachrichten', icon: 'i-chat' },
      { route: 'dashboard', label: 'Übersicht', icon: 'i-dash' }
    ],
    betrieb: [
      { route: 'start', label: 'Start', icon: 'i-home' },
      { route: 'kandidaten', label: 'Kandidaten suchen', icon: 'i-search' },
      { route: 'ausschreiben', label: 'Stelle ausschreiben', icon: 'i-tag' },
      { route: 'chat', label: 'Nachrichten', icon: 'i-chat' },
      { route: 'dashboard', label: 'Pipeline', icon: 'i-dash' }
    ]
  };

  // ───────────────────────── Toast ─────────────────────────
  var toastTimer = null;
  function toast(text, kind) {
    var el = $('toast');
    if (!el) return;
    el.textContent = text;
    el.dataset.kind = kind || 'neutral';
    el.hidden = false;
    void el.offsetWidth; // reflow für Re-Trigger
    el.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove('show');
      setTimeout(function () { el.hidden = true; }, prefersReduced ? 0 : 220);
    }, 2600);
  }
  window.toast = toast;

  // ───────────────────────── Header / Nav rendern ─────────────────────────
  function renderChrome() {
    document.body.dataset.role = App.role;
    qsa('.role-opt').forEach(function (b) {
      var on = b.dataset.role === App.role;
      b.setAttribute('aria-checked', on ? 'true' : 'false');
      b.setAttribute('tabindex', on ? '0' : '-1'); // roving tabindex
    });
    $('login-btn').textContent = App.role === 'lernende' ? 'Anmelden' : 'Betriebs-Login';

    var items = NAV[App.role];
    var navHtml = items.map(function (it) {
      var active = (it.route === App.route || (it.route === 'stellen' && App.route === 'stelle') ||
        (it.route === 'kandidaten' && App.route === 'kandidat'));
      return '<a class="nav-link' + (active ? ' active' : '') + '" data-route="' + it.route + '" href="#/' + it.route + '"' +
        (active ? ' aria-current="page"' : '') + '>' + esc(it.label) + '</a>';
    }).join('');
    $('primary-nav').innerHTML = navHtml;

    var roleSwitchMm = '<div class="mm-roleswitch" role="group" aria-label="Rolle wählen">' +
      '<button class="mm-role' + (App.role === 'lernende' ? ' active' : '') + '" data-action="switch-lernende"' +
        (App.role === 'lernende' ? ' aria-current="true"' : '') + '>Für Lernende</button>' +
      '<button class="mm-role' + (App.role === 'betrieb' ? ' active' : '') + '" data-action="switch-betrieb"' +
        (App.role === 'betrieb' ? ' aria-current="true"' : '') + '>Für Betriebe</button>' +
      '</div>';
    $('mobile-menu').innerHTML = roleSwitchMm + items.map(function (it) {
      return '<a class="mm-link" data-route="' + it.route + '" href="#/' + it.route + '">' + esc(it.label) + '</a>';
    }).join('') + '<a class="mm-link" data-route="preise" href="#/preise">Preise</a>' +
      '<button class="mm-link mm-login" data-action="login">' + (App.role === 'lernende' ? 'Anmelden' : 'Betriebs-Login') + '</button>';

    var tabItems = items.slice(0, 4);
    $('tabbar').innerHTML = tabItems.map(function (it) {
      var active = (it.route === App.route);
      return '<a class="tab' + (active ? ' active' : '') + '" data-route="' + it.route + '" href="#/' + it.route + '"' +
        (active ? ' aria-current="page"' : '') + '>' +
        '<svg class="ic" aria-hidden="true"><use href="#' + it.icon + '"></use></svg>' +
        '<span>' + esc(it.label.split(' ')[0]) + '</span></a>';
    }).join('');
  }

  function renderFooter() {
    $('footer').innerHTML =
      '<div class="footer-inner">' +
        '<div class="foot-cols">' +
          '<div class="foot-col"><h4 class="foot-h">Lehrly</h4>' +
            '<a href="#/info/ueber" data-route="info" data-id="ueber">Über uns</a>' +
            '<a href="#/info/funktioniert" data-route="info" data-id="funktioniert">So funktioniert es</a>' +
            '<a href="#/info/schulen" data-route="info" data-id="schulen">Für Schulen &amp; Berufsberatung</a></div>' +
          '<div class="foot-col"><h4 class="foot-h">Angebot</h4>' +
            '<a href="#/start" data-action="switch-lernende">Für Lernende</a>' +
            '<a href="#/start" data-action="switch-betrieb">Für Betriebe</a>' +
            '<a href="#/preise" data-route="preise">Preise</a></div>' +
          '<div class="foot-col"><h4 class="foot-h">Kontakt &amp; Support</h4>' +
            '<p class="foot-addr">Lehrly AG<br>Bahnhofstrasse 1, 8001 Zürich</p>' +
            '<p class="foot-addr">Support Mo–Fr 08–17 Uhr</p></div>' +
        '</div>' +
        '<div class="foot-trust">' +
          '<span class="trust-badge"><svg class="ic" aria-hidden="true"><use href="#i-shield"></use></svg> Daten in der Schweiz gehostet (revDSG-konform)</span>' +
        '</div>' +
        '<div class="foot-legal">' +
          '<span>© 2026 Lehrly AG</span>' +
          '<a href="#/info/impressum" data-route="info" data-id="impressum">Impressum</a>' +
          '<a href="#/info/datenschutz" data-route="info" data-id="datenschutz">Datenschutz</a>' +
          '<a href="#/info/agb" data-route="info" data-id="agb">AGB</a>' +
          '<span class="foot-ch">Made in Switzerland 🇨🇭</span>' +
        '</div>' +
      '</div>';
  }

  // ───────────────────────── Bausteine ─────────────────────────
  function breadcrumb(items) {
    return '<nav class="breadcrumb" aria-label="Brotkrumen">' + items.map(function (it, i) {
      var last = i === items.length - 1;
      if (last) return '<span aria-current="page">' + esc(it.label) + '</span>';
      var href = '#/' + it.route + (it.id ? '/' + it.id : '');
      var idAttr = it.id ? ' data-id="' + esc(String(it.id)) + '"' : '';
      return '<a href="' + href + '" data-route="' + it.route + '"' + idAttr + '>' + esc(it.label) + '</a><span class="bc-sep" aria-hidden="true">/</span>';
    }).join('') + '</nav>';
  }

  function scoreBlock(score, grund) {
    var pct = Math.max(0, Math.min(100, score));
    return '<div class="score-block">' +
      '<div class="score-head"><span class="score-label">Match</span>' +
      '<span class="score-pct tnum">' + pct + '%</span></div>' +
      '<div class="score-bar"><i class="score-fill" style="width:' + pct + '%"></i></div>' +
      '<p class="score-grund">' + esc(grund) + '</p></div>';
  }

  function verBadge(verifiziert) {
    if (verifiziert) {
      return '<span class="badge badge-ok" tabindex="0" title="Identität und Lehrberechtigung durch Lehrly geprüft">' +
        '<svg class="ic" aria-hidden="true"><use href="#i-shield"></use></svg> Betrieb verifiziert</span>';
    }
    return '<span class="badge badge-pending" tabindex="0" title="Prüfung der Angaben noch ausstehend">Prüfung ausstehend</span>';
  }

  function zeugnisStrip(noten) {
    return '<div class="zeugnis-strip">' +
      '<div class="zeugnis-skala">CH-Notenskala 1–6 · 6 = beste Note</div>' +
      noten.map(function (n) {
        var w = Math.round((n[1] / 6) * 100);
        return '<div class="zrow"><span class="zfach">' + esc(n[0]) + '</span>' +
          '<span class="ztrack"><i style="width:' + w + '%"></i></span>' +
          '<span class="znote tnum">' + n[1].toFixed(1) + '</span></div>';
      }).join('') + '</div>';
  }

  // CHF-Format mit Schweizer Tausender-Apostroph (U+2019) und Strich fuer ".–"
  function chf(n) {
    return 'CHF ' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '’') + '.–';
  }

  // Lohn-Tabelle pro Lehrjahr (Look-and-Feel analog zeugnisStrip)
  function lohnBlock(loehne) {
    if (!loehne || !loehne.length) return '';
    var max = Math.max.apply(null, loehne);
    var rows = loehne.map(function (betrag, i) {
      var w = Math.round((betrag / max) * 100);
      return '<div class="lohn-row"><span class="lohn-lj">' + (i + 1) + '. Lehrjahr</span>' +
        '<span class="lohn-track"><i style="width:' + w + '%"></i></span>' +
        '<span class="lohn-betrag tnum">' + chf(betrag) + '</span></div>';
    }).join('');
    return '<div class="lohn-table">' +
      '<div class="lohn-skala">Bruttolohn pro Monat (Richtwert, 13. Monatslohn möglich)</div>' +
      rows + '</div>';
  }

  function staerkenTags(list, active) {
    return '<div class="tag-row">' + list.map(function (s) {
      var on = active ? !!App.strengths[s] : true;
      return '<span class="tag' + (on ? ' on' : '') + (active ? ' toggle' : ' static') + '"' +
        (active ? ' data-strength="' + esc(s) + '" role="button" tabindex="0"' : '') + '>' + esc(s) + '</span>';
    }).join('') + '</div>';
  }

  function skeletonList(n) {
    var rows = '';
    for (var i = 0; i < (n || 3); i++) rows += '<div class="skel-row"><div class="skel-line w60"></div><div class="skel-line w40"></div></div>';
    return '<div class="skeleton" aria-hidden="true">' + rows + '</div>';
  }

  // Merkliste: gemerkte Lehrstellen (Yousty-Muster, hier mit Bookmark statt Herz).
  function istGemerkt(id) { return App.gemerkt.indexOf(id) !== -1; }
  function merkenButton(s) {
    var on = istGemerkt(s.id);
    return '<button class="merken-btn' + (on ? ' on' : '') + '" type="button"' +
      ' data-action="toggle-merken" data-id="' + s.id + '"' +
      ' aria-pressed="' + (on ? 'true' : 'false') + '"' +
      ' title="' + (on ? 'Aus Merkliste entfernen' : 'Zur Merkliste hinzufügen') + '"' +
      ' aria-label="' + esc(s.beruf) + ' bei ' + esc(s.betrieb) + (on ? ' aus Merkliste entfernen' : ' merken') + '">' +
      '<svg class="ic" aria-hidden="true"><use href="#i-bookmark"></use></svg>' +
      '<span class="merken-label">' + (on ? 'Gemerkt' : 'Merken') + '</span></button>';
  }

  // Merken-Buttons ausserhalb der Stellenliste (Start, Detail) in-place aktualisieren.
  function updateMerkenButtons() {
    qsa('.merken-btn').forEach(function (btn) {
      var on = istGemerkt(btn.dataset.id);
      btn.classList.toggle('on', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.setAttribute('title', on ? 'Aus Merkliste entfernen' : 'Zur Merkliste hinzufügen');
      var lbl = btn.querySelector('.merken-label');
      if (lbl) lbl.textContent = on ? 'Gemerkt' : 'Merken';
    });
  }

  // ───────────────────────── Listenkarten ─────────────────────────
  function stelleCard(s) {
    return '<div class="list-item-wrap">' +
      '<a class="list-item" data-route="stelle" data-id="' + s.id + '" href="#/stelle/' + s.id + '">' +
      '<div class="li-main">' +
        '<h3 class="li-title">' + esc(s.beruf) + '</h3>' +
        '<div class="li-sub"><span class="li-betrieb">' + esc(s.betrieb) + '</span>' +
          '<span class="li-meta"><svg class="ic" aria-hidden="true"><use href="#i-pin"></use></svg>' + esc(s.ort) + '</span></div>' +
        '<div class="li-tags">' +
          (s.verifiziert
            ? '<span class="li-badge li-badge-ok" title="Identität und Lehrberechtigung durch Lehrly geprüft"><svg class="ic" aria-hidden="true"><use href="#i-shield"></use></svg>Verifiziert</span>'
            : '<span class="li-badge li-badge-pending" title="Prüfung der Angaben noch ausstehend">Prüfung ausstehend</span>') +
          '<span class="chip-static">' + esc(s.typ.toUpperCase()) + '</span>' +
          '<span class="chip-static">' + esc(s.pensum) + '</span>' +
          '<span class="chip-static">Start ' + esc(s.beginn) + '</span></div>' +
      '</div>' +
      '<div class="li-aside">' +
        '<span class="li-scorewrap"><span class="li-scorelabel">Match</span>' +
        '<span class="li-score tnum" aria-label="Match-Score ' + s.score + ' Prozent">' + s.score + '%</span></span>' +
        '<span class="li-go">Details <svg class="ic" aria-hidden="true"><use href="#i-arrow"></use></svg></span>' +
      '</div></a>' +
      merkenButton(s) +
    '</div>';
  }

  function kandidatCard(k) {
    var name = kandName(k, '(anonym)');
    // Beruf-/Stärken-Felder bei anonymen Profilen generalisieren, kein Klarname im DOM.
    var berufZeile = k.freigegeben ? k.beruf : k.berufFeld;
    var tags = k.freigegeben
      ? '<span class="chip-static tnum">Ø ' + k.noteAvg.toFixed(1) + '</span>' +
        k.staerken.slice(0, 2).map(function (x) { return '<span class="chip-static">' + esc(x) + '</span>'; }).join('')
      : '<span class="chip-static">Noten nach Freigabe</span>' +
        '<span class="chip-static">freigabepflichtig</span>';
    return '<a class="list-item" data-route="kandidat" data-id="' + k.id + '" data-key="' + esc(kandKey(k)) + '" href="#/kandidat/' + k.id + '">' +
      '<div class="li-main">' +
        '<h3 class="li-title">' + esc(name) + '</h3>' +
        '<div class="li-sub"><span class="li-betrieb">' + esc(berufZeile) + '</span>' +
          '<span class="li-meta"><svg class="ic" aria-hidden="true"><use href="#i-pin"></use></svg>' + esc(kandRegion(k)) + '</span></div>' +
        '<div class="li-tags">' + tags + '</div>' +
      '</div>' +
      '<div class="li-aside">' +
        '<span class="li-scorewrap"><span class="li-scorelabel">Match</span>' +
        '<span class="li-score tnum" aria-label="Match-Score ' + k.score + ' Prozent">' + k.score + '%</span></span>' +
        '<span class="li-go">Profil <svg class="ic" aria-hidden="true"><use href="#i-arrow"></use></svg></span>' +
      '</div></a>';
  }

  // ═══════════════════════ SEITEN / VIEWS ═══════════════════════
  var views = {};

  views.start = function () {
    if (App.role === 'betrieb') return views.bStart();
    return '' +
      '<section class="hero"><div class="container">' +
        '<h1 class="hero-h1">Finde deine Lehrstelle.</h1>' +
        '<p class="hero-sub lead">Das Schweizer Berufsbildungs-Register. Such transparent, sieh echte Anforderungen und bewirb dich direkt.</p>' +
        searchBar('stellen') +
      '</div></section>' +
      '<section class="band"><div class="container">' +
        '<h2 class="sr-only">Kennzahlen dieser Vorschau</h2>' +
        '<div class="trust-row">' +
          '<div class="trust-stat"><span class="ts-num tnum">' + STELLEN.length + '</span><span class="ts-label">Lehrstellen in dieser Vorschau</span></div>' +
          '<div class="trust-stat"><span class="ts-num tnum">' + STELLEN.filter(function (s) { return s.verifiziert; }).length + '</span><span class="ts-label">davon verifizierte Betriebe</span></div>' +
          '<div class="trust-stat"><span class="ts-num tnum">' + berufeCount() + '</span><span class="ts-label">Berufe (EFZ/EBA)</span></div>' +
          '<div class="trust-stat"><span class="ts-num tnum">' + regionenCount() + '</span><span class="ts-label">Regionen</span></div>' +
        '</div>' +
        '<p class="trust-note muted">Demo-Vorschau mit Beispieldaten — Kennzahlen aus dem aktuellen Datensatz, keine Live-Statistik.</p>' +
        '</div></section>' +
      '<section class="band"><div class="container narrow">' +
        '<h2 class="sec-h">So funktioniert Lehrly</h2>' +
        '<ol class="steps-list">' +
          '<li><span class="step-n tnum">1</span><div><strong>Profil anlegen.</strong> Personalien, Berufswunsch aus der offiziellen EFZ/EBA-Liste, Noten und Stärken.</div></li>' +
          '<li><span class="step-n tnum">2</span><div><strong>Stellen finden.</strong> Such und filtere nach Beruf, Region und Lehrbeginn — mit ehrlichem Match-Score.</div></li>' +
          '<li><span class="step-n tnum">3</span><div><strong>Direkt bewerben.</strong> Deine Kontaktdaten siehst nur du und Betriebe, die du freigibst.</div></li>' +
          '<li><span class="step-n tnum">4</span><div><strong>In Kontakt bleiben.</strong> Nachrichten, Schnupper-Einladungen und Status an einem Ort.</div></li>' +
        '</ol></div></section>' +
      '<section class="band"><div class="container">' +
        '<h2 class="sec-h">Beliebte Berufsfelder</h2>' +
        '<div class="feld-grid">' + BERUFSFELDER.map(function (f) {
          return '<a class="feld-tile" data-route="stellen" data-feld="' + f.id + '" href="#/stellen">' + esc(f.label) + '</a>';
        }).join('') + '</div></div></section>' +
      '<section class="band"><div class="container">' +
        '<div class="sec-head"><h2 class="sec-h">Aktuelle Lehrstellen</h2>' +
          '<a class="link-arrow" data-route="stellen" href="#/stellen">Alle ansehen <svg class="ic" aria-hidden="true"><use href="#i-arrow"></use></svg></a></div>' +
        '<div class="list">' + STELLEN.slice(0, 3).map(stelleCard).join('') + '</div></div></section>' +
      '<section class="band band-cta"><div class="container">' +
        '<div class="cta-row"><div><h2 class="sec-h">Sie sind ein Betrieb?</h2>' +
          '<p class="muted">Schreiben Sie Lehrstellen aus und finden Sie passende Lernende.</p></div>' +
          '<button class="btn btn-primary" data-action="switch-betrieb">Für Betriebe</button></div></div></section>';
  };

  views.bStart = function () {
    return '' +
      '<section class="hero"><div class="container">' +
        '<h1 class="hero-h1">Finden Sie passende Lernende.</h1>' +
        '<p class="hero-sub lead">Schreiben Sie Lehrstellen nach Bildungsverordnung aus und durchsuchen Sie geprüfte Profile — anonymisiert bis zur Freigabe.</p>' +
        searchBar('kandidaten') +
      '</div></section>' +
      '<section class="band"><div class="container">' +
        '<h2 class="sr-only">Kennzahlen dieser Vorschau</h2>' +
        '<div class="trust-row">' +
          '<div class="trust-stat"><span class="ts-num tnum">' + KANDIDATEN.length + '</span><span class="ts-label">Profile in dieser Vorschau</span></div>' +
          '<div class="trust-stat"><span class="ts-num tnum">' + KANDIDATEN.filter(function (k) { return k.zeugnisGeprueft; }).length + '</span><span class="ts-label">davon mit geprüftem Zeugnis</span></div>' +
          '<div class="trust-stat"><span class="ts-num tnum">' + KANDIDATEN.filter(function (k) { return k.freigegeben; }).length + '</span><span class="ts-label">bereits freigegebene Profile</span></div>' +
        '</div>' +
        '<p class="trust-note muted">Demo-Vorschau mit Beispieldaten — Kennzahlen aus dem aktuellen Datensatz, keine Live-Statistik.</p>' +
        '</div></section>' +
      '<section class="band"><div class="container narrow">' +
        '<h2 class="sec-h">So funktioniert es für Betriebe</h2>' +
        '<ol class="steps-list">' +
          '<li><span class="step-n tnum">1</span><div><strong>Betriebsprofil anlegen.</strong> Firma, Branche, Standort.</div></li>' +
          '<li><span class="step-n tnum">2</span><div><strong>Stelle ausschreiben.</strong> Strukturierte Felder nach Bildungsverordnung.</div></li>' +
          '<li><span class="step-n tnum">3</span><div><strong>Kandidaten finden.</strong> Filtern nach Region, Jahrgang, Noten und Stärken.</div></li>' +
          '<li><span class="step-n tnum">4</span><div><strong>Einladen.</strong> Zum Schnuppern einladen oder direkt schreiben.</div></li>' +
        '</ol></div></section>' +
      '<section class="band"><div class="container">' +
        '<div class="sec-head"><h2 class="sec-h">Empfohlene Kandidaten</h2>' +
          '<a class="link-arrow" data-route="kandidaten" href="#/kandidaten">Alle ansehen <svg class="ic" aria-hidden="true"><use href="#i-arrow"></use></svg></a></div>' +
        '<div class="list">' + KANDIDATEN.slice(0, 3).map(kandidatCard).join('') + '</div></div></section>';
  };

  function searchBar(targetRoute) {
    var ph = targetRoute === 'kandidaten' ? 'Beruf oder Stärke …' : 'Beruf, z.B. Kauffrau EFZ';
    return '<form class="search-hero" data-action="hero-search" data-target="' + targetRoute + '">' +
      '<div class="sh-field"><label class="sr-only" for="sh-q">Beruf</label>' +
        '<svg class="ic" aria-hidden="true"><use href="#i-search"></use></svg>' +
        '<input id="sh-q" class="sh-input" type="text" name="q" placeholder="' + esc(ph) + '" autocomplete="off"></div>' +
      '<div class="sh-field"><label class="sr-only" for="sh-ort">Ort oder PLZ</label>' +
        '<svg class="ic" aria-hidden="true"><use href="#i-pin"></use></svg>' +
        '<input id="sh-ort" class="sh-input" type="text" name="ort" placeholder="Ort oder PLZ" autocomplete="off"></div>' +
      '<button class="btn btn-primary sh-btn" type="submit">Suchen</button>' +
    '</form>';
  }

  // — STELLEN FINDEN (feste linke Filter-Spalte + Trefferliste) —
  views.stellen = function () {
    return '<div class="container">' +
      breadcrumb([{ route: 'start', label: 'Start' }, { label: 'Stellen finden' }]) +
      '<div class="search-page">' +
        '<aside class="filter-col" aria-label="Filter">' + stellenFilterPanel() + '</aside>' +
        '<section class="results-col" aria-label="Trefferliste">' +
          '<div class="results-bar">' +
            '<div class="search-inline"><svg class="ic" aria-hidden="true"><use href="#i-search"></use></svg>' +
              '<input id="stellen-q" class="search-inline-inp" type="text" placeholder="Beruf suchen …" value="' + esc(App.stellenFilters.q) + '" data-action="stellen-q" aria-label="Beruf suchen"></div>' +
            '<div class="results-meta"><span id="stellen-count" class="results-count tnum"></span>' +
              '<label class="sort-label">Sortieren ' +
                '<select id="stellen-sort" class="sort-select" data-action="stellen-sort">' +
                  '<option value="score">Beste Übereinstimmung</option>' +
                  '<option value="beruf">Beruf A–Z</option>' +
                  '<option value="ort">Ort A–Z</option>' +
                '</select></label></div>' +
          '</div>' +
          '<div id="active-chips" class="active-chips"></div>' +
          '<div id="save-search-bar" class="save-search-bar"></div>' +
          '<div id="stellen-list" class="list">' + skeletonList(4) + '</div>' +
        '</section>' +
      '</div></div>';
  };

  // Filter-Optionen zentral (für Panel UND Chip-Labels)
  var STELLEN_FILTER_OPTS = {
    branche: [{ v: 'all', l: 'Alle Branchen' }, { v: 'banken', l: 'Banken / Finanz' }, { v: 'it', l: 'Informatik' }, { v: 'gesundheit', l: 'Gesundheit' }, { v: 'detailhandel', l: 'Detailhandel' }, { v: 'technik', l: 'Technik' }],
    region: [{ v: 'all', l: 'Ganze Schweiz' }, { v: 'zurich', l: 'Zürich' }, { v: 'bern', l: 'Bern / Mittelland' }, { v: 'zentral', l: 'Zentralschweiz' }],
    typ: [{ v: 'all', l: 'EFZ und EBA' }, { v: 'efz', l: 'Nur EFZ' }, { v: 'eba', l: 'Nur EBA' }],
    lehrjahr: [{ v: 'all', l: 'Alle Jahrgänge' }, { v: '2026', l: 'Lehrstart 2026' }, { v: '2027', l: 'Lehrstart 2027' }]
  };
  function stellenOptLabel(key, val) {
    var opts = STELLEN_FILTER_OPTS[key] || [];
    for (var i = 0; i < opts.length; i++) if (opts[i].v === val) return opts[i].l;
    return val;
  }

  function stellenFilterPanel() {
    function group(title, key, opts) {
      return '<fieldset class="filter-group"><legend class="filter-h">' + esc(title) + '</legend>' +
        opts.map(function (o) {
          var checked = App.stellenFilters[key] === o.v;
          var c = countStellenFor(key, o.v);
          var empty = (o.v !== 'all' && c === 0);
          return '<label class="filter-opt' + (empty ? ' is-empty' : '') + '"><input type="radio" name="f-' + key + '" value="' + o.v + '"' +
            (checked ? ' checked' : '') + ' data-filter-key="' + key + '">' +
            '<span class="fo-label">' + esc(o.l) + '</span>' +
            '<span class="fo-count tnum" aria-hidden="true">' + c + '</span></label>';
        }).join('') + '</fieldset>';
    }
    var nur = App.stellenFilters.nurGemerkt;
    var merkToggle = '<label class="merken-toggle' + (nur ? ' on' : '') + '">' +
      '<input type="checkbox" data-action="toggle-nur-gemerkt"' + (nur ? ' checked' : '') + '>' +
      '<svg class="ic" aria-hidden="true"><use href="#i-bookmark"></use></svg>' +
      '<span class="mt-label">Nur gemerkte</span>' +
      '<span class="mt-count tnum" aria-hidden="true">' + App.gemerkt.length + '</span></label>';
    var n = activeStellenFilterCount();
    return '<button class="filter-toggle" type="button" data-action="toggle-filter-panel" aria-expanded="false" aria-controls="filter-body">' +
        '<svg class="ic" aria-hidden="true"><use href="#i-tag"></use></svg>' +
        '<span class="ft-label">Filter</span>' +
        '<span class="ft-count tnum" aria-hidden="true">' + (n ? n : '') + '</span>' +
        '<svg class="ic ft-chevron" aria-hidden="true"><use href="#i-arrow"></use></svg></button>' +
      '<div class="filter-body" id="filter-body">' +
        '<div class="filter-head"><h3 class="filter-title">Filter</h3>' +
        '<button class="btn-text" data-action="reset-stellen-filter">Zurücksetzen</button></div>' +
        merkToggle +
        group('Branche', 'branche', STELLEN_FILTER_OPTS.branche) +
        group('Region', 'region', STELLEN_FILTER_OPTS.region) +
        group('Lehrbeginn', 'lehrjahr', STELLEN_FILTER_OPTS.lehrjahr) +
        group('Abschluss', 'typ', STELLEN_FILTER_OPTS.typ) +
      '</div>';
  }

  // Anzahl aktiver Stellen-Filter (für den Mobile-Trigger-Badge).
  function activeStellenFilterCount() {
    var f = App.stellenFilters, n = 0;
    ['branche', 'region', 'typ', 'lehrjahr'].forEach(function (k) { if (f[k] !== 'all') n++; });
    if (f.nurGemerkt) n++;
    return n;
  }

  // Gemeinsame Filterbedingung (von filteredStellen UND den Facet-Countern genutzt).
  function stellenMatch(s, f) {
    if (f.nurGemerkt && !istGemerkt(s.id)) return false;
    if (f.branche !== 'all' && s.branche !== f.branche) return false;
    if (f.region !== 'all' && s.region !== f.region) return false;
    if (f.typ !== 'all' && s.typ !== f.typ) return false;
    if (f.lehrjahr !== 'all' && s.lehrjahr !== f.lehrjahr) return false;
    if (f.q && s.beruf.toLowerCase().indexOf(f.q.toLowerCase()) === -1 &&
      s.betrieb.toLowerCase().indexOf(f.q.toLowerCase()) === -1) return false;
    if (f.ort && s.ort.toLowerCase().indexOf(f.ort.toLowerCase()) === -1) return false;
    return true;
  }

  // Treffer fuer eine Filter-Option, uebrige aktuelle Filter beibehalten (sort egal).
  function countStellenFor(key, val) {
    var f = {};
    for (var k in App.stellenFilters) if (App.stellenFilters.hasOwnProperty(k)) f[k] = App.stellenFilters[k];
    f[key] = val;
    var n = 0;
    for (var i = 0; i < STELLEN.length; i++) if (stellenMatch(STELLEN[i], f)) n++;
    return n;
  }

  function filteredStellen() {
    var f = App.stellenFilters;
    var list = STELLEN.filter(function (s) {
      return stellenMatch(s, f);
    });
    if (f.sort === 'beruf') list.sort(function (a, b) { return a.beruf.localeCompare(b.beruf); });
    else if (f.sort === 'ort') list.sort(function (a, b) { return a.ort.localeCompare(b.ort); });
    else list.sort(function (a, b) { return b.score - a.score; });
    return list;
  }

  function renderStellenResults() {
    var list = filteredStellen();
    var cnt = $('stellen-count');
    if (cnt) cnt.textContent = list.length + (list.length === 1 ? ' Lehrstelle' : ' Lehrstellen');
    var holder = $('stellen-list');
    if (!holder) return;
    if (list.length === 0) {
      var sf = App.stellenFilters;
      // Eigener, handlungsleitender Leerzustand fuer die Merkliste (0 gemerkte).
      if (sf.nurGemerkt && App.gemerkt.length === 0) {
        holder.innerHTML = '<div class="empty-state empty-merken"><h3>Noch nichts gemerkt</h3>' +
          '<p class="muted">Tippe in der Liste auf <strong>Merken</strong>, um Lehrstellen zu sammeln und später in Ruhe zu vergleichen.</p>' +
          '<button class="btn btn-primary" data-action="show-all-stellen">Alle Lehrstellen anzeigen</button></div>';
        renderStellenChips();
        renderSaveSearchBar();
        renderStellenFacets();
        return;
      }
      var lbl = stellenFilterLabel(sf);
      var head = lbl ? 'Keine Lehrstellen für ' + esc(lbl) : 'Keine Lehrstellen gefunden';
      var actions;
      if (sf.region !== 'all') {
        actions = '<button class="btn btn-primary" data-action="widen-stellen-region">Ganze Schweiz durchsuchen</button>' +
          '<button class="btn btn-outline" data-action="reset-stellen-filter">Alle Filter zurücksetzen</button>';
      } else {
        actions = '<button class="btn btn-primary" data-action="reset-stellen-filter">Filter zurücksetzen</button>';
      }
      holder.innerHTML = '<div class="empty-state"><h3>' + head + '</h3>' +
        '<p class="muted">Der Lehrstellenmarkt ist regional unterschiedlich. So findest du wieder Treffer:</p>' +
        actions + '</div>';
    } else {
      holder.innerHTML = list.map(stelleCard).join('');
    }
    renderStellenChips();
    renderSaveSearchBar();
    renderStellenFacets();
  }

  // Menschenlesbares Label aus den aktiven Filtern (geteilt: Empty-State + gespeicherte Suche).
  function stellenFilterLabel(f) {
    var parts = [];
    if (f.q) parts.push('„' + f.q + '“');
    if (f.branche !== 'all') parts.push(stellenOptLabel('branche', f.branche));
    if (f.region !== 'all') parts.push('in Region ' + stellenOptLabel('region', f.region));
    if (f.typ !== 'all') parts.push('(' + stellenOptLabel('typ', f.typ) + ')');
    if (f.lehrjahr !== 'all') parts.push('mit ' + stellenOptLabel('lehrjahr', f.lehrjahr));
    return parts.join(' ');
  }

  // Deterministische ID aus den gespeicherten Filterwerten (sort/ort/nurGemerkt zaehlen NICHT mit).
  function savedSearchFilters(f) {
    return { branche: f.branche, region: f.region, typ: f.typ, lehrjahr: f.lehrjahr, q: (f.q || '').trim() };
  }
  function savedSearchId(sf) {
    return [sf.branche, sf.region, sf.typ, sf.lehrjahr, sf.q.toLowerCase()].join('|');
  }
  function findSavedSearch(id) {
    for (var i = 0; i < App.savedSearches.length; i++) if (App.savedSearches[i].id === id) return App.savedSearches[i];
    return null;
  }

  // Schmale Aktionszeile: aktuelle Suche speichern bzw. gespeicherte Suche entfernen (nur Lernende).
  function renderSaveSearchBar() {
    var bar = $('save-search-bar');
    if (!bar) return;
    if (App.role !== 'lernende') { bar.innerHTML = ''; return; }
    var sf = savedSearchFilters(App.stellenFilters);
    var id = savedSearchId(sf);
    var saved = findSavedSearch(id);
    if (saved) {
      bar.innerHTML = '<span class="ss-status is-saved"><svg class="ic" aria-hidden="true"><use href="#i-check"></use></svg>Suche gespeichert</span>' +
        '<button class="btn-text" type="button" data-action="remove-search" data-id="' + esc(saved.id) + '">' +
        'Entfernen <svg class="ic" aria-hidden="true"><use href="#i-x"></use></svg></button>';
    } else {
      bar.innerHTML = '<button class="btn-text" type="button" data-action="save-search">' +
        '<svg class="ic" aria-hidden="true"><use href="#i-bookmark"></use></svg> Suche speichern</button>' +
        '<span class="ss-status muted">Wird bei neuen Treffern benachrichtigt.</span>';
    }
  }

  // Aktive Filter-Chips (inkl. entfernbarem "Nur gemerkte"-Chip).
  function renderStellenChips() {
    var chips = [];
    var f = App.stellenFilters;
    if (f.nurGemerkt) {
      chips.push('<button class="chip-active" data-action="clear-nur-gemerkt" aria-label="Filter entfernen: Nur gemerkte">' +
        'Nur gemerkte <svg class="ic" aria-hidden="true"><use href="#i-x"></use></svg></button>');
    }
    var labels = { branche: 'Branche', region: 'Region', typ: 'Abschluss', lehrjahr: 'Lehrbeginn' };
    ['branche', 'region', 'lehrjahr', 'typ'].forEach(function (k) {
      if (f[k] !== 'all') chips.push('<button class="chip-active" data-action="clear-filter" data-key="' + k + '" aria-label="Filter entfernen: ' + esc(labels[k]) + ' ' + esc(stellenOptLabel(k, f[k])) + '">' +
        esc(labels[k]) + ': ' + esc(stellenOptLabel(k, f[k])) + ' <svg class="ic" aria-hidden="true"><use href="#i-x"></use></svg></button>');
    });
    var ac = $('active-chips');
    if (ac) ac.innerHTML = chips.join('');
  }

  // Facet-Counts im Filter-Panel IN-PLACE aktualisieren (Radio bleibt erhalten → kein Fokusverlust).
  function renderStellenFacets() {
    var fcol = qs('.filter-col');
    if (fcol) Array.prototype.forEach.call(fcol.querySelectorAll('.filter-opt'), function (opt) {
      var input = opt.querySelector('input[type="radio"]'); if (!input) return;
      var key = input.name.slice(2), val = input.value, c = countStellenFor(key, val);
      var cnt = opt.querySelector('.fo-count'); if (cnt) cnt.textContent = c;
      opt.classList.toggle('is-empty', c === 0 && val !== 'all');
    });
    // "Nur gemerkte"-Toggle (Anzahl + Zustand) synchron halten.
    var mt = qs('.merken-toggle');
    if (mt) {
      var cb = mt.querySelector('input[type="checkbox"]');
      if (cb) cb.checked = !!App.stellenFilters.nurGemerkt;
      mt.classList.toggle('on', !!App.stellenFilters.nurGemerkt);
      var mc = mt.querySelector('.mt-count');
      if (mc) mc.textContent = App.gemerkt.length;
    }
    // Trigger-Badge (Anzahl aktiver Filter) IN-PLACE aktualisieren.
    if (fcol) {
      var ftc = fcol.querySelector('.ft-count');
      if (ftc) { var n = activeStellenFilterCount(); ftc.textContent = n ? n : ''; }
    }
  }

  // — STELLEN-DETAIL —
  views.stelle = function (id) {
    var s = STELLEN.filter(function (x) { return x.id === id; })[0];
    if (!s) return views.notfound();
    var aehnliche = STELLEN.filter(function (x) { return x.id !== s.id && x.branche === s.branche; }).slice(0, 2);
    return '<div class="container">' +
      breadcrumb([{ route: 'start', label: 'Start' }, { route: 'stellen', label: 'Stellen finden' }, { label: s.beruf }]) +
      '<div class="detail-grid">' +
        '<article class="detail-main">' +
          '<header class="detail-head">' +
            '<h1 class="detail-h1">' + esc(s.beruf) + '</h1>' +
            '<div class="detail-sub"><span>' + esc(s.betrieb) + '</span><span class="dot">·</span><span>' + esc(s.ort) + '</span></div>' +
            '<div class="badge-row">' + verBadge(s.verifiziert) +
              '<span class="badge badge-ok" tabindex="0" title="Lehrstelle entspricht der eidgenössischen Bildungsverordnung">' +
              '<svg class="ic" aria-hidden="true"><use href="#i-check"></use></svg> Gemäss Bildungsverordnung</span></div>' +
          '</header>' +
          '<section class="detail-sec"><h2 class="detail-h2">Über die Stelle</h2><p>' + esc(s.beschreibung) + '</p></section>' +
          '<section class="detail-sec"><h2 class="detail-h2">Anforderungen</h2>' +
            '<ul class="dot-list">' + s.anforderungen.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul></section>' +
          '<section class="detail-sec"><h2 class="detail-h2">Wir bieten</h2>' +
            '<ul class="dot-list">' + s.bietet.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul></section>' +
          (s.loehne && s.loehne.length ? '<section class="detail-sec"><h2 class="detail-h2">Lehrlingslohn</h2>' +
            lohnBlock(s.loehne) +
            '<p class="hint muted">Richtwerte dieses Lehrbetriebs. Effektive Löhne können je nach Vereinbarung und kantonalen Empfehlungen leicht abweichen.</p></section>' : '') +
          '<section class="detail-sec"><h2 class="detail-h2">Betrieb</h2>' +
            '<p class="muted">' + esc(s.betrieb) + (s.verifiziert ? ' ist ein verifizierter Lehrbetrieb in ' : ' ist ein Lehrbetrieb in ') + esc(s.ort) + '.' + (s.verifiziert ? '' : ' Die Angaben dieses Betriebs werden derzeit geprüft.') + '</p></section>' +
          (aehnliche.length ? '<section class="detail-sec"><h2 class="detail-h2">Ähnliche Stellen</h2><div class="list">' +
            aehnliche.map(stelleCard).join('') + '</div></section>' : '') +
        '</article>' +
        '<aside class="detail-aside">' +
          '<div class="aside-card">' +
            '<dl class="eckdaten">' +
              '<div><dt>Pensum</dt><dd>' + esc(s.pensum) + '</dd></div>' +
              '<div><dt>Lehrbeginn</dt><dd>' + esc(s.beginn) + '</dd></div>' +
              '<div><dt>Abschluss</dt><dd>' + esc(s.typ.toUpperCase()) + '</dd></div>' +
              (s.loehne && s.loehne.length ? '<div><dt>Lehrlingslohn</dt><dd>' + chf(Math.min.apply(null, s.loehne)) + ' – ' + chf(Math.max.apply(null, s.loehne)) + '</dd></div>' : '') +
              '<div><dt>Ort</dt><dd>' + esc(s.ort) + '</dd></div>' +
            '</dl>' +
            scoreBlock(s.score, s.grund) +
            '<button class="btn btn-primary btn-block" data-action="goto-bewerben" data-id="' + s.id + '">Jetzt bewerben</button>' +
            '<button class="btn btn-outline btn-block" data-action="ask-stelle" data-id="' + s.id + '">Frage stellen</button>' +
          '</div>' +
        '</aside>' +
      '</div></div>';
  };

  // — BEWERBEN —
  var bewerbenState = { step: 1, id: null, motivation: '' };
  views.bewerben = function (id) {
    var s = STELLEN.filter(function (x) { return x.id === id; })[0] || STELLEN[0];
    bewerbenState.id = s.id;
    return '<div class="container narrow">' +
      breadcrumb([{ route: 'stellen', label: 'Stellen finden' }, { route: 'stelle', id: s.id, label: s.beruf }, { label: 'Bewerben' }]) +
      '<h1 class="page-h1">Bewerbung – ' + esc(s.beruf) + '</h1>' +
      '<p class="stepper-progress" id="bewerben-progress"></p>' +
      '<div class="stepper" id="bewerben-stepper"></div>' +
      '<form id="bewerben-form" class="step-form" data-action="bewerben-form"></form>' +
    '</div>';
  };

  function renderBewerbenForm() {
    var steps = ['Profil prüfen', 'Motivation', 'Unterlagen', 'Absenden'];
    var st = bewerbenState.step;
    $('bewerben-progress').innerHTML = 'Schritt <span class="tnum">' + st + '</span> von <span class="tnum">4</span> · ' + esc(steps[st - 1]);
    var stepper = $('bewerben-stepper');
    stepper.setAttribute('aria-label', 'Bewerbungs-Fortschritt');
    stepper.innerHTML = steps.map(function (s, i) {
      var n = i + 1, label = esc(s), inner = '<span class="step-num tnum">' + (n < st ? '✓' : n) +
        '</span><span class="step-label">' + label + '</span>';
      if (n < st) {
        return '<button type="button" class="step-node done" data-action="bewerben-goto" data-step="' + n +
          '" aria-label="Zurück zu Schritt ' + n + ': ' + label + '">' + inner + '</button>';
      }
      if (n === st) {
        return '<div class="step-node current" aria-current="step">' + inner + '</div>';
      }
      return '<div class="step-node" aria-disabled="true">' + inner + '</div>';
    }).join('');

    var body = '';
    if (st === 1) {
      body = '<fieldset class="fset"><legend>Deine Angaben</legend>' +
        '<p class="hint">Wir übernehmen die Angaben aus deinem Profil. Prüfe sie kurz.</p>' +
        '<div class="kv-line"><span>Name</span><strong>' + esc((App.profile.vorname + ' ' + App.profile.nachname).trim() || '—') + '</strong></div>' +
        '<div class="kv-line"><span>Kanton</span><strong>' + esc(App.profile.kanton || '—') + '</strong></div>' +
        '<div class="kv-line"><span>Berufswunsch</span><strong>' + esc(App.profile.beruf || '—') + '</strong></div>' +
        '<p class="hint hint-trust"><svg class="ic" aria-hidden="true"><use href="#i-shield"></use></svg> Deine Kontaktdaten sieht der Betrieb erst nach deiner Zustimmung.</p>' +
        '</fieldset><div class="step-actions"><button type="button" class="btn btn-primary" data-action="bewerben-next">Weiter</button></div>';
    } else if (st === 2) {
      body = '<fieldset class="fset"><legend>Motivation</legend>' +
        '<label class="field"><span class="field-label">Warum interessierst du dich für diese Stelle? <em class="req">*</em></span>' +
        '<textarea id="bw-motivation" class="textarea" rows="6" aria-describedby="bw-motivation-err" placeholder="Erzähle kurz von dir und deiner Motivation …">' + esc(bewerbenState.motivation) + '</textarea>' +
        '<span class="field-error" id="bw-motivation-err" hidden>Bitte schreibe ein paar Sätze zu deiner Motivation.</span></label>' +
        '</fieldset><div class="step-actions"><button type="button" class="btn btn-outline" data-action="bewerben-prev">Zurück</button>' +
        '<button type="button" class="btn btn-primary" data-action="bewerben-next">Weiter</button></div>';
    } else if (st === 3) {
      body = '<fieldset class="fset"><legend>Unterlagen</legend>' +
        '<div class="doc-list">' +
          '<div class="doc-line"><svg class="ic" aria-hidden="true"><use href="#i-doc"></use></svg><span>Lebenslauf</span><span class="dl-state ok">aus Profil</span></div>' +
          '<div class="doc-line"><svg class="ic" aria-hidden="true"><use href="#i-doc"></use></svg><span>Zeugnis</span><span class="dl-state ok">geprüft</span></div>' +
        '</div>' +
        '<p class="hint">Diese Unterlagen werden mit deiner Bewerbung übermittelt.</p>' +
        '</fieldset><div class="step-actions"><button type="button" class="btn btn-outline" data-action="bewerben-prev">Zurück</button>' +
        '<button type="button" class="btn btn-primary" data-action="bewerben-next">Weiter</button></div>';
    } else {
      var s = STELLEN.filter(function (x) { return x.id === bewerbenState.id; })[0] || STELLEN[0];
      body = '<fieldset class="fset"><legend>Bewerbung absenden</legend>' +
        '<p>Du bewirbst dich bei <strong>' + esc(s.betrieb) + '</strong> für <strong>' + esc(s.beruf) + '</strong>.</p>' +
        '<p class="hint">Mit dem Absenden stimmst du der Weitergabe deiner Bewerbungsdaten an diesen Betrieb zu.</p>' +
        '</fieldset><div class="step-actions"><button type="button" class="btn btn-outline" data-action="bewerben-prev">Zurück</button>' +
        '<button type="button" class="btn btn-primary" data-action="submit-bewerbung" data-id="' + s.id + '">Bewerbung absenden</button></div>';
    }
    $('bewerben-form').innerHTML = body;
  }

  // — MEIN PROFIL —
  var ALLE_STAERKEN = ['Organisation', 'Kommunikation', 'Zuverlässigkeit', 'Logisches Denken', 'Teamarbeit', 'Kreativität', 'Empathie', 'Genauigkeit'];
  views.profil = function () {
    var voll = profilVollstaendigkeit();
    return '<div class="container narrow">' +
      breadcrumb([{ route: 'start', label: 'Start' }, { label: 'Mein Profil' }]) +
      '<div class="profil-head"><h1 class="page-h1">Mein Profil</h1>' +
        '<div class="vollstand"><span class="vs-label">Profil-Vollständigkeit</span>' +
          '<div class="vs-bar"><i id="vs-fill" style="width:' + voll + '%"></i></div>' +
          '<span id="vs-pct" class="vs-pct tnum">' + voll + '%</span></div></div>' +
      '<nav class="anchor-tabs" aria-label="Profil-Abschnitte">' +
        '<a href="#sec-personalien" class="atab active">Personalien</a>' +
        '<a href="#sec-beruf" class="atab">Berufswunsch</a>' +
        '<a href="#sec-noten" class="atab">Noten</a>' +
        '<a href="#sec-staerken" class="atab">Stärken</a>' +
        '<a href="#sec-erfahrung" class="atab">Erfahrung</a>' +
        '<a href="#sec-dokumente" class="atab">Dokumente</a></nav>' +

      '<section id="sec-personalien" class="profil-sec"><h2 class="detail-h2">Personalien</h2>' +
        '<form id="form-steckbrief" class="form-grid" data-action="profil-form">' +
          field('vorname', 'Vorname', App.profile.vorname, true) +
          field('nachname', 'Nachname', App.profile.nachname, true) +
          field('kanton', 'Kanton', App.profile.kanton, false) +
          field('plz', 'PLZ', App.profile.plz, false) +
        '</form></section>' +

      '<section id="sec-beruf" class="profil-sec"><h2 class="detail-h2">Berufswunsch</h2>' +
        '<label class="field"><span class="field-label">Wunschberuf (EFZ/EBA-Liste)</span>' +
        '<select class="select" data-field="beruf">' +
          '<option value="">Bitte wählen …</option>' +
          ['Kauffrau/Kaufmann EFZ', 'Informatiker/in EFZ', 'Fachfrau/Fachmann Gesundheit EFZ', 'Detailhandelsfachfrau/-mann EFZ', 'Polymechaniker/in EFZ', 'Detailhandelsassistent/in EBA'].map(function (b) {
            return '<option value="' + esc(b) + '"' + (App.profile.beruf === b ? ' selected' : '') + '>' + esc(b) + '</option>';
          }).join('') + '</select></label></section>' +

      '<section id="sec-noten" class="profil-sec"><h2 class="detail-h2">Noten</h2>' +
        zeugnisStrip([['Deutsch', 5.0], ['Mathematik', 5.5], ['Französisch', 4.8], ['Englisch', 5.5]]) + '</section>' +

      '<section id="sec-staerken" class="profil-sec"><h2 class="detail-h2">Stärken</h2>' +
        '<p class="hint">Wähle, was dich auszeichnet.</p>' +
        '<div id="strength-tags">' + staerkenTags(ALLE_STAERKEN, true) + '</div></section>' +

      '<section id="sec-erfahrung" class="profil-sec"><h2 class="detail-h2">Erfahrung / Schnuppern</h2>' +
        '<label class="field"><span class="field-label">Schnupper-Erfahrungen</span>' +
        '<input class="input" type="text" data-snfield="schnupper" value="' + esc(App.schnupperErf) + '" placeholder="z.B. Raiffeisenbank (3 Tage)"></label></section>' +

      '<section id="sec-dokumente" class="profil-sec"><h2 class="detail-h2">Dokumente</h2>' +
        '<div class="doc-list">' +
          '<div class="doc-line"><svg class="ic" aria-hidden="true"><use href="#i-doc"></use></svg><span>Lebenslauf</span><span class="dl-state ok">hochgeladen</span></div>' +
          '<div class="doc-line"><svg class="ic" aria-hidden="true"><use href="#i-doc"></use></svg><span>Schulzeugnis</span><span class="dl-state ok">geprüft</span></div>' +
          '<div class="doc-line"><svg class="ic" aria-hidden="true"><use href="#i-doc"></use></svg><span>Motivationsschreiben</span><span class="dl-state open">offen</span><button class="btn-text" data-action="upload-doc">Hochladen</button></div>' +
        '</div>' +
        '<p class="hint hint-trust"><svg class="ic" aria-hidden="true"><use href="#i-shield"></use></svg> Nur du und von dir freigegebene Betriebe sehen diese Daten.</p>' +
        '<div class="profil-actions"><button class="btn btn-primary" data-action="save-profil">Profil speichern</button>' +
          '<button class="btn btn-outline" data-route="cv" data-action="goto-cv">Lebenslauf-Vorschau</button></div>' +
      '</section></div>';
  };

  function field(name, label, val, req) {
    return '<label class="field"><span class="field-label">' + esc(label) + (req ? ' <em class="req">*</em>' : '') + '</span>' +
      '<input class="input" type="text" data-field="' + name + '" value="' + esc(val || '') + '" placeholder="' + esc(label) + '"></label>';
  }

  function profilVollstaendigkeit() {
    var pts = 0;
    if (App.profile.vorname) pts += 15;
    if (App.profile.nachname) pts += 15;
    if (App.profile.kanton) pts += 10;
    if (App.profile.beruf) pts += 25;
    if (App.schnupperErf) pts += 15;
    if (Object.keys(App.strengths).filter(function (k) { return App.strengths[k]; }).length >= 2) pts += 20;
    return Math.min(100, pts);
  }

  // — LEBENSLAUF-VORSCHAU (A4) —
  views.cv = function () {
    var name = (App.profile.vorname + ' ' + App.profile.nachname).trim() || 'Dein Name';
    var staerken = Object.keys(App.strengths).filter(function (k) { return App.strengths[k]; });
    return '<div class="container narrow">' +
      breadcrumb([{ route: 'profil', label: 'Mein Profil' }, { label: 'Lebenslauf' }]) +
      '<div class="cv-toolbar"><h1 class="page-h1">Lebenslauf-Vorschau</h1>' +
        '<button class="btn btn-outline" data-action="cv-print">Drucken / Exportieren</button></div>' +
      '<div class="cv-sheet" id="cv-sheet">' +
        '<header class="cv-head"><h2 class="cv-name">' + esc(name) + '</h2>' +
          '<p class="cv-beruf">' + esc(App.profile.beruf || 'Berufswunsch noch offen') + '</p>' +
          '<p class="cv-ort">' + esc((App.profile.plz + ' ' + App.profile.kanton).trim() || 'Schweiz') + '</p></header>' +
        '<section class="cv-block"><h3>Stärken</h3>' +
          (staerken.length ? '<div class="tag-row">' + staerken.map(function (s) { return '<span class="tag static on">' + esc(s) + '</span>'; }).join('') + '</div>'
            : '<p class="muted">Noch keine Stärken gewählt.</p>') + '</section>' +
        '<section class="cv-block"><h3>Schnupper-Erfahrung</h3>' +
          '<p>' + esc(App.schnupperErf || 'Noch keine Angabe.') + '</p></section>' +
        '<section class="cv-block"><h3>Schulnoten</h3>' +
          zeugnisStrip([['Deutsch', 5.0], ['Mathematik', 5.5], ['Französisch', 4.8], ['Englisch', 5.5]]) + '</section>' +
      '</div></div>';
  };

  // — KANDIDATEN SUCHEN (Betrieb) —
  views.kandidaten = function () {
    return '<div class="container">' +
      breadcrumb([{ route: 'start', label: 'Start' }, { label: 'Kandidaten suchen' }]) +
      '<div class="search-page">' +
        '<aside class="filter-col" aria-label="Filter">' + poolFilterPanel() + '</aside>' +
        '<section class="results-col" aria-label="Kandidatenliste">' +
          '<div class="results-bar">' +
            '<div class="search-inline"><svg class="ic" aria-hidden="true"><use href="#i-search"></use></svg>' +
              '<input id="pool-q" class="search-inline-inp" type="text" placeholder="Beruf oder Stärke …" value="' + esc(App.poolFilters.q) + '" data-action="pool-q" aria-label="Kandidaten suchen"></div>' +
            '<div class="results-meta"><span id="pool-count" class="results-count tnum"></span></div>' +
          '</div>' +
          '<p class="hint">Profile sind anonymisiert, bis die Kandidat/innen die Freigabe erteilen.</p>' +
          '<div id="pool-list" class="list"></div>' +
        '</section>' +
      '</div></div>';
  };

  // Pool-Filter-Optionen zentral (für Panel UND Empty-State-Labels)
  var POOL_FILTER_OPTS = {
    region: [{ v: 'all', l: 'Ganze Schweiz' }, { v: 'zurich', l: 'Zürich' }, { v: 'bern', l: 'Bern' }],
    feld: [{ v: 'all', l: 'Alle Felder' }, { v: 'kv', l: 'Kaufmännisch' }, { v: 'informatik', l: 'Informatik' }, { v: 'gesundheit', l: 'Gesundheit' }],
    note: [{ v: 'all', l: 'Alle' }, { v: '5', l: 'Ø 5.0 und höher' }, { v: '55', l: 'Ø 5.5 und höher' }]
  };
  function poolOptLabel(key, val) {
    var opts = POOL_FILTER_OPTS[key] || [];
    for (var i = 0; i < opts.length; i++) if (opts[i].v === val) return opts[i].l;
    return val;
  }

  function poolFilterPanel() {
    function group(title, key, opts) {
      return '<fieldset class="filter-group"><legend class="filter-h">' + esc(title) + '</legend>' +
        opts.map(function (o) {
          var checked = App.poolFilters[key] === o.v;
          var c = countPoolFor(key, o.v);
          var empty = (o.v !== 'all' && c === 0);
          return '<label class="filter-opt' + (empty ? ' is-empty' : '') + '"><input type="radio" name="p-' + key + '" value="' + o.v + '"' +
            (checked ? ' checked' : '') + ' data-poolfilter-key="' + key + '">' +
            '<span class="fo-label">' + esc(o.l) + '</span>' +
            '<span class="fo-count tnum" aria-hidden="true">' + c + '</span></label>';
        }).join('') + '</fieldset>';
    }
    var n = activePoolFilterCount();
    return '<button class="filter-toggle" type="button" data-action="toggle-filter-panel" aria-expanded="false" aria-controls="filter-body">' +
        '<svg class="ic" aria-hidden="true"><use href="#i-tag"></use></svg>' +
        '<span class="ft-label">Filter</span>' +
        '<span class="ft-count tnum" aria-hidden="true">' + (n ? n : '') + '</span>' +
        '<svg class="ic ft-chevron" aria-hidden="true"><use href="#i-arrow"></use></svg></button>' +
      '<div class="filter-body" id="filter-body">' +
        '<div class="filter-head"><h3 class="filter-title">Filter</h3>' +
        '<button class="btn-text" data-action="reset-pool-filter">Zurücksetzen</button></div>' +
        group('Region', 'region', POOL_FILTER_OPTS.region) +
        group('Berufsfeld', 'feld', POOL_FILTER_OPTS.feld) +
        group('Noten', 'note', POOL_FILTER_OPTS.note) +
      '</div>';
  }

  // Anzahl aktiver Pool-Filter (für den Mobile-Trigger-Badge).
  function activePoolFilterCount() {
    var f = App.poolFilters, n = 0;
    ['region', 'feld', 'note'].forEach(function (k) { if (f[k] !== 'all') n++; });
    return n;
  }

  // Gemeinsame Filterbedingung (von filteredPool UND den Facet-Countern genutzt).
  function poolMatch(k, f) {
    if (f.region !== 'all' && k.region !== f.region) return false;
    if (f.feld !== 'all' && k.feld !== f.feld) return false;
    if (f.note === '5' && k.noteAvg < 5.0) return false;
    if (f.note === '55' && k.noteAvg < 5.5) return false;
    if (f.q) {
      var hay = (k.beruf + ' ' + k.staerken.join(' ')).toLowerCase();
      if (hay.indexOf(f.q.toLowerCase()) === -1) return false;
    }
    return true;
  }

  // Treffer fuer eine Pool-Filter-Option, uebrige aktuelle Filter beibehalten.
  function countPoolFor(key, val) {
    var f = {};
    for (var k in App.poolFilters) if (App.poolFilters.hasOwnProperty(k)) f[k] = App.poolFilters[k];
    f[key] = val;
    var n = 0;
    for (var i = 0; i < KANDIDATEN.length; i++) if (poolMatch(KANDIDATEN[i], f)) n++;
    return n;
  }

  function filteredPool() {
    var f = App.poolFilters;
    return KANDIDATEN.filter(function (k) {
      return poolMatch(k, f);
    });
  }

  function renderPoolResults() {
    var list = filteredPool();
    var cnt = $('pool-count');
    if (cnt) cnt.textContent = list.length + (list.length === 1 ? ' Kandidat' : ' Kandidaten');
    var holder = $('pool-list');
    if (!holder) return;
    if (list.length === 0) {
      var pf = App.poolFilters;
      var parts = [];
      if (pf.q) parts.push('„' + esc(pf.q) + '“');
      if (pf.region !== 'all') parts.push('in Region ' + esc(poolOptLabel('region', pf.region)));
      if (pf.feld !== 'all') parts.push('(' + esc(poolOptLabel('feld', pf.feld)) + ')');
      if (pf.note !== 'all') parts.push('(' + esc(poolOptLabel('note', pf.note)) + ')');
      var head = parts.length ? 'Keine Kandidaten ' + parts.join(' ') : 'Keine Kandidaten gefunden';
      var actions;
      if (pf.region !== 'all') {
        actions = '<button class="btn btn-primary" data-action="widen-pool-region">Ganze Schweiz durchsuchen</button>' +
          '<button class="btn btn-outline" data-action="reset-pool-filter">Alle Filter zurücksetzen</button>';
      } else {
        actions = '<button class="btn btn-primary" data-action="reset-pool-filter">Filter zurücksetzen</button>';
      }
      holder.innerHTML = '<div class="empty-state"><h3>' + head + '</h3>' +
        '<p class="muted">Erweitern Sie die Region oder das Berufsfeld, um mehr Profile zu sehen.</p>' +
        actions + '</div>';
    } else {
      holder.innerHTML = list.map(kandidatCard).join('');
    }
    // Facet-Counts IN-PLACE aktualisieren (Radio bleibt erhalten → kein Fokusverlust).
    var fcol = qs('.filter-col');
    if (fcol) Array.prototype.forEach.call(fcol.querySelectorAll('.filter-opt'), function (opt) {
      var input = opt.querySelector('input[type="radio"]'); if (!input) return;
      var key = input.name.slice(2), val = input.value, c = countPoolFor(key, val);
      var cnt = opt.querySelector('.fo-count'); if (cnt) cnt.textContent = c;
      opt.classList.toggle('is-empty', c === 0 && val !== 'all');
    });
    // Trigger-Badge (Anzahl aktiver Filter) IN-PLACE aktualisieren.
    if (fcol) {
      var ftc = fcol.querySelector('.ft-count');
      if (ftc) { var pn = activePoolFilterCount(); ftc.textContent = pn ? pn : ''; }
    }
  }

  // — KANDIDAT-PROFIL —
  views.kandidat = function (id) {
    var k = KANDIDATEN.filter(function (x) { return x.id === id; })[0];
    if (!k) return views.notfound();
    var frei = k.freigegeben;
    var name = kandKey(k);                 // Klarname nur bei Freigabe
    var key = kandKey(k);                  // nie Klarname eines anonymen Profils

    // Zeugnis-Badge an echtes Datenfeld koppeln (nicht pauschal grün).
    var zeugnisBadge = k.zeugnisGeprueft
      ? '<span class="badge badge-ok" tabindex="0" title="Schulzeugnis durch Lehrly geprüft"><svg class="ic" aria-hidden="true"><use href="#i-check"></use></svg> Zeugnis geprüft</span>'
      : '<span class="badge badge-pending" tabindex="0" title="Zeugnis noch nicht geprüft">Zeugnis ausstehend</span>';

    // Noten/Stärken/Berufswunsch nur bei Freigabe; sonst Platzhalter ohne sensible Daten.
    var notenSec = frei
      ? '<section class="detail-sec"><h2 class="detail-h2">Noten</h2>' + zeugnisStrip(k.noten) + '</section>'
      : '<section class="detail-sec"><h2 class="detail-h2">Noten</h2>' +
          '<p class="muted">Noten und Zeugnis sind erst nach Freigabe durch die Kandidat/in sichtbar.</p></section>';
    var staerkenSec = frei
      ? '<section class="detail-sec"><h2 class="detail-h2">Stärken</h2>' + staerkenTags(k.staerken, false) + '</section>'
      : '';
    var berufSec = '<section class="detail-sec"><h2 class="detail-h2">Berufswunsch</h2><p>' +
      esc(frei ? k.beruf : k.berufFeld) + '</p></section>';

    var primCta = frei
      ? '<button class="btn btn-primary btn-block" data-action="open-schnupper" data-id="' + k.id + '" data-key="' + esc(key) + '">Zum Schnuppern einladen</button>'
      : '<button class="btn btn-primary btn-block" data-action="request-freigabe" data-id="' + k.id + '" data-key="' + esc(key) + '">Freigabe anfragen</button>';

    return '<div class="container">' +
      breadcrumb([{ route: 'kandidaten', label: 'Kandidaten suchen' }, { label: name }]) +
      '<div class="detail-grid">' +
        '<article class="detail-main">' +
          '<header class="detail-head"><h1 class="detail-h1">' + esc(name) + '</h1>' +
            '<div class="detail-sub"><span>' + esc(frei ? k.beruf : k.berufFeld) + '</span><span class="dot">·</span><span>' + esc(kandRegion(k)) + '</span></div>' +
            '<div class="badge-row">' + (frei
              ? '<span class="badge badge-ok" tabindex="0" title="Kandidat/in hat das Profil freigegeben">Profil freigegeben</span>'
              : '<span class="badge badge-pending" tabindex="0" title="Vollständiges Profil erst nach Freigabe sichtbar">Anonymisiert bis Freigabe</span>') +
              zeugnisBadge + '</div>' +
          '</header>' +
          notenSec + staerkenSec + berufSec +
        '</article>' +
        '<aside class="detail-aside"><div class="aside-card">' +
          scoreBlock(k.score, 'passt zu Berufsbild, Region und Notenprofil') +
          primCta +
          '<button class="btn btn-outline btn-block" data-action="msg-kandidat" data-id="' + k.id + '">Nachricht senden</button>' +
        '</div></aside>' +
      '</div></div>';
  };

  // — STELLE AUSSCHREIBEN (Betrieb) —
  views.ausschreiben = function () {
    return '<div class="container narrow">' +
      breadcrumb([{ route: 'start', label: 'Start' }, { label: 'Stelle ausschreiben' }]) +
      '<h1 class="page-h1">Stelle ausschreiben</h1>' +
      '<p class="hint">Strukturierte Angaben nach eidgenössischer Bildungsverordnung.</p>' +
      '<section class="profil-sec"><h2 class="detail-h2">Betriebsprofil</h2>' +
        '<form id="form-betrieb" class="form-grid" data-action="betrieb-form">' +
          bfield('firma', 'Firma', App.betrieb.firma, true) +
          bfield('branche', 'Branche', App.betrieb.branche, false) +
          bfield('ort', 'Standort', App.betrieb.ort, false) +
        '</form>' +
        '<div class="vollstand vollstand-inline"><span class="vs-label">Betriebsprofil</span>' +
          '<div class="vs-bar"><i id="betrieb-fill" style="width:' + betriebPct() + '%"></i></div>' +
          '<span id="betrieb-pct" class="vs-pct tnum">' + betriebPct() + '%</span></div>' +
        '<button class="btn btn-outline" data-action="save-betrieb">Betriebsprofil speichern</button></section>' +

      '<section class="profil-sec"><h2 class="detail-h2">Neue Lehrstelle</h2>' +
        '<form id="form-inserat" class="form-grid" data-action="inserat-form">' +
          '<label class="field"><span class="field-label">Berufsbild (EFZ/EBA) <em class="req">*</em></span>' +
            '<input class="input" type="text" data-ifield="beruf" placeholder="Berufsbild (EFZ/EBA)" aria-describedby="inserat-beruf-err">' +
            '<span class="field-error" id="inserat-beruf-err" hidden>Bitte ein Berufsbild angeben.</span></label>' +
          ifield('plaetze', 'Anzahl Plätze', '', false) +
          ifield('beginn', 'Lehrbeginn', '', false) +
          '<label class="field field-full"><span class="field-label">Beschreibung</span>' +
            '<textarea class="textarea" data-ifield="beschreibung" rows="4" placeholder="Aufgaben, Anforderungen, Besonderheiten …"></textarea></label>' +
        '</form>' +
        '<div class="step-actions"><button class="btn btn-primary" data-action="publish-inserat">Lehrstelle veröffentlichen</button></div></section>' +

      '<section class="profil-sec"><h2 class="detail-h2">Veröffentlichte Lehrstellen</h2>' +
        '<div id="inserat-list" class="list"></div>' +
        '<div id="inserat-empty" class="empty-state"><h3>Noch keine Lehrstellen</h3>' +
          '<p class="muted">Veröffentlichte Lehrstellen erscheinen hier.</p></div></section>' +
    '</div>';
  };

  function bfield(name, label, val, req) {
    return '<label class="field"><span class="field-label">' + esc(label) + (req ? ' <em class="req">*</em>' : '') + '</span>' +
      '<input class="input" type="text" data-bfield="' + name + '" value="' + esc(val || '') + '" placeholder="' + esc(label) + '"></label>';
  }
  function ifield(name, label, val, req) {
    return '<label class="field"><span class="field-label">' + esc(label) + (req ? ' <em class="req">*</em>' : '') + '</span>' +
      '<input class="input" type="text" data-ifield="' + name + '" value="' + esc(val || '') + '" placeholder="' + esc(label) + '"></label>';
  }
  function betriebPct() {
    var p = 0;
    if (App.betrieb.firma) p += 40;
    if (App.betrieb.branche) p += 30;
    if (App.betrieb.ort) p += 30;
    return p;
  }

  function renderInserate() {
    var holder = $('inserat-list');
    var empty = $('inserat-empty');
    if (!holder) return;
    if (App.inserate.length === 0) {
      holder.innerHTML = '';
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;
    holder.innerHTML = App.inserate.map(function (i) {
      return '<div class="list-item"><div class="li-main"><h3 class="li-title">' + esc(i.beruf) + '</h3>' +
        '<div class="li-tags"><span class="chip-static">' + esc(i.plaetze || '1') + ' Plätze</span>' +
        '<span class="chip-static">Start ' + esc(i.beginn || 'offen') + '</span>' +
        '<span class="status-pill pending">veröffentlicht</span></div></div></div>';
    }).join('');
  }

  // — CHAT (zweispaltig) —
  var chatState = { activeId: null };
  views.chat = function (id) {
    var convs = KONVERSATIONEN[App.role] || [];
    if (convs.length === 0) {
      return '<div class="container">' +
        breadcrumb([{ route: 'start', label: 'Start' }, { label: 'Nachrichten' }]) +
        '<div class="empty-state chat-empty"><h3>Noch keine Konversationen</h3>' +
        '<p class="muted">Sobald du eine Frage an einen Betrieb stellst, erscheint die Konversation hier.</p></div></div>';
    }
    if (!chatState.activeId || !convs.filter(function (c) { return c.id === chatState.activeId; })[0]) {
      chatState.activeId = (id && convs.filter(function (c) { return c.id === id; })[0]) ? id : convs[0].id;
    }
    return '<div class="container">' +
      breadcrumb([{ route: 'start', label: 'Start' }, { label: 'Nachrichten' }]) +
      '<div class="chat-grid">' +
        '<aside class="chat-list" aria-label="Konversationen">' +
          convs.map(function (c) {
            var active = c.id === chatState.activeId;
            return '<button class="conv' + (active ? ' active' : '') + '" data-action="open-conv" data-conv="' + c.id + '"' +
              (active ? ' aria-current="true"' : '') + '>' +
              '<span class="conv-top"><span class="conv-name">' + esc(c.partner) + '</span><span class="ie-time conv-time tnum">' + esc(c.time) + '</span></span>' +
              '<span class="conv-kontext">' + esc(c.kontext) + '</span>' +
              '<span class="conv-preview">' + esc(c.preview) + '</span></button>';
          }).join('') +
        '</aside>' +
        '<section class="chat-pane" aria-label="Konversation">' +
          '<div id="chat-head" class="chat-head"></div>' +
          '<div id="chat-log" class="chat-log"></div>' +
          '<form class="chat-compose" data-action="chat-send">' +
            '<label class="sr-only" for="chat-inp">Nachricht</label>' +
            '<input id="chat-inp" class="chat-inp" type="text" placeholder="Nachricht schreiben …" autocomplete="off">' +
            '<button class="btn btn-primary chat-send" type="submit">Senden</button></form>' +
        '</section>' +
      '</div></div>';
  };

  function getChatMsgs(convId) {
    if (App.chats[convId]) return App.chats[convId];
    var conv = KONVERSATIONEN[App.role].filter(function (c) { return c.id === convId; })[0];
    App.chats[convId] = conv ? conv.msgs.slice() : [];
    return App.chats[convId];
  }

  function renderChatConversation() {
    var conv = KONVERSATIONEN[App.role].filter(function (c) { return c.id === chatState.activeId; })[0];
    if (!conv) return;
    var head = $('chat-head');
    if (head) head.innerHTML = '<div><strong>' + esc(conv.partner) + '</strong>' +
      '<span class="chat-kontext"> · ' + esc(conv.kontext) + '</span></div>';
    var log = $('chat-log');
    if (!log) return;
    var msgs = getChatMsgs(conv.id);
    if (msgs.length === 0) {
      log.innerHTML = '<div class="chat-log-empty muted">Noch keine Nachrichten — schreibe die erste.</div>';
    } else {
      log.innerHTML = msgs.map(function (m) {
        return '<div class="cm-row ' + (m.me ? 'right' : 'left') + '">' +
          '<div class="bubble ' + (m.me ? 'me' : 'them') + '">' + esc(m.text) +
          '<span class="cm-time tnum">' + esc(m.time) + (m.me ? ' · gesendet' : '') + '</span></div></div>';
      }).join('');
    }
    log.scrollTop = log.scrollHeight;
  }

  // — DASHBOARD / PIPELINE —
  views.dashboard = function () {
    if (App.role === 'betrieb') return views.bDashboard();
    var metrics = [
      ['Offene Bewerbungen', App.bewerbungen.length || 0],
      ['Gemerkte Lehrstellen', App.gemerkt.length],
      ['Ungelesene Nachrichten', 2],
      ['Profil-Vollständigkeit', profilVollstaendigkeit() + '%']
    ];
    var gemerkteStellen = App.gemerkt.map(function (id) {
      return STELLEN.filter(function (x) { return x.id === id; })[0];
    }).filter(Boolean);
    var savedBlock = '<section class="dash-block dash-saved"><h2 class="detail-h2">Gespeicherte Suchen</h2>' +
      (App.savedSearches.length
        ? '<ul class="saved-search-list">' + App.savedSearches.map(function (s) {
            return '<li><button class="saved-search-item" type="button" data-action="open-saved-search" data-id="' + esc(s.id) + '">' +
              '<span class="ssi-label">' + esc(s.label) + '</span>' +
              '<span class="ssi-hint"><svg class="ic" aria-hidden="true"><use href="#i-check"></use></svg>E-Mail-Abo aktiv</span>' +
              '</button></li>';
          }).join('') + '</ul>'
        : '<div class="empty-state"><p class="muted">Speichere deine Suche, um bei neuen passenden Lehrstellen benachrichtigt zu werden.</p>' +
          '<button class="btn btn-primary" data-route="stellen" data-action="goto-stellen">Stellen finden</button></div>') +
      '</section>';
    return '<div class="container">' +
      breadcrumb([{ route: 'start', label: 'Start' }, { label: 'Übersicht' }]) +
      '<h1 class="page-h1">Deine Übersicht</h1>' +
      metricRow(metrics) +
      '<section class="dash-block dash-merkliste"><div class="dash-block-head"><h2 class="detail-h2">Merkliste</h2>' +
        (gemerkteStellen.length ? '<a class="link-arrow" data-route="stellen" data-show="gemerkt" href="#/stellen">Alle gemerkten ansehen <svg class="ic" aria-hidden="true"><use href="#i-arrow"></use></svg></a>' : '') +
        '</div>' +
        (gemerkteStellen.length
          ? '<div class="list">' + gemerkteStellen.map(stelleCard).join('') + '</div>'
          : '<div class="empty-state empty-merken"><h3>Noch nichts gemerkt</h3>' +
            '<p class="muted">Merke dir Lehrstellen über das <strong>Merken</strong>-Symbol in der Liste, um sie hier wiederzufinden.</p>' +
            '<button class="btn btn-primary" data-route="stellen" data-action="goto-stellen">Stellen finden</button></div>') +
      '</section>' +
      '<div class="dash-cols">' +
        '<section class="dash-block"><h2 class="detail-h2">Bewerbungs-Status</h2>' +
          (App.bewerbungen.length ? '<ul class="status-list">' + App.bewerbungen.map(function (b) {
            return '<li><span>' + esc(b.betrieb) + ' – ' + esc(b.beruf) + '</span><span class="status-pill ' + esc(b.statusKind) + '">' + esc(b.status) + '</span></li>';
          }).join('') + '</ul>'
          : '<div class="empty-state"><h3>Noch keine Bewerbungen</h3><p class="muted">So findest du passende Stellen.</p>' +
            '<button class="btn btn-primary" data-route="stellen" data-action="goto-stellen">Stellen finden</button></div>') +
        '</section>' +
        '<section class="dash-block"><h2 class="detail-h2">Aktivität</h2>' +
          '<ul class="activity-list">' +
            '<li><span class="act-dot"></span>ZKB hat dein Profil angesehen</li>' +
            '<li><span class="act-dot"></span>Neue passende Stelle: Informatiker EFZ</li>' +
            '<li><span class="act-dot"></span>Profil zu 80% vollständig</li>' +
          '</ul></section>' +
        savedBlock +
      '</div></div>';
  };

  views.bDashboard = function () {
    var metrics = [
      ['Veröffentlichte Stellen', App.inserate.length],
      ['Eingegangene Bewerbungen', 4],
      ['Schnupper-Einladungen', App.einladungen.length],
      ['Ungelesene Nachrichten', 1]
    ];
    return '<div class="container">' +
      breadcrumb([{ route: 'start', label: 'Start' }, { label: 'Pipeline' }]) +
      '<h1 class="page-h1">Pipeline-Übersicht</h1>' +
      metricRow(metrics) +
      '<div class="dash-cols">' +
        '<section class="dash-block"><h2 class="detail-h2">Kandidaten-Status</h2>' +
          '<ul class="status-list">' +
            '<li><span>Lena M. – Kauffrau EFZ</span><span class="status-pill ok">Schnuppern eingeladen</span></li>' +
            '<li><span>Noah B. – Informatiker EFZ</span><span class="status-pill pending">angesehen</span></li>' +
            '<li><span>Sara K. – FaGe EFZ</span><span class="status-pill pending">eingegangen</span></li>' +
            '<li><span>Tim R. – Detailhandel EFZ</span><span class="status-pill err">abgesagt</span></li>' +
          '</ul></section>' +
        '<section class="dash-block"><h2 class="detail-h2">Aktivität</h2>' +
          '<ul class="activity-list">' +
            '<li><span class="act-dot"></span>Neue Bewerbung für Kauffrau EFZ</li>' +
            '<li><span class="act-dot"></span>Lena M. hat die Einladung angenommen</li>' +
            '<li><span class="act-dot"></span>Stelle Informatiker EFZ veröffentlicht</li>' +
          '</ul></section>' +
      '</div></div>';
  };

  function metricRow(metrics) {
    return '<div class="metric-row">' + metrics.map(function (m) {
      return '<div class="metric"><span class="metric-num tnum">' + esc(m[1]) + '</span>' +
        '<span class="metric-label">' + esc(m[0]) + '</span></div>';
    }).join('') + '</div>';
  }

  // — PREISE —
  views.preise = function () {
    var betriebPlans = [
      { name: 'Start', preis: 'CHF 0', sub: 'pro Monat', feats: ['1 aktive Lehrstelle', 'Bewerbungseingang', 'Basis-Profil'], hot: false },
      { name: 'Betrieb', preis: 'CHF 49', sub: 'pro Monat', feats: ['Bis 10 Lehrstellen', 'Kandidatensuche & Filter', 'Schnupper-Einladungen', 'Verifizierungs-Badge'], hot: true },
      { name: 'Enterprise', preis: 'auf Anfrage', sub: '', feats: ['Unbegrenzte Lehrstellen', 'Mehrere Standorte', 'API-Zugang', 'Persönlicher Support'], hot: false }
    ];
    return '<div class="container">' +
      breadcrumb([{ route: 'start', label: 'Start' }, { label: 'Preise' }]) +
      '<h1 class="page-h1">Preise</h1>' +
      '<div class="preise-frei"><div class="frei-card"><div><h2 class="detail-h2">Für Lernende</h2>' +
        '<p class="muted">Lehrly ist für Lernende dauerhaft kostenlos. Profil, Suche, Bewerbungen und Nachrichten inklusive.</p></div>' +
        '<span class="frei-tag">kostenlos</span></div></div>' +
      '<h2 class="sec-h">Für Betriebe</h2>' +
      '<div class="tarif-grid">' + betriebPlans.map(function (p) {
        return '<div class="tarif-col' + (p.hot ? ' hot' : '') + '">' +
          (p.hot ? '<span class="tarif-empf">empfohlen</span>' : '') +
          '<h3 class="tarif-name">' + esc(p.name) + '</h3>' +
          '<div class="tarif-preis"><span class="tp-num tnum">' + esc(p.preis) + '</span>' +
            (p.sub ? '<span class="tp-sub">' + esc(p.sub) + '</span>' : '') + '</div>' +
          '<ul class="tarif-feats">' + p.feats.map(function (f) {
            return '<li><svg class="ic" aria-hidden="true"><use href="#i-check"></use></svg>' + esc(f) + '</li>';
          }).join('') + '</ul>' +
          '<button class="btn ' + (p.hot ? 'btn-primary' : 'btn-outline') + ' btn-block" data-action="choose-plan" data-plan="' + esc(p.name) + '">Wählen</button>' +
        '</div>';
      }).join('') + '</div></div>';
  };

  // — 404 —
  views.notfound = function () {
    return '<div class="container narrow">' +
      '<div class="notfound"><h1 class="page-h1">Seite nicht gefunden</h1>' +
        '<p class="muted">Die gesuchte Seite gibt es nicht. Versuch es mit der Stellensuche.</p>' +
        searchBar('stellen') +
        '<div class="nf-links"><a class="link-arrow" data-route="start" href="#/start">Zur Startseite</a>' +
          '<a class="link-arrow" data-route="stellen" href="#/stellen">Stellen finden</a></div>' +
      '</div></div>';
  };

  // — STATISCHE INFO-/LEGAL-SEITEN (Trust-Anker) —
  var INFO = {
    ueber: { titel: 'Über uns', body: [
      'Lehrly ist ein Vorschau-Prototyp eines Schweizer Berufsbildungs-Registers. Ziel ist eine ruhige, transparente Plattform, die Lernende und Lehrbetriebe seriös zusammenbringt.',
      'Diese Demo zeigt den Funktionsumfang ohne echtes Konto und ohne Live-Daten.'] },
    funktioniert: { titel: 'So funktioniert es', body: [
      'Lernende legen ein Profil an, suchen und filtern Lehrstellen mit transparentem Match-Score und bewerben sich direkt.',
      'Betriebe schreiben Lehrstellen nach Bildungsverordnung aus und finden passende, bis zur Freigabe anonymisierte Profile.'] },
    schulen: { titel: 'Für Schulen & Berufsberatung', body: [
      'Schulen und Berufsberatungsstellen können Lernende auf dem Weg zur Lehrstelle begleiten.',
      'In dieser Vorschau ist dieser Bereich als Platzhalter angelegt.'] },
    impressum: { titel: 'Impressum', body: [
      'Lehrly AG (Demo), Bahnhofstrasse 1, 8001 Zürich, Schweiz.',
      'Diese Seite ist Teil einer Design-Vorschau und enthält keine rechtsverbindlichen Angaben.'] },
    datenschutz: { titel: 'Datenschutzerklärung', body: [
      'Diese Vorschau speichert Eingaben ausschliesslich lokal im Browser (localStorage) und überträgt keine Personendaten an Server.',
      'Ein produktiver Betrieb würde Daten revDSG-konform in der Schweiz hosten. Es werden nur technisch notwendige Cookies verwendet.'] },
    agb: { titel: 'AGB', body: [
      'Allgemeine Geschäftsbedingungen folgen im produktiven Betrieb.',
      'In dieser Vorschau dient dieser Abschnitt als Platzhalter.'] }
  };
  views.info = function (id) {
    var d = INFO[id];
    if (!d) return views.notfound();
    return '<div class="container narrow">' +
      breadcrumb([{ route: 'start', label: 'Start' }, { label: d.titel }]) +
      '<h1 class="page-h1">' + esc(d.titel) + '</h1>' +
      '<p class="hint">Vorschau-Inhalt — in Vorbereitung.</p>' +
      d.body.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') +
      '<div class="nf-links"><a class="link-arrow" data-route="start" href="#/start">Zur Startseite</a></div>' +
    '</div>';
  };

  // ═══════════════════════ ROUTER ═══════════════════════
  function parseHash() {
    // Reiner Seiten-Anker (z.B. '#sec-noten', '#view') ist KEINE Router-Route:
    // bestehende Route beibehalten, statt eine unbekannte Route -> 404 abzuleiten.
    if (location.hash && location.hash.indexOf('#/') !== 0) {
      return { route: App.route || 'start', param: App.param || null };
    }
    var h = (location.hash || '').replace(/^#\/?/, '');
    var parts = h.split('/').filter(Boolean);
    return { route: parts[0] || 'start', param: parts[1] || null };
  }

  function gotoRoute(route, param) {
    var target = '#/' + route + (param ? '/' + param : '');
    if (location.hash !== target) { location.hash = target; }
    else { render(); }
  }
  window.gotoRoute = gotoRoute;

  function render() {
    var p = parseHash();
    App.route = p.route;
    App.param = p.param;

    var rolesRoutes = {
      lernende: ['start', 'stellen', 'stelle', 'bewerben', 'profil', 'cv', 'chat', 'dashboard', 'preise', 'info'],
      betrieb: ['start', 'kandidaten', 'kandidat', 'ausschreiben', 'chat', 'dashboard', 'preise', 'info']
    };
    var allowed = rolesRoutes[App.role];
    var fn, content;
    if (allowed.indexOf(p.route) === -1) {
      content = views.notfound();
    } else {
      fn = views[p.route];
      content = fn ? fn(p.param) : views.notfound();
    }

    var view = $('view');
    view.innerHTML = content;
    if (!prefersReduced) {
      view.classList.remove('view-in');
      void view.offsetWidth;
      view.classList.add('view-in');
    }
    renderChrome();
    closeMobileMenu();

    if (p.route === 'stellen') renderStellenResults();
    if (p.route === 'kandidaten') renderPoolResults();
    if (p.route === 'bewerben') { bewerbenState.step = 1; renderBewerbenForm(); }
    if (p.route === 'ausschreiben') renderInserate();
    if (p.route === 'chat') renderChatConversation();
    if (p.route === 'profil') setupAnchorTabs();

    try { view.focus({ preventScroll: true }); } catch (e) { try { view.focus(); } catch (e2) {} }
    try { window.scrollTo(0, 0); } catch (e) {}
  }
  window.render = render;

  // ═══════════════════════ ANKER-TABS (Scroll-Spy) ═══════════════════════
  var anchorObserver = null;
  function setActiveAtab(atab) {
    qsa('.atab').forEach(function (a) {
      var on = a === atab;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  }
  function setupAnchorTabs() {
    if (anchorObserver) { try { anchorObserver.disconnect(); } catch (e) {} anchorObserver = null; }
    var tabs = qsa('.anchor-tabs .atab');
    if (!tabs.length) return;
    setActiveAtab(tabs[0]);
    if (prefersReduced || typeof window.IntersectionObserver !== 'function') return;
    var byId = {};
    tabs.forEach(function (a) {
      var id = (a.getAttribute('href') || '').replace(/^#/, '');
      if (id) byId[id] = a;
    });
    anchorObserver = new window.IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && byId[en.target.id]) setActiveAtab(byId[en.target.id]);
      });
    }, { rootMargin: '-30% 0px -55% 0px', threshold: 0 });
    qsa('.profil-sec').forEach(function (sec) { if (sec.id) anchorObserver.observe(sec); });
  }

  // ═══════════════════════ ROLLE / MENÜ ═══════════════════════
  function setRole(role) {
    if (role === App.role) return;
    App.role = role;
    chatState.activeId = null;
    persist();
    gotoRoute('start');
    renderChrome();
  }
  window.setRole = setRole;

  function toggleMobileMenu() {
    var m = $('mobile-menu'), btn = $('nav-hamburger');
    var open = !m.hidden;
    m.hidden = open;
    btn.setAttribute('aria-expanded', String(!open));
    btn.setAttribute('aria-label', open ? 'Menü öffnen' : 'Menü schliessen');
  }
  function closeMobileMenu() {
    var m = $('mobile-menu'), btn = $('nav-hamburger');
    if (m && !m.hidden) { m.hidden = true; btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-label', 'Menü öffnen'); }
  }

  function mapFeldToBranche(feld) {
    var map = { kv: 'banken', informatik: 'it', gesundheit: 'gesundheit', detailhandel: 'detailhandel', technik: 'technik' };
    return map[feld] || 'all';
  }

  // ═══════════════════════ EVENT-DELEGATION ═══════════════════════
  document.addEventListener('click', function (e) {
    var t = e.target;

    var roleOpt = t.closest && t.closest('.role-opt');
    if (roleOpt) { e.preventDefault(); setRole(roleOpt.dataset.role); return; }

    // Stärken-Tags
    var tag = t.closest && t.closest('.tag.toggle');
    if (tag && tag.dataset.strength) { toggleStrength(tag); return; }

    // Anker-Tabs im Profil: aktiven Zustand umschalten und manuell zum Abschnitt scrollen.
    // KEIN nativer href-Sprung -> location.hash bleibt unveraendert -> kein render()/404,
    // eingegebene Formularfelder bleiben erhalten.
    var atab = t.closest && t.closest('.atab');
    if (atab) {
      e.preventDefault();
      setActiveAtab(atab);
      var aid = (atab.getAttribute('href') || '').replace(/^#/, '');
      var sec = aid && document.getElementById(aid);
      if (sec) sec.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
      return;
    }

    var actEl = t.closest && t.closest('[data-action]');
    if (actEl) {
      var act = actEl.dataset.action;
      if (handleAction(act, actEl, e)) return;
    }

    var routeEl = t.closest && t.closest('[data-route]');
    if (routeEl && routeEl.dataset.route) {
      if (routeEl.dataset.feld) App.stellenFilters.branche = mapFeldToBranche(routeEl.dataset.feld);
      if (routeEl.dataset.show === 'gemerkt') App.stellenFilters.nurGemerkt = true;
      e.preventDefault();
      gotoRoute(routeEl.dataset.route, routeEl.dataset.id || null);
      return;
    }
  });

  function handleAction(act, el, e) {
    switch (act) {
      case 'login':
        toast('Login-Demo: Diese Vorschau läuft ohne echtes Konto.', 'neutral'); return true;
      case 'skip-to-content': {
        e.preventDefault();
        var v = $('view');
        if (v) { try { v.focus(); } catch (er) {} try { v.scrollIntoView(); } catch (er2) {} }
        return true;
      }
      case 'toggle-menu':
        toggleMobileMenu(); return true;
      case 'switch-betrieb':
        e.preventDefault(); setRole('betrieb'); gotoRoute('start'); return true;
      case 'switch-lernende':
        e.preventDefault(); setRole('lernende'); gotoRoute('start'); return true;
      case 'hero-search': return false;
      case 'goto-stellen': e.preventDefault(); gotoRoute('stellen'); return true;
      case 'goto-cv': e.preventDefault(); gotoRoute('cv'); return true;

      case 'toggle-filter-panel': {
        var fcol = el.closest('.filter-col');
        if (fcol) {
          var open = fcol.classList.toggle('is-open');
          el.setAttribute('aria-expanded', open ? 'true' : 'false');
        }
        return true;
      }

      case 'reset-stellen-filter':
        App.stellenFilters = { branche: 'all', region: 'all', typ: 'all', lehrjahr: 'all', sort: 'score', q: '', ort: '', nurGemerkt: false };
        gotoRoute('stellen'); return true;
      case 'clear-filter':
        App.stellenFilters[el.dataset.key] = 'all'; renderStellenResults(); return true;
      case 'toggle-merken': {
        e.preventDefault();
        var mid = el.dataset.id;
        var idx = App.gemerkt.indexOf(mid);
        var nowOn;
        if (idx === -1) { App.gemerkt.push(mid); nowOn = true; }
        else { App.gemerkt.splice(idx, 1); nowOn = false; }
        persist();
        var s = STELLEN.filter(function (x) { return x.id === mid; })[0];
        var titel = s ? s.beruf : 'Lehrstelle';
        toast(nowOn ? '„' + titel + '" gemerkt.' : '„' + titel + '" aus Merkliste entfernt.', nowOn ? 'ok' : 'neutral');
        if (App.route === 'stellen') renderStellenResults();
        else if (App.route === 'dashboard') render(); // Merkliste-Block + Metrik konsistent halten
        else updateMerkenButtons();
        return true;
      }
      case 'toggle-nur-gemerkt':
        App.stellenFilters.nurGemerkt = !App.stellenFilters.nurGemerkt;
        renderStellenResults(); return true;
      case 'clear-nur-gemerkt':
        App.stellenFilters.nurGemerkt = false; renderStellenResults(); return true;

      case 'save-search': {
        var ssf = savedSearchFilters(App.stellenFilters);
        var sid = savedSearchId(ssf);
        if (!findSavedSearch(sid)) {
          App.savedSearches.push({ id: sid, filters: ssf, label: stellenFilterLabel(ssf) || 'Alle Lehrstellen', ts: Date.now() });
          persist();
        }
        toast('Suche gespeichert. Wir benachrichtigen dich bei neuen passenden Lehrstellen.', 'ok');
        renderSaveSearchBar();
        return true;
      }
      case 'remove-search': {
        var rid = el.dataset.id;
        App.savedSearches = App.savedSearches.filter(function (x) { return x.id !== rid; });
        persist();
        toast('Suche entfernt.', 'neutral');
        if (App.route === 'dashboard') render();
        else renderSaveSearchBar();
        return true;
      }
      case 'open-saved-search': {
        e.preventDefault();
        var os = findSavedSearch(el.dataset.id);
        if (os) {
          var of = os.filters;
          App.stellenFilters = { branche: of.branche, region: of.region, typ: of.typ, lehrjahr: of.lehrjahr,
            sort: 'score', q: of.q || '', ort: '', nurGemerkt: false };
          gotoRoute('stellen');
        }
        return true;
      }
      case 'show-all-stellen':
        App.stellenFilters.nurGemerkt = false; renderStellenResults(); return true;
      case 'widen-stellen-region': {
        App.stellenFilters.region = 'all';
        var rr = qs('input[name="f-region"][value="all"]');
        if (rr) rr.checked = true;
        renderStellenResults(); return true;
      }

      case 'goto-bewerben':
        e.preventDefault(); gotoRoute('bewerben', el.dataset.id); return true;
      case 'ask-stelle': {
        e.preventDefault();
        var askS = STELLEN.filter(function (x) { return x.id === el.dataset.id; })[0];
        openStelleChat(el.dataset.id);
        // Toast erst NACH dem Öffnen — Erfolg ist nun immer wahr (Stub angelegt).
        toast(askS ? ('Frage an ' + askS.betrieb + ' gestartet.') : 'Frage an den Betrieb gestartet.', 'neutral');
        return true;
      }
      case 'bewerben-next': bewerbenNext(); return true;
      case 'bewerben-prev': bewerbenState.step = Math.max(1, bewerbenState.step - 1); renderBewerbenForm(); return true;
      case 'bewerben-goto': { var tgt = parseInt(el.dataset.step, 10) || 1; if (tgt < bewerbenState.step) { bewerbenState.step = tgt; renderBewerbenForm(); } return true; }
      case 'submit-bewerbung': submitBewerbung(el.dataset.id); return true;

      case 'save-profil':
      case 'save-steckbrief':
        persist(); updateVollstand(); toast('Profil gesichert.', 'ok'); return true;
      case 'upload-doc':
        toast('Dokument hochgeladen.', 'ok'); return true;
      case 'cv-print':
        try { window.print(); } catch (er) {} toast('Lebenslauf bereit zum Drucken.', 'ok'); return true;

      case 'save-betrieb':
        persist(); updateBetriebPct(); toast('Betriebsprofil gespeichert: ' + (App.betrieb.firma || 'Betrieb') + '.', 'ok'); return true;
      case 'publish-inserat': publishInserat(); return true;

      case 'reset-pool-filter':
        App.poolFilters = { region: 'all', note: 'all', feld: 'all', q: '' };
        gotoRoute('kandidaten'); return true;
      case 'widen-pool-region': {
        App.poolFilters.region = 'all';
        var pr = qs('input[name="p-region"][value="all"]');
        if (pr) pr.checked = true;
        renderPoolResults(); return true;
      }
      case 'open-schnupper': openSchnupper(el.dataset.key); return true;
      case 'request-freigabe':
        toast((el.dataset.key || 'Kandidat/in') + ': Freigabe angefragt.', 'ok'); return true;
      case 'submit-schnupper': submitSchnupper(); return true;
      case 'close-schnupper': closeSchnupper(); return true;
      case 'msg-kandidat':
        e.preventDefault(); openKandidatChat(el.dataset.id); return true;

      case 'open-conv':
        chatState.activeId = el.dataset.conv;
        qsa('.conv').forEach(function (c) { c.classList.toggle('active', c.dataset.conv === el.dataset.conv); c.removeAttribute('aria-current'); });
        el.setAttribute('aria-current', 'true');
        renderChatConversation(); return true;

      case 'choose-plan':
        toast('Paket „' + (el.dataset.plan || '') + '" gewählt.', 'ok'); return true;

      case 'consent-accept':
        store.set('consent', true); $('consent').hidden = true; return true;
    }
    return false;
  }

  // ── Submit-Handler ──
  document.addEventListener('submit', function (e) {
    var form = e.target;
    var act = form.dataset && form.dataset.action;
    if (act === 'hero-search') {
      e.preventDefault();
      var q = (qs('input[name="q"]', form) || {}).value || '';
      var ort = (qs('input[name="ort"]', form) || {}).value || '';
      var target = form.dataset.target;
      if (target === 'kandidaten') { App.poolFilters.q = q.trim(); gotoRoute('kandidaten'); }
      else { App.stellenFilters.q = q.trim(); App.stellenFilters.ort = ort.trim(); gotoRoute('stellen'); }
      return;
    }
    if (act === 'chat-send') { e.preventDefault(); chatSend(); return; }
    if (act === 'schnupper-form') { e.preventDefault(); submitSchnupper(); return; }
    if (act === 'profil-form') { e.preventDefault(); persist(); updateVollstand(); toast('Profil gesichert.', 'ok'); return; }
    if (act === 'betrieb-form') { e.preventDefault(); persist(); updateBetriebPct(); toast('Betriebsprofil gespeichert: ' + (App.betrieb.firma || 'Betrieb') + '.', 'ok'); return; }
    if (act === 'inserat-form') { e.preventDefault(); publishInserat(); return; }
    if (act) e.preventDefault();
  });

  // ── Input-Delegation (Live-Sync, Suche, Filter) ──
  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t.dataset && t.dataset.field) { App.profile[t.dataset.field] = t.value; updateVollstand(); }
    if (t.dataset && t.dataset.snfield === 'schnupper') { App.schnupperErf = t.value; updateVollstand(); }
    if (t.dataset && t.dataset.bfield) { App.betrieb[t.dataset.bfield] = t.value; updateBetriebPct(); }
    if (t.id === 'bw-motivation') {
      bewerbenState.motivation = t.value;
      var err = $('bw-motivation-err'); if (err) err.hidden = true;
      t.classList.remove('invalid'); t.removeAttribute('aria-invalid');
    }
    if (t.dataset && t.dataset.sfield === 'datum') {
      t.classList.remove('invalid'); t.removeAttribute('aria-invalid');
      var sde = $('schnupper-datum-err'); if (sde) sde.hidden = true;
    }
    if (t.dataset && t.dataset.ifield === 'beruf') {
      t.classList.remove('invalid'); t.removeAttribute('aria-invalid');
      var ibe = $('inserat-beruf-err'); if (ibe) ibe.hidden = true;
    }
    if (t.dataset && t.dataset.action === 'stellen-q') { App.stellenFilters.q = t.value; renderStellenResults(); }
    if (t.dataset && t.dataset.action === 'pool-q') { App.poolFilters.q = t.value; renderPoolResults(); }
  });

  // ── Change-Delegation (Selects, Radios) ──
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.dataset && t.dataset.field === 'beruf') { App.profile.beruf = t.value; updateVollstand(); }
    if (t.dataset && t.dataset.filterKey) { App.stellenFilters[t.dataset.filterKey] = t.value; renderStellenResults(); }
    if (t.dataset && t.dataset.poolfilterKey) { App.poolFilters[t.dataset.poolfilterKey] = t.value; renderPoolResults(); }
    if (t.dataset && t.dataset.action === 'stellen-sort') { App.stellenFilters.sort = t.value; renderStellenResults(); }
  });

  // ── Tastatur (Stärken-Tags, Esc) ──
  document.addEventListener('keydown', function (e) {
    var t = e.target;
    if ((e.key === 'Enter' || e.key === ' ') && t.classList && t.classList.contains('toggle') && t.dataset.strength) {
      e.preventDefault(); toggleStrength(t);
    }
    if (e.key === 'Escape') { closeMobileMenu(); closeSchnupper(); }

    // Rollen-Umschalter: Pfeiltasten-Navigation (radiogroup-Konvention)
    if (t.classList && t.classList.contains('role-opt') &&
        (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      var next = t.dataset.role === 'lernende' ? 'betrieb' : 'lernende';
      var btn = qs('.role-opt[data-role="' + next + '"]');
      if (btn) { try { btn.focus(); } catch (er) {} setRole(next); }
    }
  });

  function toggleStrength(tag) {
    var key = tag.dataset.strength;
    App.strengths[key] = !App.strengths[key];
    tag.classList.toggle('on', App.strengths[key]);
    persist(); updateVollstand();
  }

  function updateVollstand() {
    var v = profilVollstaendigkeit();
    var fill = $('vs-fill'), pct = $('vs-pct');
    if (fill) fill.style.width = v + '%';
    if (pct) pct.textContent = v + '%';
  }
  function updateBetriebPct() {
    var v = betriebPct();
    var fill = $('betrieb-fill'), pct = $('betrieb-pct');
    if (fill) fill.style.width = v + '%';
    if (pct) pct.textContent = v + '%';
  }

  // ── Bewerben-Flow ──
  function bewerbenNext() {
    if (bewerbenState.step === 2) {
      var ta = $('bw-motivation');
      var val = ta ? ta.value.trim() : '';
      if (val.length < 3) {
        var err = $('bw-motivation-err');
        if (err) err.hidden = false;
        if (ta) { ta.classList.add('invalid'); ta.setAttribute('aria-invalid', 'true'); ta.focus(); }
        return;
      }
      bewerbenState.motivation = val;
    }
    bewerbenState.step = Math.min(4, bewerbenState.step + 1);
    renderBewerbenForm();
  }
  function submitBewerbung(id) {
    var s = STELLEN.filter(function (x) { return x.id === id; })[0] || STELLEN[0];
    App.bewerbungen.push({ id: s.id, betrieb: s.betrieb, beruf: s.beruf, status: 'eingegangen', statusKind: 'pending' });
    persist();
    toast('Bewerbung bei ' + s.betriebKurz + ' gesendet.', 'ok');
    gotoRoute('dashboard');
  }

  // ── Inserat veröffentlichen ──
  function publishInserat() {
    var berufEl = qs('[data-ifield="beruf"]');
    var beruf = berufEl ? berufEl.value : '';
    if (!beruf.trim()) {
      if (berufEl) { berufEl.classList.add('invalid'); berufEl.setAttribute('aria-invalid', 'true'); berufEl.focus(); }
      var be = $('inserat-beruf-err'); if (be) be.hidden = false;
      toast('Bitte ein Berufsbild angeben.', 'err');
      return;
    }
    var be2 = $('inserat-beruf-err'); if (be2) be2.hidden = true;
    if (berufEl) berufEl.removeAttribute('aria-invalid');
    var plaetze = (qs('[data-ifield="plaetze"]') || {}).value || '';
    var beginn = (qs('[data-ifield="beginn"]') || {}).value || '';
    App.inserate.push({ beruf: beruf.trim(), plaetze: plaetze.trim(), beginn: beginn.trim() });
    persist();
    renderInserate();
    qsa('[data-ifield]').forEach(function (i) { i.value = ''; i.classList.remove('invalid'); });
    toast('Lehrstelle „' + beruf.trim() + '" veröffentlicht.', 'ok');
  }

  // ── Schnupper-Einladung (Modal) ──
  var schnupperTrigger = null;
  function focusables(root) {
    return qsa('a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])', root);
  }
  function openSchnupper(key) {
    var existing = $('schnupper-dialog');
    if (existing) existing.remove();
    schnupperTrigger = (document.activeElement && document.activeElement !== document.body) ? document.activeElement : null;
    var dlg = document.createElement('div');
    dlg.id = 'schnupper-dialog';
    dlg.className = 'modal-overlay';
    dlg.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-label="Zum Schnuppern einladen">' +
      '<div class="modal-head"><h2 class="detail-h2">' + esc(key) + ' einladen</h2>' +
        '<button class="icon-btn" data-action="close-schnupper" aria-label="Schliessen"><svg class="ic" aria-hidden="true"><use href="#i-x"></use></svg></button></div>' +
      '<form class="form-grid" data-action="schnupper-form" data-key="' + esc(key) + '">' +
        '<label class="field field-full"><span class="field-label">Schnupper-Datum <em class="req">*</em></span>' +
          '<input class="input" type="text" data-sfield="datum" placeholder="z.B. Mi 14. Mai" aria-describedby="schnupper-datum-err">' +
          '<span class="field-error" id="schnupper-datum-err" hidden>Bitte ein Datum angeben.</span></label>' +
        '<label class="field field-full"><span class="field-label">Nachricht (optional)</span>' +
          '<textarea class="textarea" data-sfield="text" rows="3" placeholder="Kurze persönliche Notiz …"></textarea></label>' +
        '<div class="step-actions field-full"><button type="button" class="btn btn-outline" data-action="close-schnupper">Abbrechen</button>' +
          '<button type="submit" class="btn btn-primary" data-action="submit-schnupper">Einladung senden</button></div>' +
      '</form></div>';
    document.body.appendChild(dlg);
    dlg.dataset.key = key;
    document.body.style.overflow = 'hidden';
    var inp = qs('[data-sfield="datum"]', dlg);
    if (inp) try { inp.focus(); } catch (e) {}
    dlg.addEventListener('click', function (ev) {
      if (ev.target === dlg) closeSchnupper();
    });
    // Fokus-Falle: Tab/Shift+Tab innerhalb des Modals zyklisch halten
    dlg.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Tab') return;
      var f = focusables(dlg);
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); try { last.focus(); } catch (e) {} }
      else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); try { first.focus(); } catch (e) {} }
    });
  }
  function closeSchnupper() {
    var d = $('schnupper-dialog');
    if (d) d.remove();
    document.body.style.overflow = '';
    if (schnupperTrigger) { try { schnupperTrigger.focus(); } catch (e) {} schnupperTrigger = null; }
  }
  window.closeSchnupper = closeSchnupper;
  window.openSchnupper = openSchnupper;

  function submitSchnupper() {
    var dlg = $('schnupper-dialog');
    if (!dlg) return;
    var datum = (qs('[data-sfield="datum"]', dlg) || {}).value || '';
    var key = dlg.dataset.key || 'Kandidat';
    if (!datum.trim()) {
      var f = qs('[data-sfield="datum"]', dlg);
      var ferr = $('schnupper-datum-err');
      if (f) { f.classList.add('invalid'); f.setAttribute('aria-invalid', 'true'); try { f.focus(); } catch (e) {} }
      if (ferr) ferr.hidden = false;
      toast('Bitte ein Datum angeben.', 'err');
      return;
    }
    App.einladungen.push({ key: key, datum: datum.trim() });
    persist();
    closeSchnupper();
    toast(key + ' zum Schnuppern eingeladen: ' + datum.trim() + '.', 'ok');
  }

  // ── Chat senden (XSS-Escape via esc() im Render) ──
  function chatSend() {
    var inp = $('chat-inp');
    if (!inp) return;
    var val = inp.value;
    if (!val.trim()) { inp.value = ''; return; }
    var msgs = getChatMsgs(chatState.activeId);
    var now = new Date();
    var hh = ('0' + now.getHours()).slice(-2), mm = ('0' + now.getMinutes()).slice(-2);
    msgs.push({ me: true, text: val.trim(), time: hh + ':' + mm });
    inp.value = '';
    renderChatConversation();
  }
  window.chatSend = chatSend;

  // Konversation für (role, partner) finden oder als Stub neu anlegen.
  // Niemals stiller Fallback in eine fremde Konversation: existiert kein
  // Partner-Match, wird ein eindeutiger Stub am Anfang der Liste eingefügt,
  // damit der Chat-Header den korrekten Betrieb/Kandidaten + Kontext zeigt.
  function ensureConv(id, partner, kontext) {
    var convs = KONVERSATIONEN[App.role] || (KONVERSATIONEN[App.role] = []);
    var byPartner = convs.filter(function (c) { return c.partner === partner; })[0];
    if (byPartner) return byPartner.id;
    var byId = convs.filter(function (c) { return c.id === id; })[0];
    if (byId) return byId.id; // Schutz gegen doppeltes Anlegen
    convs.unshift({
      id: id, partner: partner, kontext: kontext, time: 'Jetzt',
      preview: 'Neue Konversation — noch keine Nachrichten.', msgs: []
    });
    return id;
  }
  function ensureStelleConv(s) {
    return ensureConv('c-' + s.id, s.betrieb, s.beruf);
  }
  function ensureKandConv(k) {
    // Bei anonymen Profilen anonymisierte Kennung + Berufsfeld (kein Klarbezug).
    return ensureConv('b-' + k.id, kandKey(k), k.freigegeben ? k.beruf : k.berufFeld);
  }

  // Kontextbezogene Konversation vorauswählen/anlegen, dann in den Chat navigieren.
  function openStelleChat(stelleId) {
    var s = STELLEN.filter(function (x) { return x.id === stelleId; })[0];
    if (!s) return;
    var convs = KONVERSATIONEN[App.role] || [];
    var match = convs.filter(function (c) { return c.partner === s.betrieb; })[0];
    chatState.activeId = match ? match.id : ensureStelleConv(s);
    gotoRoute('chat', chatState.activeId);
  }
  function openKandidatChat(kandId) {
    var k = KANDIDATEN.filter(function (x) { return x.id === kandId; })[0];
    if (!k) return;
    var convs = KONVERSATIONEN[App.role] || [];
    // Match nur über kandKey(k): bei anonymen Profilen nie über den Klarnamen.
    var key = kandKey(k);
    var match = convs.filter(function (c) { return c.partner === key; })[0];
    chatState.activeId = match ? match.id : ensureKandConv(k);
    gotoRoute('chat', chatState.activeId);
  }

  // ── Consent ──
  function maybeConsent() {
    if (store.get('consent', false)) return;
    var c = $('consent');
    if (!c) return;
    c.innerHTML = '<div class="consent-inner"><p>Wir verwenden nur technisch notwendige Cookies. ' +
      'Mehr in der <a href="#/info/datenschutz" data-route="info" data-id="datenschutz">Datenschutzerklärung</a>.</p>' +
      '<button class="btn btn-primary btn-sm" data-action="consent-accept">Verstanden</button></div>';
    c.hidden = false;
    var btn = qs('[data-action="consent-accept"]', c);
    if (btn && !prefersReduced) { try { btn.focus(); } catch (e) {} }
  }

  // ═══════════════════════ INIT ═══════════════════════
  window.addEventListener('hashchange', render);

  function init() {
    document.body.dataset.role = App.role;
    renderFooter();
    if (!location.hash) location.hash = '#/start';
    render();
    maybeConsent();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
