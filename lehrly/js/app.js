'use strict';

/* tiny DOM helper */
const $ = (id) => document.getElementById(id);

/* ══ NAVIGATION ══ */
function show(n) {
  document.querySelectorAll('.sc').forEach((s) => s.classList.remove('on'));
  const el = $('sc-' + n);
  if (el) { el.classList.add('on'); window.scrollTo(0, 0); }
}
function setNav(el) {
  document.querySelectorAll('.bnav-item').forEach((i) => i.classList.remove('on'));
  if (el) el.classList.add('on');
}
function navTo(name, index) {
  show(name);
  if (typeof index !== 'number') return;
  const bottom = document.querySelectorAll('.bnav-item');
  if (bottom[index]) setNav(bottom[index]);
  /* Desktop-Nav spiegeln */
  document.querySelectorAll('.dnav-item').forEach((el, i) => el.classList.toggle('on', i === index));
}
function showPreise() { show('preise'); }

/* ══ TOAST (statt alert) ══ */
let toastTimer = null;
function toast(msg) {
  let t = $('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  /* force reflow so re-triggered animation runs */
  void t.offsetWidth;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ══ PROFIL-FORM ══ */
function tg(el) { el.classList.toggle('on'); }

function runMatch(btn) {
  btn.disabled = true;
  btn.textContent = 'Matching läuft …';
  setTimeout(() => {
    btn.textContent = '3 Matches gefunden';
    const p = $('match-list');
    if (p) {
      p.style.opacity = '0';
      setTimeout(() => { p.style.transition = 'opacity .5s'; p.style.opacity = '1'; }, 300);
    }
    setTimeout(() => {
      btn.textContent = 'Matches finden';
      btn.disabled = false;
    }, 2800);
  }, 1800);
}

/* ══ STELLEN ══ */
const stellen = {
  zkb: { mk: 'ZK', n: 'Kauffrau EFZ', co: 'ZKB · Zürich HB', l: '750', note: '4.5', pl: '4', d: 'Bei der ZKB lernst du alle Facetten des Bankwesens: Kundenberatung, Backoffice und Zahlungsverkehr.', a: ['Sek A, Ø mind. 4.5', 'Freude an Zahlen & Menschen', 'Teamfähigkeit'], b: ['MacBook während der Lehrzeit', 'GA & Lunch-Zuschuss', '70 % Übernahmechance'] },
  sbb: { mk: 'SB', n: 'Kauffrau EFZ', co: 'SBB · Zürich HB', l: '730', note: '4.0', pl: '8', d: 'Spannende Ausbildung bei der grössten Arbeitgeberin der Schweiz in verschiedenen Abteilungen.', a: ['Abgeschlossene Schulpflicht', 'Interesse an Admin & Organisation', 'Pünktlichkeit'], b: ['GA für die gesamte Lehrzeit', 'Lehrlingslager & Events', 'Sehr gute Übernahmechancen'] },
  sanitas: { mk: 'SA', n: 'Kauffrau EFZ Kundenservice', co: 'Sanitas · Zürich City', l: '700', note: '4.5', pl: '2', d: 'Modernes Dienstleistungsunternehmen im Gesundheitsbereich mit Fokus auf Kundenkontakt.', a: ['Sek A, Ø mind. 4.5', 'Freude am Kundenkontakt', 'Kommunikationsstärke'], b: ['Modernes Büro in Zürich City', 'Homeoffice ab 2. Lehrjahr', 'Junges Team'] },
};

function openStelle(k) {
  const s = stellen[k] || stellen.zkb;
  $('stelle-title-h').textContent = s.n;
  $('stelle-body').innerHTML = `
    <div class="st-banner"><span class="tag">${s.mk} · Lehrstelle</span><h4>${s.n}</h4><div class="co">${s.co}</div></div>
    <div class="st-meta">
      <div class="c"><div class="l">Lohn Lj. 1</div><div class="v">CHF ${s.l}</div></div>
      <div class="c"><div class="l">Stellen</div><div class="v">${s.pl} Plätze</div></div>
      <div class="c"><div class="l">Mindest-Note</div><div class="v">Ø ${s.note}+</div></div>
      <div class="c"><div class="l">Schnuppern</div><div class="v acc">Möglich</div></div>
    </div>
    <div class="sec"><h5>Über die Stelle</h5><p>${s.d}</p></div>
    <div class="sec"><h5>Wir bieten</h5><ul>${s.b.map((x) => `<li>${x}</li>`).join('')}</ul></div>
    <div class="sec"><h5>Du bringst mit</h5><ul>${s.a.map((x) => `<li>${x}</li>`).join('')}</ul></div>`;
  openM('mo-stelle');
}

/* ══ KANDIDATEN-PROFILE ══ */
const profs = {
  'Lena Müller':   { i: 'LM', p: 96, alt: '16', kan: 'Zürich',     sch: 'Sek A', beruf: 'Kauffrau EFZ', note: '5.3', d: 5.5, m: 5.0, e: 5.5, f: 4.5, st: ['Teamarbeit', 'Zahlen', 'Organisieren', 'Kundenkontakt'], sn: 'Raiffeisenbank (3T), Bäckerei (2T)', mot: 'Motiviert, zuverlässig, teamfähig. Ziel: Kauffrau EFZ.' },
  'Noah Keller':   { i: 'NK', p: 89, alt: '15', kan: 'Zürich',     sch: 'Sek A', beruf: 'Kauffrau EFZ', note: '5.1', d: 5.0, m: 5.5, e: 5.0, f: 4.0, st: ['Digital', 'Analytisch', 'Zahlen'], sn: 'Zürich Versicherung (2T)', mot: 'Analytisches Denken und Zahlenaffinität sind meine Stärken.' },
  'Sara Brunner':  { i: 'SB', p: 85, alt: '16', kan: 'Zürich',     sch: 'Sek A', beruf: 'Kauffrau EFZ', note: '4.9', d: 5.0, m: 4.5, e: 5.0, f: 4.5, st: ['Kundenkontakt', 'Kreativität', 'Teamarbeit'], sn: 'Migros (2T)', mot: 'Ich liebe den Kontakt mit Menschen.' },
  'Tim Wenger':    { i: 'TW', p: 78, alt: '15', kan: 'Winterthur', sch: 'Sek A', beruf: 'Kauffrau EFZ', note: '4.7', d: 4.5, m: 5.0, e: 4.5, f: 4.0, st: ['Organisieren', 'Teamarbeit'], sn: 'Noch keine', mot: 'Zuverlässig und pünktlich.' },
};

function openProfil(name) {
  const pr = profs[name] || profs['Lena Müller'];
  const pct = pr.p;
  const docIcon = '<svg viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/></svg>';
  $('profil-body').innerHTML = `
    <div class="pdetail-top">
      <div class="mk">${pr.i}</div>
      <div style="flex:1"><div class="nm">${name}</div><div class="sb">${pr.beruf} · ${pr.sch} · ${pr.kan}</div>
        <div class="pchips"><span class="pch">${pr.kan}</span><span class="pch">Aug 2025</span>${pr.sn !== 'Noch keine' ? '<span class="pch acc">Schnupper-Erfahrung</span>' : ''}</div>
      </div>
      <div class="big">${pct}</div>
    </div>
    <div class="sec grades">
      <h5>Noten</h5>
      ${[['Deutsch', pr.d], ['Mathe', pr.m], ['Englisch', pr.e], ['Französisch', pr.f]].map(([n, v]) => `<div class="gbar"><span class="gl">${n}</span><div class="gt"><div class="gf" style="width:${(v / 6 * 100).toFixed(0)}%"></div></div><span class="gv">${v}</span></div>`).join('')}
    </div>
    ${pr.st.length ? `<div class="sec"><h5>Stärken</h5><div class="tags">${pr.st.map((s) => `<span class="tag on" style="cursor:default">${s}</span>`).join('')}</div></div>` : ''}
    <div class="sec"><h5>Über mich</h5><p>${pr.mot}</p></div>
    <div class="doc"><div class="ic">${docIcon}</div><div style="flex:1"><div class="nm">Zeugnis 2024</div><div class="mt">Sek ${pr.kan} · PDF</div></div><span class="ok">OK</span></div>
    <div class="doc"><div class="ic">${docIcon}</div><div style="flex:1"><div class="nm">Lebenslauf</div><div class="mt">Lehrly CV</div></div><span class="ok">OK</span></div>`;
  /* Merke aktuell geöffneten Kandidaten für "Nachricht senden" */
  $('mo-profil').dataset.candidate = name;
  openM('mo-profil');
}

/* "Nachricht senden" aus dem Kandidaten-Profil → öffnet den Chat */
function messageCandidate() {
  const name = $('mo-profil').dataset.candidate || 'Lena Müller';
  cM();
  $('chat-name-h').textContent = name;
  loadChatMsgs('candidate', name);
  navTo('chat-view', 3);
}

/* ══ CHAT ══ */
const chatData = {
  zkb: [
    { them: 'Guten Tag! Wir haben Ihr Profil auf Lehrly.ch gesehen. Hätten Sie Interesse an einem Schnuppertag?', t: '14:28' },
    { me: 'Vielen Dank! Ich würde mich sehr freuen!', t: '14:30' },
    { them: 'Perfekt! Mittwoch 14. Mai, 9 bis 17 Uhr?', t: '14:32' },
  ],
  sbb: [
    { them: 'Vielen Dank für Ihre Bewerbung!', t: '09:10' },
    { them: 'Hätten Sie Zeit für ein Schnupperpraktikum am 20. Mai?', t: '09:15' },
  ],
  sanitas: [
    { them: 'Guten Tag! Haben Sie Interesse an einer Schnupperlehre bei uns?', t: 'Gestern' },
  ],
  candidate: [
    { me: 'Guten Tag! Ich habe Ihr Profil gesehen und würde Sie gerne kennenlernen.', t: 'Jetzt' },
  ],
};

function openChat(key, name) {
  $('chat-name-h').textContent = name;
  loadChatMsgs(key, name);
  navTo('chat-view', 3);
}

function loadChatMsgs(key, nameOverride) {
  const msgs = chatData[key] || chatData.zkb;
  const name = nameOverride || $('chat-name-h').textContent;
  const first = name.split(' ')[0];
  const el = $('chat-msgs-view');
  el.innerHTML = msgs.map((m) => m.me
    ? `<div><div class="msg me">${m.me}</div><div class="mtime r">Ich · ${m.t}</div></div>`
    : `<div><div class="msg them">${m.them}</div><div class="mtime">${first} · ${m.t}</div></div>`
  ).join('');
  el.scrollTop = el.scrollHeight;
}

function sendMsg() {
  const inp = $('chat-inp');
  if (!inp.value.trim()) return;
  const el = $('chat-msgs-view');
  const d = document.createElement('div');
  const safe = inp.value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  d.innerHTML = `<div class="msg me">${safe}</div><div class="mtime r">Jetzt</div>`;
  el.appendChild(d);
  inp.value = '';
  el.scrollTop = el.scrollHeight;
}

/* ══ BETRIEBE: FILTER ══ */
function filterKandidaten(chip) {
  document.querySelectorAll('.fchip').forEach((c) => c.classList.remove('on'));
  chip.classList.add('on');
  const f = chip.dataset.filter || 'all';
  let visible = 0;
  document.querySelectorAll('#kandidaten-list .kcard').forEach((card) => {
    const tags = (card.dataset.tags || '').split(',');
    const matchOk = f === 'all' || tags.includes(f);
    card.hidden = !matchOk;
    if (matchOk) visible++;
  });
  const empty = $('kandidaten-empty');
  if (empty) empty.hidden = visible !== 0;
}

/* ══ MODALS ══ */
function openM(id) { const m = $(id); if (m) m.classList.add('open'); }
function cM() { document.querySelectorAll('.mo').forEach((m) => m.classList.remove('open')); }
function docS(id) { const e = $(id); if (e) e.classList.add('on'); setTimeout(cM, 2200); }

/* close modal sheets when pressing Escape (desktop) */
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') cM(); });

/* expose for inline handlers */
window.show = show;
window.setNav = setNav;
window.navTo = navTo;
window.showPreise = showPreise;
window.tg = tg;
window.runMatch = runMatch;
window.openStelle = openStelle;
window.openProfil = openProfil;
window.messageCandidate = messageCandidate;
window.openChat = openChat;
window.loadChatMsgs = loadChatMsgs;
window.sendMsg = sendMsg;
window.filterKandidaten = filterKandidaten;
window.openM = openM;
window.cM = cM;
window.docS = docS;
window.toast = toast;

/* ══ SCROLL-ENTRY: Rows/Cards faden mit Stagger ein (IntersectionObserver) ══
   Guard: in Umgebungen ohne IO (jsdom) wird sofort sichtbar geschaltet. */
(function scrollReveal() {
  const targets = document.querySelectorAll('.rows .row, #kandidaten-list .kcard, .list-num .li, .metric, .plan, .fcell');
  if (typeof IntersectionObserver !== 'function') {
    targets.forEach((t) => t.classList.add('in'));
    return;
  }
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    targets.forEach((t) => { t.classList.add('reveal'); t.classList.add('in'); });
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        const el = e.target;
        setTimeout(() => el.classList.add('in'), (i % 6) * 60);
        io.unobserve(el);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  targets.forEach((t) => { t.classList.add('reveal'); io.observe(t); });
})();

/* ══ A11Y: Tastatur-Bedienbarkeit für div/span-Elemente mit onclick ══
   Macht klickbare Nicht-Buttons fokussierbar (Tab) und mit Enter/Space auslösbar,
   ohne bestehende onclick-Handler/Selektoren zu verändern. */
(function enhanceA11y() {
  /* dekorative Inline-Icons aus dem Accessibility-Tree nehmen */
  document.querySelectorAll('use[href^="#i-"]').forEach((u) => {
    const svg = u.closest('svg');
    if (svg) svg.setAttribute('aria-hidden', 'true');
  });
  const sel = '.row,.li,.fcell,.kcard,.fchip,.citem,.tag,.photo .ph,.upload';
  document.querySelectorAll(sel).forEach((el) => {
    if (el.closest('[id^="profil-body"]') || el.closest('[id^="stelle-body"]')) return;
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
    if (!el.hasAttribute('role')) el.setAttribute('role', 'button');
    el.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        el.click();
      }
    });
  });
})();
