/* Headless click-through test for lehrly.ch using jsdom.
   Loads index.html + app.js, simulates every interaction,
   and fails loudly on any JS error or broken state. */
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const errors = [];
let passed = 0;
let failed = 0;

function ok(name, cond) {
  if (cond) { passed++; console.log('  ✓ ' + name); }
  else { failed++; console.log('  ✗ ' + name); errors.push('ASSERT: ' + name); }
}

const vc = new VirtualConsole();
vc.on('jsdomError', (e) => errors.push('jsdomError: ' + (e.detail || e.message || e)));

let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const appjs = fs.readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf8');
// inline app.js so we don't depend on async resource fetching, and use a real
// http origin so localStorage works (file:// origin throws DOMException).
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

// jsdom's scrollTo throws "Not implemented"; override it outright
window.scrollTo = function () {};

const doc = window.document;
const $ = (id) => doc.getElementById(id);
const click = (el) => { if (!el) throw new Error('click on null'); el.dispatchEvent(new window.Event('click', { bubbles: true })); };
const fireKey = (el, key) => {
  const ev = new window.KeyboardEvent('keydown', { key, bubbles: true });
  el.dispatchEvent(ev);
};

// app.js is loaded async via <script src>. Wait for window.gLogin to appear.
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

(async function run() {
  await waitFor(() => typeof window.show === 'function');
  console.log('\n── app.js geladen ──');

  // ───────── DIREKTSTART (ohne Login) ─────────
  console.log('\n[Direktstart]');
  ok('Main direkt sichtbar', $('main').classList.contains('show'));
  ok('Kein Login-Gate im DOM', $('gate') === null);
  ok('Start-Screen aktiv', $('sc-home').classList.contains('on'));

  // ───────── NAVIGATION ─────────
  console.log('\n[Bottom-Nav]');
  const nav = doc.querySelectorAll('.bnav-item');
  ok('5 Nav-Items vorhanden', nav.length === 5);
  const screens = ['home', 'lernende', 'betriebe', 'chat', 'dash'];
  screens.forEach((s, i) => {
    click(nav[i]);
    ok('Nav → ' + s + ' aktiv', $('sc-' + s).classList.contains('on'));
    ok('Nav-Item ' + s + ' markiert', nav[i].classList.contains('on'));
  });

  // Top-Logo zurück zu Home
  click(doc.querySelector('.top-logo'));
  ok('Top-Logo → Home', $('sc-home').classList.contains('on'));

  // ───────── HOME ─────────
  console.log('\n[Home]');
  click(doc.querySelector('.hero-btn-p'));
  ok('Hero-Button → Profil', $('sc-lernende').classList.contains('on'));
  window.show('home');
  click(doc.querySelector('.hero-btn-s'));
  ok('Hero-Sekundär → Preise', $('sc-preise').classList.contains('on'));
  window.show('home');
  // Live-Cards öffnen Stelle
  click(doc.querySelectorAll('.live-card')[0]);
  ok('Live-Card öffnet Stelle-Modal', $('mo-stelle').classList.contains('open'));
  ok('Stelle-Modal hat Inhalt', $('stelle-body').innerHTML.includes('Über die Stelle'));
  window.cM();
  ok('Modal geschlossen', !$('mo-stelle').classList.contains('open'));
  // Feature-Cards
  const feat = doc.querySelectorAll('#sc-home .content-pad .card');
  click(feat[2]); // CV-Generator
  ok('Feature CV → CV-Modal offen', $('mo-cv').classList.contains('open'));
  window.cM();

  // ───────── LERNENDE / PROFIL ─────────
  console.log('\n[Profil-Formular]');
  window.show('lernende');
  const tag = doc.querySelector('#sc-lernende .tag');
  const before = tag.classList.contains('on');
  click(tag);
  ok('Stärken-Tag toggelt', tag.classList.contains('on') !== before);
  // Foto-Upload Toast
  click(doc.querySelector('#sc-lernende [onclick*="Foto"]'));
  ok('Foto-Upload zeigt Toast', $('toast') && $('toast').classList.contains('show'));
  // Matches finden Button
  const matchBtn = doc.querySelector('#sc-lernende .btn.b-blue.b-lg');
  click(matchBtn);
  ok('Match-Button disabled während Suche', matchBtn.disabled === true);
  await delay(2000);
  ok('Match-Button zeigt Ergebnis', /Matches/.test(matchBtn.textContent));
  await delay(2900);
  ok('Match-Button zurückgesetzt', matchBtn.disabled === false);
  // Match-Karten öffnen Stellen
  const mcards = doc.querySelectorAll('#match-list .mcard');
  ['zkb', 'sbb', 'sanitas'].forEach((k, i) => {
    click(mcards[i]);
    ok('Match-Karte ' + i + ' öffnet Stelle', $('mo-stelle').classList.contains('open'));
    window.cM();
  });

  // ───────── BETRIEBE ─────────
  console.log('\n[Betriebe / Kandidaten]');
  window.show('betriebe');
  click($('mo-cv') && doc.querySelector('#sc-betriebe .btn.b-gold')); // + Stelle
  ok('+ Stelle öffnet Inserat-Modal', $('mo-inserat').classList.contains('open'));
  window.cM();
  // Filter
  const chips = doc.querySelectorAll('.fchip');
  const cards = () => Array.from(doc.querySelectorAll('#kandidaten-list .kcard'));
  click([...chips].find((c) => c.dataset.filter === 'zurich'));
  ok('Filter Zürich aktiv', [...chips].find((c) => c.dataset.filter === 'zurich').classList.contains('on'));
  ok('Zürich filtert Winterthur aus', cards().filter((c) => !c.hidden).length === 3);
  click([...chips].find((c) => c.dataset.filter === 'note5'));
  ok('Filter Note5+ zeigt 2', cards().filter((c) => !c.hidden).length === 2);
  click([...chips].find((c) => c.dataset.filter === 'informatik'));
  ok('Filter Informatik → leer', cards().filter((c) => !c.hidden).length === 0);
  ok('Empty-State sichtbar', !$('kandidaten-empty').hidden);
  click([...chips].find((c) => c.dataset.filter === 'all'));
  ok('Filter Alle → 4 sichtbar', cards().filter((c) => !c.hidden).length === 4);
  ok('Empty-State versteckt', $('kandidaten-empty').hidden);
  // Profil öffnen
  click(cards()[0]);
  ok('Kandidat-Klick öffnet Profil', $('mo-profil').classList.contains('open'));
  ok('Profil enthält Noten', $('profil-body').innerHTML.includes('Noten'));
  ok('Profil merkt Kandidat', $('mo-profil').dataset.candidate === 'Lena Müller');
  // Einladen-Button im Profil
  click(doc.querySelector('#mo-profil .btn.b-mint'));
  ok('Profil → Schnupper-Einladung', $('mo-schnupper').classList.contains('open'));
  window.cM();
  // Nachricht senden aus Profil (Bugfix-Pfad)
  window.openProfil('Noah Keller');
  click(doc.querySelector('#mo-profil .btn.b-blue'));
  ok('Nachricht senden → Chat-View offen', $('sc-chat-view').classList.contains('on'));
  ok('Chat-Header zeigt Kandidat', $('chat-name-h').textContent === 'Noah Keller');
  ok('Chat-View hat Nachrichten', $('chat-msgs-view').children.length > 0);
  // Einladen direkt aus Karte
  window.show('betriebe');
  click(doc.querySelector('#kandidaten-list .kcard .btn.b-mint'));
  ok('Karten-Einladen öffnet Modal', $('mo-schnupper').classList.contains('open'));
  // Senden im Schnupper-Modal → Success
  click(doc.querySelector('#mo-schnupper .btn.b-mint'));
  ok('Schnupper Senden zeigt Success', $('s-sch').classList.contains('on'));
  await delay(2300);
  ok('Schnupper-Modal schliesst nach Senden', !$('mo-schnupper').classList.contains('open'));

  // ───────── INSERAT senden ─────────
  console.log('\n[Inserat & Bewerbung]');
  window.openM('mo-inserat');
  click(doc.querySelector('#mo-inserat .btn.b-gold'));
  ok('Inserat veröffentlichen → Success', $('s-ins').classList.contains('on'));
  await delay(2300);
  // Stelle → Bewerben → Bewerbung senden
  window.openStelle('zkb');
  click(doc.querySelector('#mo-stelle .btn.b-blue'));
  ok('Stelle → Bewerbung-Modal', $('mo-bew').classList.contains('open'));
  click(doc.querySelector('#mo-bew .btn.b-blue'));
  ok('Bewerbung Senden → Success', $('s-bew').classList.contains('on'));
  await delay(2300);

  // ───────── CHAT ─────────
  console.log('\n[Chat]');
  window.show('chat');
  const items = doc.querySelectorAll('#sc-chat .citem');
  ok('3 Chats in Liste', items.length === 3);
  click(items[1]); // SBB
  ok('Chat-Item öffnet Chat-View', $('sc-chat-view').classList.contains('on'));
  ok('Chat-Name = SBB', /SBB/.test($('chat-name-h').textContent));
  const msgCountBefore = $('chat-msgs-view').children.length;
  ok('SBB-Chat geladen', msgCountBefore === 2);
  // Nachricht senden
  $('chat-inp').value = 'Hallo, gerne!';
  click(doc.querySelector('.chat-send2'));
  ok('Nachricht hinzugefügt', $('chat-msgs-view').children.length === msgCountBefore + 1);
  ok('Eingabe geleert', $('chat-inp').value === '');
  // Enter-Taste
  $('chat-inp').value = 'Zweite Nachricht';
  fireKey($('chat-inp'), 'Enter');
  ok('Enter sendet Nachricht', $('chat-msgs-view').children.length === msgCountBefore + 2);
  // XSS-Schutz
  $('chat-inp').value = '<img src=x onerror=alert(1)>';
  click(doc.querySelector('.chat-send2'));
  const last = $('chat-msgs-view').lastElementChild.querySelector('.msg.me');
  ok('HTML wird escaped (kein img-Tag)', last && last.querySelector('img') === null);
  // Zurück-Button
  click(doc.querySelector('.chat-back'));
  ok('Chat-Back → Chat-Liste', $('sc-chat').classList.contains('on'));

  // ───────── DASHBOARD ─────────
  console.log('\n[Dashboard]');
  window.show('dash');
  click(doc.querySelector('#sc-dash .btn.b-gold')); // Lebenslauf
  ok('Dashboard → CV-Modal', $('mo-cv').classList.contains('open'));
  window.cM();
  click(doc.querySelector('#sc-dash .card[onclick]')); // Preise-Link
  ok('Dashboard → Preise', $('sc-preise').classList.contains('on'));

  // ───────── PREISE ─────────
  console.log('\n[Preise]');
  const priceBtns = doc.querySelectorAll('#sc-preise .pc-btn-wrap button');
  ok('5 Preis-Buttons', priceBtns.length === 5);
  priceBtns.forEach((b, i) => { click(b); });
  ok('Preis-Buttons zeigen Toast', $('toast').classList.contains('show'));

  // ───────── TOP-NAV Dashboard-Shortcut ─────────
  console.log('\n[Top-Nav]');
  click(doc.querySelector('.top-logout'));
  ok('Top-Nav-Shortcut → Dashboard', $('sc-dash').classList.contains('on'));

  // ───────── ERGEBNIS ─────────
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
})().catch((e) => {
  console.error('FATAL im Testlauf:', e);
  process.exit(2);
});
