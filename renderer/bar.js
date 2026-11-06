'use strict';
/* Pasek poleceń: szybkie polecenia lokalne od razu, a polecenia po ludzku trafiają do AI, które wybiera czynność w aplikacji */
(() => {
  const demo = location.search.includes('demo');
  const $ = (s) => document.querySelector(s);
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ico = (n) => '<svg class="i"><use href="#s-' + n + '"/></svg>';
  const B = demo ? null : window.api;
  let D = { pages: [], quick: [], decks: [], kind: '', preview: '', hasKey: true }, items = [], sel = 0, busy = false, view = 'list';
  const q = $('#q'), out = $('#out');

  function build(text) {
    const t = text.trim().toLowerCase(), list = [];
    const has = (s) => !t || t.split(/\s+/).every((w) => s.toLowerCase().includes(w));
    if (!t) { D.quick.forEach((x) => list.push({ sec: 'Szybkie', icon: x.id === 'q-quiz' ? 'quiz' : x.id.startsWith('q-cards') ? 'cards' : 'tr', label: x.label, sub: D.kind === 'selection' ? 'z zaznaczonego tekstu' : 'ze schowka', tool: x.tool })); }
    else D.quick.filter((x) => has(x.label)).forEach((x) => list.push({ sec: 'Szybkie', icon: x.id === 'q-quiz' ? 'quiz' : x.id.startsWith('q-cards') ? 'cards' : 'tr', label: x.label, sub: D.kind === 'selection' ? 'z zaznaczonego tekstu' : 'ze schowka', tool: x.tool }));
    D.pages.filter((p) => has(p.label + ' ' + p.kw)).forEach((p) => list.push({ sec: 'Strony', icon: 'page', label: p.label, sub: 'Otwórz w Write Tools', tool: { tool: 'open_page', page: p.id } }));
    D.decks.filter((d) => has(d.name)).slice(0, t ? 5 : 3).forEach((d) => list.push({ sec: 'Zestawy', icon: d.kind === 'quiz' ? 'quiz' : 'cards', label: d.name, sub: d.kind === 'quiz' ? 'quiz' : (d.due ? d.due + ' do powtórki' : 'fiszki'), tool: { tool: 'study_deck', name: d.name } }));
    if (t) list.push({ sec: 'AI', icon: 'ai', ai: true, label: 'Zapytaj AI: „' + text.trim() + '”', sub: 'AI wybierze, co zrobić w aplikacji', cls: 'ai' });
    return list;
  }
  function paintList() {
    view = 'list'; if (!items.length) { out.innerHTML = ''; return; }
    let html = '', last = '', i = 0;
    items.forEach((it, idx) => { if (it.sec !== last) { html += '<div class="sec">' + it.sec + '</div>'; last = it.sec; } html += '<div class="item ' + (it.cls || '') + (idx === sel ? ' sel' : '') + '" data-i="' + idx + '" style="--i:' + (i++) + '"><span class="ic">' + ico(it.icon) + '</span><div class="tx">' + esc(it.label) + '<small>' + esc(it.sub || '') + '</small></div><span class="rt">' + (idx === sel ? '↵' : '') + '</span></div>'; });
    out.innerHTML = html; const s = out.querySelector('.sel'); if (s) { const t = s.offsetTop, h = s.offsetHeight; if (t < out.scrollTop + 4) out.scrollTop = Math.max(0, t - 34); else if (t + h > out.scrollTop + out.clientHeight) out.scrollTop = t + h - out.clientHeight + 8; }
    out.querySelectorAll('.item').forEach((el) => { el.onmouseenter = () => { sel = +el.dataset.i; out.querySelectorAll('.item').forEach((x) => { x.classList.toggle('sel', x === el); const r = x.querySelector('.rt'); r.textContent = x === el ? '↵' : ''; }); }; el.onclick = () => run(items[+el.dataset.i]); });
    fit();
  }
  function refresh() { items = build(q.value); sel = items.findIndex((x) => !x.ai); if (sel < 0) sel = Math.max(0, items.length - 1); paintList(); }
  const fit = () => { if (B) B.barResize($('#inner').offsetHeight + 12 + 12 + 12 + 12 + 6); };
  new ResizeObserver(fit).observe($('#inner'));

  function work(text) { view = 'busy'; document.body.classList.add('busy'); q.disabled = true; out.innerHTML = '<div class="work"><span class="dots"><i></i><i></i><i></i></span><span id="wt">' + esc(text) + '</span></div>'; }
  function showResult(r) {
    document.body.classList.remove('busy'); q.disabled = false; view = 'result';
    if (r.kind === 'info') { out.innerHTML = '<div class="res"><div class="h"><span class="ic">' + ico('check') + '</span>' + esc(r.text) + '</div></div>'; if (r.close) setTimeout(() => B && B.barClose(), 700); fit(); return; }
    if (r.kind === 'deck') { out.innerHTML = '<div class="res"><div class="h"><span class="ic">' + ico('check') + '</span>Gotowe: ' + r.count + (r.deckKind === 'quiz' ? ' pytań' : ' fiszek') + '</div><div class="body">„' + esc(r.name) + '” zapisano w Fiszki i quizy.</div><div class="acts"><button class="btn primary" id="go">' + (r.deckKind === 'quiz' ? 'Rozwiąż' : 'Ucz się') + '</button><button class="btn" id="cl">Zamknij</button></div></div>'; $('#go').onclick = () => B && B.barExec({ tool: 'study_deck', name: r.name }).then(() => B.barClose()); $('#cl').onclick = () => B && B.barClose(); fit(); return; }
    if (r.kind === 'text') { out.innerHTML = '<div class="res"><div class="h"><span class="ic">' + ico('ai') + '</span>' + esc(r.title || 'Wynik') + '</div><div class="body" id="rb"></div><div class="acts"><button class="btn primary" id="cp">' + ico('copy') + ' Kopiuj</button><button class="btn" id="bk">Wróć</button></div></div>'; $('#rb').textContent = r.text; $('#cp').onclick = () => { B && B.barCopy(r.text); $('#cp').textContent = 'Skopiowano ✓'; }; $('#bk').onclick = () => { q.value = ''; refresh(); q.focus(); }; fit(); return; }
    out.innerHTML = '<div class="res err"><div class="h"><span class="ic">' + ico('warn') + '</span>Nie udało się</div><div class="body">' + esc(r.text) + '</div><div class="acts"><button class="btn" id="bk">Wróć</button></div></div>'; $('#bk').onclick = () => { refresh(); q.focus(); }; fit();
  }
  async function run(it) {
    if (!it || busy) return; busy = true;
    try {
      if (it.ai) { work('Rozumiem polecenie…'); showResult(B ? await B.barAsk(q.value) : { kind: 'text', title: 'Odpowiedź', text: 'To jest przykładowa odpowiedź na polecenie: ' + q.value }); }
      else if (it.tool.tool === 'open_page' || it.tool.tool === 'study_deck') { showResult(B ? await B.barExec(it.tool) : { kind: 'info', text: 'Otwieram: ' + it.label, close: true }); }
      else { work(it.tool.tool === 'translate' ? 'Tłumaczę…' : 'Tworzę…'); showResult(B ? await B.barExec(it.tool) : { kind: 'deck', name: 'Układ Słoneczny', count: 8, deckKind: 'cards' }); }
    } finally { busy = false; }
  }

  q.addEventListener('input', () => { if (view !== 'list') view = 'list'; refresh(); });
  q.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); if (view === 'result' || view === 'busy') { document.body.classList.remove('busy'); q.disabled = false; q.value = ''; refresh(); } else if (q.value) { q.value = ''; refresh(); } else if (B) B.barClose(); return; }
    if (view !== 'list') return;
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(items.length - 1, sel + 1); paintList(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); paintList(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (e.metaKey || !items[sel]) { run(items.find((x) => x.ai) || items[sel]); } else run(items[sel]); }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.activeElement !== q && B) B.barClose(); });

  function open(d) {
    D = d; applyFrost(d.bg); document.body.classList.remove('closing', 'busy'); replay($('#panel'), 'in'); busy = false; q.disabled = false; q.value = '';
    const c = $('#chip'); c.hidden = !d.kind; if (d.kind) c.textContent = (d.kind === 'selection' ? 'Zaznaczone: “' : 'Schowek: “') + d.preview.slice(0, 26) + (d.preview.length > 26 ? '…' : '') + '”';
    refresh(); if (!d.hasKey) out.insertAdjacentHTML('beforeend', '<div class="nokey">Brak klucza API: dodaj go w Ustawieniach, żeby AI mogło pomagać.</div>');
    setTimeout(() => { q.focus(); fit(); }, 30);
  }
  if (B) {
    B.onBarOpen(open); B.onBarClosing(() => document.body.classList.add('closing'));
    B.onBarEv((ev) => { const w = $('#wt'); if (w && ev.text) w.textContent = ev.text; });
  } else {
    open({ kind: 'selection', preview: 'Hej, dzięki za szybką odpowiedź. Pogadajmy w czwartek', bg: null, hasKey: true,
      pages: [{ id: 'start', label: 'Start', kw: 'start' }, { id: 'chat', label: 'Czat', kw: 'czat' }, { id: 'study', label: 'Fiszki i quizy', kw: 'fiszki quizy nauka' }, { id: 'stats', label: 'Statystyki', kw: 'statystyki' }, { id: 'settings', label: 'Ustawienia', kw: 'ustawienia' }],
      quick: [{ id: 'q-cards', label: 'Fiszki z zaznaczonego tekstu', tool: { tool: 'make_cards' } }, { id: 'q-quiz', label: 'Quiz z zaznaczonego tekstu', tool: { tool: 'make_quiz' } }, { id: 'q-en', label: 'Przetłumacz na angielski', tool: { tool: 'translate', lang: 'English' } }],
      decks: [{ id: 'd1', name: 'Układ Słoneczny', kind: 'cards', due: 4 }, { id: 'd2', name: 'Quiz: Fotosynteza', kind: 'quiz', due: 2 }] });
    const m = location.search.match(/q=([^&]+)/); if (m) { q.value = decodeURIComponent(m[1]); refresh(); }
  }
})();
