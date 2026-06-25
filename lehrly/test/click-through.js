/* ════════════════════════════════════════════════════════════════════
   Headless Click-Through-Test für Lehrly Laufbahn — Studio Deck.

   Lädt index.html + js/app.js in jsdom (app.js inline injiziert, Origin
   https://lehrly.ch/), fängt jeden JS-Laufzeitfehler ab und klickt jeden
   Navigationsweg sowie jeden interaktiven Flow der NEUEN Struktur real
   durch — Rail-Reise, Rollen-Kippschalter, Commander (Maus + Tastatur),
   Pane-Stack (inkl. Scrim & Esc), Steckbrief-Formular, Profil-Tiefe,
   Unterlagen + CV, Matching, Stellen-Detail + Bewerben, Gespräche →
   Konversation → Senden (mit XSS-Escape-Check), Cockpit, Tarife sowie den
   kompletten Betriebs-Pfad (Profil, Ausschreiben, Talent-Pool-Filter,
   Kandidaten-Akte, Einladen, Anschreiben, Pipeline).

   Schlägt bei jedem JS-Fehler oder kaputten Zustand fehl.
   Ausgabe-Format ("Bestanden: X   Fehlgeschlagen: Y") wie gehabt, damit
   npm test unverändert funktioniert.
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
// jsdom implementiert scrollIntoView/scrollTo nicht → still überschreiben
window.HTMLElement.prototype.scrollIntoView = function () {};
window.scrollTo = function () {};

const doc = window.document;
const $ = (id) => doc.getElementById(id);
const qs = (s, r) => (r || doc).querySelector(s);
const qsa = (s, r) => Array.from((r || doc).querySelectorAll(s));
const click = (el) => { if (!el) throw new Error('click on null'); el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); };
const fireKey = (el, key, mods) => { el.dispatchEvent(new window.KeyboardEvent('keydown', Object.assign({ key, bubbles: true }, mods || {}))); };
const typeInto = (el, val) => { el.value = val; el.dispatchEvent(new window.Event('input', { bubbles: true })); };
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
const topPane = () => qsa('#pane-stack .pane').slice(-1)[0];
const stack = () => window.App.paneStack;

(async function run() {
  await waitFor(() => typeof window.gotoStation === 'function');
  console.log('\n── app.js geladen ──');

  // ═════════════ APP-SHELL / DIREKTSTART (kein Login-Gate) ═════════════
  console.log('\n[App-Shell]');
  ok('Shell-Grid vorhanden', !!$('shell'));
  ok('Kein Login-Gate (#gate fehlt)', $('gate') === null);
  ok('Rail-Schiene gerendert', !!$('rail'));
  ok('Canvas gerendert', !!$('canvas'));
  ok('Pane-Stack-Container leer beim Start', qsa('#pane-stack .pane').length === 0);
  ok('Start-Rolle = lernende', window.App.role === 'lernende' && $('shell').dataset.role === 'lernende');
  ok('Start-Station = steckbrief', window.App.station === 'steckbrief');
  ok('Commander beim Start versteckt', $('commander').hidden === true);
  // A11y: kein Live-Region-Anti-Pattern über dem ganzen Canvas-Strom
  ok('#stations ohne aria-live (kein Anti-Pattern)', $('stations').getAttribute('aria-live') === null);
  ok('#vermerk ist die einzige Status-Live-Region', $('vermerk').getAttribute('role') === 'status' && $('vermerk').getAttribute('aria-live') === 'polite');

  // ═════════════ RAIL · LERNENDE (Stationen + Navigation) ═════════════
  console.log('\n[Rail · Lernende — alle Stationen anklicken]');
  const lStations = ['steckbrief', 'profil', 'unterlagen', 'treffer', 'gespraeche', 'cockpit'];
  ok('6 Rail-Knoten (Lernende)', qsa('.rail-node').length === 6);
  ok('Rail-Knoten tragen aria-label (Icon-only-A11y)', qsa('.rail-node').every((n) => !!n.getAttribute('aria-label')));
  ok('Rail-Knoten tragen title-Tooltip', qsa('.rail-node').every((n) => !!n.getAttribute('title')));
  lStations.forEach((id) => ok('Canvas-Section st-' + id + ' existiert', !!$('st-' + id)));
  ok('Rail-Knoten in korrekter Reihenfolge', qsa('.rail-node').map((n) => n.dataset.station).join(',') === lStations.join(','));
  lStations.forEach((id) => {
    click(qs('.rail-node[data-station="' + id + '"]'));
    const node = qs('.rail-node[data-station="' + id + '"]');
    ok('Rail-Klick → ' + id + ' aktiv', window.App.station === id
      && node.classList.contains('active')
      && node.getAttribute('aria-current') === 'true');
  });

  // ═════════════ STECKBRIEF (Station 1) — Formular real ausfüllen ═════════════
  console.log('\n[Station 1 · Steckbrief]');
  window.gotoStation('steckbrief');
  const sb = $('st-steckbrief');
  ok('Steckbrief-Formular vorhanden', !!qs('#form-steckbrief', sb));
  ok('Ring startet bei 0%', qs('#ring-steckbrief', sb).dataset.pct === '0');
  // Live-Sync beim Tippen (onInput schreibt direkt in App.profile)
  typeInto(qs('[data-field="vorname"]', sb), 'Lena');
  ok('Live-Input-Sync in App.profile', window.App.profile.vorname === 'Lena');
  typeInto(qs('[data-field="nachname"]', sb), 'Müller');
  typeInto(qs('[data-field="kanton"]', sb), 'Zürich');
  typeInto(qs('[data-field="beruf"]', sb), 'Kauffrau EFZ');
  click(qs('[data-action="save-steckbrief"]', sb));
  ok('Steckbrief im State gespeichert', window.App.profile.beruf === 'Kauffrau EFZ' && window.App.profile.kanton === 'Zürich');
  ok('Vermerk-Toast erscheint', $('vermerk').classList.contains('show') && /gesichert/i.test($('vermerk').textContent));
  ok('Ring auf 100% gefüllt', qs('#ring-steckbrief', sb).dataset.pct === '100');
  ok('Rail-Knoten Steckbrief = done', qs('.rail-node[data-station="steckbrief"]').classList.contains('done'));

  // ═════════════ PROFIL-TIEFE (Station 2) — Noten-Strip + Stärken-Tags ═════════════
  console.log('\n[Station 2 · Profil-Tiefe]');
  window.gotoStation('profil');
  const pf = $('st-profil');
  ok('Zeugnis-Strip mit 4 Zeilen', qsa('.zeugnis-strip .zrow', pf).length === 4);
  ok('Notenbalken haben Breite gesetzt', qsa('.zeugnis-strip .ztrack i', pf).every((i) => /%/.test(i.style.width)));
  const tags = qsa('#strength-tags .tag', pf);
  ok('Mindestens 5 Stärken-Tags', tags.length >= 5);
  const before0 = tags[0].classList.contains('on');
  click(tags[0]); click(tags[1]); click(tags[2]);
  ok('Stärke-Tag toggelt visuell', tags[0].classList.contains('on') !== before0);
  ok('3 Stärken im State aktiv', Object.values(window.App.strengths).filter(Boolean).length >= 3);
  click(tags[2]); // wieder aus → toggelt zurück
  ok('Stärke-Tag re-toggelt aus', tags[2].classList.contains('on') === false);
  ok('Profil-Ring gefüllt (>0%)', parseInt(qs('#ring-profil', pf).dataset.pct, 10) > 0);
  ok('Rail-Knoten Profil = done (≥2 Stärken)', qs('.rail-node[data-station="profil"]').classList.contains('done'));
  // Schnupper-Erfahrungsfeld wird wirklich gelesen (kein totes Feld mehr)
  const snField = qs('[data-snfield="schnupper"]', pf);
  ok('Schnupper-Erfahrungsfeld vorhanden', !!snField);
  typeInto(snField, 'Raiffeisenbank (3 Tage)');
  ok('Schnupper-Erfahrung im State', window.App.schnupperErf === 'Raiffeisenbank (3 Tage)');

  // ═════════════ UNTERLAGEN + CV-PANE (Station 3) ═════════════
  console.log('\n[Station 3 · Unterlagen + CV-Pane]');
  window.gotoStation('unterlagen');
  const un = $('st-unterlagen');
  ok('Doc-Liste hat 3 Einträge', qsa('.doc-line', un).length === 3);
  ok('Genau ein offenes Dokument', qsa('.doc-line .dl-state.open', un).length === 1);
  click(qs('[data-action="upload-doc"]', un));
  ok('Upload zeigt Vermerk', $('vermerk').classList.contains('show') && /hochgeladen/i.test($('vermerk').textContent));
  click(qs('[data-pane="cv"]', un));
  ok('CV-Pane geöffnet (oben im Stack)', !!topPane() && topPane().dataset.pane === 'cv');
  ok('CV übernimmt Namen aus Steckbrief', /Lena/.test(topPane().textContent) && /Müller/.test(topPane().textContent));
  ok('CV übernimmt Beruf aus Steckbrief', /Kauffrau EFZ/.test(topPane().textContent));
  ok('CV listet gewählte Stärken', qsa('.cv-sheet .tag.static', topPane()).length >= 1);
  ok('CV übernimmt eingegebene Schnupper-Erfahrung', /Raiffeisenbank \(3 Tage\)/.test(topPane().textContent));
  click(qs('[data-action="cv-done"]', topPane()));
  ok('CV als bereit markiert → Unterlagen done', qs('.rail-node[data-station="unterlagen"]').classList.contains('done'));
  ok('CV-fertig-Vermerk', /bereit/i.test($('vermerk').textContent));
  window.popPane();
  await delay(280);
  ok('CV-Pane geschlossen', qsa('#pane-stack .pane').length === 0 && $('pane-scrim').hidden === true);

  // ═════════════ TREFFER → MATCH → STELLE → BEWERBEN (Station 4) ═════════════
  console.log('\n[Station 4 · Treffer / Match / Stelle / Bewerben]');
  window.gotoStation('treffer');
  const tr = $('st-treffer');
  // VOR dem Matching: nur Teaser, keine echten (klickbaren) Treffer
  ok('Vor Match: nur Teaser-Platzhalter', qsa('#match-list .index-entry.teaser', tr).length === 3);
  ok('Vor Match: keine echten Match-Sprungziele', qsa('#match-list .index-entry[data-pane="stelle"]', tr).length === 0);
  ok('Vor Match: App.matched = false', window.App.matched === false);
  const matchBtn = $('btn-match');
  ok('Match-Button initial „Matches finden"', /Matches finden/i.test(matchBtn.textContent));
  click(matchBtn);
  ok('Match-Button disabled während Suche', matchBtn.disabled === true);
  ok('Match-Button zeigt Lauftext', /läuft/i.test(matchBtn.textContent));
  await delay(1700);
  ok('Match-Button meldet Ergebnis', /Matches gefunden/.test(matchBtn.textContent));
  ok('App.matched = true', window.App.matched === true);
  // NACH dem Matching: echte Treffer wurden erst jetzt eingefüllt (Button hatte echte Wirkung)
  let entries = qsa('#match-list .index-entry[data-pane="stelle"]', $('st-treffer'));
  ok('Nach Match: 3 echte Match-Einträge', entries.length === 3);
  ok('Nach Match: keine Teaser mehr', qsa('#match-list .index-entry.teaser', $('st-treffer')).length === 0);
  ok('Jeder Match hat Score-Ring', entries.every((e) => !!qs('.score-ring', e)));
  ok('Score-Ring trägt --pct CSS-Var', entries.every((e) => qs('.score-ring', e).style.getPropertyValue('--pct') !== ''));
  ok('Match-Vermerk (Siegel)', $('vermerk').classList.contains('show') && $('vermerk').dataset.kind === 'siegel');
  ok('Rail-Knoten Treffer = done', qs('.rail-node[data-station="treffer"]').classList.contains('done'));
  await delay(2700);
  ok('Match-Button → „Match-Stream aktualisieren"', matchBtn.disabled === false && /aktualisieren/i.test(matchBtn.textContent));
  // Stelle öffnen
  click(qsa('#match-list .index-entry[data-pane="stelle"]', $('st-treffer'))[0]);
  ok('Stelle-Pane geöffnet', topPane() && topPane().dataset.pane === 'stelle');
  ok('Stelle-Pane hat Meta-Strip', !!qs('.strip-meta', topPane()));
  ok('Stelle-Pane Abschnitt "Über die Stelle"', /Über die Stelle/.test(topPane().textContent));
  ok('Stelle-Pane Abschnitt "Wir bieten"', /Wir bieten/.test(topPane().textContent));
  // Bewerben (Pane auf Pane)
  click(qs('[data-pane="bewerben"]', topPane()));
  ok('Bewerben-Pane gestackt (2 Panes)', stack().length === 2 && topPane().dataset.pane === 'bewerben');
  ok('Bewerben-Pane hat Motivations-Feld', !!qs('textarea', topPane()));
  qs('textarea', topPane()).value = 'Sehr motiviert!';
  click(qs('[data-action="submit-bewerbung"]', topPane()));
  await delay(280);
  ok('Bewerbung schliesst oberste Pane', stack().length === 1);
  ok('Bewerbung-Vermerk nennt Betrieb (Siegel)', /ZKB/.test($('vermerk').textContent) && /gesendet/i.test($('vermerk').textContent) && $('vermerk').dataset.kind === 'siegel');
  // "Frage stellen" aus der Stelle → Chat-Pane (lernende)
  click(qs('[data-pane="chat"]', topPane()));
  ok('Frage stellen öffnet Chat-Pane', stack().length === 2 && topPane().dataset.pane === 'chat');
  window.popPane(); await delay(280);
  window.popPane(); await delay(280);
  ok('Stelle-Pfad vollständig geschlossen', stack().length === 0);

  // ═════════════ GESPRÄCHE → CHAT → SENDEN + XSS (Station 5) ═════════════
  console.log('\n[Station 5 · Gespräche / Chat / XSS-Escape]');
  window.gotoStation('gespraeche');
  const ge = $('st-gespraeche');
  const conv = qsa('.conv', ge);
  ok('3 Gespräche in der Liste', conv.length === 3);
  ok('Gesprächs-Kacheln haben Zeit-Stempel', conv.every((c) => !!qs('.ie-time', c)));
  click(conv[1]); // SBB
  ok('Chat-Pane geöffnet', topPane() && topPane().dataset.pane === 'chat');
  let log = qs('#chat-log', topPane());
  const before = log.children.length;
  ok('SBB-Chat lädt 2 Nachrichten', before === 2);
  // Senden via Klick auf Send-Button
  const inp = qs('#chat-inp', topPane());
  inp.value = 'Hallo, sehr gerne!';
  click(qs('.chat-send', topPane()));
  ok('Nachricht angehängt', qs('#chat-log', topPane()).children.length === before + 1);
  ok('Letzte Nachricht ist eigene (me)', !!qs('#chat-log .cm-row:last-child .bubble.me', topPane()));
  ok('Eingabefeld geleert', inp.value === '');
  // Leere Nachricht wird ignoriert
  inp.value = '   ';
  submit(qs('.chat-compose', topPane()));
  ok('Leere Nachricht wird ignoriert', qs('#chat-log', topPane()).children.length === before + 1);
  // XSS-Escape
  inp.value = '<img src=x onerror=alert(1)>';
  submit(qs('.chat-compose', topPane()));
  const last = qs('#chat-log .cm-row:last-child .bubble.me', topPane());
  ok('Gefährliches HTML escaped (kein <img>)', last && last.querySelector('img') === null);
  ok('Roh-Markup als Text sichtbar', last && /<img/.test(last.textContent));
  window.popPane(); await delay(280);
  ok('Chat-Pane geschlossen', stack().length === 0);

  // ═════════════ COCKPIT (Station 6) — Metriken / Ticker / Chips ═════════════
  console.log('\n[Station 6 · Marktwert-Cockpit]');
  window.gotoStation('cockpit');
  const co = $('st-cockpit');
  ok('4 Metric-Strips', qsa('.metric-strip', co).length === 4);
  ok('Aktivitäts-Ticker (≥3 Einträge)', qsa('.tick', co).length >= 3);
  const chips = qsa('.cmd-chip', co);
  ok('4 Schnellaktion-Chips', chips.length === 4);
  // Chip "Matches finden" → goto treffer
  const chipMatch = chips.find((c) => /Matches/.test(c.textContent));
  click(chipMatch);
  ok('Cockpit-Chip navigiert zu Treffer', window.App.station === 'treffer');
  window.gotoStation('cockpit');
  // Chip "CV ansehen" → Pane
  const chipCv = qsa('.cmd-chip', $('st-cockpit')).find((c) => /CV/.test(c.textContent));
  click(chipCv);
  ok('Cockpit-Chip öffnet CV-Pane', topPane() && topPane().dataset.pane === 'cv');
  window.popPane(); await delay(280);

  // ═════════════ COMMANDER (Cmd-K) — Maus + Tastatur + Esc ═════════════
  console.log('\n[Commander · Lernende]');
  window.gotoStation('cockpit');
  fireKey(doc.body, 'k', { ctrlKey: true });
  ok('Commander öffnet via Ctrl+K', $('commander').hidden === false);
  ok('Commander hat Treffer', qsa('#cmd-results .cmd-item').length > 0);
  ok('Commander gruppiert (Gehe zu / Aktion)', qsa('#cmd-results .cmd-group').length >= 2);
  // A11y-Semantik: Optionen sind role=option auf DIV (nicht button), Combobox koppelt active descendant
  ok('Treffer tragen role=option', qsa('#cmd-results .cmd-item').every((i) => i.getAttribute('role') === 'option'));
  ok('Optionen sind keine <button>', qsa('#cmd-results .cmd-item').every((i) => i.tagName.toLowerCase() !== 'button'));
  ok('Input ist combobox', $('cmd-input').getAttribute('role') === 'combobox');
  ok('aria-activedescendant zeigt auf aktive Option', $('cmd-input').getAttribute('aria-activedescendant') === qs('#cmd-results .cmd-item.active').id);
  // Filter
  typeInto($('cmd-input'), 'ZKB');
  ok('Filter findet ZKB-Stelle', qsa('#cmd-results .cmd-item').some((i) => /ZKB/.test(i.textContent)));
  typeInto($('cmd-input'), 'völligunsinn123');
  ok('Kein-Treffer-Zustand', !!qs('#cmd-results .cmd-empty'));
  // Tastatur-Navigation + Enter öffnet Stelle
  typeInto($('cmd-input'), 'ZKB');
  fireKey(doc.body, 'ArrowDown');
  ok('Pfeil-Nav aktualisiert aria-activedescendant', $('cmd-input').getAttribute('aria-activedescendant') === qs('#cmd-results .cmd-item.active').id);
  fireKey(doc.body, 'ArrowUp');
  fireKey(doc.body, 'Enter');
  await delay(280);
  ok('Enter schliesst Commander', $('commander').hidden === true);
  ok('Enter führte ZKB-Stelle aus', topPane() && topPane().dataset.pane === 'stelle');
  window.popPane(); await delay(280);
  // Maus-Klick auf ein Item
  window.openCommander();
  typeInto($('cmd-input'), 'Lebenslauf ansehen');
  const cvItem = qsa('#cmd-results .cmd-item').find((i) => /Lebenslauf ansehen/.test(i.textContent));
  click(cvItem);
  await delay(60);
  ok('Commander-Klick öffnet CV-Pane', topPane() && topPane().dataset.pane === 'cv');
  window.popPane(); await delay(280);
  // Esc schliesst
  window.openCommander();
  ok('Commander erneut offen', $('commander').hidden === false);
  fireKey(doc.body, 'Escape');
  await delay(240);
  ok('Esc schliesst Commander', $('commander').hidden === true);

  // ═════════════ TARIFE (Rail-Quereinstieg) — Lernende ═════════════
  console.log('\n[Tarife / Pakete · Lernende]');
  click($('rail-tarife'));
  ok('Tarife-Pane geöffnet', topPane() && topPane().dataset.pane === 'tarife');
  ok('Lernende-Tarife: 2 Spalten', qsa('.tarif-col', topPane()).length === 2);
  ok('Genau eine Empfehlung (hot)', qsa('.tarif-col.hot', topPane()).length === 1);
  click(qs('[data-action="choose-plan"]', topPane()));
  ok('Plan-Wahl zeigt Vermerk', $('vermerk').classList.contains('show') && /Paket/i.test($('vermerk').textContent));
  // Pane-Scrim schliesst Pane
  click($('pane-scrim'));
  await delay(280);
  ok('Scrim-Klick schliesst Tarife-Pane', stack().length === 0);

  // ═════════════ ESC schliesst oberste Pane ═════════════
  console.log('\n[Pane-Stack · Esc-Verhalten]');
  window.gotoStation('treffer');
  click(qsa('#match-list .index-entry[data-pane="stelle"]', $('st-treffer'))[0]);
  ok('Stelle-Pane für Esc-Test offen', stack().length === 1);
  fireKey(doc.body, 'Escape');
  await delay(280);
  ok('Esc schliesst oberste Pane', stack().length === 0);

  // ═════════════ ROLLEN-WECHSEL → BETRIEB ═════════════
  console.log('\n[Rollen-Kippschalter · Betrieb]');
  click(qs('.role-opt[data-role="betrieb"]'));
  ok('App.role = betrieb', window.App.role === 'betrieb' && $('shell').dataset.role === 'betrieb');
  ok('Rollen-Schalter ist radiogroup', $('role-switch').getAttribute('role') === 'radiogroup');
  ok('Rollen-Radio spiegelt Auswahl (aria-checked)', qs('.role-opt[data-role="betrieb"]').getAttribute('aria-checked') === 'true'
    && qs('.role-opt[data-role="lernende"]').getAttribute('aria-checked') === 'false');
  const bStations = ['betriebsprofil', 'ausschreiben', 'pool', 'b-gespraeche', 'pipeline'];
  ok('5 Rail-Knoten (Betrieb)', qsa('.rail-node').length === 5);
  bStations.forEach((id) => ok('Betrieb-Section st-' + id + ' existiert', !!$('st-' + id)));
  ok('Station auf erste Betrieb-Station gesetzt', window.App.station === 'betriebsprofil');

  // ═════════════ BETRIEB: PROFIL + STELLE AUSSCHREIBEN (echte Felder, kein Theater) ═════════════
  console.log('\n[Betrieb · Profil / Stelle ausschreiben]');
  window.gotoStation('betriebsprofil');
  const bp = $('st-betriebsprofil');
  ok('Betriebsprofil-Felder tragen data-bfield', qsa('[data-bfield]', bp).length === 3);
  ok('Betrieb-Ring startet bei 0%', qs('#ring-betrieb', bp).dataset.pct === '0');
  typeInto(qs('[data-bfield="firma"]', bp), 'Muster AG');
  ok('Betrieb-Live-Sync in App.betrieb', window.App.betrieb.firma === 'Muster AG');
  typeInto(qs('[data-bfield="branche"]', bp), 'Banken');
  typeInto(qs('[data-bfield="ort"]', bp), 'Zürich');
  click(qs('[data-action="save-betrieb"]', bp));
  ok('Betriebsprofil persistiert (State)', window.App.betrieb.branche === 'Banken' && window.App.betrieb.ort === 'Zürich');
  ok('Betrieb-Ring nach Sichern auf 100%', qs('#ring-betrieb', bp).dataset.pct === '100');
  ok('Betrieb-Vermerk spielt Firmennamen zurück', /Muster AG/.test($('vermerk').textContent));

  window.gotoStation('ausschreiben');
  const au = $('st-ausschreiben');
  ok('Inserat-Felder tragen data-ifield', qsa('[data-ifield]', au).length === 3);
  ok('Inserat-Stream initial leer', $('inserat-empty').hidden === false && qsa('#inserat-list .index-entry', au).length === 0);
  // Leere Berufsbezeichnung wird abgelehnt
  click(qs('[data-action="publish-inserat"]', au));
  ok('Leeres Inserat wird abgelehnt', qsa('#inserat-list .index-entry', au).length === 0);
  // Echte Eingaben → erscheint im Stream
  typeInto(qs('[data-ifield="beruf"]', au), 'Informatiker EFZ');
  typeInto(qs('[data-ifield="plaetze"]', au), '3');
  typeInto(qs('[data-ifield="beginn"]', au), 'August 2026');
  click(qs('[data-action="publish-inserat"]', au));
  ok('Inserat veröffentlichen → Vermerk (Siegel)', /Informatiker EFZ/.test($('vermerk').textContent) && $('vermerk').dataset.kind === 'siegel');
  ok('Inserat erscheint im Stream (State)', window.App.inserate.length === 1 && window.App.inserate[0].beruf === 'Informatiker EFZ');
  ok('Inserat-Eintrag im Markup sichtbar', qsa('#inserat-list .index-entry', $('st-ausschreiben')).length === 1
    && /Informatiker EFZ/.test($('inserat-list').textContent));
  ok('Inserat-Empty-State verschwunden', $('inserat-empty').hidden === true);
  ok('Inserat-Felder nach Veröffentlichung geleert', qs('[data-ifield="beruf"]', $('st-ausschreiben')).value === '');

  // ═════════════ BETRIEB: TALENT-POOL + FILTER ═════════════
  console.log('\n[Betrieb · Talent-Pool / Filter]');
  window.gotoStation('pool');
  const cards = () => qsa('#pool-list .index-entry', $('st-pool'));
  const visible = () => cards().filter((c) => !c.hidden);
  const fchip = (f) => qs('#pool-filters .fchip[data-filter="' + f + '"]', $('st-pool'));
  ok('4 Kandidaten im Pool', cards().length === 4);
  ok('Filter "Alle" initial aktiv', fchip('all').classList.contains('on'));
  click(fchip('zurich'));
  ok('Filter Zürich aktiv (genau einer on)', fchip('zurich').classList.contains('on') && qsa('#pool-filters .fchip.on', $('st-pool')).length === 1);
  ok('Zürich filtert Winterthur aus → 3', visible().length === 3);
  click(fchip('note5'));
  ok('Filter Note 5+ → 2', visible().length === 2);
  click(fchip('informatik'));
  ok('Filter Informatik → 0', visible().length === 0);
  ok('Empty-State sichtbar', $('pool-empty').hidden === false);
  ok('Pool-Zähler zeigt 0', /^0 /.test($('pool-count').textContent));
  click(fchip('all'));
  ok('Filter Alle → 4 sichtbar', visible().length === 4);
  ok('Empty-State wieder versteckt', $('pool-empty').hidden === true);

  // ═════════════ BETRIEB: KANDIDAT-AKTE + EINLADEN + ANSCHREIBEN ═════════════
  console.log('\n[Betrieb · Kandidat-Akte / Einladen / Anschreiben]');
  click(cards()[0]); // Lena Müller
  ok('Kandidat-Pane geöffnet', topPane() && topPane().dataset.pane === 'kandidat');
  ok('Kandidat-Pane Key gemerkt', topPane().dataset.key === 'Lena Müller');
  ok('Kandidat-Pane zeigt Noten-Strip (4 Zeilen)', qsa('.zeugnis-strip .zrow', topPane()).length === 4);
  ok('Kandidat-Pane zeigt Stärken', qsa('.tag.static', topPane()).length >= 1);
  ok('Kandidat-Pane hat Score-Ring', !!qs('.score-ring', topPane()));
  // Einladen (Schnupper-Pane gestackt)
  click(qs('[data-pane="schnupper"]', topPane()));
  ok('Schnupper-Pane gestackt', stack().length === 2 && topPane().dataset.pane === 'schnupper');
  ok('Schnupper-Pane hat Datum-Feld (data-sfield)', !!qs('[data-sfield="datum"]', topPane()));
  qs('[data-sfield="datum"]', topPane()).value = 'Mi 14. Mai';
  click(qs('[data-action="submit-schnupper"]', topPane()));
  await delay(280);
  ok('Einladung schliesst Pane', stack().length === 1);
  ok('Einladung-Vermerk spielt Datum + Name zurück', /Mi 14\. Mai/.test($('vermerk').textContent) && /Lena/.test($('vermerk').textContent) && $('vermerk').dataset.kind === 'siegel');
  // Anschreiben → Chat-Pane (Betrieb)
  click(qs('[data-pane="chat"]', topPane()));
  ok('Anschreiben öffnet Chat-Pane', stack().length === 2 && topPane().dataset.pane === 'chat');
  ok('Betrieb-Chat hat ≥1 Nachricht', qsa('#chat-log .cm-row', topPane()).length >= 1);
  const binp = qs('#chat-inp', topPane());
  const bcount = qs('#chat-log', topPane()).children.length;
  binp.value = 'Willkommen bei uns!';
  submit(qs('.chat-compose', topPane()));
  ok('Betrieb-Chat Nachricht via Submit gesendet', qs('#chat-log', topPane()).children.length === bcount + 1);
  window.popPane(); await delay(280);
  window.popPane(); await delay(280);
  ok('Alle Betrieb-Panes geschlossen', stack().length === 0);

  // ═════════════ BETRIEB: PIPELINE-COCKPIT ═════════════
  console.log('\n[Betrieb · Pipeline-Cockpit]');
  window.gotoStation('pipeline');
  const pip = $('st-pipeline');
  ok('Pipeline: 4 Metric-Strips', qsa('.metric-strip', pip).length === 4);
  ok('Pipeline: 4 Schnellaktionen', qsa('.cmd-chip', pip).length === 4);
  ok('Pipeline-Titel korrekt', /Pipeline-Cockpit/.test(pip.textContent));

  // ═════════════ BETRIEB: TARIFE (3 Spalten) + COMMANDER (Kandidaten) ═════════════
  console.log('\n[Betrieb · Tarife / Commander-Register]');
  click($('rail-tarife'));
  ok('Betrieb-Tarife: 3 Spalten', qsa('.tarif-col', topPane()).length === 3);
  ok('Betrieb-Tarife: eine Empfehlung', qsa('.tarif-col.hot', topPane()).length === 1);
  window.popPane(); await delay(280);
  window.openCommander();
  typeInto($('cmd-input'), 'Noah');
  ok('Commander findet Kandidat Noah', qsa('#cmd-results .cmd-item').some((i) => /Noah/.test(i.textContent)));
  click(qsa('#cmd-results .cmd-item').find((i) => /Noah/.test(i.textContent)));
  await delay(60);
  ok('Commander öffnet Kandidat Noah', topPane() && topPane().dataset.pane === 'kandidat' && /Noah/.test(topPane().textContent));
  window.popPane(); await delay(280);

  // ═════════════ ZURÜCK ZU LERNENDE + WORDMARK-HOME ═════════════
  console.log('\n[Rolle zurück · Lernende / Wordmark]');
  click(qs('.role-opt[data-role="lernende"]'));
  ok('App.role = lernende', window.App.role === 'lernende');
  ok('Wieder 6 Rail-Knoten', qsa('.rail-node').length === 6);
  window.gotoStation('cockpit');
  click(qs('.wordmark'));
  ok('Wordmark navigiert zur Startstation', window.App.station === 'steckbrief');

  // ═════════════ KEINE WAISEN-PANES / SAUBERER END-ZUSTAND ═════════════
  console.log('\n[End-Zustand]');
  ok('Kein Pane mehr offen', qsa('#pane-stack .pane').length === 0 && stack().length === 0);
  ok('Scrim versteckt', $('pane-scrim').hidden === true);
  ok('Commander geschlossen', $('commander').hidden === true);

  // ═════════════ ERGEBNIS ═════════════
  console.log('\n════════════════════════════');
  console.log(`  Bestanden: ${passed}   Fehlgeschlagen: ${failed}`);
  if (errors.length) {
    console.log('\n  ⚠️  Laufzeit-/Assert-Fehler:');
    errors.forEach((e) => console.log('   - ' + e));
  } else {
    console.log('  ✅ Keine JS-Laufzeitfehler.');
  }
  console.log('════════════════════════════');
  process.exit(failed === 0 && errors.length === 0 ? 0 : 1);
})().catch((e) => { console.error('FATAL im Testlauf:', e); process.exit(2); });
