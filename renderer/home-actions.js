'use strict';
/* Edytor akcji: własne akcje (nazwa, ikona, polecenie, jakość modelu), podgląd wbudowanych, test na przykładowym tekście, import i eksport */
(() => {
  const ICONS = {
    mine: 'M12 3l2.4 5 5.6.8-4 4 1 5.7-5-2.7-5 2.7 1-5.7-4-4 5.6-.8z', slack: 'M4 5h16v11H9l-5 4zM8 9h8M8 12h5', official: 'M6 3h9l4 4v14H6zM14 3v5h5M9 12h6M9 16h6', headings: 'M6 4v16M18 4v16M6 12h12',
    tasks: 'M9 6h11M9 12h11M9 18h11M4 6l1.2 1.2L7 5M4 12l1.2 1.2L7 11M4 18l1.2 1.2L7 17', commit: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 12h6M15 12h6', flashcards: 'M4 8h13v11H4zM7 5h13v11',
    quiz: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17h.01', hardwords: 'M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h10M9 8h5',
    web: 'M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15zM16 16l5 5', reply: 'M9 7L4 12l5 5M4 12h10a6 6 0 0 1 6 6', calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4', mail: 'M3 6h18v12H3zM3 7l9 7 9-7',
    chat: 'M4 5h16v11H9l-5 4z', translate: 'M4 5h8M8 3v2M6 5c0 4 2 7 5 9M12 5c-.5 3-3 7-7 9M13 20l4-9 4 9M14.5 17h5', bizen: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18',
    refuse: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM6 6l12 12', check: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 12.5l2.7 2.7L16 9.5', explain: 'M8 8l-4 4 4 4M16 8l4 4-4 4M14 5l-4 14',
  };
  const svgI = (k) => '<svg viewBox="0 0 24 24"><path d="' + (ICONS[k] || ICONS.mine) + '"/></svg>';
  let el = null, custom = [], builtin = [], sel = { type: 'new' }, drafts = {}, testing = false;

  const q = (s) => el.querySelector(s);
  function listHtml() {
    let i = 0;
    return '<div class="lab2">Własne akcje (' + custom.length + ')</div>' + (custom.length ? custom.map((a) => '<button class="aitem' + (sel.type === 'c' && sel.id === a.id ? ' on' : '') + '" data-t="c" data-id="' + esc(a.id) + '" style="--i:' + (i++) + '">' + svgI(a.icon) + '<span class="n">' + esc(a.name) + '</span></button>').join('') : '<p class="note" style="padding:4px 10px 8px">Jeszcze żadnej.</p>') +
      '<div class="lab2">Wbudowane (' + builtin.length + ')</div>' + builtin.map((b) => '<button class="aitem' + (sel.type === 'b' && sel.id === b.id ? ' on' : '') + '" data-t="b" data-id="' + esc(b.id) + '" style="--i:' + (i++) + '">' + svgI(ICONS[b.id] ? b.id : 'mine') + '<span class="n">' + esc(b.label) + '</span></button>').join('');
  }
  function paneHtml() {
    const hdr = '<div class="arow"><h3 class="grow">';
    if (sel.type === 'b') {
      const b = builtin.find((x) => x.id === sel.id) || builtin[0];
      return '<div class="apane glass"><div class="arow"><h3 class="grow">' + esc(b.label) + ' <span class="hint2">wbudowana, tylko do podglądu</span></h3></div><label>Polecenie dla AI (po angielsku, tak jak wysyła je aplikacja)<textarea rows="7" class="ro" readonly>' + esc(b.prompt) + '</textarea></label>' +
        '<div class="arow"><button class="btn primary" id="dup">' + ic('copy') + 'Duplikuj jako własną</button><span class="hint2">Kopia trafi do Twoich akcji i będzie w menu przy zaznaczonym tekście.</span></div></div>';
    }
    const d = sel.type === 'c' ? (drafts[sel.id] || custom.find((a) => a.id === sel.id)) : (drafts.__new || { name: '', prompt: '', icon: 'mine', quality: false });
    return '<div class="apane glass"><div class="arow"><h3 class="grow">' + (sel.type === 'c' ? 'Edytuj akcję' : 'Nowa akcja') + '</h3>' +
      (sel.type === 'c' ? '<button class="icon" id="mvu" title="Wyżej">' + ic('up') + '</button><button class="icon" id="mvd" title="Niżej">' + ic('down') + '</button><button class="icon danger" id="del" title="Usuń">' + ic('trash') + '</button>' : '') + '</div>' +
      '<label>Nazwa<input type="text" id="aname" maxlength="40" placeholder="np. Zgłoszenie do Jiry" value="' + esc(d.name) + '" spellcheck="false"></label>' +
      '<label>Ikona<div class="iconpick" id="ipick">' + Object.keys(ICONS).filter((k) => !['explain'].includes(k)).map((k) => '<button data-i="' + k + '" class="' + ((d.icon || 'mine') === k ? 'on' : '') + '" title="' + k + '">' + svgI(k) + '</button>').join('') + '</div></label>' +
      '<label>Polecenie dla AI<textarea rows="5" id="aprompt" maxlength="2000" placeholder="Co ma zrobić AI z zaznaczonym tekstem? Np. „Zamień tekst w zgłoszenie do Jiry: tytuł, opis, kroki, kryteria akceptacji.”" spellcheck="false">' + esc(d.prompt) + '</textarea></label>' +
      '<div class="arow"><button class="sw" role="switch" aria-checked="' + !!d.quality + '" id="aq"><i></i></button><span>Dokładniejszy model <span class="hint2">(lepszy przy długich tekstach, ale droższy)</span></span></div>' +
      '<div class="arow"><button class="btn primary" id="save">' + (sel.type === 'c' ? 'Zapisz zmiany' : 'Dodaj akcję') + '</button><span class="msg grow" id="amsg"></span></div>' +
      '<label>Test na przykładowym tekście<textarea rows="3" id="tsample" placeholder="Wklej tu kawałek tekstu i kliknij Uruchom test" spellcheck="false">' + esc(drafts.__sample || '') + '</textarea></label>' +
      '<div class="arow"><button class="btn" id="run">' + ic('play') + (testing ? 'Zatrzymaj' : 'Uruchom test') + '</button></div><div class="testout ph" id="tout">Tu pojawi się wynik testu.</div></div>';
  }
  function readForm() { return { name: q('#aname').value.trim(), prompt: q('#aprompt').value.trim(), icon: (q('#ipick .on') || {}).dataset ? q('#ipick .on').dataset.i : 'mine', quality: q('#aq').getAttribute('aria-checked') === 'true' }; }
  function keepDraft() { if (!q('#aname')) return; const d = readForm(); if (sel.type === 'c') drafts[sel.id] = { ...custom.find((a) => a.id === sel.id), ...d }; else drafts.__new = d; drafts.__sample = (q('#tsample') || {}).value || ''; }

  function paint(animate) {
    el.innerHTML = '<header class="ph rise"><h1>Edytor akcji</h1><p>Stwórz własne polecenia dla AI, przetestuj je od razu i zobacz, jak działają wbudowane akcje.</p></header>' +
      '<div class="arow rise" style="margin-bottom:14px"><button class="btn primary" id="newa">' + ic('plus') + 'Nowa akcja</button><button class="btn" id="imp">' + ic('download') + 'Importuj</button><button class="btn" id="exp">' + ic('up') + 'Eksportuj</button><span class="msg grow" id="gmsg"></span></div>' +
      '<div class="aed"><div class="alist glass rise" id="alist">' + listHtml() + '</div><div id="pane" class="rise">' + paneHtml() + '</div></div>';
    rise(el); bindAll();
  }
  function repaintPane() { $('#pane', el).innerHTML = paneHtml(); $('#alist', el).innerHTML = listHtml(); bindAll(); }
  function say(id, t, ok) { const m = q(id); if (m) { m.className = 'msg grow' + (ok ? ' ok' : ''); m.textContent = t; } }

  async function save(all) { custom = await bridge.saveActions(all); }
  function bindAll() {
    $$('.aitem', el).forEach((b) => { b.onclick = () => { keepDraft(); sel = { type: b.dataset.t, id: b.dataset.id }; repaintPane(); }; });
    q('#newa').onclick = () => { keepDraft(); sel = { type: 'new' }; delete drafts.__new; repaintPane(); };
    q('#exp').onclick = async () => { const r = await bridge.actionsExport(); say('#gmsg', r.ok ? 'Wyeksportowano akcje: ' + r.count : r.canceled ? '' : r.msg, r.ok); };
    q('#imp').onclick = async () => { const r = await bridge.actionsImport(); if (r.ok) { custom = r.actions; say('#gmsg', 'Zaimportowano akcje: ' + r.added, true); repaintPane(); } else if (!r.canceled) say('#gmsg', r.msg, false); };
    if (sel.type === 'b') { q('#dup').onclick = async () => { const b = builtin.find((x) => x.id === sel.id); await save([...custom, { id: '', name: b.label + ' (kopia)', prompt: b.prompt, icon: ICONS[b.id] ? b.id : 'mine', quality: false }]); const n = custom[custom.length - 1]; sel = { type: 'c', id: n.id }; repaintPane(); say('#gmsg', 'Utworzono własną akcję z kopii.', true); }; return; }
    $$('#ipick button', el).forEach((b) => { b.onclick = () => { $$('#ipick button', el).forEach((x) => x.classList.toggle('on', x === b)); }; });
    const sw = q('#aq'); sw.onclick = () => sw.setAttribute('aria-checked', sw.getAttribute('aria-checked') !== 'true');
    q('#save').onclick = async () => {
      const d = readForm(); if (!d.name) return say('#amsg', 'Wpisz nazwę akcji.', false); if (!d.prompt) return say('#amsg', 'Napisz, co AI ma zrobić z tekstem.', false);
      if (sel.type === 'c') { await save(custom.map((a) => (a.id === sel.id ? { ...a, ...d } : a))); delete drafts[sel.id]; }
      else { await save([...custom, { id: '', ...d }]); const n = custom[custom.length - 1]; sel = { type: 'c', id: n.id }; delete drafts.__new; }
      repaintPane(); say('#amsg', 'Zapisano ✓', true);
    };
    if (sel.type === 'c') {
      q('#del').onclick = async () => { const b = q('#del'); if (!b.dataset.sure) { b.dataset.sure = '1'; b.style.background = 'rgba(255,69,58,.3)'; setTimeout(() => { delete b.dataset.sure; b.style.background = ''; }, 2500); return; } await save(custom.filter((a) => a.id !== sel.id)); sel = { type: 'new' }; repaintPane(); };
      const move = async (dir) => { const i = custom.findIndex((a) => a.id === sel.id), j = i + dir; if (j < 0 || j >= custom.length) return; const c = custom.slice(); [c[i], c[j]] = [c[j], c[i]]; keepDraft(); await save(c); repaintPane(); };
      q('#mvu').onclick = () => move(-1); q('#mvd').onclick = () => move(1);
    }
    q('#run').onclick = async () => {
      if (testing) { bridge.actionsStop(); return; }
      const d = readForm(), text = q('#tsample').value.trim(), out = q('#tout');
      if (!d.prompt || !text) { out.className = 'testout err'; out.textContent = 'Wpisz polecenie i przykładowy tekst.'; return; }
      out.className = 'testout caret'; out.textContent = ''; testing = true; q('#run').innerHTML = ic('stop') + 'Zatrzymaj';
      const r = await bridge.actionsTest({ prompt: d.prompt, text, quality: d.quality });
      if (!r.ok) { testing = false; q('#run').innerHTML = ic('play') + 'Uruchom test'; out.className = 'testout err'; out.textContent = r.msg; }
    };
  }
  if (window.api && window.api.onActions) window.api.onActions((ev) => {
    if (!el || !q('#tout')) { testing = false; return; }
    const out = q('#tout');
    if (ev.type === 'chunk') { out.textContent += ev.text; out.scrollTop = out.scrollHeight; return; }
    testing = false; q('#run').innerHTML = ic('play') + 'Uruchom test'; out.classList.remove('caret'); if (ev.type === 'error') { out.className = 'testout err'; out.textContent = ev.msg; }
  });

  RENDER.actions = async (page) => {
    el = page; testing = false; const D = await bridge.homeData(); custom = D.actions || []; builtin = await bridge.actionsBuiltin();
    if (sel.type === 'c' && !custom.some((a) => a.id === sel.id)) sel = { type: 'new' }; paint();
  };
})();
