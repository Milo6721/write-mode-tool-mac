'use strict';
/* Okno główne Write Mode Tool: Start, Fiszki i quizy, Statystyki, Personalizacja, Ustawienia */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const demo = location.search.includes('demo');
const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ic = (n) => '<svg class="i"><use href="#i-' + n + '"/></svg>';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ORDER = ['start', 'study', 'stats', 'people', 'settings'];
const RENDER = {};
let cur = '', busy = false, S = null, pendingDeck = null, ringId = 0, sess = null, curDeck = null;

const plural = (n, one, few, many) => (n === 1 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? few : many);
const noun = (n, kind) => n + ' ' + (kind === 'quiz' ? plural(n, 'pytanie', 'pytania', 'pytań') : plural(n, 'fiszka', 'fiszki', 'fiszek'));
const greet = () => { const h = new Date().getHours(); return h < 5 ? 'Dobrej nocy' : h < 12 ? 'Dzień dobry' : h < 18 ? 'Miłego popołudnia' : 'Dobry wieczór'; };
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const COLORS = ['#e5484d', '#e07b00', '#c9a000', '#30a46c', '#0f9fa8', '#0a84ff', '#7a5cff', '#d6409f'];
const colorOf = (s) => { let n = 0; for (const c of String(s)) n = (n * 31 + c.charCodeAt(0)) >>> 0; return COLORS[n % COLORS.length]; };
const initials = (n) => String(n).split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';

/* ---------- wykresy i animowane liczby ---------- */
function ringSvg(pct, size, sw) {
  const id = 'rg' + (++ringId), r = (size - sw) / 2, c = 2 * Math.PI * r, m = size / 2;
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '"><defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff4fd8"/><stop offset=".5" stop-color="#6a5cff"/><stop offset="1" stop-color="#2fd5ff"/></linearGradient></defs>' +
    '<circle cx="' + m + '" cy="' + m + '" r="' + r + '" fill="none" stroke="var(--line)" stroke-width="' + sw + '"/>' +
    '<circle class="arc" cx="' + m + '" cy="' + m + '" r="' + r + '" fill="none" stroke="url(#' + id + ')" stroke-width="' + sw + '" stroke-linecap="round" stroke-dasharray="' + c + '" stroke-dashoffset="' + c + '" data-off="' + (c * (1 - Math.min(100, pct) / 100)) + '" transform="rotate(-90 ' + m + ' ' + m + ')"/></svg>';
}
function animateRings(box) { requestAnimationFrame(() => requestAnimationFrame(() => { $$('.arc', box).forEach((a) => { a.style.strokeDashoffset = a.dataset.off; }); $$('.pbar i', box).forEach((b) => { b.style.width = b.dataset.w + '%'; }); })); }
function countUps(box) {
  $$('[data-count]', box).forEach((el) => {
    const to = +el.dataset.count, suf = el.dataset.suf || '', t0 = performance.now();
    (function tick(t) { const k = Math.min(1, (t - t0) / 1100); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))) + suf; if (k < 1) requestAnimationFrame(tick); })(t0);
  });
}
function spark(hist, h) {
  const pts = (hist || []).slice(-14).map((x) => (x.total ? Math.round(x.right * 100 / x.total) : 0));
  if (pts.length < 2) return '<div class="note" style="padding:26px 6px;text-align:center">Wykres pojawi się po dwóch sesjach nauki.</div>';
  const W = 420, H = h || 96, px = (i) => 10 + i * (W - 20) / (pts.length - 1), py = (v) => H - 10 - v * (H - 20) / 100;
  const line = pts.map((v, i) => (i ? 'L' : 'M') + px(i).toFixed(1) + ' ' + py(v).toFixed(1)).join('');
  const area = line + 'L' + px(pts.length - 1).toFixed(1) + ' ' + (H - 4) + 'L' + px(0).toFixed(1) + ' ' + (H - 4) + 'Z';
  return '<svg class="spark" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none"><defs><linearGradient id="sa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a5cff" stop-opacity=".45"/><stop offset="1" stop-color="#6a5cff" stop-opacity="0"/></linearGradient><linearGradient id="sl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff4fd8"/><stop offset=".5" stop-color="#6a5cff"/><stop offset="1" stop-color="#2fd5ff"/></linearGradient></defs>' +
    '<path d="' + area + '" fill="url(#sa)"/><path class="sline" pathLength="1" d="' + line + '" fill="none" stroke="url(#sl)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>';
}
const rise = (box) => $$('.rise', box).forEach((el, i) => el.style.setProperty('--i', i));
document.addEventListener('pointermove', (e) => {
  const t = e.target.closest && e.target.closest('.glass'); if (!t) return;
  const r = t.getBoundingClientRect(); t.style.setProperty('--mx', (e.clientX - r.left) + 'px'); t.style.setProperty('--my', (e.clientY - r.top) + 'px');
}, { passive: true });

/* ---------- nawigacja ---------- */
function movePill(p) {
  const b = $('#nav [data-p="' + p + '"]'); if (!b) return;
  $('#pill').style.transform = 'translateY(' + b.offsetTop + 'px)'; $('#pill').style.height = b.offsetHeight + 'px';
  $$('#nav button').forEach((x) => x.classList.toggle('on', x === b));
}
async function swap(el, fn, dir) {
  el.style.setProperty('--dir', dir || 1);
  if (!el.hidden) { el.classList.remove('enter'); el.classList.add('leave'); await sleep(150); el.classList.remove('leave'); }
  await fn(); rise(el); el.hidden = false; el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter'); el.scrollTop = 0; animateRings(el); countUps(el);
}
async function go(p) {
  if (p === cur && p === 'study' && pendingDeck && !busy) { const id = pendingDeck; pendingDeck = null; openDeck(id); return; }
  if (busy || p === cur) return; busy = true;
  const dir = ORDER.indexOf(p) >= ORDER.indexOf(cur || 'start') ? 1 : -1; movePill(p);
  try {
    if (cur) { const old = $('#p-' + cur); old.classList.add('leave'); old.style.setProperty('--dir', dir); await sleep(150); old.hidden = true; old.classList.remove('leave', 'enter'); }
    cur = p; const el = $('#p-' + p); el.hidden = true; await swap(el, () => RENDER[p](el), dir);
  } finally { busy = false; }
}
function setBadge(n) { const b = $('#dueBadge'); b.hidden = !n; b.textContent = n; }
const setHk = (l) => { $('#hk').textContent = l; };

/* ---------- Start ---------- */
RENDER.start = async (el) => {
  const [L, s] = await Promise.all([api.studyList(), api.settingsGet()]); S = s; setHk(s.hotkeyLabel);
  const acc = L.today.total ? Math.round(L.today.right * 100 / L.today.total) : null;
  const due = L.decks.filter((d) => d.kind === 'cards').reduce((n, d) => n + d.due, 0); setBadge(due);
  const top = L.decks.slice(0, 3);
  el.innerHTML = '<header class="ph rise"><h1>' + greet() + '</h1><p>Zaznacz tekst w dowolnej aplikacji i naciśnij <kbd>' + esc(s.hotkeyLabel) + '</kbd> albo kliknij prawym przyciskiem i wybierz Usługi.</p></header>' +
    '<div class="grid3">' +
    '<div class="card glass stat rise"><span class="si fire">' + ic('flame') + '</span><b data-count="' + L.streak + '">0</b><span>' + (L.streak === 1 ? 'dzień z rzędu' : 'dni z rzędu') + '</span></div>' +
    '<div class="card glass stat rise"><span class="si blue">' + ic('check') + '</span><b data-count="' + L.today.total + '">0</b><span>odpowiedzi dziś</span></div>' +
    '<div class="card glass stat rise"><span class="si green">' + ic('chart') + '</span><b' + (acc == null ? '>–' : ' data-count="' + acc + '" data-suf="%">0') + '</b><span>poprawnych dziś</span></div></div>' +
    '<div class="grid2"><div class="card glass hero accent rise"><div><h3>' + (due ? due + ' ' + plural(due, 'fiszka', 'fiszki', 'fiszek') + ' do powtórki' : 'Wszystko powtórzone') + '</h3><p>' + (due ? 'Krótka sesja utrwali to, co już umiesz.' : 'Zaznacz tekst i stwórz nowy zestaw fiszek albo quiz.') + '</p></div><button class="btn primary" data-go="study">' + ic('play') + (due ? 'Ucz się' : 'Moje zestawy') + '</button></div>' +
    '<div class="card glass rise"><h3 style="margin-bottom:6px">Ostatnie zestawy</h3>' + (top.length ? top.map((d) => '<button class="deckrow" data-deck="' + esc(d.id) + '"><i class="dbadge ' + (d.kind === 'quiz' ? 'q' : 'c') + '" style="width:36px;height:36px;border-radius:12px">' + ic(d.kind === 'quiz' ? 'quiz' : 'cards') + '</i><div class="ctx"><div class="cn">' + esc(d.name) + '</div><div class="cs">' + noun(d.count, d.kind) + '</div></div><span class="rg">' + ringSvg(d.count ? Math.round(d.mastered * 100 / d.count) : 0, 40, 4) + '<em>' + (d.count ? Math.round(d.mastered * 100 / d.count) : 0) + '</em></span></button>').join('') : '<p class="note" style="padding:14px 4px">Brak zestawów. Zaznacz tekst, naciśnij skrót i wybierz „Fiszki”.</p>') + '</div></div>' +
    '<div class="sec rise">Jak to działa</div><div class="steps">' +
    '<div class="card glass step rise"><span class="si blue">' + ic('select') + '</span><span class="n">KROK 1</span><h3>Zaznacz tekst</h3><p>W przeglądarce, Mailu, Notatkach, gdziekolwiek.</p></div>' +
    '<div class="card glass step rise"><span class="si purple">' + ic('key') + '</span><span class="n">KROK 2</span><h3>Wywołaj menu</h3><p>Skrót <b>' + esc(s.hotkeyLabel) + '</b> albo prawy przycisk i Usługi.</p></div>' +
    '<div class="card glass step rise"><span class="si pink">' + ic('sparkle') + '</span><span class="n">KROK 3</span><h3>Wybierz akcję</h3><p>Tłumaczenie, odpowiedź, fiszki, wysyłka do znajomych i więcej.</p></div></div>';
  $$('[data-go]', el).forEach((b) => { b.onclick = () => go(b.dataset.go); });
  $$('[data-deck]', el).forEach((b) => { b.onclick = () => { pendingDeck = b.dataset.deck; go('study'); }; });
};

/* ---------- Fiszki i quizy ---------- */
RENDER.study = async (el) => {
  if (pendingDeck) { const id = pendingDeck; pendingDeck = null; return renderDeck(el, id); }
  const L = await api.studyList(); setBadge(L.decks.filter((d) => d.kind === 'cards').reduce((n, d) => n + d.due, 0));
  el.innerHTML = '<header class="ph rise"><h1>Fiszki i quizy</h1><p>Zestawy powstają z zaznaczonego tekstu. Naciśnij skrót i wybierz „Fiszki” albo „Quiz z tekstu”.</p></header>' +
    (L.decks.length ? '<div class="deckgrid">' + L.decks.map((d) => {
      const pct = d.count ? Math.round(d.mastered * 100 / d.count) : 0;
      return '<button class="card glass deckcard rise" data-deck="' + esc(d.id) + '"><div class="top"><i class="dbadge ' + (d.kind === 'quiz' ? 'q' : 'c') + '">' + ic(d.kind === 'quiz' ? 'quiz' : 'cards') + '</i><span class="rg">' + ringSvg(pct, 46, 5) + '<em>' + pct + '</em></span></div><div><h3>' + esc(d.name) + '</h3><div class="meta">' + noun(d.count, d.kind) + (d.accuracy == null ? '' : ' · ' + d.accuracy + '% poprawnych') + '</div>' + (d.kind === 'cards' && d.due ? '<span class="tag">' + d.due + ' do powtórki</span>' : '') + '</div></button>';
    }).join('') + '</div>' : '<div class="card glass empty rise"><span class="si pink">' + ic('cards') + '</span><h3>Nie masz jeszcze zestawów</h3><p>Zaznacz dowolny tekst, naciśnij <b>' + esc(S ? S.hotkeyLabel : '⌘⌥M') + '</b> i wybierz „Fiszki” albo „Quiz z tekstu”.</p></div>');
  $$('[data-deck]', el).forEach((b) => { b.onclick = () => openDeck(b.dataset.deck); });
};
const openDeck = (id) => swap($('#p-study'), () => renderDeck($('#p-study'), id), 1);
const closeDeck = () => swap($('#p-study'), () => RENDER.study($('#p-study')), -1);
async function renderDeck(el, id) {
  const d = await api.studyGet(id); if (!d) return RENDER.study(el);
  curDeck = d; const inf = d.info, cards = d.kind === 'cards', pct = inf.count ? Math.round(inf.mastered * 100 / inf.count) : 0;
  const due = cards ? d.items.filter((i) => !i.due || i.due <= Date.now()) : d.items, hardQ = d.items.filter((i) => i.wrong > 0).sort((a, b) => b.wrong - a.wrong);
  el.innerHTML = '<button class="back rise" data-back>' + ic('back') + ' Wszystkie zestawy</button>' +
    '<div class="dtitle rise"><i class="dbadge ' + (cards ? 'c' : 'q') + '">' + ic(cards ? 'cards' : 'quiz') + '</i><header class="ph"><h1>' + esc(d.name) + '</h1><p>' + noun(inf.count, d.kind) + '</p></header><button class="icon danger" data-del title="Usuń zestaw">' + ic('trash') + '</button></div>' +
    '<div class="grid2"><div class="card glass bigringcard rise"><div class="bigring">' + ringSvg(pct, 128, 11) + '<div class="rc"><b data-count="' + pct + '" data-suf="%">0%</b><span>opanowane</span></div></div><div class="kv"><div><span>Opanowane</span><b>' + inf.mastered + ' / ' + inf.count + '</b></div><div><span>Skuteczność</span><b>' + (inf.accuracy == null ? '–' : inf.accuracy + '%') + '</b></div><div><span>Sesje nauki</span><b>' + inf.sessions + '</b></div></div></div>' +
    '<div class="card glass rise"><h3 style="margin-bottom:8px">Postępy w kolejnych sesjach</h3>' + spark(d.history) + '</div></div>' +
    '<div class="acts rise" id="acts"></div>' + (hardQ.length ? '<div class="sec rise">Najtrudniejsze</div><div class="card glass rise"><div class="list">' + hardQ.slice(0, 6).map((i) => '<div><span class="q">' + esc(i.q) + '</span><span class="n">błędnie ' + i.wrong + '×</span></div>').join('') + '</div></div>' : '');
  const acts = $('#acts', el), add = (label, primary, fn, icon) => { const b = document.createElement('button'); b.className = 'btn' + (primary ? ' primary' : ''); b.innerHTML = (icon ? ic(icon) : '') + esc(label); b.onclick = fn; acts.append(b); };
  if (cards) { if (due.length) add('Ucz się · ' + due.length + ' do powtórki', true, () => startSession('cards', due), 'play'); add('Powtórz wszystkie fiszki', !due.length, () => startSession('cards', d.items), 'cards'); }
  else { add('Rozwiąż quiz', true, () => startSession('quiz', d.items), 'play'); if (hardQ.length) add('Tylko trudne pytania (' + hardQ.length + ')', false, () => startSession('quiz', hardQ)); }
  $('[data-back]', el).onclick = closeDeck;
  const del = $('[data-del]', el); del.onclick = async () => {
    if (!del.classList.contains('sure')) { del.classList.add('sure'); del.style.background = 'rgba(255,69,58,.3)'; del.title = 'Kliknij jeszcze raz, żeby usunąć'; setTimeout(() => { del.classList.remove('sure'); del.style.background = ''; }, 2500); return; }
    await api.studyDelete(d.id); closeDeck();
  };
}

/* ---------- sesja nauki (pełny ekran w oknie) ---------- */
function startSession(kind, items) {
  if (!items.length) return;
  sess = { kind, deck: curDeck, items, queue: shuffle(items), total: items.length, known: 0, idx: 0, first: {}, flipped: false, busy: false, locked: false };
  const box = $('#session'); box.className = ''; box.hidden = false;
  box.innerHTML = '<div class="sbar"><button class="icon" id="sClose" title="Zamknij (Esc)">' + ic('close') + '</button><div class="prog"><i id="sProg"></i></div><span class="cnt" id="sCnt"></span></div><div class="sbody" id="sBody"></div><div class="sfoot2" id="sFoot"></div>';
  $('#sClose').onclick = endSession; kind === 'cards' ? nextCard() : nextQuestion();
}
async function endSession() { const b = $('#session'); b.classList.add('out'); await sleep(230); b.hidden = true; b.className = ''; const id = sess && sess.deck.id; sess = null; if (id && cur === 'study') openDeck(id); }
const prog = (v, t) => { $('#sProg').style.width = v + '%'; $('#sCnt').textContent = t; };
function nextCard() {
  const s = sess, it = s.queue[0]; if (!it) return finishSession();
  s.flipped = false; s.busy = false; prog(s.known * 100 / s.total, s.known + '/' + s.total);
  $('#sBody').innerHTML = '<div class="fcArea"><div class="fcWrap in" id="fcWrap"><div class="fc" id="fc"><div class="face"><span class="lab">Pytanie</span><div>' + esc(it.q) + '</div></div><div class="face back"><span class="lab">Odpowiedź</span><div>' + esc(it.a) + '</div></div></div></div></div>';
  $('#sFoot').innerHTML = '<span class="note">Kliknij kartę lub naciśnij spację, żeby zobaczyć odpowiedź</span>'; $('#fc').onclick = flipCard;
}
function flipCard() {
  const s = sess; if (!s || s.kind !== 'cards' || s.busy || s.flipped) return; s.flipped = true; $('#fc').classList.add('flipped');
  $('#sFoot').innerHTML = '<div class="grades"><button class="btn g0" data-g="0">Nie umiem <kbd>1</kbd></button><button class="btn g1" data-g="1">Z trudem <kbd>2</kbd></button><button class="btn g2" data-g="2">Umiem <kbd>3</kbd></button></div>';
  $$('.grades .btn', $('#sFoot')).forEach((b) => { b.onclick = () => gradeCard(+b.dataset.g); });
}
async function gradeCard(g) {
  const s = sess; if (!s || s.kind !== 'cards' || !s.flipped || s.busy) return; s.busy = true; const it = s.queue.shift(); api.studyReview(s.deck.id, it.id, g);
  if (!(it.id in s.first)) s.first[it.id] = g >= 1; if (g === 0) s.queue.splice(Math.min(3, s.queue.length), 0, it); else s.known++;
  prog(s.known * 100 / s.total, s.known + '/' + s.total); const w = $('#fcWrap'); w.className = 'fcWrap o' + g; await sleep(290); if (sess === s) nextCard();
}
function nextQuestion() {
  const s = sess, it = s.queue[s.idx]; if (!it) return finishSession();
  s.locked = false; prog(s.idx * 100 / s.total, (s.idx + 1) + '/' + s.total);
  const opts = shuffle(it.opts.map((t, i) => ({ t, ok: i === it.correct })));
  $('#sBody').innerHTML = '<div class="qtext">' + esc(it.q) + '</div><div class="opts" id="opts">' + opts.map((o, i) => '<button class="opt" style="--i:' + i + '"><i class="ol">' + 'ABCD'[i] + '</i><span>' + esc(o.t) + '</span></button>').join('') + '</div>';
  $('#sFoot').innerHTML = ''; $$('.opt', $('#opts')).forEach((b, i) => { b.onclick = () => pickOption(b, opts[i], opts); });
}
function pickOption(b, o, opts) {
  const s = sess; if (!s || s.kind !== 'quiz' || s.locked) return; s.locked = true; const it = s.queue[s.idx];
  api.studyReview(s.deck.id, it.id, o.ok ? 2 : 0); s.first[it.id] = o.ok;
  $$('.opt', $('#opts')).forEach((el, i) => { el.classList.add('lock'); if (opts[i].ok) el.classList.add('ok'); }); if (!o.ok) b.classList.add('bad');
  prog((s.idx + 1) * 100 / s.total, (s.idx + 1) + '/' + s.total);
  $('#sFoot').innerHTML = (it.why ? '<div class="why">' + esc(it.why) + '</div>' : '') + '<button class="btn primary" id="sNext">' + (s.idx + 1 >= s.total ? 'Zobacz wynik' : 'Dalej') + ' <kbd>↵</kbd></button>';
  $('#sNext').onclick = () => { s.idx++; nextQuestion(); };
}
function finishSession() {
  const s = sess, ids = Object.keys(s.first), right = ids.filter((i) => s.first[i]).length, total = s.total, pct = total ? Math.round(right * 100 / total) : 0;
  const hist = s.deck.history || [], prev = hist[hist.length - 1], prevPct = prev && prev.total ? Math.round(prev.right * 100 / prev.total) : null, best = hist.reduce((m, x) => Math.max(m, x.total ? Math.round(x.right * 100 / x.total) : 0), 0);
  api.studySession(s.deck.id, right, total); s.wrong = s.items.filter((i) => !s.first[i.id]); prog(100, total + '/' + total);
  const title = pct >= 90 ? 'Świetnie!' : pct >= 70 ? 'Dobrze Ci idzie' : pct >= 40 ? 'Jeszcze trochę' : 'Warto powtórzyć';
  let sub = right + ' z ' + total + (s.kind === 'quiz' ? ' pytań za pierwszym razem.' : ' fiszek umiesz od razu.');
  if (prevPct != null) { const d = pct - prevPct; sub += '<br>' + (d > 0 ? '<span class="up">+' + d + ' pkt względem ostatniej sesji</span>' : d < 0 ? '<span class="down">' + d + ' pkt względem ostatniej sesji</span>' : 'Tyle samo co ostatnio'); }
  if (hist.length && pct > best) sub += '<br><span class="up">Nowy rekord!</span>';
  $('#sBody').innerHTML = '<div class="sum"><div class="bigring">' + ringSvg(pct, 190, 15) + '<div class="rc"><b data-count="' + pct + '" data-suf="%" style="font-size:44px">0%</b><span>' + right + ' z ' + total + '</span></div></div><div class="t">' + title + '</div><div class="s">' + sub + '</div><div class="acts" id="sAct"></div></div>';
  $('#sFoot').innerHTML = ''; const act = $('#sAct');
  if (s.wrong.length) { const b = document.createElement('button'); b.className = 'btn'; b.textContent = 'Powtórz błędne (' + s.wrong.length + ')'; b.onclick = () => startSession(s.kind, s.wrong); act.append(b); }
  const d = document.createElement('button'); d.className = 'btn primary'; d.textContent = 'Gotowe'; d.onclick = endSession; act.append(d);
  animateRings($('#session')); countUps($('#session'));
}
document.addEventListener('keydown', (e) => {
  if (rec) return;
  if ((e.metaKey || e.ctrlKey) && /^[1-5]$/.test(e.key)) { e.preventDefault(); go(ORDER[+e.key - 1]); return; }
  if (!sess) return;
  if (e.key === 'Escape') { endSession(); return; }
  if (sess.kind === 'cards') { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flipCard(); } else if (['1', '2', '3'].includes(e.key)) gradeCard(+e.key - 1); }
  else { const i = ['1', '2', '3', '4'].indexOf(e.key), b = $$('.opt', $('#opts') || document)[i]; if (i >= 0 && b && !sess.locked) b.click(); else if (e.key === 'Enter' && $('#sNext')) $('#sNext').click(); }
});

/* ---------- Statystyki ---------- */
RENDER.stats = async (el) => {
  const O = await api.studyOverview(), max = Math.max(1, ...O.days.map((d) => d.total)), DAYS = ['nd', 'pn', 'wt', 'śr', 'cz', 'pt', 'sb'];
  el.innerHTML = '<header class="ph rise"><h1>Statystyki</h1><p>Jak Ci idzie z nauką w ostatnich dwóch tygodniach.</p></header>' +
    '<div class="grid3"><div class="card glass stat rise"><span class="si purple">' + ic('check') + '</span><b data-count="' + O.answers + '">0</b><span>odpowiedzi łącznie</span></div>' +
    '<div class="card glass stat rise"><span class="si green">' + ic('chart') + '</span><b' + (O.accuracy == null ? '>–' : ' data-count="' + O.accuracy + '" data-suf="%">0') + '</b><span>skuteczność ogółem</span></div>' +
    '<div class="card glass stat rise"><span class="si fire">' + ic('flame') + '</span><b data-count="' + O.streak + '">0</b><span>' + (O.streak === 1 ? 'dzień z rzędu' : 'dni z rzędu') + '</span></div></div>' +
    '<div class="card glass rise"><h3>Odpowiedzi dzień po dniu</h3><div class="bars">' + O.days.map((d, i) => '<div class="bcol"><div class="bar" style="--h:' + Math.round(d.total * 100 / max) + '%;--r:' + (d.total ? Math.round(d.right * 100 / d.total) : 0) + '%;--i:' + i + '" title="' + d.total + ' odpowiedzi, ' + d.right + ' poprawnych"><i></i></div><small>' + DAYS[new Date(d.d + 'T12:00:00').getDay()] + '</small></div>').join('') + '</div><div class="legend"><span><i style="background:#6a5cff"></i>poprawne</span><span><i style="background:rgba(255,69,58,.5)"></i>błędne</span></div></div>' +
    '<div class="cols" style="margin-top:14px"><div class="card glass rise"><h3 style="margin-bottom:6px">Opanowanie zestawów</h3>' + (O.decks.length ? O.decks.map((d) => '<div class="prow"><span class="nm">' + esc(d.name) + '</span><span class="pbar"><i data-w="' + d.pct + '"></i></span><span class="pc">' + d.pct + '%</span></div>').join('') : '<p class="note" style="padding:12px 0">Brak zestawów.</p>') + '</div>' +
    '<div class="card glass rise"><h3 style="margin-bottom:6px">Najtrudniejsze pytania</h3>' + (O.hardest.length ? '<div class="list">' + O.hardest.map((h) => '<div><span class="q">' + esc(h.q) + '<br><small class="note">' + esc(h.deck) + '</small></span><span class="n">' + h.wrong + '×</span></div>').join('') + '</div>' : '<p class="note" style="padding:12px 0">Jeszcze nic. Świetnie!</p>') + '</div></div>';
};

/* ---------- Personalizacja ---------- */
RENDER.people = async (el) => {
  const D = await api.homeData(), tones = D.tones || [], acts = D.actions || [];
  el.innerHTML = '<header class="ph rise"><h1>Personalizacja</h1><p>Ton dla konkretnych osób i własne akcje, które pojawią się w menu przy zaznaczonym tekście.</p></header><div class="cols">' +
    '<div class="card glass rise"><h3>Ton dla osób</h3><p class="note" style="margin:4px 0 8px">Zapisz, jak piszesz do kogoś. W „Odpowiedz…” wybierzesz tę osobę.</p><div id="tList">' +
    (tones.length ? tones.map((t) => '<div class="item"><span class="av" style="background:' + colorOf(t.name) + '">' + esc(initials(t.name)) + '</span><div class="ctx"><div class="cn">' + esc(t.name) + '</div><div class="cs">' + esc(t.tone) + '</div></div><button class="icon danger" data-dt="' + esc(t.name) + '" title="Usuń">' + ic('trash') + '</button></div>').join('') : '<p class="note" style="padding:10px 0">Nikogo jeszcze nie dodano.</p>') + '</div>' +
    '<div class="form"><input id="tName" placeholder="Osoba, np. Anna Kowalska" spellcheck="false"><input id="tTone" placeholder="Jak piszesz, np. na ty, luźno, z emoji" spellcheck="false"><div class="chips">' + ['Na „ty”, luźno', 'Na „pan/pani”, formalnie', 'Krótko i konkretnie', 'Ciepło, z emoji'].map((c) => '<button class="chip" data-ch="' + esc(c) + '">' + esc(c) + '</button>').join('') + '</div><div class="msg" id="tMsg"></div><button class="btn primary" id="tAdd">' + ic('plus') + 'Dodaj osobę</button></div></div>' +
    '<div class="card glass rise"><h3>Własne akcje</h3><p class="note" style="margin:4px 0 8px">Sam piszesz polecenie dla AI, np. „Zgłoszenie do Jiry”.</p><div id="aList">' +
    (acts.length ? acts.map((a) => '<div class="item"><span class="av" style="background:' + colorOf(a.name) + '">' + ic('sparkle') + '</span><div class="ctx"><div class="cn">' + esc(a.name) + '</div><div class="cs">' + esc(a.prompt) + '</div></div><button class="icon danger" data-da="' + esc(a.id) + '" title="Usuń">' + ic('trash') + '</button></div>').join('') : '<p class="note" style="padding:10px 0">Nie masz jeszcze własnych akcji.</p>') + '</div>' +
    '<div class="form"><input id="aName" placeholder="Nazwa akcji" spellcheck="false"><textarea id="aPrompt" rows="3" placeholder="Co ma zrobić AI z zaznaczonym tekstem?" spellcheck="false"></textarea><div class="msg" id="aMsg"></div><button class="btn primary" id="aAdd">' + ic('plus') + 'Dodaj akcję</button></div></div></div>';
  const redo = () => swap(el, () => RENDER.people(el), 1);
  $$('[data-ch]', el).forEach((b) => { b.onclick = () => { $('#tTone', el).value = b.dataset.ch; }; });
  $('#tAdd', el).onclick = async () => { const n = $('#tName', el).value.trim(), t = $('#tTone', el).value.trim(); if (!n || !t) { $('#tMsg', el).textContent = 'Wpisz osobę i opisz, jak do niej piszesz.'; return; } await api.saveTone(n, t); redo(); };
  $$('[data-dt]', el).forEach((b) => { b.onclick = async () => { await api.saveTone(b.dataset.dt, ''); redo(); }; });
  $('#aAdd', el).onclick = async () => { const n = $('#aName', el).value.trim(), p = $('#aPrompt', el).value.trim(); if (!n || !p) { $('#aMsg', el).textContent = 'Wpisz nazwę i polecenie.'; return; } await api.saveActions([...acts, { id: '', name: n, prompt: p }]); redo(); };
  $$('[data-da]', el).forEach((b) => { b.onclick = async () => { await api.saveActions(acts.filter((x) => x.id !== b.dataset.da)); redo(); }; });
};

/* ---------- Ustawienia ---------- */
let rec = false;
function toAccel(e) {
  const m = []; if (e.metaKey) m.push('Command'); if (e.ctrlKey) m.push('Control'); if (e.altKey) m.push('Alt'); if (e.shiftKey) m.push('Shift');
  const c = e.code; let k = null;
  if (/^Key[A-Z]$/.test(c)) k = c.slice(3); else if (/^Digit\d$/.test(c)) k = c.slice(5); else if (/^F\d{1,2}$/.test(c)) k = c; else if (c === 'Space') k = 'Space';
  if (!k || (!m.length && !/^F\d/.test(k))) return null; return m.concat(k).join('+');
}
const KEYMAP = { Command: '⌘', Control: '⌃', Alt: '⌥', Shift: '⇧', Space: 'Spacja' };
const keycaps = (acc) => acc.split('+').map((k) => '<kbd>' + esc(KEYMAP[k] || k) + '</kbd>').join('');
const sw = (k, on) => '<button class="sw" role="switch" aria-checked="' + !!on + '" data-k="' + k + '"><i></i></button>';
RENDER.settings = async (el) => {
  const s = await api.settingsGet(); S = s; setHk(s.hotkeyLabel); const sv = s.services, fast = !s.model || s.model.includes('haiku');
  el.innerHTML = '<header class="ph rise"><h1>Ustawienia</h1><p>Skróty, usługi z prawego przycisku i zachowanie aplikacji.</p></header>' +
    '<div class="sec rise">Skrót klawiszowy</div><div class="card glass group rise"><div class="srow"><div class="st"><b>Skrót główny</b><span>Otwiera menu akcji dla zaznaczonego tekstu w dowolnej aplikacji</span></div><div class="ctl"><div class="keys" id="keys">' + keycaps(s.hotkey) + '<span class="hint">Naciśnij nowy skrót…</span></div><button class="btn" id="recBtn">Zmień</button></div></div>' +
    '<div class="presets" id="presets">' + s.presets.map((p) => '<button class="chip" data-acc="' + esc(p.acc) + '">' + esc(p.label) + '</button>').join('') + '</div><div class="msg" id="hkMsg" style="padding-bottom:10px"></div></div>' +
    '<div class="sec rise">Usługi w menu prawego przycisku</div><div class="card glass group rise">' +
    [['menu', 'Write Mode Tool', 'Pełne menu akcji'], ['lang', 'Przetłumacz', 'Od razu wybór języka'], ['chat', 'Wyślij w Wiadomościach', 'Wybór osoby z Kontaktów'], ['mail', 'Wyślij e-mailem', 'Szkic w aplikacji Mail']].map(([k, n, d]) => '<div class="srow"><div class="st"><b>' + n + '</b><span>' + d + '</span></div>' + sw('svc.' + k, sv[k]) + '</div>').join('') + '</div>' +
    '<div class="sec rise">Zachowanie</div><div class="card glass group rise">' +
    [['login', 'Uruchamiaj po zalogowaniu', 'Aplikacja startuje razem z komputerem', s.login], ['showHome', 'Pokaż to okno po uruchomieniu', 'Inaczej aplikacja startuje cicho w tle', s.showHome], ['tray', 'Ikona w pasku menu', 'Szybki dostęp bez otwierania okna', s.tray], ['autoSend', 'Wysyłaj wiadomości od razu', 'Bez podglądu szkicu. Uwaga: AI może się pomylić', s.autoSend]].map(([k, n, d, v]) => '<div class="srow"><div class="st"><b>' + n + '</b><span>' + d + '</span></div>' + sw(k, v) + '</div>').join('') + '</div>' +
    '<div class="sec rise">Model AI</div><div class="card glass group rise"><div class="srow"><div class="st"><b>Jakość odpowiedzi</b><span>Szybki jest tańszy, dokładny lepiej pisze długie teksty</span></div><div class="seg" id="seg"><i style="transform:translateX(' + (fast ? 0 : 100) + '%)"></i><button data-m="" class="' + (fast ? 'on' : '') + '">Szybki</button><button data-m="claude-sonnet-5-5" class="' + (fast ? '' : 'on') + '">Dokładny</button></div></div></div>' +
    '<div class="sec rise">Klucz API Anthropic</div><div class="card glass group rise"><div class="srow" style="padding-bottom:12px"><div class="st"><b>Klucz</b><span>Zapisany zaszyfrowany na tym komputerze</span></div><span class="pill ' + (s.hasKey ? 'ok' : 'no') + '" id="keyPill">' + (s.hasKey ? 'Zapisany' : 'Brak klucza') + '</span></div>' +
    '<div class="keyin"><input id="keyIn" type="password" placeholder="sk-ant-…" spellcheck="false" autocomplete="off"><button class="btn primary" id="keySave">Zapisz</button><button class="btn" id="keyGet">Zdobądź klucz</button></div><div class="msg" id="keyMsg" style="padding-bottom:12px"></div></div>' +
    '<p class="note rise" style="margin-top:18px">Write Mode Tool ' + esc(s.version) + ' · projekt niezależny, nie jest produktem Apple Inc. ani Anthropic PBC.</p>';
  $$('.sw', el).forEach((b) => { b.onclick = async () => { const on = b.getAttribute('aria-checked') !== 'true'; b.setAttribute('aria-checked', on); await api.settingsSet(b.dataset.k, on); }; });
  $$('#seg button', el).forEach((b, i) => { b.onclick = async () => { $$('#seg button', el).forEach((x) => x.classList.toggle('on', x === b)); $('#seg i', el).style.transform = 'translateX(' + i * 100 + '%)'; await api.settingsSet('model', b.dataset.m); }; });
  const setKeys = (acc, label) => { $('#keys', el).innerHTML = keycaps(acc) + '<span class="hint">Naciśnij nowy skrót…</span>'; setHk(label); $('#hkMsg', el).textContent = ''; };
  const applyHk = async (acc) => {
    const r = await api.setHotkey(acc), box = $('#keys', el);
    if (r.ok) { S.hotkey = acc; setKeys(acc, r.label); $('#hkMsg', el).className = 'msg ok'; $('#hkMsg', el).textContent = 'Zapisano: ' + r.label; }
    else { box.classList.remove('bad'); void box.offsetWidth; box.classList.add('bad'); $('#hkMsg', el).className = 'msg'; $('#hkMsg', el).textContent = 'Ten skrót jest zajęty przez system lub inną aplikację.'; }
  };
  $$('#presets .chip', el).forEach((b) => { b.onclick = () => applyHk(b.dataset.acc); });
  $('#recBtn', el).onclick = () => {
    if (rec) return; rec = true; const box = $('#keys', el), btn = $('#recBtn', el); box.classList.add('rec'); btn.textContent = 'Anuluj';
    const stop = () => { rec = false; box.classList.remove('rec'); btn.textContent = 'Zmień'; window.removeEventListener('keydown', onKey, true); btn.onclick = start; };
    const onKey = (e) => { e.preventDefault(); e.stopPropagation(); if (e.key === 'Escape') return stop(); if (['Meta', 'Control', 'Alt', 'Shift'].includes(e.key)) return; const acc = toAccel(e); if (!acc) { box.classList.remove('bad'); void box.offsetWidth; box.classList.add('bad'); $('#hkMsg', el).className = 'msg'; $('#hkMsg', el).textContent = 'Dodaj klawisz ⌘, ⌃ lub ⌥ i literę.'; return; } stop(); applyHk(acc); };
    const start = $('#recBtn', el).onclick; btn.onclick = stop; window.addEventListener('keydown', onKey, true);
  };
  $('#keyGet', el).onclick = () => api.openConsole();
  $('#keySave', el).onclick = async () => {
    const v = $('#keyIn', el).value.trim(); if (!v) return; const r = await api.setKey(v), m = $('#keyMsg', el);
    if (r === 'ok' || r === true) { m.className = 'msg ok'; m.textContent = 'Klucz zapisany.'; $('#keyIn', el).value = ''; const p = $('#keyPill', el); p.className = 'pill ok'; p.textContent = 'Zapisany'; }
    else { m.className = 'msg'; m.textContent = r === 'bad' ? 'To nie wygląda na klucz API. Zaczyna się od sk-ant- i nie ma spacji ani polskich liter.' : 'Szyfrowanie systemowe jest niedostępne.'; }
  };
};

/* ---------- start ---------- */
$$('#nav button').forEach((b) => { b.onclick = () => go(b.dataset.p); });
const api = new Proxy({}, { get: (_, k) => (window.api ? window.api[k] : undefined) });
function boot() {
  if (demo) document.body.classList.add('fallback');
  const first = (location.search.match(/page=(\w+)/) || [])[1] || 'start';
  go(first).then(async () => {
    api.settingsGet().then((s) => { S = s; setHk(s.hotkeyLabel); $('#ver').textContent = 'wersja ' + s.version; });
    api.studyList().then((L) => setBadge(L.decks.filter((d) => d.kind === 'cards').reduce((n, d) => n + d.due, 0)));
    if (demo) { const q = location.search; const m = q.match(/open=(\w+)/); if (m) { await sleep(900); pendingDeck = null; if (m[1] === 'deck') { await openDeck('d1'); } else if (m[1] === 'cards' || m[1] === 'quiz') { await openDeck(m[1] === 'cards' ? 'd1' : 'd2'); await sleep(900); startSession(m[1], curDeck.items); } } }
  });
  if (window.api && window.api.onHome) window.api.onHome((p) => { if (ORDER.includes(p)) { busy = false; go(p); } });
}
if (demo) {
  const stu = { decks: [
    { id: 'd1', name: 'Układ Słoneczny', kind: 'cards', last: Date.now(), history: [{ right: 3, total: 8 }, { right: 5, total: 8 }, { right: 5, total: 8 }, { right: 7, total: 8 }, { right: 6, total: 8 }, { right: 8, total: 8 }], items: [
      { id: '1', q: 'Która planeta jest największa?', a: 'Jowisz', box: 4, due: 0, right: 5, wrong: 1 }, { id: '2', q: 'Co to jest jednostka astronomiczna?', a: 'Średnia odległość Ziemi od Słońca, ok. 150 mln km', box: 1, due: 0, right: 2, wrong: 3 },
      { id: '3', q: 'Która planeta ma pierścienie widoczne z Ziemi?', a: 'Saturn', box: 5, due: Date.now() + 9e9, right: 6, wrong: 0 }, { id: '4', q: 'Dlaczego Mars jest czerwony?', a: 'Pokrywa go pył bogaty w tlenki żelaza', box: 0, due: 0, right: 0, wrong: 2 }] },
    { id: 'd2', name: 'Quiz: Fotosynteza', kind: 'quiz', last: Date.now() - 1e8, history: [{ right: 2, total: 3 }, { right: 3, total: 3 }], items: [
      { id: 'q1', q: 'Gdzie zachodzi fotosynteza?', opts: ['W mitochondriach', 'W chloroplastach', 'W jądrze komórkowym', 'W rybosomach'], correct: 1, why: 'Chloroplasty zawierają chlorofil, który pochłania światło.', right: 2, wrong: 1 },
      { id: 'q2', q: 'Który gaz rośliny pobierają podczas fotosyntezy?', opts: ['Tlen', 'Azot', 'Dwutlenek węgla', 'Wodór'], correct: 2, why: 'CO₂ jest źródłem węgla do budowy cukrów.', right: 3, wrong: 0 }] },
    { id: 'd3', name: 'Angielski: czasowniki frazowe', kind: 'cards', last: Date.now() - 2e8, history: [], items: [{ id: 'a', q: 'give up', a: 'poddać się', box: 0, due: 0, right: 0, wrong: 0 }, { id: 'b', q: 'look after', a: 'opiekować się', box: 0, due: 0, right: 0, wrong: 0 }] }] };
  const infoOf = (d) => { const c = d.kind === 'cards', seen = d.items.reduce((x, i) => x + i.right + i.wrong, 0), r = d.items.reduce((x, i) => x + i.right, 0); return { id: d.id, name: d.name, kind: d.kind, count: d.items.length, last: d.last, sessions: d.history.length, mastered: c ? d.items.filter((i) => i.box >= 4).length : d.items.filter((i) => i.right > i.wrong).length, due: c ? d.items.filter((i) => i.due <= Date.now()).length : d.items.length, accuracy: seen ? Math.round(r * 100 / seen) : null }; };
  const cfg = { hotkey: 'Command+Alt+M', hotkeyLabel: '⌘⌥M', presets: [{ label: '⌘⌥M', acc: 'Command+Alt+M' }, { label: '⌘⌥W', acc: 'Command+Alt+W' }, { label: '⌥⇧Spacja', acc: 'Alt+Shift+Space' }, { label: 'F7', acc: 'F7' }], model: '', login: true, showHome: true, tray: true, autoSend: false, services: { menu: true, lang: true, chat: true, mail: false }, hasKey: true, version: '1.1.0' };
  const tones = [{ name: 'Anna Kowalska', tone: 'Na „ty”, luźno' }, { name: 'Dyrektor Nowak', tone: 'Na „pan”, formalnie' }]; let actions = [{ id: 'x', name: 'Zgłoszenie do Jiry', prompt: 'Zamień tekst w zgłoszenie do Jiry z tytułem i krokami.' }];
  window.api = { studyList: async () => ({ decks: stu.decks.map(infoOf), today: { right: 14, total: 18 }, streak: 4 }), studyGet: async (id) => { const d = stu.decks.find((x) => x.id === id); return d ? { ...d, info: infoOf(d) } : null; }, studyReview: async () => true, studySession: async (id, r, t) => { const d = stu.decks.find((x) => x.id === id); if (d) d.history.push({ right: r, total: t }); return true; }, studyDelete: async () => true,
    studyOverview: async () => ({ days: Array.from({ length: 14 }, (_, i) => { const d = new Date(Date.now() - (13 - i) * 864e5), t = [0, 6, 12, 9, 15, 4, 0, 18, 22, 10, 14, 20, 17, 18][i]; return { d: d.toISOString().slice(0, 10), total: t, right: Math.round(t * (0.55 + i * 0.03)) }; }), answers: 187, accuracy: 78, items: 12, mastered: 5, streak: 4, decks: stu.decks.map((d) => ({ name: d.name, pct: Math.round(infoOf(d).mastered * 100 / d.items.length) })), hardest: [{ q: 'Co to jest jednostka astronomiczna?', wrong: 3, deck: 'Układ Słoneczny' }, { q: 'Co powstaje oprócz glukozy?', wrong: 2, deck: 'Quiz: Fotosynteza' }] }),
    homeData: async () => ({ tones, actions }), saveTone: async (n, t) => { const i = tones.findIndex((x) => x.name.toLowerCase() === n.toLowerCase()); if (i >= 0) tones.splice(i, 1); if (t) tones.push({ name: n, tone: t }); return tones; }, saveActions: async (l) => { actions = l.map((a, i) => ({ ...a, id: a.id || 'n' + i })); return actions; },
    settingsGet: async () => cfg, settingsSet: async (k, v) => { if (k.startsWith('svc.')) cfg.services[k.slice(4)] = v; else cfg[k] = v; return true; }, setHotkey: async (acc) => ({ ok: !acc.includes('F7'), label: acc.split('+').map((k) => ({ Command: '⌘', Control: '⌃', Alt: '⌥', Shift: '⇧', Space: 'Spacja' }[k] || k)).join('') }), setKey: async () => 'ok', openConsole() {} };
}
boot();
