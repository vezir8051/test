/* Edge-case tests for the login gate: session restore, second credential,
   lockout after 5 failed attempts, empty-field validation. */
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.join(__dirname, '..');
let passed = 0, failed = 0;
const errors = [];
const ok = (n, c) => { if (c) { passed++; console.log('  ✓ ' + n); } else { failed++; console.log('  ✗ ' + n); errors.push(n); } };

const baseHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const appjs = fs.readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf8');
const html = baseHtml.replace('<script src="js/app.js"></script>', '<script>' + appjs + '</script>');

function makeDom(seedStorage) {
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errors.push('jsdomError: ' + (e.detail || e.message || e)));
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://lehrly.ch/', virtualConsole: vc });
  dom.window.scrollTo = () => {};
  if (seedStorage) dom.window.localStorage.setItem('lehrly_gate', seedStorage);
  // run app.js after optional seed so checkSession sees it
  dom.window.eval(appjs);
  return dom;
}
const waitFor = (cond, ms = 3000) => new Promise((res, rej) => {
  const s = Date.now();
  (function p() { if (cond()) return res(); if (Date.now() - s > ms) return rej(new Error('timeout')); setTimeout(p, 20); })();
});
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

(async function () {
  // ── Session restore: gültige Session → direkt eingeloggt ──
  console.log('\n[Session-Wiederherstellung]');
  {
    const valid = JSON.stringify({ user: 'admin', exp: Date.now() + 3600000 });
    const { window } = makeDom(valid);
    await waitFor(() => typeof window.gLogin === 'function');
    ok('Gültige Session → Gate sofort versteckt', window.document.getElementById('gate').classList.contains('hidden'));
    ok('Gültige Session → Main sofort sichtbar', window.document.getElementById('main').classList.contains('show'));
  }
  // ── Abgelaufene Session → bleibt im Gate ──
  {
    const expired = JSON.stringify({ user: 'admin', exp: Date.now() - 1000 });
    const { window } = makeDom(expired);
    await waitFor(() => typeof window.gLogin === 'function');
    ok('Abgelaufene Session → Gate bleibt', !window.document.getElementById('gate').classList.contains('hidden'));
    ok('Abgelaufene Session entfernt', !window.localStorage.getItem('lehrly_gate'));
  }

  // ── Zweiter Zugang (lehrly/Schweiz2025) ──
  console.log('\n[Zweiter Zugang]');
  {
    const { window } = makeDom(null);
    await waitFor(() => typeof window.gLogin === 'function');
    const d = window.document;
    d.getElementById('gu').value = 'lehrly';
    d.getElementById('gp').value = 'Schweiz2025';
    window.gLogin();
    await delay(1500);
    ok('lehrly-Zugang akzeptiert', d.getElementById('success-screen').classList.contains('show'));
  }

  // ── Leere Felder ──
  console.log('\n[Validierung]');
  {
    const { window } = makeDom(null);
    await waitFor(() => typeof window.gLogin === 'function');
    const d = window.document;
    d.getElementById('gu').value = '';
    d.getElementById('gp').value = '';
    window.gLogin();
    ok('Leere Felder → Fehlermeldung', d.getElementById('ga-err').classList.contains('show'));
    ok('Leere Felder → kein Spinner', d.getElementById('gbtn').disabled === false);
  }

  // ── Lockout nach 5 Fehlversuchen ──
  console.log('\n[Lockout]');
  {
    const { window } = makeDom(null);
    await waitFor(() => typeof window.gLogin === 'function');
    const d = window.document;
    for (let i = 0; i < 5; i++) {
      d.getElementById('gu').value = 'admin';
      d.getElementById('gp').value = 'wrong' + i;
      window.gLogin();
      await delay(800);
    }
    ok('Nach 5 Fehlversuchen gesperrt', /Zu viele Versuche/.test(d.getElementById('ga-err').textContent));
    ok('Button bleibt deaktiviert', d.getElementById('gbtn').disabled === true);
    // weiterer Versuch wird ignoriert
    d.getElementById('gu').value = 'admin';
    d.getElementById('gp').value = 'Lehrly2025!';
    window.gLogin();
    await delay(800);
    ok('Login während Lockout blockiert', !d.getElementById('main').classList.contains('show'));
  }

  console.log('\n════════════════════════════');
  console.log(`  Bestanden: ${passed}   Fehlgeschlagen: ${failed}`);
  if (errors.length) { console.log('  ⚠️ ' + errors.length + ' Probleme'); errors.forEach((e) => console.log('   - ' + e)); }
  else console.log('  ✅ Alle Edge-Cases bestanden.');
  console.log('════════════════════════════');
  process.exit(failed === 0 && errors.filter((e) => e.startsWith('jsdomError')).length === 0 ? 0 : 1);
})().catch((e) => { console.error('FATAL:', e); process.exit(2); });
