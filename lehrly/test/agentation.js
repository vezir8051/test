/* Verifiziert die gated Agentation-Integration mit dem echten Bundle. */
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const bundle = fs.readFileSync(path.join(ROOT, 'vendor', 'agentation.bundle.js'), 'utf8');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n); } };
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function makeDom(url) {
  const vc = new VirtualConsole();
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    runScripts: 'outside-only', url, pretendToBeVisual: true, virtualConsole: vc,
  });
  dom.window.matchMedia = dom.window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
  return dom;
}

(async function () {
  console.log('\n[Agentation – gated by ?annotate]');

  // OHNE ?annotate → nichts gemountet
  {
    const dom = makeDom('https://lehrly.ch/');
    dom.window.eval(bundle);
    await delay(50);
    ok('Ohne ?annotate: kein agentation-root', dom.window.document.getElementById('agentation-root') === null);
  }

  // MIT ?annotate → Toolbar gemountet
  {
    const dom = makeDom('https://lehrly.ch/?annotate');
    let err = null;
    dom.window.addEventListener('error', (e) => { err = e.error || e.message; });
    try { dom.window.eval(bundle); } catch (e) { err = e; }
    await delay(400); // React 18 createRoot rendert asynchron
    const doc = dom.window.document;
    const root = doc.getElementById('agentation-root');
    ok('Mit ?annotate: agentation-root erstellt', root !== null);
    // Die Toolbar wird per React-Portal in document.body gerendert → DOM wächst
    const rendered = doc.body.querySelectorAll('*').length;
    ok('Mit ?annotate: Toolbar in den DOM gerendert', rendered > 3);
    ok('Kein Laufzeitfehler beim Mounten', !err);
    if (err) console.log('     Fehler:', err && err.message ? err.message : err);
  }

  console.log('\n════════════════════════════');
  console.log(`  Bestanden: ${pass}   Fehlgeschlagen: ${fail}`);
  console.log(fail === 0 ? '  ✅ Agentation-Gating verifiziert.' : '  ❌ Probleme.');
  console.log('════════════════════════════');
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('FATAL:', e); process.exit(2); });
