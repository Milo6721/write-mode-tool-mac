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
  plus: 'M12 5v14M5 12h14',
};
const LABEL = { translate: 'Przetłumacz', send: 'Wyślij do…', slack: 'Wersja na Slack lub Teams', refuse: 'Uprzejma odmowa', official: 'Pismo urzędowe', bizen: 'Angielski biznesowy', headings: 'Nagłówki i akapity', tasks: 'Notatki na zadania', commit: 'Komunikat commita', flashcards: 'Fiszki', quiz: 'Quiz z tekstu', hardwords: 'Trudne słowa' };
/* Układ w stylu Apple Writing Tools: duże kafelki, potem listy z grupami */
const LAYOUT = [
  ['tile', 'g2', null, ['translate', 'send']],
  ['list', '', 'Komunikacja', ['slack', 'refuse', 'official', 'bizen']],
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
const VIEWS = ['menu', 'lang', 'send', 'contact', 'actions', 'result', 'key'];
function show(view) { st.view = view; for (const v of VIEWS) $('v-' + v).hidden = v !== view; }
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
  start(a, '');
}
function renderRows() {
  const box = $('rows'); box.textContent = '';
  if (!st.hasSel) {
    box.append(h('div', 'nosel', 'Nie zaznaczono tekstu. Napisz powyżej, co mam stworzyć, albo zaznacz tekst i naciśnij skrót jeszcze raz.'));
    box.append(chipButton('mine', 'Własne akcje…', openActions)); return;
  }
  for (const [kind, cls, title, items] of LAYOUT) {
    if (title) box.append(h('div', 'lab', title));
    const wrap = h('div', kind === 'list' ? 'list' : 'grid ' + cls);
    for (const a of items) {
      const b = h('button', kind === 'list' ? 'row' : kind); b.innerHTML = svg(a) + '<span>' + LABEL[a] + '</span>'; b.onclick = () => onMenuAction(a); wrap.append(b);
    }
    box.append(wrap);
  }
  if (st.data.actions.length) {
    box.append(h('div', 'lab', 'Moje akcje'));
    const wrap = h('div', 'list');
    for (const a of st.data.actions) { const b = h('button', 'row'); b.innerHTML = svg('mine'); b.append(h('span', null, a.name)); b.onclick = () => start('c:' + a.id, ''); wrap.append(b); }
    box.append(wrap);
  }
  box.append(chipButton('mine', 'Własne akcje…', openActions));
}
function chipButton(icon, label, fn) { const b = h('button', 'chip wide'); b.innerHTML = svg(icon) + '<span>' + label + '</span>'; b.onclick = fn; return b; }

/* ---------- wybór języka ---------- */
function openLang() {
  const box = $('langs'); box.textContent = '';
  const ordered = [...LANGS].sort((a, b) => (b[1] === st.data.lastLang) - (a[1] === st.data.lastLang));
  for (const [pl, en] of ordered) {
    const b = h('button', 'row'); b.append(h('span', 'grow', pl), h('span', 'sub2', en === st.data.lastLang ? 'ostatnio użyty' : en));
    b.onclick = () => { st.data.lastLang = en; window.api.setLang(en); start('translate', en); }; box.append(b);
  }
  show('lang');
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

/* ---------- wynik ---------- */
function start(action, instruction) {
  st.last = { action, instruction }; st.buf = '';
  show('result'); $('out').className = ''; $('out').textContent = '';
  $('status').textContent = 'Myślę…'; $('status').classList.add('shimmer');
  for (const id of ['retry', 'copy', 'sendRes', 'replace']) $(id).disabled = true;
  $('replace').hidden = action === 'ask' && st.hasSel; $('replace').textContent = st.hasSel ? 'Zamień' : 'Wstaw'; $('copy').textContent = 'Kopiuj';
  setBusy(true);
  if (demo) { demoStream(); return; }
  window.api.run(action, instruction);
}
function submitAsk() { const v = $('ask').value.trim(); if (v) start('ask', v); }
function onChunk(t) { st.buf += t; $('out').className = ''; $('out').textContent = clean(st.buf); $('out').scrollTop = 1e9; $('status').textContent = 'Piszę…'; }
function finish(ok, msg) {
  setBusy(false); $('status').classList.remove('shimmer');
  $('retry').disabled = false; $('copy').disabled = !ok; $('sendRes').disabled = !ok; $('replace').disabled = !ok;
  if (!ok) { $('status').textContent = 'Coś poszło nie tak'; $('out').className = 'err'; $('out').textContent = msg; return; }
  $('status').textContent = 'Gotowe';
}

/* ---------- zdarzenia z procesu głównego ---------- */
async function loadData() { try { st.data = await window.api.getData(); } catch (e) { /* zostają puste dane */ } }
async function onOpen(d) {
  setBusy(false); st.text = d.text || ''; st.hasSel = !!st.text.trim();
  document.body.classList.remove('dark', 'light'); document.body.classList.add(d.bg && !d.bg.dark ? 'light' : 'dark');
  const lens = $('lens');
  if (d.bg) {
    lens.style.backgroundImage = 'url(' + d.bg.url + ')'; lens.style.backgroundSize = d.bg.w + 'px ' + d.bg.h + 'px'; lens.style.backgroundPosition = d.bg.x + 'px ' + d.bg.y + 'px';
  } else lens.style.backgroundImage = 'none';
  const p = $('panel'); p.style.animation = 'none'; void p.offsetWidth; p.style.animation = '';
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
$('back').onclick = () => { if (!demo) window.api.cancel(); setBusy(false); toMenu(); };
$('langBack').onclick = toMenu; $('actBack').onclick = () => { renderRows(); toMenu(); };
$('sendBack').onclick = () => { if (st.sendFrom === 'result') show('result'); else toMenu(); };
$('contactBack').onclick = () => show('send'); $('cCancel').onclick = () => show('send'); $('cSave').onclick = saveContact; $('addContact').onclick = openContactForm;
for (const id of ['cName', 'cMail', 'cPhone']) $(id).addEventListener('keydown', (e) => { if (e.key === 'Enter') saveContact(); });
$('aAdd').onclick = addAction; $('cSearch').addEventListener('input', renderContacts);
$('retry').onclick = () => st.last && start(st.last.action, st.last.instruction);
$('copy').onclick = () => { window.api.copy(clean(st.buf)); $('copy').textContent = 'Skopiowano ✓'; };
$('sendRes').onclick = () => openSend(clean(st.buf), 'result');
$('replace').onclick = () => window.api.replace(clean(st.buf));
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
  if (['lang', 'actions', 'send'].includes(st.view)) { e.preventDefault(); toMenu(); } else if (st.view === 'contact') show('send'); else window.api && window.api.close();
});

/* ---------- tryb podglądu (?demo): działa w zwykłej przeglądarce, bez Electrona ---------- */
function demoStream() {
  const full = 'Cześć Ania,\n\nsuper, dzięki za szybką odpowiedź. Przeczytałem propozycję i wygląda dobrze. Pogadajmy w czwartek?';
  const parts = full.match(/[\s\S]{1,8}/g); let i = 0; const t = setInterval(() => { if (i >= parts.length) { clearInterval(t); finish(true); return; } onChunk(parts[i++]); }, 60);
}
if (demo) {
  const store = { contacts: [{ id: 'a', name: 'Anna Kowalska', email: 'anna@example.com', phone: '+48 600 100 200' }, { id: 'b', name: 'Piotr Nowak', email: 'piotr@firma.pl', phone: '' }], actions: [{ id: 'x', name: 'Zgłoszenie do Jiry', prompt: 'Zamień tekst w zgłoszenie do Jiry' }], lastLang: 'English' };
  window.api = { close() {}, cancel() {}, copy() {}, replace() {}, run() {}, setKey: async () => true, openConsole() {}, setLang() {}, getData: async () => store,
    saveContacts: async (l) => { store.contacts = l.map((c, i) => ({ ...c, id: c.id || 'n' + i })); return store.contacts; }, saveActions: async (l) => { store.actions = l.map((a, i) => ({ ...a, id: a.id || 'm' + i })); return store.actions; }, sendTo: async () => ({ ok: true }) };
  const c = document.createElement('canvas'); c.width = 448; c.height = 636; const g = c.getContext('2d');
  const bgc = g.createLinearGradient(0, 0, 448, 636); bgc.addColorStop(0, '#f6d365'); bgc.addColorStop(.5, '#fda085'); bgc.addColorStop(1, '#5b86e5');
  g.fillStyle = bgc; g.fillRect(0, 0, 448, 636); g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(0, 300, 448, 14); g.fillStyle = '#222'; for (let y = 40; y < 636; y += 34) g.fillRect(30, y, 200 + (y * 7) % 180, 8);
  const dark = location.search.includes('dark');
  onOpen({ mode: location.search.includes('key') ? 'key' : 'select', text: location.search.includes('nosel') ? '' : 'Hej, dzięki za szybką odpowiedź. Przeczytałem propozycję i wygląda dobrze, pogadajmy w czwartek', hasKey: true, bg: { url: c.toDataURL('image/jpeg', .9), x: 0, y: 0, w: 448, h: 636, dark } }).then(() => {
    const v = (location.search.match(/view=(\w+)/) || [])[1];
    if (v === 'lang') openLang(); else if (v === 'send') openSend(st.text, 'menu'); else if (v === 'actions') openActions(); else if (v === 'contact') openContactForm(); else if (v === 'result') start('slack', '');
  });
}
