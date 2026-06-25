/* ════════════════════════════════════════════════════════════════════
   Headless Click-Through-Test für Lehrly — heller Top-Header-Stand (NEU).

   Lädt index.html + js/app.js in jsdom (app.js inline injiziert, Origin
   https://lehrly.ch/), fängt jeden JS-Laufzeitfehler ab und klickt jeden
   Navigationsweg sowie jeden interaktiven Flow der NEUEN Struktur real
   durch — Top-Header-Nav, Hash-Routing, Rollen-Umschalter (Du/Sie +
   CTA-Tausch), feste linke Filter-Spalte (Stellen), Stellen-Detail +
   mehrstufiges Bewerben, Profil (Live-Sync, Stärken, Vollständigkeit), CV,
   Kandidatensuche + Filter, Kandidat-Profil + Schnupper-Einladung, Stelle
   ausschreiben, Chat (Liste → Konversation → Senden inkl. XSS-Escape),
   Dashboard/Pipeline, Preise sowie Toast/States.

   Schlägt bei jedem JS-Fehler oder kaputten Zustand fehl. Ausgabe-Format
   ("Bestanden: X   Fehlgeschlagen: Y") wie gehabt, damit npm test
   unverändert funktioniert.
   ════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const errors = [];
let passed = 0, failed = 0;

function ok(name, cond) {
  if (cond) { passed++; console.log('  ✓ ' + name); }
  else { failed++; console.log('  ✗ ' + name); errors.push('ASSERT: ' + name); }
}

const vc = new VirtualConsole();
vc.on('jsdomError', (e) => errors.push('jsdomError: ' + (e.detail || e.message || e)));

let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const appjs = fs.readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf8');
// app.js inline → kein async resource-fetch; echte http-Origin macht localStorage nutzbar
html = html.replace('<script src="js/app.js"></script>', '<script>' + appjs + '</script>');

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  url: 'https://lehrly.ch/',
  pretendToBeVisual: true,
  virtualConsole: vc,
});
const { window } = dom;
window.addEventListener('error', (e) => errors.push('window.error: ' + (e.error ? e.error.stack : e.message)));
window.addEventListener('unhandledrejection', (e) => errors.push('unhandledrejection: ' + e.reason));
window.HTMLElement.prototype.scrollIntoView = function () {};
window.scrollTo = function () {};
// matchMedia für prefers-reduced-motion-Guard
window.matchMedia = window.matchMedia || function () { return { matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }; };

const doc = window.document;
const $ = (id) => doc.getElementById(id);
const qs = (s, r) => (r || doc).querySelector(s);
const qsa = (s, r) => Array.from((r || doc).querySelectorAll(s));
const click = (el) => { if (!el) throw new Error('click on null'); el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); };
const typeInto = (el, val) => { el.value = val; el.dispatchEvent(new window.Event('input', { bubbles: true })); };
const changeTo = (el, val) => { el.value = val; el.dispatchEvent(new window.Event('change', { bubbles: true })); };
const submit = (form) => form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));

function waitFor(cond, ms = 3000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    (function poll() {
      if (cond()) return resolve();
      if (Date.now() - start > ms) return reject(new Error('waitFor timeout'));
      setTimeout(poll, 20);
    })();
  });
}
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// Navigation per Hash + Warten bis App.route stimmt
async function go(route, param) {
  window.gotoRoute(route, param || null);
  await waitFor(() => window.App.route === route);
  await delay(0);
}

(async function run() {
  await waitFor(() => typeof window.gotoRoute === 'function' && window.App);
  console.log('\n── app.js geladen ──');

  // ═════════════ APP-SHELL / DIREKTSTART (kein Login-Gate) ═════════════
  console.log('\n[App-Shell · Top-Header]');
  ok('Top-Header vorhanden', !!$('topbar'));
  ok('Keine linke Rail (#rail fehlt)', $('rail') === null);
  ok('Kein Cmd-K-Commander (#commander fehlt)', $('commander') === null);
  ok('Router-Outlet #view vorhanden', !!$('view'));
  ok('Footer-Trust-Block vorhanden', !!$('footer') && /Made in Switzerland/.test($('footer').textContent));
  ok('Untere Tab-Bar vorhanden', !!$('tabbar'));
  ok('Login nur als Button (kein Auth)', !!$('login-btn') && $('login-btn').tagName.toLowerCase() === 'button');
  ok('Start-Rolle = lernende', window.App.role === 'lernende' && doc.body.dataset.role === 'lernende');
  ok('Start-Route = start', window.App.route === 'start');
  ok('Toast ist Status-Live-Region', $('toast').getAttribute('role') === 'status' && $('toast').getAttribute('aria-live') === 'polite');
  ok('Rollen-Umschalter ist radiogroup', $('role-switch') && $('role-switch').getAttribute('role') === 'radiogroup');

  // ═════════════ START-SEITE (Lernende) ═════════════
  console.log('\n[Start · Lernende]');
  await go('start');
  ok('Hero-H1 "Finde deine Lehrstelle."', /Finde deine Lehrstelle\./.test($('view').textContent));
  ok('Trust-Statistiken gerendert', qsa('.trust-stat').length === 4);
  ok('Berufsfelder-Kacheln gerendert', qsa('.feld-tile').length === 8);
  ok('Aktuelle Lehrstellen (3 Karten)', qsa('#view .list .list-item').length === 3);
  ok('Hero-Suchformular vorhanden', !!qs('.search-hero'));
  ok('Primär-Nav für Lernende (5 Links)', qsa('#primary-nav .nav-link').length === 5);
  ok('Tab-Bar zeigt 4 Tabs', qsa('#tabbar .tab').length === 4);

  // Header-Nav: jeder Link einmal durchklicken
  console.log('\n[Header-Navigation · alle Wege]');
  const navRoutesLern = ['start', 'stellen', 'profil', 'chat', 'dashboard'];
  for (const r of navRoutesLern) {
    const link = qs('#primary-nav .nav-link[data-route="' + r + '"]');
    click(link);
    await waitFor(() => window.App.route === r);
    ok('Nav → ' + r + ' aktiv', window.App.route === r && !!qs('#primary-nav .nav-link.active[data-route="' + r + '"]'));
  }
  // Wordmark → start
  await go('dashboard');
  click($('wordmark'));
  await waitFor(() => window.App.route === 'start');
  ok('Wordmark führt zur Startseite', window.App.route === 'start');

  // Tab-Bar-Navigation
  const tabProfil = qs('#tabbar .tab[data-route="profil"]');
  click(tabProfil);
  await waitFor(() => window.App.route === 'profil');
  ok('Tab-Bar → Profil', window.App.route === 'profil');

  // Mobile-Menü (Hamburger)
  console.log('\n[Mobile-Menü]');
  await go('start');
  ok('Mobile-Menü initial geschlossen', $('mobile-menu').hidden === true);
  click($('nav-hamburger'));
  ok('Hamburger öffnet Menü', $('mobile-menu').hidden === false && $('nav-hamburger').getAttribute('aria-expanded') === 'true');
  ok('Mobile-Menü enthält Preise-Link', !!qs('#mobile-menu .mm-link[data-route="preise"]'));
  // Esc schliesst
  doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  ok('Esc schliesst Mobile-Menü', $('mobile-menu').hidden === true);
  // Klick auf Menü-Link navigiert + schliesst (render → closeMobileMenu)
  click($('nav-hamburger'));
  click(qs('#mobile-menu .mm-link[data-route="chat"]'));
  await waitFor(() => window.App.route === 'chat');
  ok('Mobile-Menü-Link navigiert + schliesst', window.App.route === 'chat' && $('mobile-menu').hidden === true);

  // ═════════════ ROLLEN-UMSCHALTER (Du/Sie + CTA-Tausch) ═════════════
  console.log('\n[Rollen-Umschalter · Du/Sie · CTA]');
  await go('start');
  ok('Sprache Lernende = du', window.lang().anrede === 'du' && window.lang().findCta === 'Lehrstelle finden');
  ok('Login-Label Lernende = Anmelden', $('login-btn').textContent === 'Anmelden');
  // Auf Betrieb umschalten
  click(qs('.role-opt[data-role="betrieb"]'));
  await waitFor(() => window.App.role === 'betrieb' && window.App.route === 'start');
  ok('Umschalten → Rolle betrieb', window.App.role === 'betrieb' && doc.body.dataset.role === 'betrieb');
  ok('aria-checked folgt Rolle', qs('.role-opt[data-role="betrieb"]').getAttribute('aria-checked') === 'true' && qs('.role-opt[data-role="lernende"]').getAttribute('aria-checked') === 'false');
  ok('Sprache Betrieb = Sie', window.lang().anrede === 'Sie' && window.lang().applyCta === 'Zum Schnuppern einladen');
  ok('Login-Label Betrieb = Betriebs-Login', $('login-btn').textContent === 'Betriebs-Login');
  ok('Betrieb-Hero-H1 "Finden Sie passende Lernende."', /Finden Sie passende Lernende\./.test($('view').textContent));
  ok('Betrieb-Nav enthält "Kandidaten suchen"', !!qs('#primary-nav .nav-link[data-route="kandidaten"]'));
  ok('Betrieb-Nav enthält "Stelle ausschreiben"', !!qs('#primary-nav .nav-link[data-route="ausschreiben"]'));
  ok('Empfohlene Kandidaten gerendert', qsa('#view .list .list-item').length === 3);

  // Zurück zu Lernende über Umschalter
  click(qs('.role-opt[data-role="lernende"]'));
  await waitFor(() => window.App.role === 'lernende');
  ok('Zurück → Rolle lernende', window.App.role === 'lernende');
  // CTA "Für Betriebe" auf der Startseite (switch-betrieb)
  await go('start');
  const ctaBetrieb = qs('[data-action="switch-betrieb"]');
  click(ctaBetrieb);
  await waitFor(() => window.App.role === 'betrieb');
  ok('Start-CTA "Für Betriebe" wechselt Rolle', window.App.role === 'betrieb');
  // wieder Lernende für die nächsten Lernenden-Flows
  click(qs('.role-opt[data-role="lernende"]'));
  await waitFor(() => window.App.role === 'lernende');

  // ═════════════ STELLEN-SUCHE + FILTER-SPALTE ═════════════
  console.log('\n[Stellen-Suche · Filter-Spalte · Treffer]');
  await go('stellen');
  ok('Linke Filter-Spalte vorhanden', !!qs('.filter-col') && qsa('.filter-group').length === 4);
  await waitFor(() => qsa('#stellen-list .list-item').length > 0);
  const allCount = qsa('#stellen-list .list-item').length;
  ok('Alle 6 Stellen gelistet', allCount === 6);
  ok('Treffer-Zähler zeigt 6 Lehrstellen', /6 Lehrstellen/.test($('stellen-count').textContent));
  ok('Sortierung Score: ZKB (92%) zuerst', qs('#stellen-list .list-item').dataset.id === 'zkb-kauffrau');

  // Facet-Counts: jede Filter-Option hat eine Trefferzahl rechts (R-Facet)
  ok('Jede Filter-Option hat eine fo-count-Zahl', qsa('.filter-col .filter-opt').length > 0 &&
    qsa('.filter-col .filter-opt').every((l) => !!qs('.fo-count', l) && /^\d+$/.test(qs('.fo-count', l).textContent)));
  ok('Facet-Count "Alle Branchen" = 6 (alle Filter offen)',
    qs('.filter-col input[data-filter-key="branche"][value="all"]').closest('.filter-opt').querySelector('.fo-count').textContent === '6');
  ok('Facet-Count Branche=IT = 1', qs('.filter-col input[data-filter-key="branche"][value="it"]').closest('.filter-opt').querySelector('.fo-count').textContent === '1');
  ok('"Alle"-Option nie als is-empty markiert',
    !qs('.filter-col input[data-filter-key="branche"][value="all"]').closest('.filter-opt').classList.contains('is-empty'));

  // Verifizierungs-Badge auf der Stellenkarte (R2) — beide Zweige
  const vCard = qs('#stellen-list .list-item[data-id="zkb-kauffrau"]');
  const uCard = qs('#stellen-list .list-item[data-id="usz-fage"]');
  ok('Verifizierte Stelle: Karten-Badge "Verifiziert" (ok)', !!qs('.li-badge-ok', vCard) && /Verifiziert/.test(vCard.textContent));
  ok('Unverifizierte Stelle: Karten-Badge "Prüfung ausstehend" (pending)', !!qs('.li-badge-pending', uCard) && /Prüfung ausstehend/.test(uCard.textContent) && !qs('.li-badge-ok', uCard));

  // Branche-Filter (Radio) → nur IT
  changeTo(qs('input[data-filter-key="branche"][value="it"]'), 'it');
  await waitFor(() => qsa('#stellen-list .list-item').length === 1);
  ok('Branche=IT filtert auf 1 Treffer', qsa('#stellen-list .list-item').length === 1 && qs('#stellen-list .list-item').dataset.id === 'sbb-informatiker');
  ok('Aktiver Filter-Chip sichtbar', qsa('#active-chips .chip-active').length >= 1);
  // Chip wegklicken → wieder alle
  click(qs('#active-chips .chip-active[data-key="branche"]'));
  await waitFor(() => qsa('#stellen-list .list-item').length === 6);
  ok('Filter-Chip entfernen stellt 6 Treffer wieder her', qsa('#stellen-list .list-item').length === 6);

  // Region-Filter
  changeTo(qs('input[data-filter-key="region"][value="zurich"]'), 'zurich');
  await waitFor(() => qsa('#stellen-list .list-item').length === 3);
  ok('Region=Zürich → 3 Treffer', qsa('#stellen-list .list-item').length === 3);
  // Facet-Count reagiert auf gesetzten Region-Filter: EBA liefert in Zürich 0 → is-empty, klickbar (kein disabled)
  ok('Facet-Count Abschluss=EBA in Zürich = 0',
    qs('.filter-col input[data-filter-key="typ"][value="eba"]').closest('.filter-opt').querySelector('.fo-count').textContent === '0');
  ok('0-Treffer-Option ist is-empty markiert',
    qs('.filter-col input[data-filter-key="typ"][value="eba"]').closest('.filter-opt').classList.contains('is-empty'));
  ok('is-empty-Option bleibt klickbar (kein disabled)',
    !qs('.filter-col input[data-filter-key="typ"][value="eba"]').disabled);
  // a11y: Fokus bleibt beim Filtern erhalten (In-Place-Count-Update statt Panel-Neuaufbau, R6-Fix)
  const rBern = qs('.filter-col input[data-filter-key="region"][value="bern"]');
  rBern.focus();
  changeTo(rBern, 'bern');
  ok('Filter-Radio behält Fokus nach Count-Update (kein Panel-Neuaufbau)', doc.activeElement === rBern);
  // zurück auf Zürich für die folgenden Assertions
  changeTo(qs('.filter-col input[data-filter-key="region"][value="zurich"]'), 'zurich');
  await waitFor(() => qsa('#stellen-list .list-item').length === 3);
  // Abschluss EBA kombiniert → 0 Treffer (Zürich hat kein EBA) → kontextbezogener Empty-State (R5)
  changeTo(qs('input[data-filter-key="typ"][value="eba"]'), 'eba');
  await waitFor(() => qsa('#stellen-list .empty-state').length === 1);
  ok('Zürich + EBA → leerer Zustand', !!qs('#stellen-list .empty-state'));
  ok('Empty-State: kontextbezogene Headline nennt Region (R5)', /Zürich/i.test(qs('#stellen-list .empty-state h3').textContent));
  ok('Empty-State: "Ganze Schweiz durchsuchen"-Aktion bei gesetzter Region (R5)', !!qs('#stellen-list .empty-state [data-action="widen-stellen-region"]'));
  // Region erweitern → region=all, EBA bleibt → coop-eba erscheint
  click(qs('#stellen-list .empty-state [data-action="widen-stellen-region"]'));
  await waitFor(() => window.App.stellenFilters.region === 'all');
  ok('Region erweitern: region=all + Treffer kehren zurück (R5)', window.App.stellenFilters.region === 'all' && qsa('#stellen-list .list-item').length >= 1);
  // Typ-Chip entfernen → wieder alle 6
  click(qs('#active-chips .chip-active[data-key="typ"]'));
  await waitFor(() => qsa('#stellen-list .list-item').length === 6);
  ok('Filter komplett zurück → 6 Treffer', qsa('#stellen-list .list-item').length === 6);

  // ─── Lehrbeginn-Filter (Lehrstart-Jahr 2026/2027) ───
  console.log('\n[Stellen-Filter · Lehrbeginn (Kohorten 2026/2027)]');
  ok('Vierte Filtergruppe "Lehrbeginn" vorhanden',
    qsa('.filter-col .filter-group .filter-h').some((l) => /Lehrbeginn/.test(l.textContent)));
  ok('Lehrbeginn-Optionen 2026 + 2027 vorhanden',
    !!qs('.filter-col input[data-filter-key="lehrjahr"][value="2026"]') &&
    !!qs('.filter-col input[data-filter-key="lehrjahr"][value="2027"]'));
  ok('Facet-Count "Alle Jahrgänge" = 6',
    qs('.filter-col input[data-filter-key="lehrjahr"][value="all"]').closest('.filter-opt').querySelector('.fo-count').textContent === '6');
  ok('Facet-Count Lehrstart 2027 = 2',
    qs('.filter-col input[data-filter-key="lehrjahr"][value="2027"]').closest('.filter-opt').querySelector('.fo-count').textContent === '2');
  ok('Facet-Count Lehrstart 2026 = 4',
    qs('.filter-col input[data-filter-key="lehrjahr"][value="2026"]').closest('.filter-opt').querySelector('.fo-count').textContent === '4');
  // Lehrstart 2027 wählen → nur die 2 Stellen mit lehrjahr 2027 (usz-fage, bosch-poly)
  changeTo(qs('input[data-filter-key="lehrjahr"][value="2027"]'), '2027');
  await waitFor(() => qsa('#stellen-list .list-item').length === 2);
  ok('Lehrstart 2027 → 2 Treffer', qsa('#stellen-list .list-item').length === 2);
  const lj2027Ids = qsa('#stellen-list .list-item').map((c) => c.dataset.id).sort();
  ok('Lehrstart 2027 listet usz-fage + bosch-poly',
    JSON.stringify(lj2027Ids) === JSON.stringify(['bosch-poly', 'usz-fage']));
  ok('Treffer-Zähler aktualisiert auf 2 Lehrstellen', /2 Lehrstellen/.test($('stellen-count').textContent));
  // Entfernbarer Chip "Lehrbeginn: Lehrstart 2027"
  const ljChip = qs('#active-chips .chip-active[data-key="lehrjahr"]');
  ok('Entfernbarer Chip "Lehrbeginn: Lehrstart 2027"', !!ljChip && /Lehrbeginn: Lehrstart 2027/.test(ljChip.textContent));
  // Facet-Counts der anderen Gruppen passen sich an (Banken nur 2026 → 0 unter 2027)
  ok('Facet-Count Branche=Banken unter 2027 = 0',
    qs('.filter-col input[data-filter-key="branche"][value="banken"]').closest('.filter-opt').querySelector('.fo-count').textContent === '0');
  // Reset entfernt den Lehrbeginn-Filter wieder
  click(qs('[data-action="reset-stellen-filter"]'));
  await waitFor(() => qsa('#stellen-list .list-item').length === 6);
  ok('Zurücksetzen entfernt Lehrbeginn-Filter', window.App.stellenFilters.lehrjahr === 'all' &&
    !qs('#active-chips .chip-active[data-key="lehrjahr"]') && qsa('#stellen-list .list-item').length === 6);

  // ─── Merkliste: Merken-Aktion + "Nur gemerkte"-Toggle + Chip + Empty-State ───
  console.log('\n[Stellen · Merkliste (merken / nur gemerkte / chip / leerzustand)]');
  // Ausgangslage: nichts gemerkt
  window.App.gemerkt.length = 0;
  window.App.stellenFilters.nurGemerkt = false;
  await go('stellen');
  await waitFor(() => qsa('#stellen-list .list-item').length === 6);
  ok('Jede Stellenkarte hat einen Merken-Button', qsa('#stellen-list .merken-btn').length === 6);
  ok('Merken-Button initial nicht gemerkt (aria-pressed=false)',
    qs('#stellen-list .merken-btn').getAttribute('aria-pressed') === 'false' &&
    !qs('#stellen-list .merken-btn').classList.contains('on'));
  ok('"Nur gemerkte"-Toggle im Filter-Panel vorhanden',
    !!qs('.filter-col .merken-toggle input[data-action="toggle-nur-gemerkt"]'));
  ok('Merken-Toggle-Zähler startet bei 0', qs('.filter-col .merken-toggle .mt-count').textContent === '0');

  // Eine Stelle merken → Karte zeigt "Gemerkt"-Status (grün), Klick navigiert NICHT
  const merkBtnZkb = qs('#stellen-list .list-item-wrap .merken-btn[data-id="zkb-kauffrau"]');
  click(merkBtnZkb);
  await waitFor(() => window.App.gemerkt.indexOf('zkb-kauffrau') !== -1);
  ok('Merken-Klick navigiert NICHT (bleibt auf Stellen)', window.App.route === 'stellen');
  ok('Gemerkte Stelle im State', window.App.gemerkt.indexOf('zkb-kauffrau') !== -1 && window.App.gemerkt.length === 1);
  ok('Merken-Toast bestätigt', /gemerkt/.test($('toast').textContent));
  const merkBtnAfter = qs('#stellen-list .merken-btn[data-id="zkb-kauffrau"]');
  ok('Gemerkte Karte zeigt on-Status (aria-pressed=true, Label "Gemerkt")',
    merkBtnAfter.classList.contains('on') && merkBtnAfter.getAttribute('aria-pressed') === 'true' &&
    /Gemerkt/.test(merkBtnAfter.textContent));
  ok('Merken-Toggle-Zähler aktualisiert auf 1', qs('.filter-col .merken-toggle .mt-count').textContent === '1');

  // Zweite Stelle merken
  click(qs('#stellen-list .merken-btn[data-id="sbb-informatiker"]'));
  await waitFor(() => window.App.gemerkt.length === 2);
  ok('Zwei Stellen gemerkt', window.App.gemerkt.length === 2);

  // "Nur gemerkte" aktivieren → genau die 2 gemerkten Stellen
  const nurToggle = qs('.filter-col .merken-toggle input[data-action="toggle-nur-gemerkt"]');
  click(nurToggle);
  await waitFor(() => qsa('#stellen-list .list-item').length === 2);
  ok('"Nur gemerkte" filtert auf 2 Treffer', window.App.stellenFilters.nurGemerkt === true && qsa('#stellen-list .list-item').length === 2);
  const gemerktIds = qsa('#stellen-list .list-item').map((c) => c.dataset.id).sort();
  ok('Gemerkte Liste enthält genau die 2 gemerkten Stellen',
    JSON.stringify(gemerktIds) === JSON.stringify(['sbb-informatiker', 'zkb-kauffrau']));
  ok('Entfernbarer Chip "Nur gemerkte" sichtbar',
    !!qs('#active-chips .chip-active[data-action="clear-nur-gemerkt"]') &&
    /Nur gemerkte/.test(qs('#active-chips .chip-active[data-action="clear-nur-gemerkt"]').textContent));

  // Aus der gefilterten Liste heraus eine Stelle entmerken → fällt aus der Liste
  click(qs('#stellen-list .merken-btn[data-id="sbb-informatiker"]'));
  await waitFor(() => qsa('#stellen-list .list-item').length === 1);
  ok('Entmerken in "Nur gemerkte" reduziert Liste auf 1', window.App.gemerkt.length === 1 && qsa('#stellen-list .list-item').length === 1);
  ok('Entmerken-Toast bestätigt', /aus Merkliste entfernt/.test($('toast').textContent));

  // Letzte gemerkte Stelle entfernen → eigener Merkliste-Empty-State
  click(qs('#stellen-list .merken-btn[data-id="zkb-kauffrau"]'));
  await waitFor(() => !!qs('#stellen-list .empty-merken'));
  ok('Leere Merkliste zeigt eigenen Empty-State', !!qs('#stellen-list .empty-merken') && /Noch nichts gemerkt/.test($('stellen-list').textContent));
  ok('Merkliste-Empty-State hat "Alle Lehrstellen anzeigen"-Aktion', !!qs('#stellen-list [data-action="show-all-stellen"]'));
  // Empty-State-Aktion deaktiviert den Toggle wieder
  click(qs('#stellen-list [data-action="show-all-stellen"]'));
  await waitFor(() => qsa('#stellen-list .list-item').length === 6);
  ok('"Alle Lehrstellen anzeigen" hebt nurGemerkt auf', window.App.stellenFilters.nurGemerkt === false && qsa('#stellen-list .list-item').length === 6);

  // Chip-Entfernen-Pfad: erneut merken + Toggle, dann Chip wegklicken
  click(qs('#stellen-list .merken-btn[data-id="zkb-kauffrau"]'));
  await waitFor(() => window.App.gemerkt.length === 1);
  click(qs('.filter-col .merken-toggle input[data-action="toggle-nur-gemerkt"]'));
  await waitFor(() => qsa('#stellen-list .list-item').length === 1);
  click(qs('#active-chips .chip-active[data-action="clear-nur-gemerkt"]'));
  await waitFor(() => qsa('#stellen-list .list-item').length === 6);
  ok('"Nur gemerkte"-Chip entfernen stellt volle Liste wieder her', window.App.stellenFilters.nurGemerkt === false && qsa('#stellen-list .list-item').length === 6);

  // Reset-Filter setzt auch nurGemerkt zurück (gemerkte Stelle bleibt für Dashboard-Test bestehen)
  click(qs('.filter-col .merken-toggle input[data-action="toggle-nur-gemerkt"]'));
  await waitFor(() => window.App.stellenFilters.nurGemerkt === true);
  click(qs('[data-action="reset-stellen-filter"]'));
  await waitFor(() => qsa('#stellen-list .list-item').length === 6);
  ok('Zurücksetzen hebt nurGemerkt auf', window.App.stellenFilters.nurGemerkt === false);

  // Inline-Suche (Live)
  typeInto($('stellen-q'), 'informatik');
  await waitFor(() => qsa('#stellen-list .list-item').length === 1);
  ok('Inline-Suche "informatik" → 1 Treffer', qsa('#stellen-list .list-item').length === 1);
  typeInto($('stellen-q'), '');
  await waitFor(() => qsa('#stellen-list .list-item').length === 6);
  // Sortierung Beruf A–Z
  changeTo($('stellen-sort'), 'beruf');
  await waitFor(() => qsa('#stellen-list .list-item').length === 6);
  const titles = qsa('#stellen-list .li-title').map((e) => e.textContent);
  const sorted = titles.slice().sort((a, b) => a.localeCompare(b));
  ok('Sortierung Beruf A–Z greift', JSON.stringify(titles) === JSON.stringify(sorted));
  changeTo($('stellen-sort'), 'score');
  await delay(0);

  // Hero-Suche von der Startseite aus
  await go('start');
  const heroForm = qs('.search-hero');
  typeInto(qs('input[name="q"]', heroForm), 'Kauffrau');
  submit(heroForm);
  await waitFor(() => window.App.route === 'stellen' && qsa('#stellen-list .list-item').length === 1);
  ok('Hero-Suche füllt Filter + navigiert', window.App.route === 'stellen' && window.App.stellenFilters.q === 'Kauffrau' && qsa('#stellen-list .list-item').length === 1);
  // Filter wieder leeren
  click(qs('[data-action="reset-stellen-filter"]'));
  await waitFor(() => qsa('#stellen-list .list-item').length === 6);

  // Berufsfeld-Kachel von Start → setzt Branche
  await go('start');
  click(qs('.feld-tile[data-feld="informatik"]'));
  await waitFor(() => window.App.route === 'stellen');
  ok('Berufsfeld-Kachel setzt Branche-Filter', window.App.stellenFilters.branche === 'it' && qsa('#stellen-list .list-item').length === 1);
  click(qs('[data-action="reset-stellen-filter"]'));
  await waitFor(() => qsa('#stellen-list .list-item').length === 6);

  // ═════════════ STELLEN-DETAIL + BEWERBEN-STEPS ═════════════
  console.log('\n[Stellen-Detail · Bewerben-Flow]');
  click(qs('#stellen-list .list-item[data-id="zkb-kauffrau"]'));
  await waitFor(() => window.App.route === 'stelle' && window.App.param === 'zkb-kauffrau');
  ok('Stellen-Detail geöffnet', window.App.route === 'stelle');
  ok('Detail-H1 zeigt Beruf', /Kauffrau\/Kaufmann EFZ/.test(qs('.detail-h1').textContent));
  ok('Verifiziert-Badge sichtbar', /Betrieb verifiziert/.test($('view').textContent));
  ok('Score-Block 92%', /92%/.test(qs('.score-block').textContent));
  ok('Eckdaten-Liste (5 Einträge inkl. Lohn)', qsa('.eckdaten > div').length === 5);
  ok('Lehrlingslohn-Sektion vorhanden', qsa('.lohn-table .lohn-row').length === 3 && /Lehrlingslohn/.test($('view').textContent));
  ok('Lohn-Eckdaten zeigt Spanne (CHF)', /CHF 800.– – CHF 1’200.–/.test($('view').textContent));
  ok('Bewerben-Button vorhanden', !!qs('[data-action="goto-bewerben"]'));

  // Ähnliche Stellen: Detailhandel hat Geschwister (Migros + Coop)
  await go('stelle', 'migros-detail');
  ok('Ähnliche Stellen vorhanden (Detailhandel)', qsa('.detail-sec .list .list-item').length >= 1);
  // Unverifizierte Stelle: Detailtext konsistent mit Karten-Badge (kein "verifizierter Lehrbetrieb")
  await go('stelle', 'usz-fage');
  ok('Unverifizierte Stelle: Detailtext ohne "verifiziert" + Prüfhinweis',
    /ist ein Lehrbetrieb in/.test($('view').textContent)
    && /werden derzeit geprüft/.test($('view').textContent)
    && !/verifizierter Lehrbetrieb/.test($('view').textContent));
  await go('stelle', 'zkb-kauffrau');

  // Frage stellen → Chat + Toast
  click(qs('[data-action="ask-stelle"]'));
  await waitFor(() => window.App.route === 'chat');
  ok('"Frage stellen" → Chat', window.App.route === 'chat');
  ok('Toast nach Frage stellen', /Frage an den Betrieb/.test($('toast').textContent));

  // zurück zu Detail → bewerben
  await go('stelle', 'zkb-kauffrau');
  click(qs('[data-action="goto-bewerben"]'));
  await waitFor(() => window.App.route === 'bewerben');
  ok('Bewerben-Stepper Step 1', !!qs('#bewerben-stepper .step-node.current') && /Profil prüfen/.test($('bewerben-stepper').textContent));
  // Step 1 → 2
  click(qs('[data-action="bewerben-next"]'));
  await waitFor(() => !!$('bw-motivation'));
  ok('Step 2 (Motivation) aktiv', !!$('bw-motivation'));
  // Leere Motivation blockt
  click(qs('[data-action="bewerben-next"]'));
  await delay(0);
  ok('Leere Motivation zeigt Fehler', $('bw-motivation-err') && $('bw-motivation-err').hidden === false && !!$('bw-motivation'));
  // Motivation füllen → weiter
  typeInto($('bw-motivation'), 'Ich interessiere mich sehr für den Bankberuf und die Beratung.');
  ok('Fehler verschwindet bei Eingabe', $('bw-motivation-err').hidden === true);
  click(qs('[data-action="bewerben-next"]'));
  await waitFor(() => /Unterlagen/.test($('bewerben-form').textContent));
  ok('Step 3 (Unterlagen) aktiv', /Lebenslauf/.test($('bewerben-form').textContent));
  click(qs('[data-action="bewerben-next"]'));
  await waitFor(() => !!qs('[data-action="submit-bewerbung"]'));
  ok('Step 4 (Absenden) aktiv', !!qs('[data-action="submit-bewerbung"]') && /Zürcher Kantonalbank/.test($('bewerben-form').textContent));
  // Zurück-Navigation prüfen
  click(qs('[data-action="bewerben-prev"]'));
  await waitFor(() => /Unterlagen/.test($('bewerben-form').textContent));
  ok('Zurück führt zu Step 3', /Unterlagen/.test($('bewerben-form').textContent));
  click(qs('[data-action="bewerben-next"]'));
  await waitFor(() => !!qs('[data-action="submit-bewerbung"]'));
  // Absenden
  const bewVorher = window.App.bewerbungen.length;
  click(qs('[data-action="submit-bewerbung"]'));
  await waitFor(() => window.App.route === 'dashboard');
  ok('Bewerbung absenden → Dashboard', window.App.route === 'dashboard');
  ok('Bewerbung gespeichert', window.App.bewerbungen.length === bewVorher + 1);
  ok('Toast "Bewerbung gesendet"', /Bewerbung bei ZKB gesendet/.test($('toast').textContent));

  // ═════════════ DASHBOARD (Lernende) ═════════════
  console.log('\n[Dashboard · Lernende]');
  ok('Dashboard-H1 "Deine Übersicht"', /Deine Übersicht/.test($('view').textContent));
  ok('Metrik-Reihe (4 Kennzahlen)', qsa('.metric').length === 4);
  ok('Bewerbungs-Status-Liste zeigt Eintrag', qsa('.status-list li').length >= 1 && /Zürcher Kantonalbank/.test($('view').textContent));

  // Merkliste-Block + echte "Gemerkte Lehrstellen"-Metrik (statt Mock "Treffer")
  console.log('\n[Dashboard · Merkliste-Block]');
  ok('Metrik "Gemerkte Lehrstellen" vorhanden (keine Mock-Treffer)',
    qsa('.metric-label').some((l) => /Gemerkte Lehrstellen/.test(l.textContent)) &&
    !qsa('.metric-label').some((l) => l.textContent.trim() === 'Treffer'));
  const merkMetric = qsa('.metric').find((m) => /Gemerkte Lehrstellen/.test(m.textContent));
  ok('Gemerkte-Metrik zeigt echten Wert (App.gemerkt.length)',
    merkMetric.querySelector('.metric-num').textContent === String(window.App.gemerkt.length) &&
    window.App.gemerkt.length === 1);
  ok('Dashboard-Merkliste-Block vorhanden', !!qs('.dash-merkliste') && /Merkliste/.test(qs('.dash-merkliste').textContent));
  ok('Merkliste-Block listet die gemerkte Stelle', qsa('.dash-merkliste .list .list-item').length === 1 &&
    !!qs('.dash-merkliste .list-item[data-id="zkb-kauffrau"]'));
  ok('Merkliste-Block hat "Alle gemerkten ansehen"-Link', !!qs('.dash-merkliste [data-show="gemerkt"]'));

  // Ent-Merken DIREKT im Dashboard aktualisiert Block + Metrik live (R8-Fix gegen inkonsistenten Zustand)
  click(qs('.dash-merkliste [data-action="toggle-merken"][data-id="zkb-kauffrau"]'));
  await waitFor(() => window.App.gemerkt.indexOf('zkb-kauffrau') === -1);
  ok('Ent-Merken im Dashboard rendert Block + Metrik neu (kein veralteter Zustand)',
    !!qs('.dash-merkliste .empty-merken')
    && qsa('.metric').find((m) => /Gemerkte Lehrstellen/.test(m.textContent)).querySelector('.metric-num').textContent === '0');
  // wieder merken, damit die folgenden Assertions ihre Ausgangslage haben
  window.App.gemerkt.push('zkb-kauffrau'); window.gotoRoute('dashboard');
  await waitFor(() => qsa('.dash-merkliste .list-item[data-id="zkb-kauffrau"]').length === 1);

  // Link "Alle gemerkten ansehen" → Stellen mit voraktiviertem nurGemerkt-Filter
  click(qs('.dash-merkliste [data-show="gemerkt"]'));
  await waitFor(() => window.App.route === 'stellen');
  await waitFor(() => qsa('#stellen-list .list-item').length === 1);
  ok('"Alle gemerkten ansehen" öffnet gefilterte Stellenliste',
    window.App.stellenFilters.nurGemerkt === true && qsa('#stellen-list .list-item').length === 1 &&
    !!qs('#stellen-list .list-item[data-id="zkb-kauffrau"]'));
  // Filter wieder leeren für saubere Folgezustände
  click(qs('[data-action="reset-stellen-filter"]'));
  await waitFor(() => qsa('#stellen-list .list-item').length === 6);

  // Leere Merkliste → Dashboard zeigt eigenen Empty-State
  window.App.gemerkt.length = 0;
  window.App.stellenFilters.nurGemerkt = false;
  await go('dashboard');
  ok('Dashboard-Merkliste leer → Empty-State', !!qs('.dash-merkliste .empty-merken') &&
    qsa('.metric').find((m) => /Gemerkte Lehrstellen/.test(m.textContent)).querySelector('.metric-num').textContent === '0');

  // ═════════════ PROFIL-FORMULAR ═════════════
  console.log('\n[Profil · Live-Sync · Stärken · Vollständigkeit]');
  await go('profil');
  ok('Profil-H1 vorhanden', /Mein Profil/.test($('view').textContent));
  ok('Vollständigkeit-Anzeige vorhanden', !!$('vs-pct') && !!$('vs-fill'));
  const voll0 = $('vs-pct').textContent;
  // Personalien live tippen
  typeInto(qs('[data-field="vorname"]'), 'Lena');
  typeInto(qs('[data-field="nachname"]'), 'Muster');
  typeInto(qs('[data-field="kanton"]'), 'Zürich');
  ok('Vorname live in State', window.App.profile.vorname === 'Lena' && window.App.profile.nachname === 'Muster');
  ok('Vollständigkeit steigt nach Eingabe', $('vs-pct').textContent !== voll0);
  // Berufswunsch (Select → change)
  changeTo(qs('[data-field="beruf"]'), 'Kauffrau/Kaufmann EFZ');
  ok('Berufswunsch in State', window.App.profile.beruf === 'Kauffrau/Kaufmann EFZ');
  // Schnupper-Erfahrung
  typeInto(qs('[data-snfield="schnupper"]'), 'Raiffeisenbank (3 Tage)');
  ok('Schnupper-Erfahrung in State', window.App.schnupperErf === 'Raiffeisenbank (3 Tage)');
  // Stärken-Tags toggeln
  const tag1 = qs('.tag.toggle[data-strength="Organisation"]');
  const tag2 = qs('.tag.toggle[data-strength="Kommunikation"]');
  click(tag1); click(tag2);
  ok('Zwei Stärken aktiviert', window.App.strengths['Organisation'] === true && window.App.strengths['Kommunikation'] === true);
  ok('Tag bekommt .on-Klasse', tag1.classList.contains('on'));
  // Tastatur-Toggle (Enter)
  const tag3 = qs('.tag.toggle[data-strength="Zuverlässigkeit"]');
  tag3.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  ok('Stärke per Tastatur (Enter) toggelt', window.App.strengths['Zuverlässigkeit'] === true);
  const vollVoll = parseInt($('vs-pct').textContent, 10);
  ok('Volles Profil ergibt 100%', vollVoll === 100);
  // Speichern
  click(qs('[data-action="save-profil"]'));
  ok('Profil speichern → Toast', /Profil gesichert/.test($('toast').textContent));
  // Upload-Dokument
  click(qs('[data-action="upload-doc"]'));
  ok('Dokument-Upload → Toast', /Dokument hochgeladen/.test($('toast').textContent));

  // ═════════════ LEBENSLAUF-VORSCHAU (CV) ═════════════
  console.log('\n[CV · Lebenslauf-Vorschau]');
  click(qs('[data-action="goto-cv"]'));
  await waitFor(() => window.App.route === 'cv');
  ok('CV-Route aktiv', window.App.route === 'cv' && !!$('cv-sheet'));
  ok('CV zeigt Namen aus Profil', /Lena Muster/.test($('cv-sheet').textContent));
  ok('CV zeigt Berufswunsch', /Kauffrau\/Kaufmann EFZ/.test($('cv-sheet').textContent));
  ok('CV zeigt gewählte Stärken', /Organisation/.test($('cv-sheet').textContent));
  ok('CV zeigt Schnupper-Erfahrung', /Raiffeisenbank/.test($('cv-sheet').textContent));
  // Drucken
  let printed = false; window.print = function () { printed = true; };
  click(qs('[data-action="cv-print"]'));
  ok('CV Drucken ruft window.print + Toast', printed === true && /zum Drucken/.test($('toast').textContent));

  // ═════════════ CHAT (Lernende) · Senden · XSS ═════════════
  console.log('\n[Chat · Liste → Konversation → Senden · XSS]');
  await go('chat');
  ok('Chat-Liste mit Konversationen', qsa('.conv').length === 3);
  ok('Erste Konversation aktiv', !!qs('.conv.active') && window.App.route === 'chat');
  ok('Chat-Log zeigt Nachrichten', qsa('#chat-log .bubble').length >= 1);
  ok('Chat-Kopf zeigt Partner', /Zürcher Kantonalbank/.test($('chat-head').textContent));
  // Andere Konversation öffnen
  const convSbb = qs('.conv[data-conv="c-sbb"]');
  click(convSbb);
  await delay(0);
  ok('Konversation wechseln (SBB)', window.lang && /SBB AG/.test($('chat-head').textContent) && convSbb.classList.contains('active'));
  // Nachricht senden
  const logBefore = qsa('#chat-log .bubble').length;
  typeInto($('chat-inp'), 'Guten Tag, ich habe noch eine Frage.');
  submit(qs('[data-action="chat-send"]'));
  await waitFor(() => qsa('#chat-log .bubble').length === logBefore + 1);
  ok('Nachricht senden fügt Bubble hinzu', qsa('#chat-log .bubble.me').length >= 1);
  ok('Eingabefeld nach Senden geleert', $('chat-inp').value === '');
  ok('Gesendete Bubble zeigt "gesendet"', /gesendet/.test(qs('#chat-log .bubble.me').textContent));
  // Leere Nachricht wird nicht gesendet
  const logNow = qsa('#chat-log .bubble').length;
  typeInto($('chat-inp'), '   ');
  submit(qs('[data-action="chat-send"]'));
  await delay(0);
  ok('Leere Nachricht wird ignoriert', qsa('#chat-log .bubble').length === logNow);
  // XSS-Escape: HTML-Payload darf nicht als Markup landen
  const xss = '<img src=x onerror="window.__xss=1">';
  window.__xss = 0;
  typeInto($('chat-inp'), xss);
  submit(qs('[data-action="chat-send"]'));
  await waitFor(() => qsa('#chat-log .bubble').length === logNow + 1);
  ok('XSS-Payload nicht als <img> gerendert', qsa('#chat-log img').length === 0);
  const meBubbles = qsa('#chat-log .bubble.me');
  ok('XSS-Payload als Text escaped', /&lt;img/.test(meBubbles[meBubbles.length - 1].innerHTML));
  ok('XSS-Handler nicht ausgeführt', window.__xss === 0);

  // ═════════════ PREISE ═════════════
  console.log('\n[Preise]');
  await go('preise');
  ok('Preise-H1 vorhanden', /Preise/.test(qs('.page-h1').textContent));
  ok('Lernende-Frei-Karte vorhanden', /kostenlos/.test($('view').textContent));
  ok('Drei Betriebs-Tarife', qsa('.tarif-col').length === 3);
  ok('Empfohlener Tarif markiert', !!qs('.tarif-col.hot') && /empfohlen/.test($('view').textContent));
  click(qs('.tarif-col.hot [data-action="choose-plan"]'));
  ok('Tarif wählen → Toast', /gewählt/.test($('toast').textContent));

  // ═════════════ BETRIEB-FLOWS ═════════════
  console.log('\n[Betrieb · Kandidaten · Filter · Profil · Einladen]');
  click(qs('.role-opt[data-role="betrieb"]'));
  await waitFor(() => window.App.role === 'betrieb' && window.App.route === 'start');
  ok('Rolle betrieb für Betriebs-Flows', window.App.role === 'betrieb');

  // Header-Nav (Betrieb) jeden Link
  const navRoutesBetr = ['start', 'kandidaten', 'ausschreiben', 'chat', 'dashboard'];
  for (const r of navRoutesBetr) {
    const link = qs('#primary-nav .nav-link[data-route="' + r + '"]');
    click(link);
    await waitFor(() => window.App.route === r);
    ok('Betrieb-Nav → ' + r, window.App.route === r);
  }

  // Kandidaten suchen + Filter
  await go('kandidaten');
  ok('Kandidaten-Filter-Spalte', !!qs('.filter-col') && qsa('.filter-group').length === 3);
  await waitFor(() => qsa('#pool-list .list-item').length > 0);
  ok('Alle 4 Kandidaten gelistet', qsa('#pool-list .list-item').length === 4);
  ok('Anonyme Kandidaten maskiert', /anonym/.test($('pool-list').textContent));
  // Pool-Facet-Counts: jede Option mit Trefferzahl rechts
  ok('Jede Pool-Filter-Option hat eine fo-count-Zahl', qsa('.filter-col .filter-opt').length > 0 &&
    qsa('.filter-col .filter-opt').every((l) => !!qs('.fo-count', l) && /^\d+$/.test(qs('.fo-count', l).textContent)));
  ok('Pool-Facet-Count "Ganze Schweiz" = 4',
    qs('.filter-col input[data-poolfilter-key="region"][value="all"]').closest('.filter-opt').querySelector('.fo-count').textContent === '4');
  ok('Pool-Facet-Count Region=Bern = 1',
    qs('.filter-col input[data-poolfilter-key="region"][value="bern"]').closest('.filter-opt').querySelector('.fo-count').textContent === '1');
  // Region-Filter
  changeTo(qs('input[data-poolfilter-key="region"][value="bern"]'), 'bern');
  await waitFor(() => qsa('#pool-list .list-item').length === 1);
  ok('Region=Bern → 1 Kandidat', qsa('#pool-list .list-item').length === 1);
  click(qs('[data-action="reset-pool-filter"]'));
  await waitFor(() => qsa('#pool-list .list-item').length === 4);
  // Noten-Filter
  changeTo(qs('input[data-poolfilter-key="note"][value="55"]'), '55');
  await waitFor(() => qsa('#pool-list .list-item').length === 1);
  ok('Noten Ø≥5.5 → 1 Kandidat (Noah)', qsa('#pool-list .list-item').length === 1 && /Noah/.test($('pool-list').textContent));
  click(qs('[data-action="reset-pool-filter"]'));
  await waitFor(() => qsa('#pool-list .list-item').length === 4);
  // Inline-Suche
  typeInto($('pool-q'), 'Empathie');
  await waitFor(() => qsa('#pool-list .list-item').length === 1);
  ok('Suche "Empathie" → 1 Kandidat', qsa('#pool-list .list-item').length === 1);
  // Empty-State + Reset
  typeInto($('pool-q'), 'gibtsnicht');
  await waitFor(() => !!qs('#pool-list .empty-state'));
  ok('Kandidaten-Empty-State', !!qs('#pool-list .empty-state'));
  click(qs('#pool-list .empty-state [data-action="reset-pool-filter"]'));
  await waitFor(() => qsa('#pool-list .list-item').length === 4);
  ok('Pool-Reset stellt 4 Kandidaten her', qsa('#pool-list .list-item').length === 4);

  // Kandidat-Profil öffnen
  click(qs('#pool-list .list-item[data-id="k-lena"]'));
  await waitFor(() => window.App.route === 'kandidat' && window.App.param === 'k-lena');
  ok('Kandidat-Profil geöffnet', window.App.route === 'kandidat');
  ok('Zeugnis-Strip mit Noten', qsa('.zeugnis-strip .zrow').length === 4);
  ok('Stärken-Tags (statisch) sichtbar', qsa('.detail-sec .tag.static').length >= 1);
  ok('Einladen-Button vorhanden', !!qs('[data-action="open-schnupper"]'));

  // Schnupper-Einladung (Modal)
  console.log('\n[Schnupper-Einladung · Modal]');
  click(qs('[data-action="open-schnupper"]'));
  await waitFor(() => !!$('schnupper-dialog'));
  ok('Schnupper-Modal geöffnet', !!$('schnupper-dialog') && /einladen/.test($('schnupper-dialog').textContent));
  // Leeres Datum blockt
  const einlVorher = window.App.einladungen.length;
  submit(qs('[data-action="schnupper-form"]'));
  await delay(0);
  ok('Leeres Datum blockt Einladung', window.App.einladungen.length === einlVorher && !!$('schnupper-dialog'));
  ok('Toast fordert Datum', /Datum angeben/.test($('toast').textContent));
  // Datum füllen → senden
  typeInto(qs('[data-sfield="datum"]', $('schnupper-dialog')), 'Mi 14. Mai');
  submit(qs('[data-action="schnupper-form"]'));
  await waitFor(() => !$('schnupper-dialog'));
  ok('Einladung gesendet schliesst Modal', !$('schnupper-dialog') && window.App.einladungen.length === einlVorher + 1);
  ok('Toast bestätigt Einladung', /zum Schnuppern eingeladen/.test($('toast').textContent));
  // Modal erneut öffnen + Esc schliesst
  await go('kandidat', 'k-lena');
  click(qs('[data-action="open-schnupper"]'));
  await waitFor(() => !!$('schnupper-dialog'));
  doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  ok('Esc schliesst Schnupper-Modal', !$('schnupper-dialog'));

  // Nachricht senden (msg-kandidat) → Chat
  await go('kandidat', 'k-noah');
  click(qs('[data-action="msg-kandidat"]'));
  await waitFor(() => window.App.route === 'chat');
  ok('"Nachricht senden" → Betriebs-Chat', window.App.route === 'chat' && qsa('.conv').length === 2);

  // ═════════════ STELLE AUSSCHREIBEN ═════════════
  console.log('\n[Stelle ausschreiben · Betriebsprofil · Inserat]');
  await go('ausschreiben');
  ok('Ausschreiben-H1 vorhanden', /Stelle ausschreiben/.test($('view').textContent));
  ok('Betriebsprofil-Vollständigkeit vorhanden', !!$('betrieb-pct'));
  const bp0 = $('betrieb-pct').textContent;
  // Betriebsprofil live tippen
  typeInto(qs('[data-bfield="firma"]'), 'Muster AG');
  typeInto(qs('[data-bfield="branche"]'), 'IT');
  typeInto(qs('[data-bfield="ort"]'), 'Zürich');
  ok('Betrieb-State live', window.App.betrieb.firma === 'Muster AG');
  ok('Betriebs-Vollständigkeit steigt', $('betrieb-pct').textContent !== bp0 && $('betrieb-pct').textContent === '100%');
  click(qs('[data-action="save-betrieb"]'));
  ok('Betriebsprofil speichern → Toast', /Betriebsprofil gespeichert/.test($('toast').textContent));
  // Inserat ohne Beruf blockt
  ok('Inserat-Empty-State initial sichtbar', $('inserat-empty') && $('inserat-empty').hidden === false);
  const insVorher = window.App.inserate.length;
  click(qs('[data-action="publish-inserat"]'));
  await delay(0);
  ok('Inserat ohne Berufsbild blockt', window.App.inserate.length === insVorher && /Berufsbild angeben/.test($('toast').textContent));
  // Inserat füllen + veröffentlichen
  typeInto(qs('[data-ifield="beruf"]'), 'Informatiker/in EFZ');
  typeInto(qs('[data-ifield="plaetze"]'), '2');
  typeInto(qs('[data-ifield="beginn"]'), 'August 2026');
  click(qs('[data-action="publish-inserat"]'));
  await waitFor(() => qsa('#inserat-list .list-item').length === insVorher + 1);
  ok('Inserat veröffentlicht erscheint in Liste', qsa('#inserat-list .list-item').length === 1 && /Informatiker\/in EFZ/.test($('inserat-list').textContent));
  ok('Inserat-Empty-State danach versteckt', $('inserat-empty').hidden === true);
  ok('Veröffentlicht-Toast', /veröffentlicht/.test($('toast').textContent));
  ok('Inserat-Felder zurückgesetzt', qs('[data-ifield="beruf"]').value === '');

  // ═════════════ BETRIEB-DASHBOARD / PIPELINE ═════════════
  console.log('\n[Pipeline · Betrieb-Dashboard]');
  await go('dashboard');
  ok('Pipeline-H1 vorhanden', /Pipeline-Übersicht/.test($('view').textContent));
  ok('Pipeline-Metriken (4)', qsa('.metric').length === 4);
  ok('Veröffentlichte Stellen zählt Inserat', /1/.test(qsa('.metric .metric-num')[0].textContent));
  ok('Kandidaten-Status-Liste', qsa('.status-list li').length === 4);

  // ═════════════ 404 / NOTFOUND ═════════════
  console.log('\n[Sonderfälle · 404 · Rollen-Routen-Schutz]');
  // Lernende-Route als Betrieb aufrufen → notfound
  await go('profil');
  ok('Lernende-Route als Betrieb → 404', /Seite nicht gefunden/.test($('view').textContent));
  // unbekannte Stellen-ID → 404
  click(qs('.role-opt[data-role="lernende"]'));
  await waitFor(() => window.App.role === 'lernende');
  await go('stelle', 'gibtsnicht');
  ok('Unbekannte Stellen-ID → 404', /Seite nicht gefunden/.test($('view').textContent));
  // komplett unbekannte Route
  await go('quatsch');
  ok('Unbekannte Route → 404', /Seite nicht gefunden/.test($('view').textContent));

  // ═════════════ FOOTER-NAV + LOGIN-TOAST ═════════════
  console.log('\n[Footer-Nav · Login-Toast · Consent]');
  await go('start');
  click(qs('#footer a[data-route="preise"]'));
  await waitFor(() => window.App.route === 'preise');
  ok('Footer-Link → Preise', window.App.route === 'preise');
  click($('login-btn'));
  ok('Login-Button zeigt Demo-Toast', /Login-Demo/.test($('toast').textContent));
  // Consent (falls eingeblendet) wegklicken
  if (!$('consent').hidden) {
    click(qs('[data-action="consent-accept"]'));
    ok('Consent-Banner schliesst', $('consent').hidden === true);
  } else {
    ok('Consent bereits akzeptiert/ausgeblendet', true);
  }

  // ═════════════ KEINE JS-FEHLER ═════════════
  console.log('\n[JS-Fehler-Bilanz]');
  ok('Keine JS-Laufzeitfehler während Click-Through', errors.length === 0);
  if (errors.length) errors.slice(0, 8).forEach((e) => console.log('     ! ' + e));

  // ═════════════ AUSGABE ═════════════
  console.log('\n════════════════════════════');
  console.log(`  Bestanden: ${passed}   Fehlgeschlagen: ${failed}`);
  console.log(failed === 0 ? '  ✅ Click-Through grün.' : '  ❌ Click-Through rot.');
  console.log('════════════════════════════');
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => { console.error('FATAL:', e && e.stack ? e.stack : e); process.exit(2); });
