'use strict';
const $ = (id) => document.getElementById(id);
const demo = location.search.includes('demo');

/* Mapa przemieszczeń dla soczewki: przy krawędziach panelu próbkujemy treść głębiej wewnątrz (efekt wypukłego szkła) */
(function buildLensMap() {
  const PW = 368, PH = 556, PAD = 40, R = 32, BEVEL = 44, W = PW + 2 * PAD, H = PH + 2 * PAD;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), img = g.createImageData(W, H), cx = PAD + PW / 2, cy = PAD + PH / 2;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const px = x + .5 - cx, py = y + .5 - cy;
    const qx = Math.abs(px) - (PW / 2 - R), qy = Math.abs(py) - (PH / 2 - R);
    const d = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - R, depth = -d;
    let r = 128, gg = 128;
    if (depth > 0 && depth < BEVEL) {
      let nx, ny;
      if (qx > 0 || qy > 0) { nx = Math.sign(px) * Math.max(qx, 0); ny = Math.sign(py) * Math.max(qy, 0); const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l; }
      else if (qx > qy) { nx = Math.sign(px); ny = 0; } else { nx = 0; ny = Math.sign(py); }
      const t = 1 - depth / BEVEL, m = t * t * (3 - 2 * t);
      r = 128 - nx * m * 127; gg = 128 - ny * m * 127;
    }
    const o = (y * W + x) * 4; img.data[o] = r; img.data[o + 1] = gg; img.data[o + 2] = 128; img.data[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  $('lensMap').setAttribute('href', c.toDataURL());
})();

/* Połysk i obwódka reagują na pozycję kursora jak źródło światła */
document.addEventListener('mousemove', (e) => {
  const r = $('panel').getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  const dx = x - r.width / 2, dy = y - r.height / 2;
  const root = document.documentElement.style;
  root.setProperty('--mx', x + 'px'); root.setProperty('--my', y + 'px');
  root.setProperty('--ang', (Math.atan2(dx, -dy) * 180 / Math.PI + 180).toFixed(0) + 'deg');
});

/* Światło na kafelkach i przyciskach podąża za kursorem */
document.addEventListener('pointermove', (e) => {
  const t = e.target.closest && e.target.closest('.tile,.chip,.btn,.row,.contact'); if (!t) return;
  const r = t.getBoundingClientRect(); t.style.setProperty('--tx', (e.clientX - r.left) + 'px'); t.style.setProperty('--ty', (e.clientY - r.top) + 'px');
}, { passive: true });

/* ---------- ikony i układ menu ---------- */
const I = {
  translate: 'M4 5h8M8 3v2M6 5c0 4 2 7 5 9M12 5c-.5 3-3 7-7 9M13 20l4-9 4 9M14.5 17h5',
  send: 'M21 3L3 11l7 3 3 7zM10 14l11-11',
  slack: 'M4 5h16v11H9l-5 4zM8 9h8M8 12h5',
  refuse: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM6 6l12 12',
  official: 'M6 3h9l4 4v14H6zM14 3v5h5M9 12h6M9 16h6',
  bizen: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18',
  headings: 'M6 4v16M18 4v16M6 12h12',
  tasks: 'M9 6h11M9 12h11M9 18h11M4 6l1.2 1.2L7 5M4 12l1.2 1.2L7 11M4 18l1.2 1.2L7 17',
  commit: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 12h6M15 12h6',
  flashcards: 'M4 8h13v11H4zM7 5h13v11',
  quiz: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17h.01',
  hardwords: 'M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h10M9 8h5',
  mine: 'M12 3l2.4 5 5.6.8-4 4 1 5.7-5-2.7-5 2.7 1-5.7-4-4 5.6-.8z',
  mail: 'M3 6h18v12H3zM3 7l9 7 9-7',
  chat: 'M4 5h16v11H9l-5 4z',
  trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13',
  reply: 'M9 7L4 12l5 5M4 12h10a6 6 0 0 1 6 6',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  web: 'M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15zM16 16l5 5',
  check: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 12.5l2.7 2.7L16 9.5',
  precheck: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 12.5l2.7 2.7L16 9.5',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  explain: 'M8 8l-4 4 4 4M16 8l4 4-4 4M14 5l-4 14',
  plus: 'M12 5v14M5 12h14',
};
const LABEL = { translate: 'Przetłumacz', send: 'Wyślij do…', slack: 'Wersja na Slack lub Teams', refuse: 'Uprzejma odmowa', official: 'Pismo urzędowe', bizen: 'Angielski biznesowy', headings: 'Nagłówki i akapity', tasks: 'Notatki na zadania', commit: 'Komunikat commita', flashcards: 'Fiszki', quiz: 'Quiz z tekstu', hardwords: 'Trudne słowa', reply: 'Odpowiedz…', calendar: 'Do kalendarza', web: 'Szukaj w internecie', precheck: 'Sprawdź przed wysłaniem', explain: 'Wyjaśnij kod' };
/* Układ w stylu Apple Writing Tools: duże kafelki, potem listy z grupami */
const LAYOUT = [
  ['tile', 'g2', null, ['translate', 'send']],
  ['tile', 'g2', null, ['reply', 'calendar']],
  ['list', '', 'Szybkie', ['web']],
  ['list', '', 'Komunikacja', ['precheck', 'slack', 'refuse', 'official', 'bizen']],
  ['list', '', 'Tekst i kod', ['headings', 'tasks', 'commit']],
  ['list', '', 'Nauka', ['flashcards', 'quiz', 'hardwords']],
];
const LANGS = [['angielski', 'English'], ['niemiecki', 'German'], ['francuski', 'French'], ['hiszpański', 'Spanish'], ['włoski', 'Italian'], ['polski', 'Polish'], ['ukraiński', 'Ukrainian'], ['rosyjski', 'Russian'],
  ['portugalski', 'Portuguese'], ['holenderski', 'Dutch'], ['czeski', 'Czech'], ['szwedzki', 'Swedish'], ['turecki', 'Turkish'], ['japoński', 'Japanese'], ['chiński', 'Chinese'], ['koreański', 'Korean'], ['arabski', 'Arabic']];
const SUGGEST = [
  ['Zgłoszenie do Jiry', 'Zamień tekst w zgłoszenie do Jiry: krótki tytuł, opis problemu, kroki do odtworzenia i kryteria akceptacji.'],
  ['Wyjaśnij kod', 'Wyjaśnij prostym językiem, co robi ten kod, krok po kroku.'],
  ['Post na LinkedIn', 'Zamień tekst w profesjonalny post na LinkedIn z mocnym pierwszym zdaniem i krótkimi akapitami.'],
  ['Wyjaśnij jak dziecku', 'Wyjaśnij ten tekst najprościej, jak się da, tak żeby zrozumiało go dziecko.'],
];

let st = { text: '', hasSel: false, last: null, busy: false, buf: '', data: { contacts: [], actions: [], lastLang: '' }, sendText: '', sendFrom: 'menu' };
const clean = (t) => t.replace(/<\/?text>/gi, '').replace(/<\/?t?e?x?t?$/i, '').replace(/^\s+/, '');
const MARK = '=== POPRAWIONA WERSJA ===';
const view = (t) => clean(t).replace(MARK, '— Poprawiona wersja —');
const payload = () => { const b = payload(); if (st.last && st.last.action === 'precheck') { const i = b.indexOf(MARK); if (i >= 0) return b.slice(i + MARK.length).trim(); } return b; };
const VIEWS = ['menu', 'lang', 'send', 'contact', 'actions', 'result', 'key', 'tone', 'people', 'ptone', 'study', 'deck', 'cards', 'quiz', 'sum', 'make'];
const DEPTH = { menu: 0, lang: 1, send: 1, actions: 1, result: 1, key: 1, tone: 1, contact: 2, people: 2, ptone: 3, study: 1, make: 1, deck: 2, cards: 3, quiz: 3, sum: 3 };
function show(view) {
  document.body.dataset.dir = (DEPTH[view] || 0) >= (DEPTH[st.view] || 0) ? 'fwd' : 'back';
  st.view = view; for (const v of VIEWS) $('v-' + v).hidden = v !== view;
}
/* kolejne elementy listy pojawiają się z opóźnieniem */
function stagger(box) { let i = 0; for (const el of box.querySelectorAll(':scope > *, :scope .row, :scope .contact, :scope .deck, :scope .hard, :scope .stat')) el.style.setProperty('--i', Math.min(i++, 16)); }
function setBusy(b) { st.busy = b; document.body.classList.toggle('busy', b); }
const svg = (a) => '<svg viewBox="0 0 24 24"><path d="' + I[a] + '"/></svg>';
function h(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
const COLORS = ['#e5484d', '#e07b00', '#c9a000', '#30a46c', '#0f9fa8', '#0a84ff', '#7a5cff', '#d6409f'];
const colorOf = (s) => { let n = 0; for (const c of String(s)) n = (n * 31 + c.charCodeAt(0)) >>> 0; return COLORS[n % COLORS.length]; };
const initials = (n) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';

/* ---------- menu główne ---------- */
function onMenuAction(a) {
  if (a === 'translate') return openLang();
  if (a === 'send') return openSend(st.text, 'menu');
  if (a === 'reply') return openTone();
  if (a === 'web') { window.api.search(st.text); return; }
  start(a, '');
}
function renderRows() {
  const box = $('rows'); box.textContent = ''; box.append(studyChip());
  if (!st.hasSel) {
    box.append(h('div', 'nosel', 'Nie zaznaczono tekstu. Napisz powyżej, co mam stworzyć, albo zaznacz tekst i naciśnij skrót jeszcze raz.'));
    box.append(chipButton('mine', 'Własne akcje…', openActions)); return;
  }
  if (st.ctx && st.ctx.picks && st.ctx.picks.length) {
    box.append(h('div', 'lab', 'Podpowiedzi dla: ' + st.ctx.name));
    const cw = h('div', 'list ctxlist');
    for (const a of st.ctx.picks) { const b = h('button', 'row a-' + a); b.innerHTML = '<i class="ico">' + svg(a) + '</i><span>' + (LABEL[a] || a) + '</span>' + (st.ctx.learned && st.ctx.learned.includes(a) ? '<span class="sub2">często używasz</span>' : ''); b.onclick = () => onMenuAction(a); cw.append(b); }
    box.append(cw);
  }
  for (const [kind, cls, title, items] of LAYOUT) {
    if (title) box.append(h('div', 'lab', title));
    const wrap = h('div', kind === 'list' ? 'list' : 'grid ' + cls);
    for (const a of items) {
      const b = h('button', (kind === 'list' ? 'row' : kind) + ' a-' + a); b.innerHTML = '<i class="ico">' + svg(a) + '</i><span>' + LABEL[a] + '</span>'; b.onclick = () => onMenuAction(a); wrap.append(b);
    }
    box.append(wrap);
  }
  if (st.data.actions.length) {
    box.append(h('div', 'lab', 'Moje akcje'));
    const wrap = h('div', 'list');
    for (const a of st.data.actions) { const b = h('button', 'row'); b.innerHTML = svg(I[a.icon] ? a.icon : 'mine'); b.append(h('span', null, a.name)); b.onclick = () => start('c:' + a.id, ''); wrap.append(b); }
    box.append(wrap);
  }
  box.append(chipButton('mine', 'Własne akcje…', openActions));
  stagger(box);
}
function chipButton(icon, label, fn) { const b = h('button', 'chip wide'); b.innerHTML = svg(icon) + '<span>' + label + '</span>'; b.onclick = fn; return b; }

const TONES = ['Krótko i na temat', 'Uprzejmie i formalnie', 'Przyjaźnie i luźno', 'Stanowczo', 'Zgoda, potwierdzenie', 'Odmowa', 'Poproś o więcej szczegółów'];
const PERSON_TONES = ['Na „ty”, luźno', 'Na „pan/pani”, formalnie', 'Krótko i konkretnie', 'Ciepło, z emoji', 'Zwięźle, bez powitań'];
function openTone() {
  const box = $('toneBox'); box.textContent = '';
  const ppl = st.data.tones || [];
  if (ppl.length) {
    box.append(h('div', 'lab', 'Jak do konkretnej osoby'));
    const wrap = h('div', 'list');
    for (const p of ppl) { const b = h('button', 'row'); b.append(h('span', 'grow', p.name), h('span', 'sub2', p.tone)); b.onclick = () => start('reply', p.tone + ' (adresat: ' + p.name + ')'); wrap.append(b); }
    box.append(wrap);
  }
  box.append(h('div', 'lab', 'Ton'));
  const wrap = h('div', 'list');
  for (const t of TONES) { const b = h('button', 'row'); b.append(h('span', 'grow', t)); b.onclick = () => start('reply', t); wrap.append(b); }
  box.append(wrap, chipButton('send', ppl.length ? 'Zmień tony osób…' : 'Ustaw ton dla osób…', openPeople));
  stagger(box); show('tone');
}
function openPeople() { renderPeople(); show('people'); }
function renderPeople() {
  const box = $('people'); box.textContent = '';
  const ppl = st.data.tones || [];
  if (!ppl.length) { box.append(h('div', 'nosel', 'Nikogo jeszcze nie dodano. Dodaj osobę i zapisz, jak do niej piszesz, np. „na ty, luźno”.')); return; }
  for (const p of ppl) {
    const row = h('div', 'contact'); const av = h('div', 'av', initials(p.name)); av.style.background = colorOf(p.name);
    const tx = h('div', 'ctx'); tx.append(h('div', 'cn', p.name), h('div', 'cs', p.tone));
    const edit = h('button', 'icon-btn small'); edit.innerHTML = svg('edit'); edit.title = 'Zmień'; edit.onclick = () => openPerson(p);
    const del = h('button', 'icon-btn small'); del.innerHTML = svg('trash'); del.title = 'Usuń';
    del.onclick = async () => { await window.api.saveTone(p.name, ''); await loadData(); renderPeople(); };
    row.append(av, tx, edit, del); box.append(row);
  }
  stagger(box);
}
function openPerson(p) {
  st.editPerson = p ? p.name : '';
  $('pName').value = p ? p.name : ''; $('pTone').value = p ? p.tone : ''; $('pMsg').textContent = '';
  const dl = $('pNames'); dl.textContent = '';
  for (const c of (st.data.contacts || []).slice(0, 300)) { const o = document.createElement('option'); o.value = c.name; dl.append(o); }
  const box = $('pChips'); box.textContent = '';
  for (const t of PERSON_TONES) { const b = h('button', 'chip small', t); b.onclick = () => { $('pTone').value = t; }; box.append(b); }
  show('ptone'); setTimeout(() => $('pName').focus(), 40);
}
async function savePerson() {
  const name = $('pName').value.trim(), tone = $('pTone').value.trim();
  if (!name) { $('pMsg').textContent = 'Wpisz imię i nazwisko.'; return; }
  if (!tone) { $('pMsg').textContent = 'Napisz, jak do tej osoby piszesz.'; return; }
  if (st.editPerson && st.editPerson.toLowerCase() !== name.toLowerCase()) await window.api.saveTone(st.editPerson, '');
  await window.api.saveTone(name, tone); await loadData(); renderPeople(); show('people');
}
/* ---------- wybór języka ---------- */
function openLang() {
  document.querySelector('#v-lang .stitle').textContent = 'Przetłumacz na…';
  const box = $('langs'); box.textContent = '';
  const ordered = [...LANGS].sort((a, b) => (b[1] === st.data.lastLang) - (a[1] === st.data.lastLang));
  for (const [pl, en] of ordered) {
    const b = h('button', 'row'); b.append(h('span', 'grow', pl), h('span', 'sub2', en === st.data.lastLang ? 'ostatnio użyty' : en));
    b.onclick = () => { st.data.lastLang = en; window.api.setLang(en); start('translate', en); }; box.append(b);
  }
  stagger($('langs')); show('lang');
}

/* ---------- Wyślij do… ---------- */
function openSend(text, from, chan) {
  st.sendText = text; st.sendFrom = from; st.chan = chan || ''; $('cSearch').value = ''; $('sendMsg').textContent = '';
  const t = text.replace(/\s+/g, ' ').trim(); $('sendWhat').textContent = 'Wysyłany tekst: “' + (t.length > 70 ? t.slice(0, 70) + '…' : t) + '”';
  renderContacts(); show('send');
}
function renderContacts() {
  const box = $('contacts'); box.textContent = '';
  const q = $('cSearch').value.trim().toLowerCase(), want = st.chan;
  let list = st.data.contacts.filter((c) => (!want || (want === 'mail' ? c.email : c.phone)) && (!q || (c.name + ' ' + c.email + ' ' + c.phone).toLowerCase().includes(q)));
  if (!list.length) { box.append(h('div', 'nosel', q ? 'Nikogo nie znaleziono.' : 'Brak kontaktów. Zezwól aplikacji na dostęp do Kontaktów (Ustawienia systemowe → Prywatność i ochrona → Kontakty) albo dodaj kontakt ręcznie.')); return; }
  list = list.slice(0, 80);
  const wrap = h('div', 'list');
  for (const c of list) {
    const row = h('div', 'contact'); const av = h('div', 'av', initials(c.name)); av.style.background = colorOf(c.name);
    const tx = h('div', 'ctx'); tx.append(h('div', 'cn', c.name), h('div', 'cs', [c.email, c.phone].filter(Boolean).join(' · ')));
    const mk = (icon, title, enabled, fn) => { const b = h('button', 'icon-btn small'); b.innerHTML = svg(icon); b.title = title; b.disabled = !enabled; b.onclick = fn; return b; };
    row.append(av, tx, mk('mail', 'Wyślij e-mailem', !!c.email, () => doSend(c, 'mail')), mk('chat', 'Wyślij w Wiadomościach', !!c.phone, () => doSend(c, 'sms')));
    if (!c.apple) row.append(mk('trash', 'Usuń kontakt', true, () => removeContact(c)));
    wrap.append(row);
  }
  box.append(wrap);
}
async function doSend(c, channel) {
  $('sendMsg').textContent = ''; if (!st.sendText.trim()) { $('sendMsg').textContent = 'Brak tekstu do wysłania.'; return; }
  const r = await window.api.sendTo(c.id, channel, st.sendText);
  if (!r.ok) $('sendMsg').textContent = r.msg || 'Nie udało się wysłać.';
}
async function removeContact(c) { await window.api.saveContacts(st.data.contacts.filter((x) => !x.apple && x.id !== c.id)); await loadData(); renderContacts(); }
function openContactForm() { for (const id of ['cName', 'cMail', 'cPhone']) $(id).value = ''; $('cMsg').textContent = ''; show('contact'); setTimeout(() => $('cName').focus(), 30); }
async function saveContact() {
  const c = { id: '', name: $('cName').value.trim(), email: $('cMail').value.trim(), phone: $('cPhone').value.trim() };
  if (!c.name) { $('cMsg').textContent = 'Wpisz imię i nazwisko.'; return; }
  if (!c.email && !c.phone) { $('cMsg').textContent = 'Podaj adres e-mail albo numer telefonu.'; return; }
  if (c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) { $('cMsg').textContent = 'Adres e-mail wygląda na niepoprawny.'; return; }
  await window.api.saveContacts([...st.data.contacts.filter((x) => !x.apple), c]); await loadData(); renderContacts(); show('send');
}

/* ---------- własne akcje ---------- */
function openActions() {
  $('aName').value = ''; $('aPrompt').value = ''; $('aMsg').textContent = ''; renderMyActs();
  const box = $('sugg'); box.textContent = '';
  for (const [name, prompt] of SUGGEST) { const b = h('button', 'chip small', name); b.onclick = () => { $('aName').value = name; $('aPrompt').value = prompt; }; box.append(b); }
  show('actions');
}
function renderMyActs() {
  const box = $('myActs'); box.textContent = '';
  if (!st.data.actions.length) { box.append(h('div', 'nosel', 'Nie masz jeszcze własnych akcji. Dodaj pierwszą poniżej albo wybierz podpowiedź.')); return; }
  for (const a of st.data.actions) {
    const row = h('div', 'contact'); row.append(h('div', 'ctx', null)); row.firstChild.append(h('div', 'cn', a.name), h('div', 'cs', a.prompt.slice(0, 60)));
    const del = h('button', 'icon-btn small'); del.innerHTML = svg('trash'); del.title = 'Usuń akcję';
    del.onclick = async () => { st.data.actions = await window.api.saveActions(st.data.actions.filter((x) => x.id !== a.id)); renderMyActs(); };
    row.append(del); box.append(row);
  }
}
async function addAction() {
  const a = { id: '', name: $('aName').value.trim(), prompt: $('aPrompt').value.trim() };
  if (!a.name) { $('aMsg').textContent = 'Wpisz nazwę akcji.'; return; }
  if (!a.prompt) { $('aMsg').textContent = 'Napisz, co AI ma zrobić z tekstem.'; return; }
  if (st.data.actions.length >= 30) { $('aMsg').textContent = 'Możesz mieć najwyżej 30 własnych akcji.'; return; }
  st.data.actions = await window.api.saveActions([...st.data.actions, a]); $('aName').value = ''; $('aPrompt').value = ''; $('aMsg').textContent = ''; renderMyActs();
}

/* ---------- Nauka: zestawy fiszek i quizów, sesje powtórek, statystyki ---------- */
const STUDY_ACTIONS = ['flashcards', 'quiz'];
let ringId = 0;
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function ringSvg(pct, size, sw) {
  const id = 'rg' + (++ringId), r = (size - sw) / 2, c = 2 * Math.PI * r, m = size / 2;
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '"><defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff4fd8"/><stop offset=".5" stop-color="#6a5cff"/><stop offset="1" stop-color="#2fd5ff"/></linearGradient></defs>' +
    '<circle cx="' + m + '" cy="' + m + '" r="' + r + '" fill="none" stroke="var(--line)" stroke-width="' + sw + '"/>' +
    '<circle class="arc" cx="' + m + '" cy="' + m + '" r="' + r + '" fill="none" stroke="url(#' + id + ')" stroke-width="' + sw + '" stroke-linecap="round" stroke-dasharray="' + c + '" stroke-dashoffset="' + c + '" data-off="' + (c * (1 - Math.min(100, pct) / 100)) + '" transform="rotate(-90 ' + m + ' ' + m + ')"/></svg>';
}
function animateRings(box) { requestAnimationFrame(() => requestAnimationFrame(() => box.querySelectorAll('.arc').forEach((a) => { a.style.strokeDashoffset = a.dataset.off; }))); }
function spark(hist) {
  const pts = (hist || []).slice(-12).map((x) => (x.total ? Math.round(x.right * 100 / x.total) : 0)); if (pts.length < 2) return '';
  const W = 300, H = 64, px = (i) => 8 + i * (W - 16) / (pts.length - 1), py = (v) => H - 8 - v * (H - 16) / 100;
  const line = pts.map((v, i) => (i ? 'L' : 'M') + px(i).toFixed(1) + ' ' + py(v).toFixed(1)).join('');
  const area = line + 'L' + px(pts.length - 1).toFixed(1) + ' ' + (H - 4) + 'L' + px(0).toFixed(1) + ' ' + (H - 4) + 'Z';
  return '<svg class="spark" viewBox="0 0 300 64"><defs><linearGradient id="sa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a5cff" stop-opacity=".45"/><stop offset="1" stop-color="#6a5cff" stop-opacity="0"/></linearGradient><linearGradient id="sl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff4fd8"/><stop offset=".5" stop-color="#6a5cff"/><stop offset="1" stop-color="#2fd5ff"/></linearGradient></defs>' +
    '<path d="' + area + '" fill="url(#sa)"/><path class="sline" pathLength="1" d="' + line + '" fill="none" stroke="url(#sl)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' +
    pts.map((v, i) => '<circle cx="' + px(i).toFixed(1) + '" cy="' + py(v).toFixed(1) + '" r="3" fill="#fff"/>').join('') + '</svg>';
}
const noun = (n, kind) => n + (kind === 'quiz' ? (n === 1 ? ' pytanie' : ' pytań') : (n === 1 ? ' fiszka' : ' fiszek'));
function studyChip() {
  const n = (st.data.study && st.data.study.due) || 0, b = h('button', 'chip wide study');
  b.innerHTML = svg('flashcards') + '<span>Moje fiszki i quizy</span>' + (n ? '<em>' + n + '</em>' : ''); b.onclick = openStudy; return b;
}

/* lista zestawów */
async function openStudy() {
  const r = await window.api.studyList();
  const acc = r.today.total ? Math.round(r.today.right * 100 / r.today.total) : null;
  $('studyHead').innerHTML = '<div class="statrow"><div class="stat"><b>' + r.today.total + '</b><span>odpowiedzi dziś</span></div><div class="stat"><b>' + (acc == null ? '–' : acc + '%') + '</b><span>poprawnych</span></div><div class="stat"><b>' + r.streak + '</b><span>' + (r.streak === 1 ? 'dzień z rzędu' : 'dni z rzędu') + '</span></div></div>';
  const box = $('decks'); box.textContent = '';
  if (!r.decks.length) box.append(h('div', 'nosel', 'Nie masz jeszcze zestawów. Zaznacz tekst, naciśnij skrót i wybierz „Fiszki” albo „Quiz z tekstu”. Zestaw zapisze się tutaj.'));
  for (const d of r.decks) {
    const row = h('button', 'deck'), badge = h('i', 'dbadge ' + (d.kind === 'quiz' ? 'q' : 'c')); badge.innerHTML = svg(d.kind === 'quiz' ? 'quiz' : 'flashcards');
    const tx = h('div', 'ctx'); tx.append(h('div', 'cn', d.name), h('div', 'cs', noun(d.count, d.kind) + (d.kind === 'cards' && d.due ? ' · ' + d.due + ' do powtórki' : '')));
    const pct = d.count ? Math.round(d.mastered * 100 / d.count) : 0, rg = h('span', 'rg'); rg.innerHTML = ringSvg(pct, 38, 4) + '<em>' + pct + '</em>';
    row.append(badge, tx, rg); row.onclick = () => openDeck(d.id); box.append(row);
  }
  stagger($('studyHead').parentNode); show('study'); animateRings(box);
}

/* jeden zestaw: statystyki i start sesji */
async function openDeck(id) {
  const d = await window.api.studyGet(id); if (!d) return openStudy();
  st.deck = d; const inf = d.info, cards = d.kind === 'cards';
  $('deckTitle').textContent = d.name; $('deckDel').classList.remove('sure'); $('deckDel').title = 'Usuń zestaw';
  const box = $('deckBox'); box.textContent = '';
  const pct = inf.count ? Math.round(inf.mastered * 100 / inf.count) : 0;
  const top = h('div', 'deckTop');
  top.innerHTML = '<div class="bigring">' + ringSvg(pct, 108, 9) + '<div class="rc"><b>' + pct + '%</b><span>opanowane</span></div></div><div class="statcol">' +
    '<div class="stat"><span>Opanowane</span><b>' + inf.mastered + '/' + inf.count + '</b></div><div class="stat"><span>Skuteczność</span><b>' + (inf.accuracy == null ? '–' : inf.accuracy + '%') + '</b></div><div class="stat"><span>Sesje</span><b>' + inf.sessions + '</b></div></div>';
  box.append(top);
  const sp = spark(d.history);
  box.append(h('div', 'lab', 'Postępy w kolejnych sesjach'));
  if (sp) { const sb = h('div', 'sparkbox'); sb.innerHTML = sp; box.append(sb); } else box.append(h('div', 'nosel', 'Wykres pojawi się po dwóch sesjach nauki.'));
  const acts = h('div', 'deckActs');
  const due = cards ? d.items.filter((i) => !i.due || i.due <= Date.now()) : d.items;
  const mk = (label, primary, fn) => { const b = h('button', 'btn' + (primary ? ' primary' : ''), label); b.onclick = fn; acts.append(b); };
  if (cards) {
    if (due.length) mk('Ucz się · ' + due.length + ' do powtórki', true, () => startCards(due));
    mk('Powtórz wszystkie fiszki', !due.length, () => startCards(d.items));
  } else {
    mk('Rozwiąż quiz', true, () => startQuiz(d.items));
    const hardQ = d.items.filter((i) => i.wrong > 0);
    if (hardQ.length) mk('Tylko trudne pytania (' + hardQ.length + ')', false, () => startQuiz(hardQ));
  }
  box.append(acts);
  const hard = d.items.filter((i) => i.wrong > 0).sort((a, b) => b.wrong - a.wrong).slice(0, 5);
  if (hard.length) {
    box.append(h('div', 'lab', 'Najtrudniejsze'));
    const l = h('div', 'list');
    for (const i of hard) { const r = h('div', 'hard'); r.append(h('span', 'q', i.q), h('span', 'n', 'błędnie ' + i.wrong + '×')); l.append(r); }
    box.append(l);
  }
  stagger(box); show('deck'); animateRings(box);
}

/* sesja z fiszkami */
function startCards(items) {
  if (!items.length) return;
  st.sess = { kind: 'cards', deck: st.deck, items, queue: shuffle(items), total: items.length, known: 0, first: {}, flipped: false, busy: false };
  show('cards'); nextCard();
}
function nextCard() {
  const s = st.sess, it = s.queue[0]; if (!it) return finishSession();
  s.flipped = false; s.busy = false; $('card').classList.remove('flipped');
  $('cardQ').textContent = it.q; $('cardA').textContent = it.a; $('grades').hidden = true; $('cardHint').hidden = false;
  const w = $('cardWrap'); w.className = ''; void w.offsetWidth; w.classList.add('in');
  $('cardsProg').style.width = (s.known * 100 / s.total) + '%'; $('cardsCnt').textContent = s.known + '/' + s.total;
}
function flipCard() {
  const s = st.sess; if (!s || st.view !== 'cards' || s.busy || s.flipped) return;
  s.flipped = true; $('card').classList.add('flipped'); $('cardHint').hidden = true;
  const g = $('grades'); g.hidden = false; g.classList.remove('pop'); void g.offsetWidth; g.classList.add('pop');
}
function gradeCard(g) {
  const s = st.sess; if (!s || st.view !== 'cards' || !s.flipped || s.busy) return;
  s.busy = true; const it = s.queue.shift(); window.api.studyReview(s.deck.id, it.id, g);
  if (!(it.id in s.first)) s.first[it.id] = g >= 1;
  if (g === 0) s.queue.splice(Math.min(3, s.queue.length), 0, it); else s.known++;
  $('cardsProg').style.width = (s.known * 100 / s.total) + '%'; $('cardsCnt').textContent = s.known + '/' + s.total;
  const w = $('cardWrap'); w.className = ''; void w.offsetWidth; w.classList.add('o' + g);
  setTimeout(nextCard, 270);
}

/* sesja z quizem */
function startQuiz(items) {
  if (!items.length) return;
  st.sess = { kind: 'quiz', deck: st.deck, items, queue: shuffle(items), total: items.length, idx: 0, first: {}, locked: false };
  show('quiz'); nextQuestion();
}
function nextQuestion() {
  const s = st.sess, it = s.queue[s.idx]; if (!it) return finishSession();
  s.locked = false; $('quizProg').style.width = (s.idx * 100 / s.total) + '%'; $('quizCnt').textContent = (s.idx + 1) + '/' + s.total;
  const q = $('quizQ'); q.textContent = it.q; q.classList.remove('in'); void q.offsetWidth; q.classList.add('in');
  const opts = shuffle(it.opts.map((t, i) => ({ t, ok: i === it.correct }))), box = $('quizOpts'); box.textContent = '';
  opts.forEach((o, i) => { const b = h('button', 'opt'); b.style.setProperty('--i', i); b.append(h('i', 'ol', 'ABCD'[i]), h('span', null, o.t)); b.onclick = () => pickOption(b, o, opts); box.append(b); });
  $('quizWhy').hidden = true; $('quizNext').hidden = true;
}
function pickOption(b, o, opts) {
  const s = st.sess; if (!s || s.locked) return; s.locked = true; const it = s.queue[s.idx], box = $('quizOpts');
  window.api.studyReview(s.deck.id, it.id, o.ok ? 2 : 0); s.first[it.id] = o.ok;
  [...box.children].forEach((el, i) => { el.classList.add('lock'); if (opts[i].ok) el.classList.add('ok'); });
  if (!o.ok) b.classList.add('bad');
  if (it.why) { const w = $('quizWhy'); w.textContent = it.why; w.hidden = false; }
  const n = $('quizNext'); n.textContent = s.idx + 1 >= s.total ? 'Zobacz wynik' : 'Dalej'; n.hidden = false;
  $('quizProg').style.width = ((s.idx + 1) * 100 / s.total) + '%'; box.scrollTop = 0;
}

/* podsumowanie: wynik, porównanie z poprzednią sesją */
function finishSession() {
  const s = st.sess, ids = Object.keys(s.first), right = ids.filter((i) => s.first[i]).length, total = s.total, pct = total ? Math.round(right * 100 / total) : 0;
  const hist = s.deck.history || [], prev = hist[hist.length - 1], prevPct = prev && prev.total ? Math.round(prev.right * 100 / prev.total) : null;
  const best = hist.reduce((m, x) => Math.max(m, x.total ? Math.round(x.right * 100 / x.total) : 0), 0);
  window.api.studySession(s.deck.id, right, total);
  s.wrong = s.items.filter((i) => !s.first[i.id]);
  const title = pct >= 90 ? 'Świetnie!' : pct >= 70 ? 'Dobrze Ci idzie' : pct >= 40 ? 'Jeszcze trochę' : 'Warto powtórzyć';
  let sub = right + ' z ' + total + (s.kind === 'quiz' ? ' pytań za pierwszym razem.' : ' fiszek umiesz od razu.');
  if (prevPct != null) { const d = pct - prevPct; sub += '<br>' + (d > 0 ? '<span class="up">+' + d + ' pkt względem ostatniej sesji</span>' : d < 0 ? '<span class="down">' + d + ' pkt względem ostatniej sesji</span>' : 'Tyle samo co ostatnio'); }
  if (hist.length && pct > best) sub += '<br><span class="up">Nowy rekord!</span>';
  $('sumBox').innerHTML = '<div class="bigring">' + ringSvg(pct, 150, 12) + '<div class="rc"><b id="sumPct">0%</b><span>' + right + ' z ' + total + '</span></div></div><div class="sumT">' + title + '</div><div class="sumS">' + sub + '</div>';
  const again = $('sumAgain'); again.hidden = !s.wrong.length; again.textContent = 'Powtórz błędne (' + s.wrong.length + ')';
  show('sum'); animateRings($('sumBox'));
  const el = $('sumPct'), t0 = performance.now(); (function tick(t) { const k = Math.min(1, (t - t0) / 1000); el.textContent = Math.round(pct * (1 - Math.pow(1 - k, 3))) + '%'; if (k < 1) requestAnimationFrame(tick); })(t0);
}

/* tworzenie zestawu z zaznaczonego tekstu */
function openMake(action) {
  st.make = action; st.made = null;
  $('makeStatus').textContent = action === 'quiz' ? 'Tworzę quiz…' : 'Tworzę fiszki…'; $('makeNum').textContent = '0';
  $('makeMsg').textContent = 'AI czyta tekst i układa ' + (action === 'quiz' ? 'pytania.' : 'fiszki.'); $('makeBtns').hidden = true;
  const a = $('makeArt'); a.className = 'busy'; show('make');
}
function makeProgress() {
  const n = (st.buf.match(/"q"/g) || []).length; if (!n) return;
  $('makeNum').textContent = n; $('makeMsg').textContent = 'Mam już ' + noun(n, st.make === 'quiz' ? 'quiz' : 'cards') + '…';
}
async function makeDone(ok, msg) {
  const a = $('makeArt'); a.classList.remove('busy');
  let r = null; if (ok) { r = await window.api.studyCreate(st.make, st.buf); if (!r.ok) { ok = false; msg = r.msg; } }
  if (!ok) { $('makeStatus').textContent = 'Coś poszło nie tak'; $('makeMsg').textContent = msg || 'Spróbuj ponownie.'; $('makeGo').textContent = 'Spróbuj ponownie'; st.made = null; $('makeBtns').hidden = false; return; }
  st.made = r; a.classList.add('done'); $('makeStatus').textContent = 'Gotowe'; $('makeNum').textContent = r.count;
  $('makeMsg').textContent = 'Zapisano „' + r.name + '” (' + noun(r.count, r.kind) + ') w Moje fiszki i quizy.';
  $('makeGo').textContent = r.kind === 'quiz' ? 'Rozwiąż teraz' : 'Ucz się teraz'; $('makeBtns').hidden = false;
}
$('studyBack').onclick = () => toMenu();
$('deckBack').onclick = () => openStudy();
$('deckDel').onclick = async () => {
  const b = $('deckDel'); if (!st.deck) return;
  if (!b.classList.contains('sure')) { b.classList.add('sure'); b.title = 'Kliknij jeszcze raz, żeby usunąć'; setTimeout(() => b.classList.remove('sure'), 2500); return; }
  await window.api.studyDelete(st.deck.id); openStudy();
};
$('cardsBack').onclick = () => openDeck(st.deck.id); $('quizBack').onclick = () => openDeck(st.deck.id);
$('card').onclick = flipCard;
for (const b of $('grades').querySelectorAll('button')) b.onclick = () => gradeCard(+b.dataset.g);
$('quizNext').onclick = () => { st.sess.idx++; nextQuestion(); };
$('sumDone').onclick = () => openDeck(st.sess.deck.id);
$('sumAgain').onclick = () => { const s = st.sess; if (s.kind === 'quiz') startQuiz(s.wrong); else startCards(s.wrong); };
$('makeBack').onclick = () => { if (!demo) window.api.cancel(); setBusy(false); toMenu(); };
$('makeClose').onclick = () => toMenu();
$('makeGo').onclick = async () => {
  if (!st.made) { start(st.last.action, st.last.instruction); return; }
  await openDeck(st.made.id); if (st.made.kind === 'quiz') startQuiz(st.deck.items); else startCards(st.deck.items);
};
document.addEventListener('keydown', (e) => {
  if (st.view === 'cards') { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flipCard(); } else if (['1', '2', '3'].includes(e.key)) gradeCard(+e.key - 1); }
  else if (st.view === 'quiz' && st.sess) {
    const i = ['1', '2', '3', '4'].indexOf(e.key), b = $('quizOpts').children[i];
    if (i >= 0 && b && !st.sess.locked) b.click(); else if ((e.key === 'Enter' || e.key === ' ') && !$('quizNext').hidden) { e.preventDefault(); $('quizNext').click(); }
  }
});

/* ---------- wynik ---------- */
function start(action, instruction) {
  if (STUDY_ACTIONS.includes(action)) { st.last = { action, instruction }; st.buf = ''; openMake(action); setBusy(true); if (demo) { demoMake(); return; } window.api.run(action, instruction); return; }
  st.last = { action, instruction }; st.buf = '';
  show('result'); $('out').className = ''; $('out').textContent = '';
  $('status').textContent = 'Myślę…'; $('status').classList.add('shimmer');
  for (const id of ['retry', 'copy', 'sendRes', 'replace', 'cal', 'note']) $(id).disabled = true;
  $('note').textContent = 'Do Notatek';
  $('cal').hidden = action !== 'calendar'; $('cal').textContent = 'Do kalendarza';
  $('replace').hidden = (action === 'ask' && st.hasSel) || action === 'reply' || action === 'calendar'; $('replace').textContent = st.hasSel ? 'Zamień' : 'Wstaw'; $('copy').textContent = 'Kopiuj';
  setBusy(true);
  if (demo) { demoStream(); return; }
  window.api.run(action, instruction);
}
function submitAsk() { const v = $('ask').value.trim(); if (v) start('ask', v); }
function onChunk(t) { st.buf += t; if (st.view === 'make') return makeProgress(); $('out').className = ''; $('out').textContent = view(st.buf); $('out').scrollTop = 1e9; $('status').textContent = 'Piszę…'; }
function finish(ok, msg) {
  setBusy(false);
  if (st.view === 'make') return makeDone(ok, msg); $('status').classList.remove('shimmer');
  $('retry').disabled = false; $('copy').disabled = !ok; $('sendRes').disabled = !ok; $('replace').disabled = !ok; $('cal').disabled = !ok; $('note').disabled = !ok;
  if (!ok) { $('status').textContent = 'Coś poszło nie tak'; $('out').className = 'err'; $('out').textContent = msg; return; }
  $('status').textContent = 'Gotowe';
}

/* ---------- zdarzenia z procesu głównego ---------- */
async function loadData() { try { st.data = await window.api.getData(); } catch (e) { /* zostają puste dane */ } }
/* Szkło podąża za oknem: zrzut całego ekranu przychodzi raz, a przy każdym ruchu okna przesuwamy go pod soczewką */
const LENS_E = 28; // P - M z style.css
let disp = null, lum = null;
function setLens(bg) {
  const lens = $('lens'); disp = null; lum = null;
  if (!bg) { lens.style.backgroundImage = 'none'; return; }
  lens.style.backgroundImage = 'url(' + bg.url + ')';
  if (!bg.dw) { lens.style.backgroundSize = bg.w + 'px ' + bg.h + 'px'; lens.style.backgroundPosition = bg.x + 'px ' + bg.y + 'px'; return; }
  disp = bg; lens.style.backgroundSize = bg.dw + 'px ' + bg.dh + 'px';
  onMoved({ x: bg.wx, y: bg.wy });
  const img = new Image();
  img.onload = () => { const c = document.createElement('canvas'); c.width = 96; c.height = Math.max(1, Math.round(96 * bg.dh / bg.dw)); const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, c.width, c.height); lum = { c, g }; onMoved({ x: bg.wx, y: bg.wy }); };
  img.src = bg.url;
}
function onMoved(p) {
  if (!disp) return;
  const lx = p.x - disp.dx, ly = p.y - disp.dy;
  $('lens').style.backgroundPosition = (LENS_E - lx) + 'px ' + (LENS_E - ly) + 'px';
  if (!lum) return;
  const s = lum.c.width / disp.dw, cw = lum.c.width, ch = lum.c.height;
  const x = Math.max(0, Math.min(cw - 2, Math.round((lx + 12) * s))), y = Math.max(0, Math.min(ch - 2, Math.round((ly + 12) * s)));
  const w = Math.max(2, Math.min(cw - x, Math.round(368 * s))), hh = Math.max(2, Math.min(ch - y, Math.round(556 * s)));
  try {
    const d = lum.g.getImageData(x, y, w, hh).data; let sum = 0, n = 0;
    for (let i = 0; i < d.length; i += 16) { sum += .299 * d[i] + .587 * d[i + 1] + .114 * d[i + 2]; n++; }
    const L = sum / n, dark = document.body.classList.contains('dark');
    if (dark && L > 160) { document.body.classList.replace('dark', 'light'); } else if (!dark && L < 126) { document.body.classList.replace('light', 'dark'); }
  } catch (e) { /* próbkowanie jasności jest opcjonalne */ }
}
async function onOpen(d) {
  st.ctx = d.ctx || null;
  setBusy(false); st.text = d.text || ''; st.hasSel = !!st.text.trim();
  document.body.classList.remove('dark', 'light', 'closing'); document.body.classList.add(d.bg && !d.bg.dark ? 'light' : 'dark');
  setLens(d.bg);
  const p = $('panel'); p.classList.remove('opening'); void p.offsetWidth; p.classList.add('opening');
  $('ask').value = ''; $('askWrap').classList.remove('has');
  $('ask').placeholder = st.hasSel ? 'Zapytaj o zaznaczony tekst' : 'Napisz, co mam stworzyć';
  if (d.mode === 'key' || !d.hasKey) { show('key'); $('keyInput').value = ''; setTimeout(() => $('keyInput').focus(), 30); return; }
  await loadData();
  const t = st.text.replace(/\s+/g, ' ').trim();
  $('snip').textContent = st.hasSel ? '“' + (t.length > 48 ? t.slice(0, 48) + '…' : t) + '”' : ''; $('snip').hidden = !st.hasSel;
  renderRows();
  if (d.view === 'chat' || d.view === 'mail') { openSend(st.text, 'menu', d.view === 'mail' ? 'mail' : 'sms'); setTimeout(() => $('cSearch').focus(), 30); return; }
  if (d.view === 'lang') { openLang(); return; }
  show('menu'); setTimeout(() => $('ask').focus(), 30);
}
if (!demo) {
  window.api.onOpen(onOpen);
  window.api.onMoved(onMoved);
  window.api.onClosing(() => document.body.classList.add('closing'));
  window.api.onChunk(onChunk);
  window.api.onDone(() => finish(true));
  window.api.onError((m) => finish(false, m));
}

/* ---------- przyciski ---------- */
const toMenu = () => { show('menu'); setTimeout(() => $('ask').focus(), 30); };
$('ask').addEventListener('input', () => $('askWrap').classList.toggle('has', !!$('ask').value.trim()));
$('ask').addEventListener('keydown', (e) => { if (e.key === 'Enter') submitAsk(); });
$('askGo').onclick = submitAsk;
$('close').onclick = () => window.api && window.api.close();
$('orb').onclick = () => { const o = $('orb'); o.classList.remove('tap'); void o.offsetWidth; o.classList.add('tap'); };
$('back').onclick = () => { if (!demo) window.api.cancel(); setBusy(false); toMenu(); };
$('langBack').onclick = toMenu; $('actBack').onclick = () => { renderRows(); toMenu(); };
$('sendBack').onclick = () => { if (st.sendFrom === 'result') show('result'); else toMenu(); };
$('contactBack').onclick = () => show('send'); $('cCancel').onclick = () => show('send'); $('cSave').onclick = saveContact; $('addContact').onclick = openContactForm;
for (const id of ['cName', 'cMail', 'cPhone']) $(id).addEventListener('keydown', (e) => { if (e.key === 'Enter') saveContact(); });
$('toneBack').onclick = toMenu; $('peopleBack').onclick = openTone; $('ptoneBack').onclick = openPeople; $('pCancel').onclick = openPeople; $('pSave').onclick = savePerson; $('addPerson').onclick = () => openPerson(null);
for (const id of ['pName', 'pTone']) $(id).addEventListener('keydown', (e) => { if (e.key === 'Enter') savePerson(); });
$('aAdd').onclick = addAction; $('cSearch').addEventListener('input', renderContacts);
$('retry').onclick = () => st.last && start(st.last.action, st.last.instruction);
$('copy').onclick = () => { window.api.copy(payload()); $('copy').textContent = 'Skopiowano ✓'; };
$('sendRes').onclick = () => openSend(payload(), 'result');
$('replace').onclick = () => window.api.replace(payload());
$('note').onclick = async () => { const r = await window.api.saveNote(payload()); $('note').textContent = r.ok ? 'Zapisano w Notatkach ✓' : (r.msg || 'Nie udało się'); };
$('cal').onclick = async () => { const r = await window.api.addCalendar(payload()); $('cal').textContent = r.ok ? 'Dodano: ' + r.n + ' ✓' : (r.msg || 'Nie udało się'); };
$('getKey').onclick = () => window.api.openConsole();
async function saveKey() {
  const v = $('keyInput').value.trim(); if (!v) return;
  const r = await window.api.setKey(v);
  if (r === true || r === 'ok') { onOpen({ mode: 'select', text: st.text, bg: null, hasKey: true }); $('keyNote').textContent = ''; }
  else if (r === 'bad') $('keyNote').textContent = 'To nie wygląda na klucz API. Klucz zaczyna się od sk-ant-, nie ma spacji ani polskich liter. Skopiuj go z console.anthropic.com.';
  else $('keyNote').textContent = 'Szyfrowanie systemowe jest niedostępne. Ustaw zmienną środowiskową ANTHROPIC_API_KEY.';
}
$('saveKey').onclick = saveKey;
$('keyInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') saveKey(); });
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (['lang', 'actions', 'send', 'tone'].includes(st.view)) { e.preventDefault(); toMenu(); } else if (st.view === 'contact') show('send'); else if (st.view === 'people') openTone(); else if (st.view === 'ptone') openPeople(); else if (st.view === 'study' || st.view === 'make') { if (st.view === 'make' && !demo) window.api.cancel(); setBusy(false); toMenu(); } else if (st.view === 'deck') openStudy(); else if (['cards', 'quiz', 'sum'].includes(st.view)) openDeck(st.deck.id); else window.api && window.api.close();
});

/* ---------- tryb podglądu (?demo): działa w zwykłej przeglądarce, bez Electrona ---------- */
function demoMake() {
  const full = '{"title":"Układ Słoneczny","cards":[{"q":"a","a":"b"},{"q":"c","a":"d"},{"q":"e","a":"f"},{"q":"g","a":"h"},{"q":"i","a":"j"},{"q":"k","a":"l"}]}';
  const parts = full.match(/[\s\S]{1,12}/g); let i = 0; const t = setInterval(() => { if (i >= parts.length) { clearInterval(t); finish(true); return; } onChunk(parts[i++]); }, 220);
}
function demoStream() {
  const full = 'Cześć Ania,\n\nsuper, dzięki za szybką odpowiedź. Przeczytałem propozycję i wygląda dobrze. Pogadajmy w czwartek?';
  const parts = full.match(/[\s\S]{1,8}/g); let i = 0; const t = setInterval(() => { if (i >= parts.length) { clearInterval(t); finish(true); return; } onChunk(parts[i++]); }, 60);
}
if (demo) {
  const store = { contacts: [{ id: 'a', name: 'Anna Kowalska', email: 'anna@example.com', phone: '+48 600 100 200' }, { id: 'b', name: 'Piotr Nowak', email: 'piotr@firma.pl', phone: '' }], actions: [{ id: 'x', name: 'Zgłoszenie do Jiry', prompt: 'Zamień tekst w zgłoszenie do Jiry' }], lastLang: 'English', tones: [{ name: 'Anna Kowalska', tone: 'Na „ty”, luźno' }, { name: 'Dyrektor Nowak', tone: 'Na „pan”, formalnie' }] };
  const stu = { decks: [
    { id: 'd1', name: 'Układ Słoneczny', kind: 'cards', last: Date.now(), history: [{ right: 3, total: 8 }, { right: 5, total: 8 }, { right: 5, total: 8 }, { right: 7, total: 8 }], items: [
      { id: '1', q: 'Która planeta jest największa?', a: 'Jowisz', box: 4, due: 0, right: 5, wrong: 1 }, { id: '2', q: 'Co to jest jednostka astronomiczna?', a: 'Średnia odległość Ziemi od Słońca, ok. 150 mln km', box: 1, due: 0, right: 2, wrong: 3 },
      { id: '3', q: 'Która planeta ma pierścienie widoczne z Ziemi?', a: 'Saturn', box: 5, due: Date.now() + 9e9, right: 6, wrong: 0 }, { id: '4', q: 'Dlaczego Mars jest czerwony?', a: 'Pokrywa go pył bogaty w tlenki żelaza', box: 0, due: 0, right: 0, wrong: 2 },
      { id: '5', q: 'Ile planet ma Układ Słoneczny?', a: 'Osiem', box: 4, due: Date.now() + 9e9, right: 4, wrong: 0 }, { id: '6', q: 'Co leży między Marsem a Jowiszem?', a: 'Pas planetoid', box: 2, due: 0, right: 3, wrong: 1 }] },
    { id: 'd2', name: 'Quiz: Fotosynteza', kind: 'quiz', last: Date.now() - 1e8, history: [{ right: 2, total: 4 }, { right: 3, total: 4 }], items: [
      { id: 'q1', q: 'Gdzie zachodzi fotosynteza?', opts: ['W mitochondriach', 'W chloroplastach', 'W jądrze komórkowym', 'W rybosomach'], correct: 1, why: 'Chloroplasty zawierają chlorofil, który pochłania światło.', right: 2, wrong: 1 },
      { id: 'q2', q: 'Który gaz rośliny pobierają podczas fotosyntezy?', opts: ['Tlen', 'Azot', 'Dwutlenek węgla', 'Wodór'], correct: 2, why: 'CO₂ jest źródłem węgla do budowy cukrów.', right: 3, wrong: 0 },
      { id: 'q3', q: 'Co powstaje oprócz glukozy?', opts: ['Tlen', 'Metan', 'Amoniak', 'Siarka'], correct: 0, why: 'Tlen jest produktem ubocznym rozkładu wody.', right: 1, wrong: 2 }] }], daily: { right: 14, total: 18 } };
  const infoOf = (d) => { const c = d.kind === 'cards', seen = d.items.reduce((s, i) => s + i.right + i.wrong, 0), r = d.items.reduce((s, i) => s + i.right, 0); return { id: d.id, name: d.name, kind: d.kind, count: d.items.length, last: d.last, sessions: d.history.length, mastered: c ? d.items.filter((i) => i.box >= 4).length : d.items.filter((i) => i.right > i.wrong).length, due: c ? d.items.filter((i) => i.due <= Date.now()).length : d.items.length, accuracy: seen ? Math.round(r * 100 / seen) : null }; };
  const studyStubs = { studyList: async () => ({ decks: stu.decks.map(infoOf), today: { right: stu.daily.right, total: stu.daily.total }, streak: 4 }), studyGet: async (id) => { const d = stu.decks.find((x) => x.id === id); return d ? { ...d, info: infoOf(d) } : null; },
    studyCreate: async () => ({ ok: true, id: 'd1', name: 'Układ Słoneczny', kind: 'cards', count: 6 }), studyReview: async () => true, studySession: async (id, r, t) => { const d = stu.decks.find((x) => x.id === id); if (d) d.history.push({ right: r, total: t }); return true; }, studyDelete: async () => true };
  store.study = { due: 4, decks: 2 };
  window.api = { ...studyStubs, close() {}, cancel() {}, copy() {}, replace() {}, run() {}, setKey: async () => true, openConsole() {}, setLang() {}, getData: async () => store,
    saveContacts: async (l) => { store.contacts = l.map((c, i) => ({ ...c, id: c.id || 'n' + i })); return store.contacts; }, saveActions: async (l) => { store.actions = l.map((a, i) => ({ ...a, id: a.id || 'm' + i })); return store.actions; }, sendTo: async () => ({ ok: true }), saveTone: async (n, t) => { store.tones = store.tones.filter((x) => x.name.toLowerCase() !== n.toLowerCase()); if (t) store.tones.push({ name: n, tone: t }); return store.tones; }, onMoved() {}, onClosing() {} };
  const c = document.createElement('canvas'); c.width = 1440; c.height = 900; const g = c.getContext('2d');
  const bgc = g.createLinearGradient(0, 0, 1440, 900); bgc.addColorStop(0, '#f6d365'); bgc.addColorStop(.5, '#fda085'); bgc.addColorStop(1, '#5b86e5');
  g.fillStyle = bgc; g.fillRect(0, 0, 1440, 900); g.fillStyle = 'rgba(255,255,255,.9)'; for (let x = 0; x < 1440; x += 160) g.fillRect(x, 300, 80, 14); g.fillStyle = '#222'; for (let y = 40; y < 900; y += 34) g.fillRect(30, y, 200 + (y * 7) % 380, 8);
  g.fillStyle = '#d6409f'; g.beginPath(); g.arc(900, 420, 120, 0, 7); g.fill();
  window.__move = (x, y) => onMoved({ x, y });
  const dark = location.search.includes('dark');
  onOpen({ mode: location.search.includes('key') ? 'key' : 'select', text: location.search.includes('nosel') ? '' : 'Hej, dzięki za szybką odpowiedź. Przeczytałem propozycję i wygląda dobrze, pogadajmy w czwartek', hasKey: true, bg: { url: c.toDataURL('image/jpeg', .9), dw: 1440, dh: 900, dx: 0, dy: 0, wx: 300, wy: 120, dark } }).then(() => {
    const v = (location.search.match(/view=(\w+)/) || [])[1];
    if (v === 'lang') openLang(); else if (v === 'send') openSend(st.text, 'menu'); else if (v === 'actions') openActions(); else if (v === 'contact') openContactForm(); else if (v === 'result') start('slack', ''); else if (v === 'tone') openTone(); else if (v === 'people') openPeople(); else if (v === 'ptone') openPerson(null); else if (v === 'check') start('precheck', ''); else if (v === 'study') openStudy(); else if (v === 'deck') openDeck('d1'); else if (v === 'cards') openDeck('d1').then(() => startCards(st.deck.items)); else if (v === 'quiz') openDeck('d2').then(() => startQuiz(st.deck.items)); else if (v === 'make') start('flashcards', '');
  });
}
