'use strict';

/* ════════════════════════════
   ZUGANGSDATEN – HIER ÄNDERN!
   ════════════════════════════ */
const LOGINS = [
  { user: 'admin',  pwd: 'Lehrly2025!' },
  { user: 'lehrly', pwd: 'Schweiz2025' },
];
/* ════════════════════════════ */

const SK = 'lehrly_gate';
let att = 5;
let locked = false;

/* tiny DOM helper */
const $ = (id) => document.getElementById(id);

/* sichere localStorage-Wrapper (Inkognito/blockiert werfen sonst) */
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* no-op */ } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* no-op */ } },
};

/* ── Session prüfen ── */
(function checkSession() {
  try {
    const s = JSON.parse(store.get(SK) || '{}');
    if (s.exp && Date.now() < s.exp) { showMain(true); return; }
    store.del(SK);
  } catch (e) { /* ignore corrupt session */ }
})();

/* ══ LOGIN ══ */
function gLogin() {
  if (locked) return;
  const u = $('gu').value.trim();
  const p = $('gp').value;
  if (!u || !p) { showGErr('Bitte beide Felder ausfüllen.'); return; }
  const btn = $('gbtn');
  btn.disabled = true;
  btn.textContent = '⏳ Prüfen...';
  setTimeout(() => {
    const ok = LOGINS.find((l) => l.user === u && l.pwd === p);
    if (ok) {
      store.set(SK, JSON.stringify({ user: u, exp: Date.now() + 8 * 3600000 }));
      showGOk('✅ Willkommen!');
      setTimeout(() => showMain(false), 600);
    } else {
      att--;
      btn.disabled = false;
      btn.textContent = 'Einloggen →';
      const card = $('gate-card');
      card.classList.add('shake');
      setTimeout(() => card.classList.remove('shake'), 350);
      $('gp').value = '';
      if (att <= 0) {
        locked = true;
        showGErr('⛔ Zu viele Versuche. Bitte 5 Min. warten.');
        btn.disabled = true;
        setTimeout(() => { locked = false; att = 5; btn.disabled = false; }, 300000);
      } else {
        showGErr(`❌ Falsch – noch ${att} Versuche`);
      }
    }
  }, 700);
}

function showMain(instant) {
  if (instant) {
    $('gate').classList.add('hidden');
    $('main').classList.add('show');
    return;
  }
  const ss = $('success-screen');
  ss.classList.add('show');
  setTimeout(() => {
    $('gate').classList.add('hidden');
    ss.classList.remove('show');
    ss.style.display = 'none';
    $('main').classList.add('show');
  }, 2000);
}

function gLogout() { store.del(SK); location.reload(); }

function toggleGP() {
  const i = $('gp');
  const e = document.querySelector('.pwd-eye');
  i.type = i.type === 'password' ? 'text' : 'password';
  e.textContent = i.type === 'password' ? '👁' : '🙈';
}

function showGErr(m) {
  const e = $('ga-err');
  e.textContent = m;
  e.classList.add('show');
  $('ga-ok').classList.remove('show');
}
function showGOk(m) {
  const e = $('ga-ok');
  e.textContent = m;
  e.classList.add('show');
  $('ga-err').classList.remove('show');
}

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
  const items = document.querySelectorAll('.bnav-item');
  if (typeof index === 'number' && items[index]) setNav(items[index]);
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
  btn.textContent = '⏳ KI sucht...';
  setTimeout(() => {
    btn.textContent = '🎯 3 Matches!';
    btn.style.background = 'var(--mint)';
    const p = $('match-list');
    if (p) {
      p.style.opacity = '0';
      setTimeout(() => { p.style.transition = 'opacity .5s'; p.style.opacity = '1'; }, 300);
    }
    setTimeout(() => {
      btn.textContent = '✨ Matches finden!';
      btn.disabled = false;
      btn.style.background = '';
    }, 2800);
  }, 1800);
}

/* ══ STELLEN ══ */
const stellen = {
  zkb: { e: '🏦', n: 'Kauffrau EFZ', co: 'ZKB · Zürich HB', l: '750', note: '4.5', pl: '4', d: 'Bei der ZKB lernst du alle Facetten des Bankwesens – Kundenberatung, Backoffice, Zahlungsverkehr.', a: ['Sek A, Ø mind. 4.5', 'Freude an Zahlen & Menschen', 'Teamfähigkeit'], b: ['MacBook während der Lehrzeit', 'GA & Lunch-Zuschuss', '70% Übernahmechance'] },
  sbb: { e: '🚂', n: 'Kauffrau EFZ', co: 'SBB · Zürich HB', l: '730', note: '4.0', pl: '8', d: 'Spannende Ausbildung bei der grössten Arbeitgeberin der Schweiz in verschiedenen Abteilungen.', a: ['Abgeschlossene Schulpflicht', 'Interesse an Admin & Organisation', 'Pünktlichkeit'], b: ['GA für die gesamte Lehrzeit', 'Lehrlingslager & Events', 'Sehr gute Übernahmechancen'] },
  sanitas: { e: '💊', n: 'Kauffrau EFZ – Kundenservice', co: 'Sanitas · Zürich City', l: '700', note: '4.5', pl: '2', d: 'Modernes Dienstleistungsunternehmen im Gesundheitsbereich mit Fokus auf Kundenkontakt.', a: ['Sek A, Ø mind. 4.5', 'Freude am Kundenkontakt', 'Kommunikationsstärke'], b: ['Modernes Büro in Zürich City', 'Homeoffice ab 2. Lehrjahr', 'Junges Team'] },
};

function openStelle(k) {
  const s = stellen[k] || stellen.zkb;
  $('stelle-title-h').textContent = `${s.e} ${s.n}`;
  $('stelle-body').innerHTML = `
    <div class="stelle-banner"><div class="stlogo">${s.e}</div><div class="sttitle">${s.n}</div><div class="stco">${s.co}</div><div class="sttags"><span class="sttag">📅 Aug. 2025</span><span class="sttag">💰 CHF ${s.l}/Mt.</span><span class="sttag">⏱ 3 Jahre</span></div></div>
    <div class="igrid"><div class="ibox"><div class="ibox-l">Lohn Lj.1</div><div class="ibox-v">CHF ${s.l}</div></div><div class="ibox"><div class="ibox-l">Stellen</div><div class="ibox-v">${s.pl} Plätze</div></div><div class="ibox"><div class="ibox-l">Mindest-Note</div><div class="ibox-v">Ø ${s.note}+</div></div><div class="ibox"><div class="ibox-l">Schnuppern</div><div class="ibox-v" style="color:var(--mint)">✓ Möglich</div></div></div>
    <div class="ss"><h4>Über die Stelle</h4><p>${s.d}</p></div>
    <div class="ss"><h4>Wir bieten</h4><ul>${s.b.map((x) => `<li>${x}</li>`).join('')}</ul></div>
    <div class="ss"><h4>Du bringst mit</h4><ul>${s.a.map((x) => `<li>${x}</li>`).join('')}</ul></div>`;
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
  $('profil-body').innerHTML = `
    <div class="ptop-m">
      <div class="pav-m">${pr.i}</div>
      <div style="flex:1"><div class="pname-m">${name}</div><div class="psub-m">${pr.beruf} · ${pr.sch} · ${pr.kan}</div><div class="pchips"><span class="pch">📍 ${pr.kan}</span><span class="pch">📅 Aug. 2025</span>${pr.sn !== 'Noch keine' ? '<span class="pch gr">✓ Schnupper</span>' : ''}</div></div>
      <div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0;"><div class="pmring-m" style="--p:${pct}"><span class="pmn-m">${pct}%</span></div><div style="font-size:10px;color:var(--muted);margin-top:3px;">Match</div></div>
    </div>
    <div style="background:var(--pale2);border-radius:10px;padding:13px;border:1px solid var(--border);margin-bottom:12px;">
      <div style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-bottom:8px;">Noten</div>
      ${[['Deutsch', pr.d], ['Mathe', pr.m], ['Englisch', pr.e], ['Französisch', pr.f]].map(([n, v]) => `<div class="nbar"><span class="nbl">${n}</span><div class="nbt"><div class="nbf" style="width:${(v / 6 * 100).toFixed(0)}%"></div></div><span class="nbv">${v}</span></div>`).join('')}
    </div>
    ${pr.st.length ? `<div style="background:var(--pale2);border-radius:10px;padding:13px;border:1px solid var(--border);margin-bottom:12px;"><div style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-bottom:8px;">Stärken</div><div class="tags">${pr.st.map((s) => `<span class="tag on" style="cursor:default">${s}</span>`).join('')}</div></div>` : ''}
    <div style="background:var(--pale2);border-radius:10px;padding:13px;border:1px solid var(--border);margin-bottom:12px;"><div style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-bottom:6px;">Über mich</div><p style="font-size:13.5px;line-height:1.65;">${pr.mot}</p></div>
    <div class="zdoc"><div class="zdi">📋</div><div><div class="zname">Zeugnis 2024</div><div class="zmeta">Sek ${pr.kan} · PDF</div></div><span class="zstatus">✓</span></div>
    <div class="zdoc"><div class="zdi">📄</div><div><div class="zname">Lebenslauf</div><div class="zmeta">Lehrly CV</div></div><span class="zstatus">✓</span></div>`;
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
    { them: 'Perfekt! Mittwoch 14. Mai, 9–17 Uhr?', t: '14:32' },
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
    ? `<div><div class="msg me">${m.me}</div><div class="msg-time2 r">Ich – ${m.t}</div></div>`
    : `<div><div class="msg them">${m.them}</div><div class="msg-time2">${first} – ${m.t}</div></div>`
  ).join('');
  el.scrollTop = el.scrollHeight;
}

function sendMsg() {
  const inp = $('chat-inp');
  if (!inp.value.trim()) return;
  const el = $('chat-msgs-view');
  const d = document.createElement('div');
  const safe = inp.value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  d.innerHTML = `<div class="msg me">${safe}</div><div class="msg-time2 r">Jetzt</div>`;
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
window.gLogin = gLogin;
window.gLogout = gLogout;
window.toggleGP = toggleGP;
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
