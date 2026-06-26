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

  // Mobile-Disclosure: einklappbares Filter-Panel (Stellen)
  console.log('\n[Stellen-Suche · Mobile-Filter-Disclosure]');
  const stToggle = qs('.filter-col .filter-toggle[data-action="toggle-filter-panel"]');
  ok('Filter-Trigger-Button vorhanden', !!stToggle);
  ok('Trigger steuert #filter-body (aria-controls)', stToggle.getAttribute('aria-controls') === 'filter-body');
  ok('Filter-Body-Container vorhanden mit id=filter-body', !!qs('.filter-col #filter-body.filter-body'));
  ok('filter-head liegt im filter-body (Desktop unverändert)', !!qs('.filter-col .filter-body .filter-head'));
  ok('Panel startet eingeklappt (kein is-open)', !qs('.filter-col').classList.contains('is-open'));
  ok('Trigger aria-expanded startet false', stToggle.getAttribute('aria-expanded') === 'false');
  ok('Filter-Count-Badge bei 0 aktiven Filtern leer', qs('.filter-col .ft-count').textContent === '');
  click(stToggle);
  ok('Klick öffnet Panel (is-open gesetzt)', qs('.filter-col').classList.contains('is-open'));
  ok('Trigger aria-expanded=true nach Öffnen', stToggle.getAttribute('aria-expanded') === 'true');
  click(stToggle);
  ok('Erneuter Klick schliesst Panel', !qs('.filter-col').classList.contains('is-open') &&
    stToggle.getAttribute('aria-expanded') === 'false');

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
  ok('Trigger-Count-Badge zeigt 1 aktiven Filter', qs('.filter-col .ft-count').textContent === '1');
  // Chip wegklicken → wieder alle
  click(qs('#active-chips .chip-active[data-key="branche"]'));
  await waitFor(() => qsa('#stellen-list .list-item').length === 6);
  ok('Filter-Chip entfernen stellt 6 Treffer wieder her', qsa('#stellen-list .list-item').length === 6);
  ok('Trigger-Count-Badge wieder leer nach Filter-Entfernen', qs('.filter-col .ft-count').textContent === '');

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

  // ─── Gespeicherte Suche / Job-Alert (Saved Search) ───
  console.log('\n[Stellen · Gespeicherte Suche / Job-Alert]');
  window.App.savedSearches.length = 0;
  await go('stellen');
  await waitFor(() => qsa('#stellen-list .list-item').length === 6);
  ok('Save-Search-Leiste vorhanden (nur Lernende)', !!qs('#save-search-bar'));
  ok('Leiste zeigt "Suche speichern"-Button', !!qs('#save-search-bar [data-action="save-search"]') &&
    /Suche speichern/.test(qs('#save-search-bar').textContent));
  ok('Leiste zeigt Benachrichtigungs-Hinweis', /Wird bei neuen Treffern benachrichtigt/.test(qs('#save-search-bar').textContent));
  // Filter setzen, dann Suche speichern
  changeTo(qs('input[data-filter-key="branche"][value="it"]'), 'it');
  await waitFor(() => qsa('#stellen-list .list-item').length === 1);
  ok('Vor dem Speichern noch nicht gespeichert', !!qs('#save-search-bar [data-action="save-search"]'));
  click(qs('#save-search-bar [data-action="save-search"]'));
  await waitFor(() => window.App.savedSearches.length === 1);
  ok('Suche gespeichert im State (mit branche=it)', window.App.savedSearches.length === 1 &&
    window.App.savedSearches[0].filters.branche === 'it');
  ok('Speichern erzeugt menschenlesbares Label', /Informatik/.test(window.App.savedSearches[0].label));
  ok('Gespeicherte Suche persistiert in localStorage',
    JSON.parse(window.localStorage.getItem('lehrly:savedSearches')).length === 1);
  ok('Speichern-Toast bestätigt Job-Alert', /benachrichtigen/.test($('toast').textContent));
  ok('Leiste zeigt nach Speichern "Suche gespeichert" + Entfernen-Button',
    /Suche gespeichert/.test(qs('#save-search-bar').textContent) &&
    !!qs('#save-search-bar [data-action="remove-search"]') &&
    !qs('#save-search-bar [data-action="save-search"]'));
  ok('Gespeicherter Status nutzt Erfolgs-Grün (is-saved)', !!qs('#save-search-bar .ss-status.is-saved'));
  // Identische Filterkombination → erneut als gespeichert erkannt (kein Duplikat)
  click(qs('[data-action="reset-stellen-filter"]'));
  await waitFor(() => qsa('#stellen-list .list-item').length === 6);
  changeTo(qs('input[data-filter-key="branche"][value="it"]'), 'it');
  await waitFor(() => qsa('#stellen-list .list-item').length === 1);
  ok('Identische Filterkombination wird als bereits gespeichert erkannt',
    !!qs('#save-search-bar [data-action="remove-search"]') && !qs('#save-search-bar [data-action="save-search"]'));
  // Entfernen
  click(qs('#save-search-bar [data-action="remove-search"]'));
  await waitFor(() => window.App.savedSearches.length === 0);
  ok('Entfernen löscht gespeicherte Suche', window.App.savedSearches.length === 0 &&
    !!qs('#save-search-bar [data-action="save-search"]'));
  ok('Entfernen-Toast bestätigt', /Suche entfernt/.test($('toast').textContent));
  click(qs('[data-action="reset-stellen-filter"]'));
  await waitFor(() => qsa('#stellen-list .list-item').length === 6);

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

  // ── Ort/PLZ-Hero-Suche (Lernende): sichtbarer, entfernbarer Ort-Filter (idx 0) ──
  console.log('\n[Ort-Filter · Stellensuche sichtbar/entfernbar]');
  await go('start');
  const heroOrtForm = qs('.search-hero[data-target="stellen"]');
  ok('Lernende-Hero hat Ort/PLZ-Feld', !!qs('input[name="ort"]', heroOrtForm));
  typeInto(qs('input[name="ort"]', heroOrtForm), 'Zürich');
  submit(heroOrtForm);
  await waitFor(() => window.App.route === 'stellen' && window.App.stellenFilters.ort === 'Zürich');
  ok('Hero-Ort-Suche füllt stellenFilters.ort + navigiert', window.App.stellenFilters.ort === 'Zürich' && qsa('#stellen-list .list-item').length === 2);
  ok('Ort-Inputfeld in results-bar gefüllt', !!$('stellen-ort') && $('stellen-ort').value === 'Zürich');
  ok('Entfernbarer Ort-Chip vorhanden', !!qs('[data-action="clear-ort"]') && /Ort: Zürich/.test(qs('[data-action="clear-ort"]').textContent));
  ok('Filter-Badge zählt Ort mit', /1/.test(qs('.ft-count').textContent));
  // Ort-Chip-X entfernen → ort leer, Liste aktualisiert
  click(qs('[data-action="clear-ort"]'));
  await waitFor(() => window.App.stellenFilters.ort === '' && qsa('#stellen-list .list-item').length === 6);
  ok('clear-ort entfernt Ort-Filter + Liste aktualisiert', window.App.stellenFilters.ort === '' && qsa('#stellen-list .list-item').length === 6 && !qs('[data-action="clear-ort"]'));
  // Ort-Inputfeld live editieren → renderStellenResults reagiert
  typeInto($('stellen-ort'), 'Bern');
  await waitFor(() => window.App.stellenFilters.ort === 'Bern' && qsa('#stellen-list .list-item').length === 1);
  ok('Ort-Inputfeld live editieren filtert sofort', window.App.stellenFilters.ort === 'Bern' && qsa('#stellen-list .list-item').length === 1);
  // Empty-State nennt den Ort im Heading
  typeInto($('stellen-ort'), 'Genf');
  await waitFor(() => qsa('#stellen-list .list-item').length === 0);
  ok('Empty-State-Heading nennt "in Genf"', /in Genf/.test(qs('#stellen-list .empty-state h3').textContent));
  // "Filter zurücksetzen" leert ort
  click(qs('#stellen-list [data-action="reset-stellen-filter"]'));
  await waitFor(() => window.App.stellenFilters.ort === '' && qsa('#stellen-list .list-item').length === 6);
  ok('reset-stellen-filter leert ort weiterhin', window.App.stellenFilters.ort === '');

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

  // Frage stellen → Chat + Toast (ZKB hat bestehende Konversation → Match-Pfad)
  click(qs('[data-action="ask-stelle"]'));
  await waitFor(() => window.App.route === 'chat');
  ok('"Frage stellen" → Chat', window.App.route === 'chat');
  ok('Toast nennt konkreten Betrieb (ZKB-Match)', /Frage an Zürcher Kantonalbank gestartet\./.test($('toast').textContent));
  ok('ZKB-Frage öffnet die ZKB-Konversation (kein Fallback)',
    /Zürcher Kantonalbank/.test($('chat-head').textContent) && !!qs('.conv.active[data-conv="c-zkb"]'));

  // zurück zu Detail → bewerben
  await go('stelle', 'zkb-kauffrau');
  click(qs('[data-action="goto-bewerben"]'));
  await waitFor(() => window.App.route === 'bewerben');
  ok('Bewerben-Stepper Step 1', !!qs('#bewerben-stepper .step-node.current') && /Profil prüfen/.test($('bewerben-stepper').textContent));

  // ═════════════ BEWERBEN · BREADCRUMB (Major-Fix: mittlerer Crumb mit id, kein 404) ═════════════
  console.log('\n[Bewerben · Breadcrumb · mittlerer Crumb → Stellen-Detail]');
  const bcCrumbs = qsa('.breadcrumb a');
  ok('Breadcrumb hat zwei Links (Stellen finden / Beruf)', bcCrumbs.length === 2);
  const bcStelle = bcCrumbs.filter((a) => a.dataset.route === 'stelle')[0];
  ok('T3: Mittlerer Crumb hat data-id (id mitgegeben)', !!bcStelle && bcStelle.dataset.id === 'zkb-kauffrau');
  ok('T3: Mittlerer Crumb-href = #/stelle/<id> (nicht ohne id)', bcStelle.getAttribute('href') === '#/stelle/zkb-kauffrau');
  // T4 Regression: Crumbs ohne id dürfen keinen /null und keinen doppelten Slash erzeugen
  const bcStellen = bcCrumbs.filter((a) => a.dataset.route === 'stellen')[0];
  ok('T4: Crumb ohne id ist sauber (#/stellen, kein /null)', bcStellen.getAttribute('href') === '#/stellen' && !bcStellen.hasAttribute('data-id'));
  // T3: Klick auf mittleren Crumb → zurück zur Stellen-Detailseite, KEIN 404
  click(bcStelle);
  await waitFor(() => window.App.route === 'stelle');
  ok('T3: Mittlerer Crumb führt zur Stellen-Detailseite', window.App.route === 'stelle' && window.App.param === 'zkb-kauffrau');
  ok('T3: Kein 404 nach Crumb-Klick', !/Seite nicht gefunden/i.test($('view').textContent) && !!qs('.detail-h1'));
  // zurück in den Bewerben-Flow für die folgenden Stepper-Tests
  await go('stelle', 'zkb-kauffrau');
  click(qs('[data-action="goto-bewerben"]'));
  await waitFor(() => window.App.route === 'bewerben' && !!qs('#bewerben-stepper .step-node.current'));

  // ARIA-Fortschritt + Stepper-Semantik
  ok('Stepper hat aria-label', $('bewerben-stepper').getAttribute('aria-label') === 'Bewerbungs-Fortschritt');
  ok('Fortschritts-Label "Schritt 1 von 4 · Profil prüfen"', /Schritt\s*1\s*von\s*4\s*·\s*Profil prüfen/.test($('bewerben-progress').textContent));
  ok('Aktueller Schritt hat aria-current="step"', qs('#bewerben-stepper .step-node.current').getAttribute('aria-current') === 'step');
  ok('Zukunfts-Schritte aria-disabled (nicht klickbar)', qsa('#bewerben-stepper [aria-disabled="true"]').length === 3);
  ok('Step 1 hat keinen klickbaren done-Knoten', !qs('#bewerben-stepper button.step-node'));
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
  // Stepper-Direktsprung: in Step 4 sind die 3 abgeschlossenen Schritte klickbare Buttons
  ok('Drei klickbare done-Knoten in Step 4', qsa('#bewerben-stepper button.step-node.done[data-action="bewerben-goto"]').length === 3);
  ok('Fortschritts-Label zeigt Schritt 4', /Schritt\s*4\s*von\s*4\s*·\s*Absenden/.test($('bewerben-progress').textContent));
  // Direktsprung zurück zu Schritt 2 (Motivation) per Stepper
  click(qs('#bewerben-stepper button[data-step="2"]'));
  await waitFor(() => !!$('bw-motivation'));
  ok('Stepper-Direktsprung führt zu Step 2', window.App && $('bw-motivation') && /Schritt\s*2\s*von\s*4/.test($('bewerben-progress').textContent));
  ok('Motivation bleibt nach Direktsprung erhalten', /Bankberuf/.test($('bw-motivation').value));
  // Vorwärts-Sprung im Stepper ist nicht möglich (Validierung bleibt geschützt)
  ok('Kein Vorwärts-Sprung-Button für Step 3/4 im Stepper', !qs('#bewerben-stepper button[data-step="3"]') && !qs('#bewerben-stepper button[data-step="4"]'));
  // wieder bis Step 4 vor (validiert)
  click(qs('[data-action="bewerben-next"]'));
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

  // idx 4/5/19/27: Kennzahlen + Aktivität aus echtem State (keine Fantasiewerte)
  const unreadLernMetric = qsa('.metric').find((m) => /Ungelesene Nachrichten/.test(m.textContent));
  ok('"Ungelesene Nachrichten" (Lernende) = unreadCount (kein fixer Wert)',
    !!unreadLernMetric &&
    unreadLernMetric.querySelector('.metric-num').textContent.trim() === String(window.unreadCount('lernende')));
  ok('"Ungelesene Nachrichten" (Lernende) deterministisch = 3 Demo-Konversationen',
    window.unreadCount('lernende') === 3 &&
    unreadLernMetric.querySelector('.metric-num').textContent.trim() === '3');
  // Aktivität spiegelt echten State: Profil-%-Zeile = profilVollstaendigkeit(), KEINE fixe "80%"
  const aktBlock = qsa('.dash-block').find((b) => /Aktivität/.test(b.querySelector('.detail-h2') ? b.querySelector('.detail-h2').textContent : ''));
  ok('Aktivität: keine erfundene "80%"-Zeile', !!aktBlock && !/80% vollständig/.test(aktBlock.textContent));
  // Profil-%-Zeile in Aktivität MUSS dem Metrik-Wert "Profil-Vollständigkeit" entsprechen (kein Widerspruch)
  const profilMetric = qsa('.metric').find((m) => /Profil-Vollständigkeit/.test(m.textContent));
  const profilPctVal = profilMetric.querySelector('.metric-num').textContent.trim().replace('%', '');
  ok('Aktivität: Profil-%-Zeile entspricht Metrik (kein Widerspruch)',
    new RegExp('Profil zu ' + profilPctVal + '% vollständig').test(aktBlock.textContent));
  ok('Aktivität: Bewerbungszeile aus App.bewerbungen abgeleitet',
    window.App.bewerbungen.length >= 1 && /Beworben: .* bei Zürcher Kantonalbank/.test(aktBlock.textContent));

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

  // Gespeicherte Suchen auf dem Dashboard
  console.log('\n[Dashboard · Gespeicherte Suchen]');
  window.App.savedSearches.length = 0;
  await go('dashboard');
  ok('Dashboard-Block "Gespeicherte Suchen" vorhanden', !!qs('.dash-saved') && /Gespeicherte Suchen/.test(qs('.dash-saved').textContent));
  ok('Leerzustand verweist auf Stellensuche', !!qs('.dash-saved [data-action="goto-stellen"]') &&
    /benachrichtigt/.test(qs('.dash-saved').textContent));
  // Eine Suche speichern, dann auf Dashboard prüfen
  window.App.savedSearches.push({ id: 'banken|all|all|all|', filters: { branche: 'banken', region: 'all', typ: 'all', lehrjahr: 'all', q: '' }, label: 'Banken / Finanz', ts: Date.now() });
  await go('dashboard');
  ok('Gespeicherte Suche wird auf Dashboard gelistet', qsa('.dash-saved .saved-search-item').length === 1 &&
    /Banken \/ Finanz/.test(qs('.dash-saved').textContent));
  ok('Dashboard-Eintrag zeigt "E-Mail-Abo aktiv"', /E-Mail-Abo aktiv/.test(qs('.dash-saved').textContent));
  // Klick öffnet Stellen mit gesetztem Filter
  click(qs('.dash-saved .saved-search-item[data-id="banken|all|all|all|"]'));
  await waitFor(() => window.App.route === 'stellen');
  ok('Klick auf gespeicherte Suche öffnet Stellen mit Filter',
    window.App.route === 'stellen' && window.App.stellenFilters.branche === 'banken');
  click(qs('[data-action="reset-stellen-filter"]'));
  await waitFor(() => qsa('#stellen-list .list-item').length === 6);
  window.App.savedSearches.length = 0;

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

  // ── NOTEN: editierbar, persistent, kein Fremd-/Demowert ──
  console.log('\n[Profil · Noten editierbar · echte Daten]');
  const sNoten = $('sec-noten');
  ok('Noten-Abschnitt: vier number-Inputs', qsa('input[type="number"][data-nfield]', sNoten).length === 4);
  ok('Noten-Inputs: CH-Skala min/max/step', (() => {
    const inp = qs('input[data-nfield="deutsch"]', sNoten);
    return inp.getAttribute('min') === '1' && inp.getAttribute('max') === '6' && inp.getAttribute('step') === '0.1';
  })());
  // Frisches Profil: keine Fremdnoten gerendert, Inputs leer
  ok('Frisches Profil: keine erfundenen Noten vorbelegt', qsa('input[data-nfield]', sNoten).every((i) => i.value === ''));
  ok('Frisches Profil: kein Demo-Notenstrip im Abschnitt', !qs('.zeugnis-strip', sNoten));
  // Eingabe einer echten Note
  typeInto(qs('[data-nfield="deutsch"]', sNoten), '5.2');
  ok('Note Deutsch live in State', window.App.profile.noten.deutsch === '5.2');
  typeInto(qs('[data-nfield="mathematik"]', sNoten), '4.5');
  ok('Note Mathematik live in State', window.App.profile.noten.mathematik === '4.5');
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
  // Noten landen mit dem Profil im localStorage (Persistenz über Reload)
  ok('Noten in localStorage persistiert', (() => {
    const p = JSON.parse(window.localStorage.getItem('lehrly:profile'));
    return p.noten && p.noten.deutsch === '5.2' && p.noten.mathematik === '4.5';
  })());
  // Enter-Submit des Profil-Formulars (data-action="profil-form") teilt denselben Pfad
  typeInto(qs('[data-field="vorname"]'), 'Lena');
  $('toast').textContent = '';
  submit(qs('#form-steckbrief'));
  await delay(0);
  ok('Profil-Enter-Submit → Toast "Profil gesichert."', $('toast').textContent === 'Profil gesichert.');
  ok('Profil-Enter-Submit → Toast ist role=status', $('toast').getAttribute('role') === 'status');
  ok('Profil-Enter-Submit erhält Feldwert (kein Reset/Datenverlust)',
    qs('[data-field="vorname"]').value === 'Lena' && window.App.profile.vorname === 'Lena');
  // ── Dokumente: ehrlicher Status + echter Upload-Toggle (toter-Klick-Fix) ──
  console.log('\n[Profil · Dokumente · ehrlicher Status · Upload-Toggle · Persistenz]');
  // Frischer Demozustand: keine vorgetäuschten "hochgeladen"/"geprüft"-Status
  window.App.docsUploaded = {};
  window.localStorage.removeItem('lehrly:docsUploaded');
  await go('profil');
  const docList = qs('#sec-dokumente .doc-list');
  ok('Drei Dokument-Zeilen mit stabilen data-doc-Keys', qsa('.doc-line', docList).length === 3 &&
    !!qs('[data-action="upload-doc"][data-doc="lebenslauf"]', docList) &&
    !!qs('[data-action="upload-doc"][data-doc="schulzeugnis"]', docList) &&
    !!qs('[data-action="upload-doc"][data-doc="motivation"]', docList));
  ok('Initial: alle drei Dokumente "offen" (kein vorgetäuschtes hochgeladen/geprüft)',
    qsa('.doc-line .dl-state.ok', docList).length === 0 &&
    qsa('.doc-line .dl-state.open', docList).length === 3 &&
    !/hochgeladen|geprüft/.test(docList.textContent));
  ok('Initial: jede Zeile hat einen aktiven Hochladen-Button',
    qsa('.doc-line [data-action="upload-doc"]', docList).length === 3);
  // Motivationsschreiben hochladen → Toast + Statuswechsel + Button verschwindet
  $('toast').textContent = '';
  click(qs('[data-action="upload-doc"][data-doc="motivation"]'));
  await waitFor(() => window.App.docsUploaded.motivation === true);
  ok('Upload Motivationsschreiben → Toast', /Dokument hochgeladen/.test($('toast').textContent));
  const motivLine = qsa('#sec-dokumente .doc-line').find((l) => /Motivationsschreiben/.test(l.textContent));
  ok('Status Motivationsschreiben wird "hochgeladen" (ok)', !!qs('.dl-state.ok', motivLine) &&
    /hochgeladen/.test(motivLine.textContent));
  ok('Hochladen-Button beim hochgeladenen Dokument entfernt', !qs('[data-action="upload-doc"]', motivLine));
  ok('Andere Dokumente bleiben "offen" mit Button',
    qsa('#sec-dokumente .doc-line .dl-state.open').length === 2 &&
    qsa('#sec-dokumente .doc-line [data-action="upload-doc"]').length === 2);
  // Persistenz + kein wiederholter Erfolgs-Toast
  ok('Upload-Status in localStorage persistiert', (() => {
    const d = JSON.parse(window.localStorage.getItem('lehrly:docsUploaded'));
    return d && d.motivation === true;
  })());
  // Reload simulieren: Re-Render hält "hochgeladen"
  await go('cv'); await go('profil');
  const motivLine2 = qsa('#sec-dokumente .doc-line').find((l) => /Motivationsschreiben/.test(l.textContent));
  ok('Nach Neu-Navigation bleibt Motivationsschreiben "hochgeladen"',
    !!qs('.dl-state.ok', motivLine2) && !qs('[data-action="upload-doc"]', motivLine2));

  // ═════════════ PROFIL · ANKER-TABS (Blocker-Fix: kein 404, kein Datenverlust) ═════════════
  console.log('\n[Profil · Anker-Tabs · kein 404 · Felder bleiben]');
  ok('Sechs Anker-Tabs vorhanden', qsa('.anchor-tabs .atab').length === 6);
  // Cancelable-Klick, um die native Anker-Navigation zu prüfen (preventDefault).
  // Hinweis: jsdom setzt location.hash trotz preventDefault (bekannte jsdom-Grenze);
  // im echten Browser bleibt der Hash dadurch #/profil. Die parseHash-Absicherung
  // (T2) hält die Route auch dann, wenn der Hash zum Anker wechselt.
  const clickCancelable = (el) => { const ev = new window.MouseEvent('click', { bubbles: true, cancelable: true }); el.dispatchEvent(ev); return ev; };
  ok('Vorname-Feld vor Tab-Klick gefüllt', qs('[data-field="vorname"]').value === 'Lena');
  const tabNoten = qsa('.anchor-tabs .atab').filter((a) => /sec-noten/.test(a.getAttribute('href')))[0];
  const evNoten = clickCancelable(tabNoten);
  await delay(0);
  ok('T1: Tab "Noten" wird aktiv markiert', tabNoten.classList.contains('active') && tabNoten.getAttribute('aria-current') === 'true');
  ok('T1: Handler verhindert nativen Anker-Sprung (preventDefault)', evNoten.defaultPrevented === true);
  ok('T1: Kein 404 nach Noten-Tab', window.App.route === 'profil' && !/Seite nicht gefunden/i.test($('view').textContent));
  ok('T1: Eingegebener Vorname bleibt erhalten', qs('[data-field="vorname"]').value === 'Lena' && window.App.profile.vorname === 'Lena');
  const tabStaerken = qsa('.anchor-tabs .atab').filter((a) => /sec-staerken/.test(a.getAttribute('href')))[0];
  clickCancelable(tabStaerken);
  await delay(0);
  ok('T1: Tab "Stärken" wird aktiv markiert', tabStaerken.classList.contains('active') && !tabNoten.classList.contains('active'));
  ok('T1: Kein 404 nach Stärken-Tab, Felder bleiben', window.App.route === 'profil' && qs('[data-field="vorname"]').value === 'Lena');

  // T2: direkter Anker-Deep-Link darf parseHash nicht auf 404 werfen
  window.location.hash = '#sec-noten';
  window.dispatchEvent(new window.HashChangeEvent('hashchange'));
  await delay(0);
  ok('T2: Direkter #sec-Anker hält Profil-Route', window.App.route === 'profil');
  ok('T2: Direkter #sec-Anker erzeugt kein 404', !/Seite nicht gefunden/i.test($('view').textContent));
  // wieder sauberer Router-Hash für Folgetests
  window.gotoRoute('profil');
  await waitFor(() => window.App.route === 'profil' && window.location.hash === '#/profil');

  // ═════════════ LEBENSLAUF-VORSCHAU (CV) ═════════════
  console.log('\n[CV · Lebenslauf-Vorschau]');
  click(qs('[data-action="goto-cv"]'));
  await waitFor(() => window.App.route === 'cv');
  ok('CV-Route aktiv', window.App.route === 'cv' && !!$('cv-sheet'));
  ok('CV zeigt Namen aus Profil', /Lena Muster/.test($('cv-sheet').textContent));
  ok('CV zeigt Berufswunsch', /Kauffrau\/Kaufmann EFZ/.test($('cv-sheet').textContent));
  ok('CV zeigt gewählte Stärken', /Organisation/.test($('cv-sheet').textContent));
  ok('CV zeigt Schnupper-Erfahrung', /Raiffeisenbank/.test($('cv-sheet').textContent));
  // CV-Schulnoten aus echten Profil-Daten (Deutsch 5.2, Mathematik 4.5) – teilweise erfasst
  const cvNotenBlock = qsa('.cv-block').filter((b) => /Schulnoten/.test(b.textContent))[0];
  ok('CV-Schulnoten: nur erfasste Fächer (2 Zeilen)', qsa('.zeugnis-strip .zrow', cvNotenBlock).length === 2);
  ok('CV-Schulnoten: echte Note 5.2 (Deutsch)', /Deutsch/.test(cvNotenBlock.textContent) && /5\.2/.test(cvNotenBlock.textContent));
  ok('CV-Schulnoten: echte Note 4.5 (Mathematik)', /Mathematik/.test(cvNotenBlock.textContent) && /4\.5/.test(cvNotenBlock.textContent));
  ok('CV-Schulnoten: kein Demowert für leere Fächer (kein Französisch/Englisch im Strip)',
    !/Französisch/.test(cvNotenBlock.textContent) && !/Englisch/.test(cvNotenBlock.textContent));
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
  // idx 4/19: nach eigener Antwort sinkt unreadCount (letzte Nachricht c-sbb ist nun me=true)
  ok('unreadCount(lernende) sinkt nach gesendeter Antwort (c-sbb gelesen)',
    window.unreadCount('lernende') === 2);
  ok('Gesendete Bubble zeigt "gesendet"', /gesendet/.test(qs('#chat-log .bubble.me').textContent));
  // idx 18: Sidebar-Vorschau/Zeit der aktiven Konversation aktualisiert sich nach dem Senden
  ok('Sidebar-Preview der aktiven Konversation zeigt gesendeten Text',
    /Guten Tag, ich habe noch eine Frage\./.test(qs('.conv.active[data-conv="c-sbb"] .conv-preview').textContent));
  ok('Sidebar-Zeit der aktiven Konversation zeigt Uhrzeit (HH:MM)',
    /^\d{2}:\d{2}$/.test(qs('.conv.active[data-conv="c-sbb"] .conv-time').textContent.trim()));
  ok('Aktiver Eintrag bleibt nach Re-Render markiert', !!qs('.conv.active[data-conv="c-sbb"]') &&
    qs('.conv.active[data-conv="c-sbb"]').getAttribute('aria-current') === 'true');
  ok('Listen-Reihenfolge nach Senden stabil (SBB nicht umsortiert)',
    qsa('.conv')[1] && qsa('.conv')[1].getAttribute('data-conv') === 'c-sbb');
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

  // ═════════════ CHAT-KONTEXT · Frage ohne bestehende Konversation (kein Fallback) ═════════════
  console.log('\n[Chat-Kontext · Lernende · neue Stub-Konversation statt ZKB-Fallback]');
  const convCountBefore = qsa('.conv').length;
  // Bosch Polymechaniker hat KEINE bestehende Konversation → es darf NICHT auf ZKB fallen.
  await go('stelle', 'bosch-poly');
  click(qs('[data-action="ask-stelle"]'));
  await waitFor(() => window.App.route === 'chat');
  ok('Frage (Bosch) → Chat', window.App.route === 'chat');
  ok('Aktive Konversation ist NICHT ZKB-Fallback',
    !/Zürcher Kantonalbank/.test($('chat-head').textContent) && !qs('.conv.active[data-conv="c-zkb"]'));
  ok('Chat-Header zeigt korrekten Betrieb (Bosch Schweiz)', /Bosch Schweiz/.test($('chat-head').textContent));
  ok('Chat-Header zeigt Stellenkontext (Beruf)', /Polymechaniker/.test($('chat-head').textContent));
  ok('Aktive Konversation hat partner = s.betrieb', /Bosch Schweiz/.test(qs('.conv.active .conv-name').textContent));
  ok('Neue Konversation in der Liste vorhanden', qsa('.conv').length === convCountBefore + 1 && !!qs('.conv[data-conv="c-bosch-poly"]'));
  ok('Toast nennt Bosch Schweiz', /Frage an Bosch Schweiz gestartet\./.test($('toast').textContent));
  // Neue Konversation mit msgs:[] → Empty-State im chat-log
  ok('Neue Konversation zeigt Empty-State im chat-log', !!qs('#chat-log .chat-log-empty') &&
    /Noch keine Nachrichten/.test($('chat-log').textContent));
  // Senden funktioniert auch in der frischen Konversation (inkl. XSS-Escape)
  typeInto($('chat-inp'), 'Guten Tag, ich interessiere mich für die Lehrstelle.');
  submit(qs('[data-action="chat-send"]'));
  await waitFor(() => qsa('#chat-log .bubble.me').length === 1);
  ok('Senden in neuer Konversation hängt Bubble an', qsa('#chat-log .bubble.me').length === 1 && !qs('#chat-log .chat-log-empty'));
  // idx 18: frischer Stub (ensureConv) hatte Platzhalter-Preview — nach Senden echter Text + Zeit
  ok('Stub-Preview ersetzt Platzhalter durch gesendeten Text',
    /Guten Tag, ich interessiere mich für die Lehrstelle\./.test(qs('.conv.active[data-conv="c-bosch-poly"] .conv-preview').textContent) &&
    !/noch keine Nachrichten/.test(qs('.conv.active[data-conv="c-bosch-poly"] .conv-preview').textContent));
  ok('Stub-Zeit ersetzt "Jetzt" durch Uhrzeit (HH:MM)',
    /^\d{2}:\d{2}$/.test(qs('.conv.active[data-conv="c-bosch-poly"] .conv-time').textContent.trim()));
  window.__xss2 = 0;
  typeInto($('chat-inp'), '<img src=x onerror="window.__xss2=1">');
  submit(qs('[data-action="chat-send"]'));
  await waitFor(() => qsa('#chat-log .bubble.me').length === 2);
  ok('XSS-Escape bleibt in neuer Konversation intakt', qsa('#chat-log img').length === 0 && window.__xss2 === 0);
  // Kein doppeltes Anlegen: erneut dieselbe Stelle-Frage stellen → gleiche id reaktiviert
  const convCountAfter = qsa('.conv').length;
  await go('stelle', 'bosch-poly');
  click(qs('[data-action="ask-stelle"]'));
  await waitFor(() => window.App.route === 'chat');
  ok('Erneute Bosch-Frage legt KEINE zweite Konversation an',
    qsa('.conv').length === convCountAfter && qsa('.conv[data-conv="c-bosch-poly"]').length === 1);
  ok('Erneute Frage reaktiviert dieselbe Konversation', !!qs('.conv.active[data-conv="c-bosch-poly"]'));
  // Coop EBA: zweite kontextlose Stelle → eigene neue Konversation (Header zeigt Coop)
  await go('stelle', 'coop-eba');
  click(qs('[data-action="ask-stelle"]'));
  await waitFor(() => window.App.route === 'chat');
  ok('Coop-Frage öffnet eigene Coop-Konversation (kein ZKB-Fallback)',
    /Coop Genossenschaft/.test($('chat-head').textContent) && !!qs('.conv.active[data-conv="c-coop-eba"]'));

  // ═════════════ PREISE ═════════════
  console.log('\n[Preise]');
  await go('preise');
  ok('Preise-H1 vorhanden', /Preise/.test(qs('.page-h1').textContent));
  ok('Lernende-Frei-Karte vorhanden', /kostenlos/.test($('view').textContent));
  ok('Drei Betriebs-Tarife', qsa('.tarif-col').length === 3);
  ok('Empfohlener Tarif markiert', !!qs('.tarif-col.hot') && /empfohlen/.test($('view').textContent));
  // ── Plan wählen: echter Zustand statt totem Klick ──
  console.log('\n[Preise · Plan wählen · Zustand · Markierung · Persistenz · Wechsel]');
  window.App.chosenPlan = null;
  window.localStorage.removeItem('lehrly:chosenPlan');
  await go('preise');
  ok('Initial: alle drei Tarife mit aktivem "Wählen"-Button',
    qsa('.tarif-col [data-action="choose-plan"]').length === 3 && !qs('.tarif-col.chosen'));
  // Empfohlenen Tarif wählen
  const hotPlanName = qs('.tarif-col.hot [data-action="choose-plan"]').dataset.plan;
  click(qs('.tarif-col.hot [data-action="choose-plan"]'));
  await waitFor(() => window.App.chosenPlan === hotPlanName);
  ok('Tarif wählen → Toast', /gewählt/.test($('toast').textContent));
  ok('Gewählter Tarif zeigt disabled "Aktueller Plan"', (() => {
    const col = qsa('.tarif-col').find((c) => c.classList.contains('chosen'));
    const btn = qs('button[disabled]', col);
    return !!col && col.classList.contains('hot') && !!btn && /Aktueller Plan/.test(btn.textContent) &&
      !qs('[data-action="choose-plan"]', col);
  })());
  ok('Nur ein Tarif markiert, andere behalten aktives "Wählen"',
    qsa('.tarif-col.chosen').length === 1 && qsa('.tarif-col [data-action="choose-plan"]').length === 2);
  ok('chosenPlan in localStorage persistiert', window.localStorage.getItem('lehrly:chosenPlan') === JSON.stringify(hotPlanName));
  // Anderen Plan wählen → Markierung wechselt
  const otherBtn = qs('.tarif-col:not(.chosen) [data-action="choose-plan"]');
  const otherName = otherBtn.dataset.plan;
  click(otherBtn);
  await waitFor(() => window.App.chosenPlan === otherName);
  ok('Anderen Tarif wählen → Markierung wechselt', (() => {
    const col = qsa('.tarif-col').find((c) => c.classList.contains('chosen'));
    return qsa('.tarif-col.chosen').length === 1 && /Aktueller Plan/.test(col.textContent) &&
      new RegExp(otherName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(col.textContent);
  })());
  // Reload simulieren: Markierung bleibt erhalten
  await go('start'); await go('preise');
  ok('Nach Neu-Navigation bleibt gewählter Tarif markiert (disabled "Aktueller Plan")',
    qsa('.tarif-col.chosen').length === 1 &&
    /Aktueller Plan/.test(qsa('.tarif-col').find((c) => c.classList.contains('chosen')).textContent));

  // ═════════════ BETRIEB-FLOWS ═════════════
  console.log('\n[Betrieb · Kandidaten · Filter · Profil · Einladen]');
  click(qs('.role-opt[data-role="betrieb"]'));
  await waitFor(() => window.App.role === 'betrieb' && window.App.route === 'start');
  ok('Rolle betrieb für Betriebs-Flows', window.App.role === 'betrieb');

  // ── Betriebs-Startseite: Kandidaten-Hero OHNE folgenloses Ort/PLZ-Feld (idx 7) ──
  await go('start');
  const kandHero = qs('.search-hero[data-target="kandidaten"]');
  ok('Betrieb-Start zeigt Kandidaten-Hero', !!kandHero);
  ok('Kandidaten-Hero hat KEIN Ort/PLZ-Feld mehr', !qs('input[name="ort"]', kandHero) && !$('sh-ort'));
  ok('Kandidaten-Hero behält Beruf/Stärke-Feld + Suchen', !!qs('input[name="q"]', kandHero) && !!qs('.sh-btn', kandHero));
  typeInto(qs('input[name="q"]', kandHero), 'Empathie');
  submit(kandHero);
  await waitFor(() => window.App.route === 'kandidaten' && window.App.poolFilters.q === 'Empathie');
  ok('Kandidaten-Hero-Suche setzt poolFilters.q + navigiert (keine verworfene Eingabe)',
    window.App.route === 'kandidaten' && window.App.poolFilters.q === 'Empathie');
  window.App.poolFilters.q = '';

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
  // Mobile-Disclosure: einklappbares Filter-Panel (Kandidaten)
  const kdToggle = qs('.filter-col .filter-toggle[data-action="toggle-filter-panel"]');
  ok('Kandidaten-Filter-Trigger vorhanden', !!kdToggle && kdToggle.getAttribute('aria-controls') === 'filter-body');
  ok('Kandidaten-Filter-Body vorhanden', !!qs('.filter-col #filter-body.filter-body .filter-head'));
  ok('Kandidaten-Panel startet eingeklappt', !qs('.filter-col').classList.contains('is-open'));
  ok('Kandidaten-Count-Badge bei 0 leer', qs('.filter-col .ft-count').textContent === '');
  click(kdToggle);
  ok('Kandidaten-Klick öffnet Panel', qs('.filter-col').classList.contains('is-open') &&
    kdToggle.getAttribute('aria-expanded') === 'true');
  click(kdToggle);
  ok('Kandidaten-Panel wieder geschlossen', !qs('.filter-col').classList.contains('is-open'));
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
  ok('Pool-Trigger-Count-Badge zeigt 1 aktiven Filter', qs('.filter-col .ft-count').textContent === '1');
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

  // ── Anonymer Kandidat: "Freigabe anfragen" quittiert Zustand (toter-Klick-Fix) ──
  console.log('\n[Kandidat (anonym) · Freigabe anfragen · Zustand · Persistenz · Mehrfach-Schutz]');
  window.App.freigabeAnfragen = {};
  window.localStorage.removeItem('lehrly:freigabeAnfragen');
  await go('kandidat', 'k-tim');
  ok('Anonymes Profil: "Freigabe anfragen"-Button aktiv',
    !!qs('[data-action="request-freigabe"][data-id="k-tim"]') &&
    /Freigabe anfragen/.test(qs('[data-action="request-freigabe"]').textContent) &&
    !qs('.btn-primary.btn-block[disabled]'));
  $('toast').textContent = '';
  click(qs('[data-action="request-freigabe"][data-id="k-tim"]'));
  await waitFor(() => window.App.freigabeAnfragen['k-tim'] === true);
  ok('Freigabe anfragen → Toast', /Freigabe angefragt/.test($('toast').textContent));
  ok('Button wird zu disabled "Freigabe angefragt - ausstehend"', (() => {
    const b = qs('.detail-aside .btn-primary.btn-block');
    return !!b && b.disabled === true && /Freigabe angefragt - ausstehend/.test(b.textContent) &&
      !qs('[data-action="request-freigabe"]');
  })());
  ok('Freigabe-Anfrage in localStorage persistiert', (() => {
    const f = JSON.parse(window.localStorage.getItem('lehrly:freigabeAnfragen'));
    return f && f['k-tim'] === true;
  })());
  // Neu-Navigation → Zustand bleibt, erneuter Klick nicht möglich
  await go('kandidaten'); await go('kandidat', 'k-tim');
  ok('Nach Neu-Navigation bleibt Button disabled (kein erneuter request-freigabe-Button)',
    !qs('[data-action="request-freigabe"]') &&
    !!qs('.detail-aside .btn-primary.btn-block[disabled]'));
  // Anderer anonymer Kandidat (Sara) bleibt unabhängig anfragbar
  await go('kandidat', 'k-sara');
  ok('Anderer anonymer Kandidat behält aktiven Freigabe-Button',
    !!qs('[data-action="request-freigabe"][data-id="k-sara"]') &&
    !qs('.btn-primary.btn-block[disabled]'));
  // Aufräumen für nachfolgende Chat-Kontext-Tests (Anonymität/Chat unberührt)
  window.App.freigabeAnfragen = {};
  window.localStorage.removeItem('lehrly:freigabeAnfragen');

  // ── Nachricht-Sperre: Kontakt erst nach Freigabe (Anonymitäts-Versprechen durchsetzen) ──
  console.log('\n[Kandidat · Nachricht-Sperre bei nicht freigegebenen Profilen]');
  // T1: Sara K. (freigegeben=false, zeugnisGeprüft=true) → kein aktiver "Nachricht senden"
  await go('kandidat', 'k-sara');
  ok('T1: Sara K. Primär-CTA = "Freigabe anfragen"',
    !!qs('[data-action="request-freigabe"][data-id="k-sara"]'));
  ok('T1: Kein aktiver "Nachricht senden"-Button bei Sara K.',
    !qs('.detail-aside [data-action="msg-kandidat"]'));
  ok('T1: Stattdessen disabled "Nachricht erst nach Freigabe" + Hinweis', (() => {
    const dis = qs('.detail-aside .btn-outline.btn-block[disabled]');
    return !!dis && /Nachricht erst nach Freigabe/.test(dis.textContent) &&
      qsa('.detail-aside .hint').some((h) => /erst nach Freigabe durch die Kandidat\/in/.test(h.textContent));
  })());
  // T2: Tim R. (freigegeben=false, zeugnisGeprüft=false) → identisches Sperrverhalten
  await go('kandidat', 'k-tim');
  ok('T2: Tim R. ebenfalls ohne aktiven "Nachricht senden"-Button',
    !qs('.detail-aside [data-action="msg-kandidat"]') &&
    !!qs('.detail-aside .btn-outline.btn-block[disabled]') &&
    /Nachricht erst nach Freigabe/.test(qs('.detail-aside .btn-outline.btn-block[disabled]').textContent));

  // T3: freigegebene Kandidaten (Lena, Noah) — aktiver "Nachricht senden" → Chat (Regression)
  await go('kandidat', 'k-lena');
  ok('T3: Lena M. (freigegeben) hat "Zum Schnuppern einladen"',
    !!qs('[data-action="open-schnupper"][data-id="k-lena"]'));
  ok('T3: Lena M. hat aktiven "Nachricht senden"-Button (kein disabled)',
    !!qs('.detail-aside [data-action="msg-kandidat"][data-id="k-lena"]') &&
    !qs('.detail-aside .btn-outline.btn-block[disabled]'));
  await go('kandidat', 'k-noah');
  ok('T3: Noah B. (freigegeben) hat aktiven "Nachricht senden"-Button',
    !!qs('.detail-aside [data-action="msg-kandidat"][data-id="k-noah"]'));
  click(qs('[data-action="msg-kandidat"]'));
  await waitFor(() => window.App.route === 'chat');
  ok('T3: "Nachricht senden" (freigegeben) → Betriebs-Chat via openKandidatChat',
    window.App.route === 'chat' && qsa('.conv').length === 2);

  // T4: Defense-in-depth — direkter Handler-Hit auf anonymen Kandidaten löst KEINEN Chat aus
  console.log('\n[Kandidat · Handler-Härtung (Defense-in-depth)]');
  await go('kandidat', 'k-sara');
  const routeBeforeHandler = window.App.route;
  const convBeforeHandler = qsa('.conv').length;
  $('toast').textContent = '';
  // Synthetischer msg-kandidat-Klick mit data-id eines anonymen Kandidaten (Button existiert real nicht)
  const fakeBtn = doc.createElement('button');
  fakeBtn.setAttribute('data-action', 'msg-kandidat');
  fakeBtn.setAttribute('data-id', 'k-sara');
  qs('.detail-aside').appendChild(fakeBtn);
  click(fakeBtn);
  await delay(0);
  ok('T4: Handler blockt anonymen Kandidaten (kein gotoRoute chat)',
    window.App.route === routeBeforeHandler && window.App.route === 'kandidat');
  ok('T4: Fehler-Toast "Kontakt erst nach Freigabe"', /Kontakt erst nach Freigabe/.test($('toast').textContent));
  ok('T4: Keine neue anonyme Konversation durch Handler-Hit angelegt',
    qsa('.conv').length === convBeforeHandler);
  fakeBtn.remove();

  // Anonymitäts-Garantie der Chat-Logik bleibt load-bearing: openKandidatChat direkt geprüft
  // (freigegebener Pfad nutzt sie; Anonymisierung muss auch hier ohne Klarname-Leak greifen).
  console.log('\n[Chat-Kontext · Betrieb · openKandidatChat · kandKey statt Fallback]');
  ok('openKandidatChat ist als window-Funktion verfügbar', typeof window.openKandidatChat === 'function');
  // Zuerst in den Chat eintreten (freigegebener Kandidat), um die Konversationszahl auf der Chat-Ansicht zu zählen
  window.openKandidatChat('k-noah');
  await waitFor(() => window.App.route === 'chat');
  const saraExistsBefore = !!qs('.conv[data-conv="b-k-sara"]');
  const bConvBefore = qsa('.conv').length;
  window.openKandidatChat('k-sara');
  await waitFor(() => window.App.route === 'chat' && !!qs('.conv.active[data-conv="b-k-sara"]'));
  ok('openKandidatChat(anonym) → Chat ohne Lena-M.-Fallback',
    window.App.route === 'chat' && !/Lena M\./.test($('chat-head').textContent) && !qs('.conv.active[data-conv="b-lena"]'));
  ok('Header zeigt anonymisierte Kennung (kandKey)', /S\. \(anonymisiert\)/.test($('chat-head').textContent));
  ok('Listentitel der aktiven Konversation = kandKey', /S\. \(anonymisiert\)/.test(qs('.conv.active .conv-name').textContent));
  ok('Kein Klarname "Sara K." im Chat-DOM (Anonymität gewahrt)',
    !/Sara K\./.test($('chat-head').textContent) && !/Sara K\./.test(qs('.conv.active').textContent));
  ok('Header zeigt Berufsfeld (kein Klarbezug)', /Gesundheit \/ Pflege/.test($('chat-head').textContent));
  ok('Neue anonyme Konversation in der Liste vorhanden',
    qsa('.conv').length === bConvBefore + (saraExistsBefore ? 0 : 1) && !!qs('.conv[data-conv="b-k-sara"]'));
  ok('Anonyme Konversation zeigt Empty-State im chat-log', !!qs('#chat-log .chat-log-empty'));
  typeInto($('chat-inp'), 'Guten Tag, wir würden Sie gerne kennenlernen.');
  submit(qs('[data-action="chat-send"]'));
  await waitFor(() => qsa('#chat-log .bubble.me').length === 1);
  ok('Senden an anonymen Kandidaten hängt Bubble an', qsa('#chat-log .bubble.me').length === 1);
  const bConvAfter = qsa('.conv').length;
  window.openKandidatChat('k-sara');
  await waitFor(() => window.App.route === 'chat');
  ok('Erneuter openKandidatChat legt KEINE zweite anonyme Konversation an',
    qsa('.conv').length === bConvAfter && qsa('.conv[data-conv="b-k-sara"]').length === 1 &&
    !!qs('.conv.active[data-conv="b-k-sara"]'));
  window.openKandidatChat('k-tim');
  await waitFor(() => window.App.route === 'chat' && !!qs('.conv.active[data-conv="b-k-tim"]'));
  ok('Zweiter anonymer Kandidat → eigene anonyme Konversation',
    /T\. \(anonymisiert\)/.test($('chat-head').textContent) && !!qs('.conv.active[data-conv="b-k-tim"]') &&
    !/Tim R\./.test(qs('.conv.active').textContent));

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
  // Enter-Submit des Betriebs-Formulars (data-action="betrieb-form") teilt denselben Pfad
  typeInto(qs('[data-bfield="firma"]'), 'Beispiel GmbH');
  $('toast').textContent = '';
  submit(qs('#form-betrieb'));
  await delay(0);
  ok('Betrieb-Enter-Submit → Toast mit Firmenname',
    /Betriebsprofil gespeichert/.test($('toast').textContent) && /Beispiel GmbH/.test($('toast').textContent));
  ok('Betrieb-Enter-Submit → Betriebs-Pct aktualisiert', $('betrieb-pct').textContent === '100%');
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

  // ── Enter-Submit des Inserat-Formulars (data-action="inserat-form") teilt denselben Pfad ──
  // Leeres Berufsbild → Fehlermeldung sichtbar, kein neues Inserat
  const insVorSubmit = window.App.inserate.length;
  submit(qs('#form-inserat'));
  await delay(0);
  ok('Inserat-Enter-Submit ohne Berufsbild blockt',
    window.App.inserate.length === insVorSubmit && qsa('#inserat-list .list-item').length === insVorSubmit);
  ok('Inserat-Enter-Submit zeigt Feld-Fehler #inserat-beruf-err',
    $('inserat-beruf-err') && $('inserat-beruf-err').hidden === false);
  ok('Inserat-Enter-Submit ohne Berufsbild → Berufsbild-Toast', /Berufsbild angeben/.test($('toast').textContent));
  // Berufsbild füllen → erneut Enter-Submit → Inserat erscheint, Felder zurückgesetzt
  typeInto(qs('[data-ifield="beruf"]'), 'Kauffrau/Kaufmann EFZ');
  $('toast').textContent = '';
  submit(qs('#form-inserat'));
  await waitFor(() => qsa('#inserat-list .list-item').length === insVorSubmit + 1);
  ok('Inserat-Enter-Submit veröffentlicht erscheint in Liste',
    qsa('#inserat-list .list-item').length === insVorSubmit + 1 && /Kauffrau\/Kaufmann EFZ/.test($('inserat-list').textContent));
  ok('Inserat-Enter-Submit → Empty-State versteckt', $('inserat-empty').hidden === true);
  ok('Inserat-Enter-Submit → Felder zurückgesetzt', qs('[data-ifield="beruf"]').value === '');
  ok('Inserat-Enter-Submit → Fehler #inserat-beruf-err wieder versteckt', $('inserat-beruf-err').hidden === true);
  ok('Inserat-Enter-Submit → Veröffentlicht-Toast', /veröffentlicht/.test($('toast').textContent));

  // ── Status-Pill: aktiver Zustand "veröffentlicht" ist grün (ok), nicht grau (pending) ──
  console.log('\n[Inserat · Status-Pill · Plural · Beschreibung · Entfernen/Bearbeiten]');
  ok('Veröffentlicht-Pill nutzt status-pill ok (grün)',
    qsa('#inserat-list .status-pill.ok').length >= 1 &&
    /veröffentlicht/.test(qs('#inserat-list .status-pill.ok').textContent) &&
    qsa('#inserat-list .status-pill.pending').length === 0);

  // ── Plural-Fix + Beschreibung: dritte Stelle mit 1 Platz + Beschreibung (inkl. XSS-Escape) ──
  const insVorPlural = window.App.inserate.length;
  typeInto(qs('[data-ifield="beruf"]'), 'Maurer/in EBA');
  typeInto(qs('[data-ifield="plaetze"]'), '1');
  typeInto(qs('[data-ifield="beginn"]'), 'August 2026');
  typeInto(qs('[data-ifield="beschreibung"]'), 'Aufgaben <b>vor Ort</b> & Anforderungen');
  click(qs('[data-action="publish-inserat"]'));
  await waitFor(() => qsa('#inserat-list .list-item').length === insVorPlural + 1);
  const maurerCard = qsa('#inserat-list .list-item').find((c) => /Maurer\/in EBA/.test(c.textContent));
  ok('Plural-Fix: "1" Platz → Singular "1 Platz" (nicht "1 Plätze")',
    qs('.chip-static', maurerCard).textContent.trim() === '1 Platz');
  ok('Beschreibung wird im Inserat angezeigt (li-desc)',
    !!qs('.li-desc', maurerCard) && /Aufgaben/.test(qs('.li-desc', maurerCard).textContent));
  ok('Beschreibung ist XSS-escaped (kein roher <b>-Tag)',
    !qs('.li-desc b', maurerCard) && /<b>vor Ort<\/b>/.test(qs('.li-desc', maurerCard).textContent));
  ok('Beschreibung ins Inserat-Objekt übernommen',
    /^Aufgaben/.test(window.App.inserate[window.App.inserate.length - 1].beschreibung));
  ok('Beschreibung-Feld nach Veröffentlichen geleert', qs('[data-ifield="beschreibung"]').value === '');

  // ── Plural-Fix bei mehreren Plätzen: "3" → "3 Plätze" ──
  typeInto(qs('[data-ifield="beruf"]'), 'Logistiker/in EFZ');
  typeInto(qs('[data-ifield="plaetze"]'), '3');
  click(qs('[data-action="publish-inserat"]'));
  await waitFor(() => qsa('#inserat-list .list-item').length === insVorPlural + 2);
  const logiCard = qsa('#inserat-list .list-item').find((c) => /Logistiker\/in EFZ/.test(c.textContent));
  ok('Plural-Fix: "3" Plätze → "3 Plätze"', qs('.chip-static', logiCard).textContent.trim() === '3 Plätze');

  // ── Plural-Fix bei leerem Plätze-Feld: Default "1 Platz" ──
  typeInto(qs('[data-ifield="beruf"]'), 'Gärtner/in EFZ');
  typeInto(qs('[data-ifield="plaetze"]'), '');
  click(qs('[data-action="publish-inserat"]'));
  await waitFor(() => qsa('#inserat-list .list-item').length === insVorPlural + 3);
  const gartCard = qsa('#inserat-list .list-item').find((c) => /Gärtner\/in EFZ/.test(c.textContent));
  ok('Plural-Fix: leeres Plätze-Feld → Default "1 Platz"',
    qs('.chip-static', gartCard).textContent.trim() === '1 Platz');

  // ── Aktions-Buttons je Eintrag (Sackgasse beheben): Bearbeiten + Entfernen mit aria-label ──
  ok('Jeder Inserat-Eintrag hat eine Aktionszeile (li-actions)',
    qsa('#inserat-list .list-item .li-actions').length === window.App.inserate.length);
  ok('Jeder Eintrag hat Entfernen- + Bearbeiten-Button',
    qsa('#inserat-list [data-action="remove-inserat"]').length === window.App.inserate.length &&
    qsa('#inserat-list [data-action="edit-inserat"]').length === window.App.inserate.length);
  ok('Aktions-Buttons tragen berufsbezogenes aria-label',
    qsa('#inserat-list [data-action="remove-inserat"]').some((b) => /Maurer\/in EBA entfernen/.test(b.getAttribute('aria-label'))));

  // ── Bearbeiten: Felder zurück ins Formular, Eintrag aus Liste; erneutes Veröffentlichen legt korrigierte Version an ──
  const gartIdx = qsa('#inserat-list .list-item').findIndex((c) => /Gärtner\/in EFZ/.test(c.textContent));
  const insVorEdit = window.App.inserate.length;
  click(qsa('#inserat-list [data-action="edit-inserat"]')[gartIdx]);
  await waitFor(() => window.App.inserate.length === insVorEdit - 1);
  ok('Bearbeiten füllt Berufsbild-Feld', qs('[data-ifield="beruf"]').value === 'Gärtner/in EFZ');
  ok('Bearbeiten entfernt Eintrag aus Liste', window.App.inserate.length === insVorEdit - 1 &&
    !qsa('#inserat-list .list-item').some((c) => /Gärtner\/in EFZ/.test(c.textContent)));
  ok('Bearbeiten-Toast bestätigt', /zum Bearbeiten geladen/.test($('toast').textContent));
  // korrigierten Beruf veröffentlichen
  typeInto(qs('[data-ifield="beruf"]'), 'Gärtner/in EFZ (Garten- und Landschaftsbau)');
  click(qs('[data-action="publish-inserat"]'));
  await waitFor(() => window.App.inserate.length === insVorEdit);
  ok('Erneutes Veröffentlichen legt korrigierte Version an',
    qsa('#inserat-list .list-item').some((c) => /Garten- und Landschaftsbau/.test(c.textContent)));

  // ── Entfernen: Eintrag verschwindet, persist greift; bis auf 2 (Ausgangslage für Dashboard) zurückbauen ──
  while (window.App.inserate.length > 2) {
    const before = window.App.inserate.length;
    const removedBeruf = window.App.inserate[window.App.inserate.length - 1].beruf;
    click(qsa('#inserat-list [data-action="remove-inserat"]')[before - 1]);
    await waitFor(() => window.App.inserate.length === before - 1);
    ok('Entfernen reduziert Liste (' + removedBeruf + ')',
      window.App.inserate.length === before - 1 &&
      qsa('#inserat-list .list-item').length === before - 1);
  }
  ok('Entfernen persistiert (localStorage spiegelt App.inserate)',
    JSON.parse(window.localStorage.getItem('lehrly:inserate')).length === window.App.inserate.length);

  // ── Empty-State kehrt nach Entfernen des letzten Eintrags zurück ──
  const insSnapshot = window.App.inserate.slice();
  while (window.App.inserate.length > 0) {
    const before = window.App.inserate.length;
    click(qs('#inserat-list [data-action="remove-inserat"]'));
    await waitFor(() => window.App.inserate.length === before - 1);
  }
  ok('Nach Entfernen des letzten Eintrags erscheint Empty-State wieder',
    window.App.inserate.length === 0 && $('inserat-empty').hidden === false &&
    qsa('#inserat-list .list-item').length === 0);
  // Ausgangslage (2 Inserate) für den Dashboard-Test wiederherstellen
  insSnapshot.forEach((i) => window.App.inserate.push(i));
  window.gotoRoute('ausschreiben');
  await waitFor(() => qsa('#inserat-list .list-item').length === 2);
  ok('Ausgangslage wiederhergestellt (2 Inserate, kein Empty-State)',
    window.App.inserate.length === 2 && $('inserat-empty').hidden === true);

  // ═════════════ BETRIEB-DASHBOARD / PIPELINE ═════════════
  console.log('\n[Pipeline · Betrieb-Dashboard]');
  await go('dashboard');
  ok('Pipeline-H1 vorhanden', /Pipeline-Übersicht/.test($('view').textContent));
  // idx 19/27: erfundene "Eingegangene Bewerbungen=4"-Kachel entfernt → 3 echte Metriken
  ok('Pipeline-Metriken (3, keine erfundene Bewerbungseingangs-Kachel)', qsa('.metric').length === 3);
  ok('Keine "Eingegangene Bewerbungen"-Kachel mehr (erfundene 4 entfernt)',
    !qsa('.metric-label').some((l) => /Eingegangene Bewerbungen/.test(l.textContent)));
  ok('Veröffentlichte Stellen zählt Inserate', qsa('.metric .metric-num')[0].textContent.trim() === String(window.App.inserate.length) && window.App.inserate.length === 2);
  // idx 4/19: "Ungelesene Nachrichten" (Betrieb) = unreadCount, kein fixer Wert "1"
  const unreadBetrMetric = qsa('.metric').find((m) => /Ungelesene Nachrichten/.test(m.textContent));
  ok('"Ungelesene Nachrichten" (Betrieb) = unreadCount(betrieb)',
    !!unreadBetrMetric &&
    unreadBetrMetric.querySelector('.metric-num').textContent.trim() === String(window.unreadCount('betrieb')));
  ok('Kandidaten-Status-Liste', qsa('.status-list li').length === 4);

  // ═════════════ 404 / NOTFOUND ═════════════
  console.log('\n[Sonderfälle · 404 · Rollen-Routen-Schutz]');
  // Lernende-Route als Betrieb aufrufen → notfound
  await go('profil');
  ok('Lernende-Route als Betrieb → 404', /Seite nicht gefunden/.test($('view').textContent));

  // ── T5: 404 für Betrieb ist rollenrichtig (Kandidatensuche statt Stellen-Sackgasse) ──
  console.log('\n[404 · Rolle betrieb · rollenrichtige Suche/Links (keine Endlosschleife)]');
  ok('T5: Rolle ist betrieb', window.App.role === 'betrieb');
  await go('quatsch');
  ok('T5: 404 für Betrieb sichtbar', /Seite nicht gefunden/.test($('view').textContent));
  ok('T5: 404 zeigt Kandidaten-Suchleiste (data-target=kandidaten)',
    !!qs('.notfound .search-hero[data-target="kandidaten"]') && !qs('.notfound .search-hero[data-target="stellen"]'));
  ok('T5: Hinweistext nennt Kandidatensuche',
    /Kandidatensuche/.test(qs('.notfound .muted').textContent));
  ok('T5: Primär-Link "Kandidaten suchen" → #/kandidaten',
    !!qs('.notfound .nf-links a[data-route="kandidaten"]') &&
    /Kandidaten suchen/.test(qs('.notfound .nf-links a[data-route="kandidaten"]').textContent) &&
    qs('.notfound .nf-links a[data-route="kandidaten"]').getAttribute('href') === '#/kandidaten' &&
    !qs('.notfound .nf-links a[data-route="stellen"]'));
  ok('T5: "Zur Startseite"-Link unverändert → #/start',
    !!qs('.notfound .nf-links a[data-route="start"]') &&
    qs('.notfound .nf-links a[data-route="start"]').getAttribute('href') === '#/start');
  // Such-Submit aus dem 404 landet auf #/kandidaten (nicht erneut 404)
  const nf404Form = qs('.notfound .search-hero[data-target="kandidaten"]');
  typeInto(qs('input[name="q"]', nf404Form), 'Pflege');
  submit(nf404Form);
  await waitFor(() => window.App.route === 'kandidaten');
  ok('T5: 404-Such-Submit landet auf #/kandidaten (keine Endlosschleife)',
    window.App.route === 'kandidaten' && !/Seite nicht gefunden/.test($('view').textContent));
  // Primär-Link führt ebenfalls auf #/kandidaten
  await go('quatsch');
  click(qs('.notfound .nf-links a[data-route="kandidaten"]'));
  await waitFor(() => window.App.route === 'kandidaten');
  ok('T5: 404-Link "Kandidaten suchen" führt auf #/kandidaten',
    window.App.route === 'kandidaten' && !/Seite nicht gefunden/.test($('view').textContent));
  // "Zur Startseite" führt auf #/start
  await go('quatsch');
  click(qs('.notfound .nf-links a[data-route="start"]'));
  await waitFor(() => window.App.route === 'start');
  ok('T5: 404-Link "Zur Startseite" führt auf #/start', window.App.route === 'start');

  // unbekannte Stellen-ID → 404
  click(qs('.role-opt[data-role="lernende"]'));
  await waitFor(() => window.App.role === 'lernende');
  await go('stelle', 'gibtsnicht');
  ok('Unbekannte Stellen-ID → 404', /Seite nicht gefunden/.test($('view').textContent));
  // komplett unbekannte Route
  await go('quatsch');
  ok('Unbekannte Route → 404', /Seite nicht gefunden/.test($('view').textContent));

  // ── T6: 404 für Lernende bleibt unverändert (Stellen-Suche → #/stellen) ──
  console.log('\n[404 · Rolle lernende · unverändert (Regression)]');
  ok('T6: 404 zeigt Stellen-Suchleiste (data-target=stellen)',
    !!qs('.notfound .search-hero[data-target="stellen"]') && !qs('.notfound .search-hero[data-target="kandidaten"]'));
  ok('T6: Hinweistext nennt Stellensuche', /Stellensuche/.test(qs('.notfound .muted').textContent));
  ok('T6: Primär-Link "Stellen finden" → #/stellen',
    !!qs('.notfound .nf-links a[data-route="stellen"]') &&
    /Stellen finden/.test(qs('.notfound .nf-links a[data-route="stellen"]').textContent) &&
    qs('.notfound .nf-links a[data-route="stellen"]').getAttribute('href') === '#/stellen' &&
    !qs('.notfound .nf-links a[data-route="kandidaten"]'));
  const nf404Lern = qs('.notfound .search-hero[data-target="stellen"]');
  typeInto(qs('input[name="q"]', nf404Lern), 'Informatik');
  submit(nf404Lern);
  await waitFor(() => window.App.route === 'stellen');
  ok('T6: 404-Such-Submit (Lernende) landet auf #/stellen',
    window.App.route === 'stellen' && !/Seite nicht gefunden/.test($('view').textContent));
  click(qs('[data-action="reset-stellen-filter"]'));
  await waitFor(() => qsa('#stellen-list .list-item').length === 6);

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

  // ═════════════ NOTEN · LEERZUSTAND + UNGÜLTIG-GUARD ═════════════
  console.log('\n[Profil/CV · Noten-Leerzustand · toFixed-Guard]');
  // Noten leeren und Profil neu rendern → Leerzustand statt Fremdnoten
  window.App.profile.noten = { deutsch: '', mathematik: '', franzoesisch: '', englisch: '' };
  await go('profil');
  const sNotenEmpty = $('sec-noten');
  // Im Profil sind die leeren Eingabefelder der Leerzustand (kein Demo-Strip mit Fremdnoten)
  ok('Leeres Profil: #sec-noten zeigt leere Eingabefelder statt Fremdnoten',
    qsa('input[data-nfield]', sNotenEmpty).length === 4 &&
    qsa('input[data-nfield]', sNotenEmpty).every((i) => i.value === '') &&
    !qs('.zeugnis-strip', sNotenEmpty));
  // Ungültige Eingabe darf keinen JS-Fehler/Render-Bruch auslösen (toFixed-Guard)
  const errBeforeInvalid = errors.length;
  typeInto(qs('[data-nfield="deutsch"]', sNotenEmpty), 'abc');
  await go('cv');
  const cvEmptyBlock = qsa('.cv-block').filter((b) => /Schulnoten/.test(b.textContent))[0];
  ok('Ungültige Note (abc) → kein JS-Fehler', errors.length === errBeforeInvalid);
  ok('Ungültige Note (abc) → kein Strip, Leerzustand im CV', /Noch keine Noten erfasst/.test(cvEmptyBlock.textContent) && !qs('.zeugnis-strip', cvEmptyBlock));

  // ═════════════ NOTEN-VALIDIERUNG & BALKEN-CLAMP (CH-Skala 1.0–6.0) ═════════════
  console.log('\n[Profil/CV · Noten-Validierung & Balken-Clamp · CH-Skala 1.0–6.0]');
  // Sauberer Ausgangszustand
  window.App.profile.noten = { deutsch: '', mathematik: '', franzoesisch: '', englisch: '' };
  await go('profil');
  const sNotenV = $('sec-noten');

  // (a) '9' eintippen → Inline-Hinweis + invalid am Feld, Rohwert bleibt im State (kein Springen)
  const inpMath = qs('[data-nfield="mathematik"]', sNotenV);
  typeInto(inpMath, '9');
  ok('Out-of-Range (9): Rohwert bleibt im State während des Tippens', window.App.profile.noten.mathematik === '9');
  ok('Out-of-Range (9): Feld bekommt .invalid + aria-invalid', inpMath.classList.contains('invalid') && inpMath.getAttribute('aria-invalid') === 'true');
  ok('Out-of-Range (9): Inline-Hinweis sichtbar', !$('note-err-mathematik').hidden && /1\.0 und 6\.0/.test($('note-err-mathematik').textContent));

  // Gültigen Wert für ein zweites Feld erfassen (für den ~83%-Balken-Check)
  typeInto(qs('[data-nfield="deutsch"]', sNotenV), '5.0');

  // (b) Speichern → '9' wird auf 6.0 geklemmt, '5.0' bleibt; korrigierter Wert ins Input gespiegelt
  click(qs('[data-action="save-profil"]'));
  ok('Speichern klemmt 9 → 6.0 im State', window.App.profile.noten.mathematik === '6.0');
  ok('Speichern spiegelt 6.0 ins Inputfeld', qs('[data-nfield="mathematik"]', $('sec-noten')).value === '6.0');
  ok('Speichern räumt invalid/Inline-Hinweis ab', !qs('[data-nfield="mathematik"]', $('sec-noten')).classList.contains('invalid') && $('note-err-mathematik').hidden);
  ok('Gültige 5.0 bleibt nach Speichern unverändert', window.App.profile.noten.deutsch === '5.0');
  ok('Geklemmte Note 6.0 in localStorage persistiert', (() => {
    const p = JSON.parse(window.localStorage.getItem('lehrly:profile'));
    return p.noten && p.noten.mathematik === '6.0' && p.noten.deutsch === '5.0';
  })());

  // (c) '0.5' eintippen → beim Speichern auf 1.0 korrigiert (kein Balken <0, keine 0.5 auf dem CV)
  await go('profil');
  typeInto(qs('[data-nfield="franzoesisch"]', $('sec-noten')), '0.5');
  click(qs('[data-action="save-profil"]'));
  ok('Speichern korrigiert 0.5 → 1.0 im State', window.App.profile.noten.franzoesisch === '1.0');

  // (d) CV-Vorschau: kein '9.0', kein '0.5', Balken nie breiter als .ztrack (w<=100%)
  await go('cv');
  const cvVBlock = qsa('.cv-block').filter((b) => /Schulnoten/.test(b.textContent))[0];
  ok('CV: keine Schrott-Note 9.0 auf dem Lebenslauf', !/9\.0/.test(cvVBlock.textContent));
  ok('CV: keine Schrott-Note 0.5 auf dem Lebenslauf', !/0\.5/.test(cvVBlock.textContent));
  ok('CV: Mathematik zeigt geklemmte 6.0', /Mathematik/.test(cvVBlock.textContent) && /6\.0/.test(cvVBlock.textContent));
  ok('CV: Deutsch 5.0 → Balken ~83% (gültig, unverändert)', (() => {
    const rows = qsa('.zeugnis-strip .zrow', cvVBlock);
    const deutschRow = rows.filter((r) => /Deutsch/.test(r.textContent))[0];
    const w = parseInt((deutschRow.querySelector('.ztrack i').style.width || '0'), 10);
    return w === 83;
  })());
  ok('CV: kein Balken überläuft .ztrack (alle w<=100%)', qsa('.zeugnis-strip .ztrack i', cvVBlock).every((i) => parseInt(i.style.width || '0', 10) <= 100));

  // (e) Render-Seiten-Clamp direkt: unplausible Werte im State werden NICHT als gültig gerendert
  window.App.profile.noten = { deutsch: '9.0', mathematik: '0.5', franzoesisch: '5.0', englisch: '' };
  await go('cv');
  const cvRawBlock = qsa('.cv-block').filter((b) => /Schulnoten/.test(b.textContent))[0];
  ok('CV-Render verwirft 9.0/0.5 direkt aus State (nur gültige 5.0 als Zeile)',
    qsa('.zeugnis-strip .zrow', cvRawBlock).length === 1 && /5\.0/.test(cvRawBlock.textContent) && !/9\.0/.test(cvRawBlock.textContent) && !/0\.5/.test(cvRawBlock.textContent));

  // (f) Leeres Feld → kein Render, Leerzustand bleibt funktionsfähig
  window.App.profile.noten = { deutsch: '', mathematik: '', franzoesisch: '', englisch: '' };
  await go('cv');
  const cvAllEmpty = qsa('.cv-block').filter((b) => /Schulnoten/.test(b.textContent))[0];
  ok('Leere Noten → Leerzustand "Noch keine Noten erfasst." bleibt funktionsfähig',
    /Noch keine Noten erfasst/.test(cvAllEmpty.textContent) && !qs('.zeugnis-strip', cvAllEmpty));

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
