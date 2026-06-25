'use strict';

/* ════════════════════════════════════════════════════════════════════
   LEHRLY LAUFBAHN — Studio Deck
   Persistente Rail-Reise + Commander + Stack-Panes. Vanilla JS, kein
   Framework, kein Backend. Single source of truth = App-State; Rail und
   Canvas werden aus dem State gerendert (kein Section-Toggling).
   ════════════════════════════════════════════════════════════════════ */

/* ── tiny helpers ── */
const $ = (id) => document.getElementById(id);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const prefersReduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

/* localStorage gegen Inkognito abgesichert */
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* noop */ } },
};

/* ════════════════════════════════════════════════════════════════════
   1. DATEN  (reine Daten — vom Renderer konsumiert, nicht hardverdrahtet)
   ════════════════════════════════════════════════════════════════════ */

const DATA = {
  stellen: {
    zkb: { mk: 'ZK', n: 'Kauffrau/-mann EFZ', co: 'ZKB · Zürich HB', l: '750', note: '4.5', pl: '4', score: 96,
      d: 'Bei der ZKB lernst du alle Facetten des Bankwesens: Kundenberatung, Backoffice und Zahlungsverkehr.',
      a: ['Sek A, Ø mind. 4.5', 'Freude an Zahlen & Menschen', 'Teamfähigkeit'],
      b: ['MacBook während der Lehrzeit', 'GA & Lunch-Zuschuss', '70 % Übernahmechance'] },
    sbb: { mk: 'SB', n: 'Kauffrau/-mann EFZ', co: 'SBB · Zürich HB', l: '730', note: '4.0', pl: '8', score: 91,
      d: 'Spannende Ausbildung bei der grössten Arbeitgeberin der Schweiz in verschiedenen Abteilungen.',
      a: ['Abgeschlossene Schulpflicht', 'Interesse an Admin & Organisation', 'Pünktlichkeit'],
      b: ['GA für die gesamte Lehrzeit', 'Lehrlingslager & Events', 'Sehr gute Übernahmechancen'] },
    sanitas: { mk: 'SA', n: 'KV Kundenservice EFZ', co: 'Sanitas · Zürich City', l: '700', note: '4.5', pl: '2', score: 85,
      d: 'Modernes Dienstleistungsunternehmen im Gesundheitsbereich mit Fokus auf Kundenkontakt.',
      a: ['Sek A, Ø mind. 4.5', 'Freude am Kundenkontakt', 'Kommunikationsstärke'],
      b: ['Modernes Büro in Zürich City', 'Homeoffice ab 2. Lehrjahr', 'Junges Team'] },
  },
  profs: {
    'Lena Müller':  { i: 'LM', p: 96, alt: '16', kan: 'Zürich',     sch: 'Sek A', beruf: 'Kauffrau EFZ', note: '5.3', d: 5.5, m: 5.0, e: 5.5, f: 4.5, st: ['Teamarbeit', 'Zahlen', 'Organisieren', 'Kundenkontakt'], sn: 'Raiffeisenbank (3T), Bäckerei (2T)', mot: 'Motiviert, zuverlässig, teamfähig. Ziel: Kauffrau EFZ.', tags: ['zurich', 'note5', 'schnuppern'] },
    'Noah Keller':  { i: 'NK', p: 89, alt: '15', kan: 'Zürich',     sch: 'Sek A', beruf: 'Kauffrau EFZ', note: '5.1', d: 5.0, m: 5.5, e: 5.0, f: 4.0, st: ['Digital', 'Analytisch', 'Zahlen'], sn: 'Zürich Versicherung (2T)', mot: 'Analytisches Denken und Zahlenaffinität sind meine Stärken.', tags: ['zurich', 'note5', 'schnuppern'] },
    'Sara Brunner': { i: 'SB', p: 85, alt: '16', kan: 'Zürich',     sch: 'Sek A', beruf: 'Kauffrau EFZ', note: '4.9', d: 5.0, m: 4.5, e: 5.0, f: 4.5, st: ['Kundenkontakt', 'Kreativität', 'Teamarbeit'], sn: 'Migros (2T)', mot: 'Ich liebe den Kontakt mit Menschen.', tags: ['zurich', 'schnuppern'] },
    'Tim Wenger':   { i: 'TW', p: 78, alt: '15', kan: 'Winterthur', sch: 'Sek A', beruf: 'Kauffrau EFZ', note: '4.7', d: 4.5, m: 5.0, e: 4.5, f: 4.0, st: ['Organisieren', 'Teamarbeit'], sn: 'Noch keine', mot: 'Zuverlässig und pünktlich.', tags: ['winterthur'] },
  },
  chats: {
    zkb:     { name: 'ZKB · Recruiting', msgs: [
      { them: 'Guten Tag! Wir haben Ihr Profil auf Lehrly.ch gesehen. Hätten Sie Interesse an einem Schnuppertag?', t: '14:28' },
      { me: 'Vielen Dank! Ich würde mich sehr freuen!', t: '14:30' },
      { them: 'Perfekt! Mittwoch 14. Mai, 9 bis 17 Uhr?', t: '14:32' } ] },
    sbb:     { name: 'SBB · Berufsbildung', msgs: [
      { them: 'Vielen Dank für Ihre Bewerbung!', t: '09:10' },
      { them: 'Hätten Sie Zeit für ein Schnupperpraktikum am 20. Mai?', t: '09:15' } ] },
    sanitas: { name: 'Sanitas · HR', msgs: [
      { them: 'Guten Tag! Haben Sie Interesse an einer Schnupperlehre bei uns?', t: 'Gestern' } ] },
  },
  /* Gespräche aus Betriebs-Sicht (Kandidaten) */
  betriebChats: {
    'Lena Müller':  { name: 'Lena Müller', msgs: [ { me: 'Guten Tag Lena! Ihr Profil hat uns überzeugt. Lust auf einen Schnuppertag?', t: 'Mo 10:02' }, { them: 'Sehr gerne, vielen Dank!', t: 'Mo 10:20' } ] },
    'Noah Keller':  { name: 'Noah Keller',  msgs: [ { me: 'Guten Tag Noah, wir würden Sie gerne kennenlernen.', t: 'Di 08:30' } ] },
    'Sara Brunner': { name: 'Sara Brunner', msgs: [ { me: 'Hallo Sara, passt ein Telefonat diese Woche?', t: 'Mi 14:00' } ] },
  },
  plaene: [
    { id: 'free',   name: 'Schnupper', preis: 'CHF 0', sub: 'für immer', f: ['Profil & CV erstellen', '3 Bewerbungen / Monat', 'Match-Stream'], cta: 'Aktiv', hot: false, role: 'lernende' },
    { id: 'plus',   name: 'Lehrly Plus', preis: 'CHF 9', sub: 'pro Monat', f: ['Unbegrenzte Bewerbungen', 'Marktwert-Cockpit', 'Priorität im Stream'], cta: 'Upgraden', hot: true, role: 'lernende' },
    { id: 'starter',name: 'Betrieb Start', preis: 'CHF 49', sub: 'pro Monat', f: ['1 aktive Stelle', 'Talent-Pool Zugriff', '20 Anschreiben'], cta: 'Wählen', hot: false, role: 'betrieb' },
    { id: 'pro',    name: 'Betrieb Pro', preis: 'CHF 149', sub: 'pro Monat', f: ['10 aktive Stellen', 'Pipeline-Cockpit', 'Unbegrenzte Anschreiben'], cta: 'Empfohlen', hot: true, role: 'betrieb' },
    { id: 'enter',  name: 'Enterprise', preis: 'Auf Anfrage', sub: 'individuell', f: ['Unbegrenzte Stellen', 'API & ATS-Anbindung', 'Persönliche Betreuung'], cta: 'Kontakt', hot: false, role: 'betrieb' },
  ],
};

/* Stations-Definitionen pro Rolle */
const STATIONS = {
  lernende: [
    { id: 'steckbrief', icon: 'i-steckbrief', label: 'Steckbrief',   kurz: 'Personalien & Berufswunsch' },
    { id: 'profil',     icon: 'i-profil',     label: 'Profil-Tiefe', kurz: 'Noten, Stärken, Erfahrung' },
    { id: 'unterlagen', icon: 'i-unterlagen', label: 'Unterlagen',   kurz: 'Dokumente & Lebenslauf' },
    { id: 'treffer',    icon: 'i-treffer',    label: 'Treffer',      kurz: 'Deine Matches' },
    { id: 'gespraeche', icon: 'i-gespraeche', label: 'Gespräche',    kurz: 'Konversationen' },
    { id: 'cockpit',    icon: 'i-cockpit',    label: 'Cockpit',      kurz: 'Marktwert & Aktivität' },
  ],
  betrieb: [
    { id: 'betriebsprofil', icon: 'i-betrieb',     label: 'Betriebsprofil', kurz: 'Euer Unternehmen' },
    { id: 'ausschreiben',   icon: 'i-ausschreiben',label: 'Stelle',         kurz: 'Stelle ausschreiben' },
    { id: 'pool',           icon: 'i-pool',        label: 'Talent-Pool',    kurz: 'Kandidaten filtern' },
    { id: 'b-gespraeche',   icon: 'i-gespraeche',  label: 'Gespräche',      kurz: 'Konversationen' },
    { id: 'pipeline',       icon: 'i-pipeline',    label: 'Pipeline',       kurz: 'Kennzahlen & Aktivität' },
  ],
};

/* ════════════════════════════════════════════════════════════════════
   STATE — Single source of truth
   ════════════════════════════════════════════════════════════════════ */
const App = {
  role: 'lernende',
  station: 'steckbrief',
  paneStack: [],            /* [{type, payload, el, trigger}] */
  cmdIndex: [],
  cmdActive: 0,
  poolFilter: 'all',
  profile: {},              /* ausgefüllte Steckbrief-Felder */
  strengths: {},            /* aktivierte Stärken-Tags */
  schnupperErf: '',         /* freie Schnupper-Erfahrung (Profil-Tiefe) */
  matched: false,
  betrieb: {},              /* Betriebsprofil-Felder */
  inserate: [],             /* selbst ausgeschriebene Stellen (in den Stream gespiegelt) */
};

/* ════════════════════════════════════════════════════════════════════
   2. RENDER-LAYER
   ════════════════════════════════════════════════════════════════════ */

function stationsFor(role) { return STATIONS[role] || STATIONS.lernende; }

/* ── Fortschritt: welche Stationen sind "abgeschlossen"? ── */
function isStationDone(id) {
  switch (id) {
    case 'steckbrief': return !!(App.profile.vorname && App.profile.beruf);
    case 'profil':     return Object.values(App.strengths).filter(Boolean).length >= 2;
    case 'unterlagen': return !!store.get('lehrly_cv_done');
    case 'treffer':    return App.matched;
    default:           return false;
  }
}

/* ── RAIL ── */
function renderRail() {
  const wrap = $('rail-stations');
  if (!wrap) return;
  wrap.innerHTML = '';
  stationsFor(App.role).forEach((st, idx) => {
    const node = el('button', 'rail-node');
    node.dataset.station = st.id;
    node.dataset.action = 'goto';
    node.setAttribute('aria-current', App.station === st.id ? 'true' : 'false');
    node.setAttribute('aria-label', st.label + ' — ' + st.kurz);
    node.setAttribute('title', st.label);
    const done = isStationDone(st.id);
    if (done) node.classList.add('done');
    if (App.station === st.id) node.classList.add('active');
    node.innerHTML =
      `<span class="rn-dot" aria-hidden="true"><svg class="ic"><use href="#${st.icon}"></use></svg></span>` +
      `<span class="rn-meta"><span class="rn-idx">0${idx + 1}</span><span class="rn-label">${st.label}</span><span class="rn-kurz">${st.kurz}</span></span>`;
    wrap.appendChild(node);
  });
  /* Rollen-Switch spiegeln */
  document.querySelectorAll('#role-switch .role-opt').forEach((b) => {
    const on = b.dataset.role === App.role;
    b.setAttribute('aria-checked', on ? 'true' : 'false');
    b.classList.toggle('on', on);
  });
  $('shell').dataset.role = App.role;
}

/* ── CANVAS: alle Stationen als echte Scroll-Abschnitte ── */
function renderCanvas() {
  const wrap = $('stations');
  wrap.innerHTML = '';
  stationsFor(App.role).forEach((st) => {
    const sec = el('section', 'station');
    sec.id = 'st-' + st.id;
    sec.dataset.station = st.id;
    sec.setAttribute('aria-label', st.label);
    sec.innerHTML =
      `<header class="st-head"><span class="st-eyebrow">Station · ${st.label}</span></header>` +
      `<div class="st-grid" data-body="${st.id}"></div>`;
    wrap.appendChild(sec);
    renderStation(st.id, sec.querySelector('.st-grid'));
  });
  observeStations();
}

/* ── einzelne Station füllen ── */
function renderStation(id, body) {
  const R = {
    steckbrief: renderSteckbrief, profil: renderProfilTiefe, unterlagen: renderUnterlagen,
    treffer: renderTreffer, gespraeche: () => renderGespraeche(body, 'lernende'), cockpit: () => renderCockpit(body, 'lernende'),
    betriebsprofil: renderBetriebsprofil, ausschreiben: renderAusschreiben, pool: renderPool,
    'b-gespraeche': () => renderGespraeche(body, 'betrieb'), pipeline: () => renderCockpit(body, 'betrieb'),
  };
  (R[id] || (() => {}))(body);
}

/* ───────── LERNENDE Station 1: Steckbrief ───────── */
function renderSteckbrief(b) {
  b.innerHTML =
    `<div class="st-main">
       <h1 class="st-title">Dein Steckbrief</h1>
       <p class="st-lede">Erzähl uns, wer du bist und welche Lehre du suchst. Ein Schritt nach dem anderen.</p>
       <form class="flow" id="form-steckbrief" autocomplete="off">
         <label class="field"><span class="lbl">Vorname</span><input class="inp" name="vorname" data-field="vorname" placeholder="z. B. Lena"></label>
         <label class="field"><span class="lbl">Nachname</span><input class="inp" name="nachname" data-field="nachname" placeholder="z. B. Müller"></label>
         <label class="field"><span class="lbl">Wohnkanton</span><input class="inp" name="kanton" data-field="kanton" placeholder="z. B. Zürich"></label>
         <label class="field"><span class="lbl">Berufswunsch</span><input class="inp" name="beruf" data-field="beruf" placeholder="z. B. Kauffrau EFZ"></label>
         <button type="button" class="btn" data-action="save-steckbrief">Steckbrief sichern</button>
       </form>
     </div>
     <aside class="st-margin">
       <div class="ring-wrap"><div class="ring" id="ring-steckbrief" data-pct="0"><span class="ring-num">0%</span></div><span class="ring-cap">Vollständig</span></div>
       <p class="margin-note">Je vollständiger dein Steckbrief, desto besser deine Matches.</p>
     </aside>`;
  syncSteckbrief(b);
}

function syncSteckbrief(b) {
  ['vorname', 'nachname', 'kanton', 'beruf'].forEach((f) => {
    const i = b.querySelector(`[data-field="${f}"]`);
    if (i && App.profile[f]) i.value = App.profile[f];
  });
  const filled = ['vorname', 'nachname', 'kanton', 'beruf'].filter((f) => App.profile[f]).length;
  const pct = Math.round(filled / 4 * 100);
  setRing(b.querySelector('#ring-steckbrief'), pct);
}

/* ───────── LERNENDE Station 2: Profil-Tiefe ───────── */
function renderProfilTiefe(b) {
  const noten = [['Deutsch', 5.5], ['Mathematik', 5.0], ['Englisch', 5.5], ['Französisch', 4.5]];
  const tags = ['Teamarbeit', 'Zahlen', 'Organisieren', 'Kundenkontakt', 'Digital', 'Kreativität', 'Analytisch'];
  b.innerHTML =
    `<div class="st-main">
       <h1 class="st-title">Profil-Tiefe</h1>
       <p class="st-lede">Deine Noten als Zeugnis-Strip, deine Stärken und Schnupper-Erfahrung.</p>
       <h2 class="sub-h">Zeugnis</h2>
       <div class="zeugnis-strip">
         ${noten.map(([n, v]) => `<div class="zrow"><span class="zn">${n}</span><div class="ztrack"><i style="width:${(v / 6 * 100).toFixed(0)}%"></i></div><span class="zv mono">${v.toFixed(1)}</span></div>`).join('')}
       </div>
       <h2 class="sub-h">Stärken</h2>
       <div class="tag-row" id="strength-tags">
         ${tags.map((t) => `<button type="button" class="tag${App.strengths[t] ? ' on' : ''}" data-action="toggle-strength" data-tag="${t}">${t}</button>`).join('')}
       </div>
       <h2 class="sub-h">Erfahrung & Schnuppern</h2>
       <label class="field"><span class="lbl">Bisherige Schnuppertage</span><input class="inp" name="schnupper" data-snfield="schnupper" placeholder="z. B. Raiffeisenbank (3 Tage)"></label>
     </div>
     <aside class="st-margin">
       <div class="ring-wrap"><div class="ring" id="ring-profil" data-pct="0"><span class="ring-num">0%</span></div><span class="ring-cap">Stärken gewählt</span></div>
       <p class="margin-note"><span class="mono">Ø 5.13</span> · Sek A</p>
     </aside>`;
  const sn = b.querySelector('[data-snfield="schnupper"]');
  if (sn && App.schnupperErf) sn.value = App.schnupperErf;
  syncStrengthRing(b);
}

function syncStrengthRing(b) {
  const n = Object.values(App.strengths).filter(Boolean).length;
  setRing(b.querySelector('#ring-profil'), Math.min(100, Math.round(n / 3 * 100)));
}

/* ───────── LERNENDE Station 3: Unterlagen ───────── */
function renderUnterlagen(b) {
  const docs = [['Zeugnis 2024', 'Sek Zürich · PDF', true], ['Multicheck', 'Resultat · PDF', true], ['Motivationsschreiben', 'Noch offen', false]];
  b.innerHTML =
    `<div class="st-main">
       <h1 class="st-title">Unterlagen</h1>
       <p class="st-lede">Lade deine Dokumente hoch — dein Lebenslauf rendert rechts als Vorschau.</p>
       <div class="doc-list">
         ${docs.map(([n, m, ok]) => `<div class="doc-line"><svg class="ic" aria-hidden="true"><use href="#i-doc"></use></svg><div class="dl-meta"><span class="dl-n">${n}</span><span class="dl-m">${m}</span></div><span class="dl-state ${ok ? 'ok' : 'open'}">${ok ? 'OK' : 'offen'}</span></div>`).join('')}
       </div>
       <button type="button" class="btn out" data-action="upload-doc">Dokument hochladen</button>
       <button type="button" class="btn" data-action="pane" data-pane="cv">CV-Vorschau öffnen</button>
     </div>
     <aside class="st-margin">
       <p class="margin-note">Dein Lehrly-CV wird automatisch aus Steckbrief, Noten und Stärken erzeugt.</p>
     </aside>`;
}

/* ───────── LERNENDE Station 4: Treffer ───────── */
function renderTreffer(b) {
  b.innerHTML =
    `<div class="st-main">
       <h1 class="st-title">Deine Treffer</h1>
       <p class="st-lede">Match-Stream auf Basis deines Profils. Starte das Matching — danach Stelle antippen für Details und Bewerben.</p>
       <button type="button" class="btn" id="btn-match" data-action="run-match">${App.matched ? 'Match-Stream aktualisieren' : 'Matches finden'}</button>
       <div class="index-list" id="match-list">${App.matched ? matchEntriesHTML() : matchTeaserHTML()}</div>
     </div>
     <aside class="st-margin">
       <p class="margin-note"><span class="mono">3</span> Stellen · Score ≥ 85</p>
       <p class="margin-note">Score = Passung von Noten, Region und Berufswunsch.</p>
     </aside>`;
}

/* Vor dem Matching: anonymisierter Teaser ohne Detail-Sprungziele */
function matchTeaserHTML() {
  return Object.keys(DATA.stellen).map(() =>
    `<div class="index-entry teaser" aria-hidden="true">
       <span class="ie-mark">··</span>
       <span class="ie-body"><span class="teaser-bar w1"></span><span class="teaser-bar w2"></span></span>
       <span class="ring sm" data-pct="0"><span class="ring-num mono">?</span></span>
     </div>`).join('') +
    `<p class="empty-state">Starte das Matching, um deine ${Object.keys(DATA.stellen).length} Treffer aufzudecken.</p>`;
}

function matchEntriesHTML() {
  return Object.entries(DATA.stellen).map(([k, s]) =>
    `<button type="button" class="index-entry" data-action="pane" data-pane="stelle" data-key="${k}">
       <span class="ie-mark">${s.mk}</span>
       <span class="ie-body"><span class="ie-title">${s.n}</span><span class="ie-sub">${s.co}</span></span>
       <span class="ring sm score-ring" data-pct="${s.score}"><span class="ring-num mono">${s.score}</span></span>
     </button>`).join('');
}

/* ───────── Station 5 / Betrieb 4: Gespräche ───────── */
function renderGespraeche(b, role) {
  const src = role === 'betrieb' ? DATA.betriebChats : DATA.chats;
  const entries = Object.entries(src);
  b.innerHTML =
    `<div class="st-main">
       <h1 class="st-title">Gespräche</h1>
       <p class="st-lede">${role === 'betrieb' ? 'Deine Konversationen mit Kandidaten.' : 'Deine Konversationen mit Betrieben.'}</p>
       <div class="index-list conv-list">
         ${entries.map(([key, c]) => {
           const last = c.msgs[c.msgs.length - 1];
           const prev = (last.me || last.them).slice(0, 46);
           return `<button type="button" class="index-entry conv" data-action="pane" data-pane="chat" data-key="${key}" data-chatrole="${role}">
             <span class="ie-mark">${c.name.slice(0, 2).toUpperCase()}</span>
             <span class="ie-body"><span class="ie-title">${esc(c.name)}</span><span class="ie-sub">${esc(prev)}…</span></span>
             <span class="ie-time">${last.t}</span>
           </button>`;
         }).join('')}
       </div>
     </div>
     <aside class="st-margin"><p class="margin-note mono">${entries.length} aktive Gespräche</p></aside>`;
}

/* ───────── Station 6 / Betrieb 5: Cockpit ───────── */
function renderCockpit(b, role) {
  const metrics = role === 'betrieb'
    ? [['Aktive Stellen', '3'], ['Bewerbungen', '47'], ['Im Pool', '128'], ['Schnupper geplant', '6']]
    : [['Profil-Stärke', '89'], ['Matches', '3'], ['Bewerbungen', '2'], ['Antwortquote', '67%']];
  const ticker = role === 'betrieb'
    ? ['Lena Müller hat zugesagt', 'Neue Bewerbung: KV EFZ', '12 neue Profile im Pool']
    : ['ZKB hat dir geschrieben', 'Dein Match-Score stieg auf 89', 'SBB lädt zum Schnuppern'];
  const actions = role === 'betrieb'
    ? [['Stelle ausschreiben', 'goto', 'ausschreiben'], ['Talent-Pool', 'goto', 'pool'], ['Gespräche', 'goto', 'b-gespraeche'], ['Pakete', 'pane', 'tarife']]
    : [['Matches finden', 'goto', 'treffer'], ['CV ansehen', 'pane', 'cv'], ['Gespräche', 'goto', 'gespraeche'], ['Pakete', 'pane', 'tarife']];
  b.innerHTML =
    `<div class="st-main">
       <h1 class="st-title">${role === 'betrieb' ? 'Pipeline-Cockpit' : 'Marktwert-Cockpit'}</h1>
       <p class="st-lede">${role === 'betrieb' ? 'Kennzahlen deiner Rekrutierung auf einen Blick.' : 'Dein Marktwert und deine Aktivität auf einen Blick.'}</p>
       <div class="metric-strips">
         ${metrics.map(([l, v]) => `<div class="metric-strip"><span class="ms-num mono">${v}</span><span class="ms-lbl">${l}</span></div>`).join('')}
       </div>
       <h2 class="sub-h">Aktivität</h2>
       <ul class="ticker">${ticker.map((t) => `<li class="tick"><span class="tick-dot"></span>${esc(t)}</li>`).join('')}</ul>
       <h2 class="sub-h">Schnellaktionen</h2>
       <div class="chip-row">
         ${actions.map(([lab, act, key]) => `<button type="button" class="cmd-chip" data-action="${act === 'goto' ? 'goto' : 'pane'}" ${act === 'goto' ? `data-station="${key}"` : `data-pane="${key}"`}>${lab}</button>`).join('')}
       </div>
     </div>
     <aside class="st-margin"><p class="margin-note">Werte aktualisieren sich automatisch.</p></aside>`;
}

/* ───────── BETRIEB Station 1: Betriebsprofil ───────── */
function renderBetriebsprofil(b) {
  b.innerHTML =
    `<div class="st-main">
       <h1 class="st-title">Betriebsprofil</h1>
       <p class="st-lede">So präsentiert sich euer Unternehmen den Lernenden.</p>
       <form class="flow" id="form-betrieb" autocomplete="off">
         <label class="field"><span class="lbl">Firmenname</span><input class="inp" name="firma" data-bfield="firma" placeholder="z. B. Muster AG"></label>
         <label class="field"><span class="lbl">Branche</span><input class="inp" name="branche" data-bfield="branche" placeholder="z. B. Banken & Finanzen"></label>
         <label class="field"><span class="lbl">Standort</span><input class="inp" name="ort" data-bfield="ort" placeholder="z. B. Zürich"></label>
         <button type="button" class="btn" data-action="save-betrieb">Profil sichern</button>
       </form>
     </div>
     <aside class="st-margin">
       <div class="ring-wrap"><div class="ring" id="ring-betrieb" data-pct="0"><span class="ring-num">0%</span></div><span class="ring-cap">Vollständig</span></div>
       <p class="margin-note">Ein vollständiges Profil erhöht eure Sichtbarkeit im Match-Stream.</p>
     </aside>`;
  syncBetrieb(b);
}

function syncBetrieb(b) {
  ['firma', 'branche', 'ort'].forEach((f) => {
    const i = b.querySelector(`[data-bfield="${f}"]`);
    if (i && App.betrieb[f]) i.value = App.betrieb[f];
  });
  const filled = ['firma', 'branche', 'ort'].filter((f) => App.betrieb[f]).length;
  setRing(b.querySelector('#ring-betrieb'), Math.round(filled / 3 * 100));
}

/* ───────── BETRIEB Station 2: Stelle ausschreiben ───────── */
function renderAusschreiben(b) {
  b.innerHTML =
    `<div class="st-main">
       <h1 class="st-title">Stelle ausschreiben</h1>
       <p class="st-lede">Geführter Fluss — die Stelle erscheint danach in eurem Stellen-Stream.</p>
       <form class="flow" id="form-inserat" autocomplete="off">
         <label class="field"><span class="lbl">Berufsbezeichnung</span><input class="inp" name="beruf" data-ifield="beruf" placeholder="z. B. Kauffrau/-mann EFZ"></label>
         <label class="field"><span class="lbl">Anzahl Plätze</span><input class="inp" name="plaetze" data-ifield="plaetze" type="number" min="1" placeholder="2"></label>
         <label class="field"><span class="lbl">Lehrbeginn</span><input class="inp" name="beginn" data-ifield="beginn" placeholder="August 2026"></label>
         <button type="button" class="btn" data-action="publish-inserat">Stelle veröffentlichen</button>
       </form>
       <h2 class="sub-h">Veröffentlichte Stellen</h2>
       <div class="index-list" id="inserat-list">${inseratEntriesHTML()}</div>
       <p class="empty-state" id="inserat-empty"${App.inserate.length ? ' hidden' : ''}>Noch keine Stelle ausgeschrieben.</p>
     </div>
     <aside class="st-margin"><p class="margin-note mono" id="inserat-count">${App.inserate.length} aktive Stellen</p><p class="margin-note">Tipp: Nenne den Lohn — Stellen mit Lohnangabe erhalten 2× mehr Bewerbungen.</p></aside>`;
}

function inseratEntriesHTML() {
  return App.inserate.map((s, idx) =>
    `<div class="index-entry static-entry">
       <span class="ie-mark">${esc((s.beruf || '?').slice(0, 2).toUpperCase())}</span>
       <span class="ie-body"><span class="ie-title">${esc(s.beruf || 'Stelle')}</span><span class="ie-sub">${esc(s.plaetze || '–')} Plätze · ab ${esc(s.beginn || 'n. V.')}</span></span>
       <span class="dl-state ok">live</span>
     </div>`).join('');
}

/* ───────── BETRIEB Station 3: Talent-Pool ───────── */
function renderPool(b) {
  const filters = [['all', 'Alle'], ['zurich', 'Zürich'], ['winterthur', 'Winterthur'], ['note5', 'Note 5+'], ['schnuppern', 'Schnupper-Erf.'], ['informatik', 'Informatik']];
  b.innerHTML =
    `<div class="st-main">
       <h1 class="st-title">Talent-Pool</h1>
       <p class="st-lede">Filtere den Pool — Treffer erscheinen direkt im Index. Kandidat antippen für die Akte.</p>
       <div class="filter-row" id="pool-filters">
         ${filters.map(([f, l]) => `<button type="button" class="fchip${f === 'all' ? ' on' : ''}" data-action="filter-pool" data-filter="${f}">${l}</button>`).join('')}
       </div>
       <div class="index-list" id="pool-list">${poolEntriesHTML()}</div>
       <p class="empty-state" id="pool-empty" hidden>Keine Kandidaten für diesen Filter.</p>
     </div>
     <aside class="st-margin"><p class="margin-note mono" id="pool-count">${Object.keys(DATA.profs).length} Kandidaten</p></aside>`;
}

function poolEntriesHTML() {
  return Object.entries(DATA.profs).map(([name, p]) =>
    `<button type="button" class="index-entry kand" data-action="pane" data-pane="kandidat" data-key="${name}" data-tags="${p.tags.join(',')}">
       <span class="ie-mark">${p.i}</span>
       <span class="ie-body"><span class="ie-title">${esc(name)}</span><span class="ie-sub">${p.beruf} · ${p.sch} · ${p.kan}</span></span>
       <span class="ring sm score-ring" data-pct="${p.p}"><span class="ring-num mono">${p.p}</span></span>
     </button>`).join('');
}

/* ════════════════════════════════════════════════════════════════════
   RING-Helfer (sich füllende Kreissegmente + Mono-Count-up)
   ════════════════════════════════════════════════════════════════════ */
function setRing(ring, pct) {
  if (!ring) return;
  ring.dataset.pct = pct;
  ring.style.setProperty('--pct', pct);
  const num = ring.querySelector('.ring-num');
  if (num) num.textContent = pct + '%';
}

function paintScoreRings(scope) {
  (scope || document).querySelectorAll('.score-ring').forEach((r) => {
    r.style.setProperty('--pct', r.dataset.pct || 0);
  });
}

/* ════════════════════════════════════════════════════════════════════
   3. NAVIGATION
   ════════════════════════════════════════════════════════════════════ */
function gotoStation(id, opts) {
  const list = stationsFor(App.role);
  if (!list.some((s) => s.id === id)) return;
  App.station = id;
  renderRail();
  const sec = $('st-' + id);
  if (sec) {
    if (prefersReduced() || (opts && opts.instant)) {
      try { $('canvas').scrollTop = sec.offsetTop; } catch (e) { /* noop */ }
    } else {
      try { sec.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) { try { $('canvas').scrollTop = sec.offsetTop; } catch (_) {} }
    }
  }
}

function switchRole(r) {
  if (r !== 'lernende' && r !== 'betrieb') return;
  App.role = r;
  App.station = stationsFor(r)[0].id;
  renderRail();
  renderCanvas();
  buildCommandIndex();
  paintScoreRings();
}

/* ════════════════════════════════════════════════════════════════════
   4. PANE-STACK  (einschiebende Stack-Panes — nie Bottom-Sheet)
   ════════════════════════════════════════════════════════════════════ */
const FOCUSABLE = 'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])';

function paneContent(type, payload) {
  switch (type) {
    case 'stelle':   return stellePane(payload);
    case 'kandidat': return kandidatPane(payload);
    case 'cv':       return cvPane();
    case 'chat':     return chatPane(payload);
    case 'tarife':   return tarifePane();
    case 'bewerben': return bewerbenPane(payload);
    case 'schnupper':return schnupperPane(payload);
    default:         return { title: 'Detail', html: '<p>—</p>' };
  }
}

function pushPane(type, payload) {
  const { title, html } = paneContent(type, payload);
  const trigger = document.activeElement;
  const pane = el('div', 'pane');
  pane.dataset.pane = type;
  if (payload) pane.dataset.key = (typeof payload === 'string' ? payload : (payload.key || ''));
  pane.setAttribute('role', 'dialog');
  pane.setAttribute('aria-modal', 'true');
  pane.setAttribute('aria-label', title);
  pane.innerHTML =
    `<header class="pane-head">
       <button class="pane-back" data-action="pop-pane" aria-label="Zurück"><svg class="ic" aria-hidden="true"><use href="#i-back"></use></svg></button>
       <h2 class="pane-title">${esc(title)}</h2>
       <button class="pane-x" data-action="pop-pane" aria-label="Schliessen"><svg class="ic" aria-hidden="true"><use href="#i-x"></use></svg></button>
     </header>
     <div class="pane-body">${html}</div>`;
  $('pane-stack').appendChild(pane);
  $('pane-stack').setAttribute('aria-hidden', 'false');
  $('pane-scrim').hidden = false;
  App.paneStack.push({ type, payload, el: pane, trigger });
  paintScoreRings(pane);
  /* einschieben */
  requestAnimationFrame(() => pane.classList.add('in'));
  /* Fokus in die Pane */
  const first = pane.querySelector(FOCUSABLE);
  if (first) { try { first.focus(); } catch (e) {} }
  return pane;
}

function popPane() {
  const top = App.paneStack.pop();
  if (!top) return;
  top.el.classList.remove('in');
  const remove = () => { if (top.el.parentNode) top.el.parentNode.removeChild(top.el); };
  if (prefersReduced()) remove(); else setTimeout(remove, 240);
  if (App.paneStack.length === 0) {
    $('pane-stack').setAttribute('aria-hidden', 'true');
    $('pane-scrim').hidden = true;
  }
  if (top.trigger && typeof top.trigger.focus === 'function') { try { top.trigger.focus(); } catch (e) {} }
}

function popAllPanes() { while (App.paneStack.length) popPane(); }

/* ── Pane-Inhalte ── */
function stellePane(key) {
  const s = DATA.stellen[key] || DATA.stellen.zkb;
  return { title: s.n, html:
    `<div class="pane-cols">
       <div class="pane-detail">
         <div class="detail-banner"><span class="ie-mark lg">${s.mk}</span><div><span class="db-tag">Lehrstelle</span><h3>${s.n}</h3><span class="db-co">${s.co}</span></div></div>
         <div class="strip-meta">
           <div class="sm-cell"><span class="sm-l">Lohn Lj. 1</span><span class="sm-v mono">CHF ${s.l}</span></div>
           <div class="sm-cell"><span class="sm-l">Plätze</span><span class="sm-v mono">${s.pl}</span></div>
           <div class="sm-cell"><span class="sm-l">Ø-Note</span><span class="sm-v mono">${s.note}+</span></div>
           <div class="sm-cell"><span class="sm-l">Match</span><span class="sm-v mono acc">${s.score}%</span></div>
         </div>
         <section class="detail-sec"><h4>Über die Stelle</h4><p>${esc(s.d)}</p></section>
         <section class="detail-sec"><h4>Wir bieten</h4><ul>${s.b.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></section>
         <section class="detail-sec"><h4>Du bringst mit</h4><ul>${s.a.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></section>
       </div>
       <aside class="pane-action">
         <button type="button" class="btn" data-action="pane" data-pane="bewerben" data-key="${key}">Jetzt bewerben</button>
         <button type="button" class="btn out" data-action="pane" data-pane="chat" data-key="${chatKeyForStelle(key)}" data-chatrole="lernende">Frage stellen</button>
       </aside>
     </div>` };
}
function chatKeyForStelle(key) { return DATA.chats[key] ? key : 'zkb'; }

function kandidatPane(name) {
  const p = DATA.profs[name] || DATA.profs['Lena Müller'];
  const noten = [['Deutsch', p.d], ['Mathematik', p.m], ['Englisch', p.e], ['Französisch', p.f]];
  return { title: name, html:
    `<div class="pane-cols">
       <div class="pane-detail">
         <div class="detail-banner"><span class="ie-mark lg">${p.i}</span><div><span class="db-tag">${p.beruf}</span><h3>${esc(name)}</h3><span class="db-co">${p.sch} · ${p.kan} · ${p.alt} J.</span></div>
           <span class="ring score-ring" data-pct="${p.p}"><span class="ring-num mono">${p.p}</span></span></div>
         <section class="detail-sec"><h4>Noten</h4>
           <div class="zeugnis-strip">${noten.map(([n, v]) => `<div class="zrow"><span class="zn">${n}</span><div class="ztrack"><i style="width:${(v / 6 * 100).toFixed(0)}%"></i></div><span class="zv mono">${v.toFixed(1)}</span></div>`).join('')}</div></section>
         <section class="detail-sec"><h4>Stärken</h4><div class="tag-row">${p.st.map((t) => `<span class="tag static">${esc(t)}</span>`).join('')}</div></section>
         <section class="detail-sec"><h4>Schnuppern</h4><p>${esc(p.sn)}</p></section>
         <section class="detail-sec"><h4>Über mich</h4><p>${esc(p.mot)}</p></section>
       </div>
       <aside class="pane-action">
         <button type="button" class="btn" data-action="pane" data-pane="schnupper" data-key="${esc(name)}">Zum Schnuppern einladen</button>
         <button type="button" class="btn out" data-action="pane" data-pane="chat" data-key="${esc(name)}" data-chatrole="betrieb">Anschreiben</button>
       </aside>
     </div>` };
}

function cvPane() {
  const p = App.profile;
  const nm = (p.vorname || 'Lena') + ' ' + (p.nachname || 'Müller');
  const beruf = p.beruf || 'Kauffrau EFZ';
  const kan = p.kanton || 'Zürich';
  return { title: 'Lebenslauf-Vorschau', html:
    `<div class="cv-sheet">
       <div class="cv-head"><h3>${esc(nm)}</h3><span class="cv-role mono">${esc(beruf)} · ${esc(kan)}</span></div>
       <div class="cv-sec"><h4>Schulische Ausbildung</h4><p>Sekundarschule A, ${esc(kan)} — Abschluss 2025</p></div>
       <div class="cv-sec"><h4>Noten</h4><div class="zeugnis-strip">
         <div class="zrow"><span class="zn">Deutsch</span><div class="ztrack"><i style="width:92%"></i></div><span class="zv mono">5.5</span></div>
         <div class="zrow"><span class="zn">Mathematik</span><div class="ztrack"><i style="width:83%"></i></div><span class="zv mono">5.0</span></div>
       </div></div>
       <div class="cv-sec"><h4>Stärken</h4><div class="tag-row">${(Object.keys(App.strengths).filter((k) => App.strengths[k]).map((t) => `<span class="tag static">${esc(t)}</span>`).join('') || '<span class="tag static">Teamarbeit</span>')}</div></div>
       <div class="cv-sec"><h4>Schnupper-Erfahrung</h4><p>${esc(App.schnupperErf || 'Raiffeisenbank (3 Tage), Bäckerei (2 Tage)')}</p></div>
     </div>
     <div class="pane-action inline"><button type="button" class="btn" data-action="cv-done">CV als bereit markieren</button></div>` };
}

function chatPane(payload) {
  const isObj = payload && typeof payload === 'object';
  const role = (isObj && payload.role) || App._lastChatRole || 'lernende';
  const key = isObj ? payload.key : payload;
  const src = role === 'betrieb' ? DATA.betriebChats : DATA.chats;
  const c = src[key] || Object.values(src)[0];
  App._lastChatRole = role;
  return { title: c.name, html:
    `<div class="chat-pane" data-chat-key="${esc(key || '')}" data-chat-role="${role}">
       <div class="chat-log" id="chat-log">${chatMsgsHTML(c)}</div>
       <form class="chat-compose" data-action="send-msg">
         <input class="chat-inp" id="chat-inp" placeholder="Nachricht schreiben …" autocomplete="off" aria-label="Nachricht">
         <button type="submit" class="chat-send" aria-label="Senden"><svg class="ic" aria-hidden="true"><use href="#i-arrow"></use></svg></button>
       </form>
     </div>` };
}
function chatMsgsHTML(c) {
  const first = c.name.split(/[ ·]/)[0];
  return c.msgs.map((m) => m.me
    ? `<div class="cm-row me"><div class="bubble me">${esc(m.me)}</div><span class="cm-time">Ich · ${m.t}</span></div>`
    : `<div class="cm-row them"><div class="bubble them">${esc(m.them)}</div><span class="cm-time">${esc(first)} · ${m.t}</span></div>`
  ).join('');
}

function tarifePane() {
  const rows = DATA.plaene.filter((p) => p.role === App.role);
  return { title: 'Pakete & Tarife', html:
    `<p class="pane-lede">Vergleich der Pakete für ${App.role === 'betrieb' ? 'Betriebe' : 'Lernende'}. Eine Empfehlung ist hervorgehoben.</p>
     <div class="tarif-table">
       ${rows.map((p) => `<div class="tarif-col${p.hot ? ' hot' : ''}">
         ${p.hot ? '<span class="tarif-flag">Empfohlen</span>' : ''}
         <h3 class="tarif-name">${p.name}</h3>
         <div class="tarif-price"><span class="tp-num mono">${p.preis}</span><span class="tp-sub">${p.sub}</span></div>
         <ul class="tarif-feat">${p.f.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
         <button type="button" class="btn${p.hot ? '' : ' out'}" data-action="choose-plan" data-plan="${p.name}">${p.cta}</button>
       </div>`).join('')}
     </div>` };
}

function bewerbenPane(key) {
  const s = DATA.stellen[key] || DATA.stellen.zkb;
  return { title: 'Bewerbung senden', html:
    `<div class="form-pane">
       <p class="pane-lede">Du bewirbst dich bei <strong>${esc(s.co)}</strong> als ${esc(s.n)}.</p>
       <label class="field"><span class="lbl">Kurze Motivation</span><textarea class="inp ta" placeholder="Warum diese Lehrstelle?"></textarea></label>
       <label class="field check"><input type="checkbox" checked> Lehrly-CV & Zeugnis anhängen</label>
       <button type="button" class="btn" data-action="submit-bewerbung" data-key="${key}">Bewerbung absenden</button>
     </div>` };
}

function schnupperPane(name) {
  return { title: 'Schnuppern einladen', html:
    `<div class="form-pane">
       <p class="pane-lede">Lade <strong>${esc(name)}</strong> zu einem Schnuppertag ein.</p>
       <label class="field"><span class="lbl">Datum</span><input class="inp" data-sfield="datum" placeholder="z. B. Mi 14. Mai"></label>
       <label class="field"><span class="lbl">Nachricht</span><textarea class="inp ta" data-sfield="nachricht" placeholder="Persönliche Worte …"></textarea></label>
       <button type="button" class="btn" data-action="submit-schnupper" data-key="${esc(name)}">Einladung senden</button>
     </div>` };
}

/* ════════════════════════════════════════════════════════════════════
   5. COMMANDER  (verb-gruppiertes Befehlsregister, Cmd-K)
   ════════════════════════════════════════════════════════════════════ */
function buildCommandIndex() {
  const idx = [];
  stationsFor(App.role).forEach((s) => idx.push({ group: 'Gehe zu', label: s.label, hint: s.kurz, run: () => gotoStation(s.id) }));
  if (App.role === 'lernende') {
    Object.entries(DATA.stellen).forEach(([k, s]) => idx.push({ group: 'Stelle öffnen', label: s.n + ' · ' + s.co, hint: 'Score ' + s.score, run: () => { gotoStation('treffer'); pushPane('stelle', k); } }));
    idx.push({ group: 'Aktion', label: 'Matches finden', hint: 'Match-Stream', run: () => { gotoStation('treffer'); const b = $('btn-match'); if (b) b.click(); } });
    idx.push({ group: 'Aktion', label: 'Lebenslauf ansehen', hint: 'CV-Vorschau', run: () => pushPane('cv') });
  } else {
    Object.entries(DATA.profs).forEach(([name, p]) => idx.push({ group: 'Kandidat', label: name, hint: p.beruf + ' · ' + p.kan, run: () => { gotoStation('pool'); pushPane('kandidat', name); } }));
    idx.push({ group: 'Aktion', label: 'Stelle ausschreiben', hint: 'Neue Lehrstelle', run: () => gotoStation('ausschreiben') });
  }
  idx.push({ group: 'Aktion', label: 'Pakete vergleichen', hint: 'Tarife', run: () => pushPane('tarife') });
  idx.push({ group: 'Rolle', label: App.role === 'lernende' ? 'Zu Betrieb wechseln' : 'Zu Lernende wechseln', hint: 'Rolle kippen', run: () => switchRole(App.role === 'lernende' ? 'betrieb' : 'lernende') });
  App.cmdIndex = idx;
  return idx;
}

function openCommander() {
  buildCommandIndex();
  const c = $('commander');
  c.hidden = false;
  requestAnimationFrame(() => c.classList.add('open'));
  const inp = $('cmd-input');
  inp.value = '';
  filterCommands('');
  try { inp.focus(); } catch (e) {}
}

function closeCommander() {
  const c = $('commander');
  c.classList.remove('open');
  if (prefersReduced()) c.hidden = true; else setTimeout(() => { c.hidden = true; }, 200);
}

function filterCommands(q) {
  const query = (q || '').trim().toLowerCase();
  const res = App.cmdIndex.filter((it) => !query || (it.label + ' ' + it.group + ' ' + it.hint).toLowerCase().includes(query));
  App.cmdResults = res;
  App.cmdActive = 0;
  const wrap = $('cmd-results');
  if (!res.length) { wrap.innerHTML = '<div class="cmd-empty">Kein Treffer für „' + esc(q) + '"</div>'; return; }
  let lastGroup = null, html = '';
  res.forEach((it, i) => {
    if (it.group !== lastGroup) { html += `<div class="cmd-group" role="presentation">${esc(it.group)}</div>`; lastGroup = it.group; }
    html += `<div class="cmd-item${i === 0 ? ' active' : ''}" id="cmd-opt-${i}" role="option" tabindex="-1" aria-selected="${i === 0 ? 'true' : 'false'}" data-action="cmd-run" data-idx="${i}">
      <span class="ci-label">${esc(it.label)}</span><span class="ci-hint">${esc(it.hint)}</span></div>`;
  });
  wrap.innerHTML = html;
  syncCmdActiveDescendant();
}

/* aktive Option für Screenreader an das Combobox-Input koppeln */
function syncCmdActiveDescendant() {
  const inp = $('cmd-input');
  if (!inp) return;
  const cur = $('cmd-results').querySelector('.cmd-item.active');
  inp.setAttribute('aria-activedescendant', cur ? cur.id : '');
}

function runCommand(i) {
  const it = App.cmdResults && App.cmdResults[i];
  closeCommander();
  if (it && it.run) it.run();
}

function moveCmdActive(dir) {
  const items = Array.from($('cmd-results').querySelectorAll('.cmd-item'));
  if (!items.length) return;
  if (items[App.cmdActive]) { items[App.cmdActive].classList.remove('active'); items[App.cmdActive].setAttribute('aria-selected', 'false'); }
  App.cmdActive = (App.cmdActive + dir + items.length) % items.length;
  const cur = items[App.cmdActive];
  cur.classList.add('active');
  cur.setAttribute('aria-selected', 'true');
  cur.scrollIntoView({ block: 'nearest' });
  syncCmdActiveDescendant();
}

/* ════════════════════════════════════════════════════════════════════
   6. FEATURE-AKTIONEN
   ════════════════════════════════════════════════════════════════════ */
function saveSteckbrief() {
  const form = $('form-steckbrief');
  if (!form) return;
  ['vorname', 'nachname', 'kanton', 'beruf'].forEach((f) => {
    const i = form.querySelector(`[data-field="${f}"]`);
    if (i) App.profile[f] = i.value.trim();
  });
  store.set('lehrly_profile', JSON.stringify(App.profile));
  syncSteckbrief(form.closest('.st-grid'));
  renderRail();
  vermerk('Steckbrief gesichert', 'haken');
}

function toggleStrength(tag, btn) {
  App.strengths[tag] = !App.strengths[tag];
  if (btn) btn.classList.toggle('on', App.strengths[tag]);
  store.set('lehrly_strengths', JSON.stringify(App.strengths));
  const grid = btn && btn.closest('.st-grid');
  if (grid) syncStrengthRing(grid);
  renderRail();
}

function runMatch(btn) {
  if (!btn) btn = $('btn-match');
  if (!btn) return;
  const wasMatched = App.matched;
  btn.disabled = true;
  btn.textContent = 'Matching läuft …';
  setTimeout(() => {
    App.matched = true;
    btn.textContent = '3 Matches gefunden';
    /* echter Effekt: Treffer werden jetzt erst eingefüllt (vorher Teaser) */
    const list = $('match-list');
    if (list) {
      list.innerHTML = matchEntriesHTML();
      paintScoreRings(list);
      if (!prefersReduced()) { list.style.opacity = '0'; requestAnimationFrame(() => { list.style.transition = 'opacity .5s'; list.style.opacity = '1'; }); }
    }
    renderRail();
    vermerk(wasMatched ? '3 Matches aktualisiert' : '3 Matches in deinem Stream', 'siegel');
    setTimeout(() => { btn.textContent = 'Match-Stream aktualisieren'; btn.disabled = false; }, 2600);
  }, 1500);
}

function filterPool(filter, chip) {
  App.poolFilter = filter || 'all';
  document.querySelectorAll('#pool-filters .fchip').forEach((c) => c.classList.toggle('on', c === chip));
  let visible = 0;
  document.querySelectorAll('#pool-list .index-entry').forEach((card) => {
    const tags = (card.dataset.tags || '').split(',');
    const ok = App.poolFilter === 'all' || tags.includes(App.poolFilter);
    card.hidden = !ok;
    if (ok) visible++;
  });
  const empty = $('pool-empty');
  if (empty) empty.hidden = visible !== 0;
  const cnt = $('pool-count');
  if (cnt) cnt.textContent = visible + ' Kandidaten';
}

function sendMsg(form) {
  const pane = form.closest('.chat-pane');
  const inp = pane.querySelector('#chat-inp');
  if (!inp.value.trim()) return;
  const log = pane.querySelector('#chat-log');
  const row = el('div', 'cm-row me');
  row.innerHTML = `<div class="bubble me">${esc(inp.value)}</div><span class="cm-time">Ich · Jetzt</span>`;
  log.appendChild(row);
  inp.value = '';
  log.scrollTop = log.scrollHeight;
}

function cvDone() {
  store.set('lehrly_cv_done', '1');
  renderRail();
  vermerk('Lebenslauf bereit', 'haken');
}

/* ── Betrieb: Profil sichern (echter State + localStorage) ── */
function saveBetrieb() {
  const form = $('form-betrieb');
  if (!form) { vermerk('Betriebsprofil gesichert', 'haken'); return; }
  ['firma', 'branche', 'ort'].forEach((f) => {
    const i = form.querySelector(`[data-bfield="${f}"]`);
    if (i) App.betrieb[f] = i.value.trim();
  });
  store.set('lehrly_betrieb', JSON.stringify(App.betrieb));
  syncBetrieb(form.closest('.st-grid'));
  const nm = App.betrieb.firma;
  vermerk(nm ? `Profil „${nm}" gesichert` : 'Betriebsprofil gesichert', 'haken');
}

/* ── Betrieb: Stelle veröffentlichen (liest Felder, spiegelt in Stream) ── */
function publishInserat() {
  const form = $('form-inserat');
  if (!form) { vermerk('Stelle veröffentlicht', 'siegel'); return; }
  const get = (f) => { const i = form.querySelector(`[data-ifield="${f}"]`); return i ? i.value.trim() : ''; };
  const beruf = get('beruf');
  if (!beruf) { vermerk('Bitte Berufsbezeichnung angeben', 'reiter'); return; }
  const entry = { beruf, plaetze: get('plaetze') || '1', beginn: get('beginn') || 'n. V.' };
  App.inserate.unshift(entry);
  store.set('lehrly_inserate', JSON.stringify(App.inserate));
  /* Stream live aktualisieren statt nur Toast */
  const list = $('inserat-list');
  if (list) list.innerHTML = inseratEntriesHTML();
  const empty = $('inserat-empty'); if (empty) empty.hidden = true;
  const cnt = $('inserat-count'); if (cnt) cnt.textContent = App.inserate.length + ' aktive Stellen';
  ['beruf', 'plaetze', 'beginn'].forEach((f) => { const i = form.querySelector(`[data-ifield="${f}"]`); if (i) i.value = ''; });
  vermerk(`„${beruf}" ist live im Stream`, 'siegel');
}

/* ── Bewerbung absenden: Motivation auslesen & in Bestätigung zurückspielen ── */
function submitBewerbung(t) {
  const pane = t.closest('.pane');
  const ta = pane && pane.querySelector('textarea');
  const txt = ta ? ta.value.trim() : '';
  const key = t.dataset.key;
  const s = DATA.stellen[key];
  popPane();
  vermerk(s ? `Bewerbung an ${s.co.split(' · ')[0]} gesendet` : 'Bewerbung gesendet', 'siegel');
}

/* ── Schnupper-Einladung: Datum/Nachricht auslesen & echoen ── */
function submitSchnupper(t) {
  const pane = t.closest('.pane');
  const datum = pane && pane.querySelector('[data-sfield="datum"]');
  const d = datum ? datum.value.trim() : '';
  const name = t.dataset.key || '';
  popPane();
  vermerk(d ? `Einladung an ${name} für ${d}` : `Einladung an ${name} gesendet`, 'siegel');
}

/* ── dock-vermerk Toast (andockende Sprech-Pille) ── */
let vermerkTimer = null;
function vermerk(msg, kind) {
  const v = $('vermerk');
  if (!v) return;
  v.hidden = false;
  v.dataset.kind = kind || 'haken';
  v.textContent = msg;
  void v.offsetWidth;
  v.classList.add('show');
  clearTimeout(vermerkTimer);
  vermerkTimer = setTimeout(() => { v.classList.remove('show'); }, 2400);
}

/* ════════════════════════════════════════════════════════════════════
   8. MOTION — IntersectionObserver Stations-Reveal
   ════════════════════════════════════════════════════════════════════ */
let _io = null;
function observeStations() {
  const targets = document.querySelectorAll('.station, .index-entry, .metric-strip, .zrow, .tarif-col');
  if (typeof IntersectionObserver !== 'function' || prefersReduced()) {
    targets.forEach((t) => t.classList.add('in'));
    return;
  }
  if (_io) _io.disconnect();
  _io = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) { const t = e.target; setTimeout(() => t.classList.add('in'), (i % 6) * 50); _io.unobserve(t); }
    });
  }, { root: $('canvas'), rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
  targets.forEach((t) => { t.classList.add('reveal'); _io.observe(t); });
  /* Defensive: noch nicht intersectete Targets nach Timeout sichtbar zwingen,
     damit Edge-Layouts/Zoom keine Blank-Sections produzieren. */
  setTimeout(() => { targets.forEach((t) => { if (!t.classList.contains('in')) t.classList.add('in'); }); }, 1200);
}

/* ── aktive Station aus Scroll-Position ableiten ── */
function trackActiveStation() {
  const canvas = $('canvas');
  if (!canvas) return;
  let raf = null;
  canvas.addEventListener('scroll', () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = null;
      const secs = Array.from(document.querySelectorAll('.station'));
      const top = canvas.scrollTop + canvas.clientHeight * 0.3;
      let cur = secs[0];
      for (const s of secs) { if (s.offsetTop <= top) cur = s; }
      if (cur && cur.dataset.station !== App.station) {
        App.station = cur.dataset.station;
        document.querySelectorAll('.rail-node').forEach((n) => {
          const on = n.dataset.station === App.station;
          n.classList.toggle('active', on);
          n.setAttribute('aria-current', on ? 'true' : 'false');
          /* done-Haken konsistent halten, auch wenn nur gescrollt wurde */
          n.classList.toggle('done', isStationDone(n.dataset.station));
        });
      }
    });
  }, { passive: true });
}

/* ════════════════════════════════════════════════════════════════════
   9. EVENT-DELEGATION  (kein Inline-onclick — data-action am Shell)
   ════════════════════════════════════════════════════════════════════ */
function onAction(e) {
  const t = e.target.closest('[data-action]');
  if (!t) return;
  const act = t.dataset.action;
  switch (act) {
    case 'home':            e.preventDefault(); gotoStation(stationsFor(App.role)[0].id); break;
    case 'goto':            gotoStation(t.dataset.station); break;
    case 'commander':       openCommander(); break;
    case 'close-commander': closeCommander(); break;
    case 'cmd-run':         runCommand(parseInt(t.dataset.idx, 10)); break;
    case 'pane':            openPaneFromEl(t); break;
    case 'pop-pane':        popPane(); break;
    case 'save-steckbrief': saveSteckbrief(); break;
    case 'toggle-strength': toggleStrength(t.dataset.tag, t); break;
    case 'run-match':       runMatch(t); break;
    case 'filter-pool':     filterPool(t.dataset.filter, t); break;
    case 'upload-doc':      vermerk('Dokument hochgeladen', 'haken'); break;
    case 'cv-done':         cvDone(); break;
    case 'save-betrieb':    saveBetrieb(); break;
    case 'publish-inserat': publishInserat(); break;
    case 'submit-bewerbung':submitBewerbung(t); break;
    case 'submit-schnupper':submitSchnupper(t); break;
    case 'choose-plan':     vermerk('Paket „' + t.dataset.plan + '" gewählt', 'reiter'); break;
    case 'send-msg':        break; /* via submit */
    default: break;
  }
}

function openPaneFromEl(t) {
  const type = t.dataset.pane;
  let payload = t.dataset.key || null;
  if (type === 'chat') payload = { key: t.dataset.key, role: t.dataset.chatrole || 'lernende' };
  pushPane(type, payload);
}

/* Rollen-Switch */
function onRoleSwitch(e) {
  const b = e.target.closest('.role-opt');
  if (!b) return;
  switchRole(b.dataset.role);
}

/* Formular-Submit (Chat senden) */
function onSubmit(e) {
  const form = e.target.closest('[data-action="send-msg"]');
  if (!form) return;
  e.preventDefault();
  sendMsg(form);
}

/* Steckbrief Live-Sync beim Tippen */
function onInput(e) {
  const f = e.target.closest('[data-field]');
  if (f) { App.profile[f.dataset.field] = f.value.trim(); }
  const bf = e.target.closest('[data-bfield]');
  if (bf) { App.betrieb[bf.dataset.bfield] = bf.value.trim(); }
  const sn = e.target.closest('[data-snfield]');
  if (sn) { App.schnupperErf = sn.value.trim(); store.set('lehrly_schnupper', App.schnupperErf); }
  if (e.target.id === 'cmd-input') filterCommands(e.target.value);
}

/* ── Tastatur: Cmd-K, Esc, Commander-Navigation, A11y für Index-Einträge ── */
function onKeydown(ev) {
  /* Commander öffnen */
  if ((ev.metaKey || ev.ctrlKey) && (ev.key === 'k' || ev.key === 'K')) {
    ev.preventDefault();
    if ($('commander').hidden) openCommander(); else closeCommander();
    return;
  }
  /* Commander aktiv? */
  if (!$('commander').hidden) {
    if (ev.key === 'Escape') { ev.preventDefault(); closeCommander(); return; }
    if (ev.key === 'ArrowDown') { ev.preventDefault(); moveCmdActive(1); return; }
    if (ev.key === 'ArrowUp') { ev.preventDefault(); moveCmdActive(-1); return; }
    if (ev.key === 'Enter') { ev.preventDefault(); runCommand(App.cmdActive); return; }
    return;
  }
  /* Esc schliesst oberste Pane */
  if (ev.key === 'Escape' && App.paneStack.length) { ev.preventDefault(); popPane(); return; }
  /* Fokus-Trap in oberster Pane */
  if (ev.key === 'Tab' && App.paneStack.length) {
    const pane = App.paneStack[App.paneStack.length - 1].el;
    const isVisible = (x) => x === document.activeElement || (typeof x.getClientRects === 'function' && x.getClientRects().length > 0) || x.offsetParent !== null;
    const items = Array.from(pane.querySelectorAll(FOCUSABLE)).filter(isVisible);
    if (items.length) {
      const f = items[0], l = items[items.length - 1];
      if (ev.shiftKey && document.activeElement === f) { ev.preventDefault(); l.focus(); }
      else if (!ev.shiftKey && document.activeElement === l) { ev.preventDefault(); f.focus(); }
      else if (!pane.contains(document.activeElement)) { ev.preventDefault(); f.focus(); }
    }
  }
}

/* ════════════════════════════════════════════════════════════════════
   INIT
   ════════════════════════════════════════════════════════════════════ */
function loadPersisted() {
  try {
    const p = store.get('lehrly_profile'); if (p) App.profile = JSON.parse(p) || {};
    const s = store.get('lehrly_strengths'); if (s) App.strengths = JSON.parse(s) || {};
    const b = store.get('lehrly_betrieb'); if (b) App.betrieb = JSON.parse(b) || {};
    const i = store.get('lehrly_inserate'); if (i) App.inserate = JSON.parse(i) || [];
    const sn = store.get('lehrly_schnupper'); if (sn) App.schnupperErf = sn;
  } catch (e) { App.profile = App.profile || {}; App.strengths = App.strengths || {}; App.betrieb = App.betrieb || {}; App.inserate = App.inserate || []; }
}

function init() {
  loadPersisted();
  renderRail();
  renderCanvas();
  buildCommandIndex();
  paintScoreRings();

  const shell = $('shell');
  shell.addEventListener('click', onAction);
  shell.addEventListener('submit', onSubmit);
  $('commander').addEventListener('click', onAction);
  $('pane-scrim').addEventListener('click', onAction);
  $('role-switch').addEventListener('click', onRoleSwitch);
  document.addEventListener('input', onInput);
  document.addEventListener('keydown', onKeydown);

  trackActiveStation();
  gotoStation(App.station, { instant: true });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

/* ── expose für Tests & Power-User ── */
window.App = App;
window.DATA = DATA;
window.gotoStation = gotoStation;
window.switchRole = switchRole;
window.pushPane = pushPane;
window.popPane = popPane;
window.openCommander = openCommander;
window.closeCommander = closeCommander;
window.filterCommands = filterCommands;
window.runMatch = runMatch;
window.filterPool = filterPool;
window.sendMsg = sendMsg;
window.vermerk = vermerk;
