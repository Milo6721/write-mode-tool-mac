'use strict';
/* Czat w oknie głównym: historia rozmów, przeciąganie plików (zdjęcia, PDF, tekst), odpowiedź na żywo */
(() => {
  const IMG = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp']);
  const TEXT = new Set(['txt', 'md', 'markdown', 'csv', 'tsv', 'json', 'js', 'ts', 'jsx', 'tsx', 'py', 'rb', 'go', 'rs', 'java', 'kt', 'swift', 'c', 'h', 'cpp', 'cs', 'php', 'html', 'css', 'xml', 'yml', 'yaml', 'toml', 'ini', 'log', 'sh', 'sql', 'tex']);
  const kindOf = (f) => { const e = (f.name.split('.').pop() || '').toLowerCase(); return IMG.has(e) ? 'image' : e === 'pdf' ? 'pdf' : TEXT.has(e) || (f.type || '').startsWith('text/') ? 'text' : ''; };
  const size = (n) => (n < 1024 ? n + ' B' : n < 1048576 ? Math.round(n / 1024) + ' KB' : (n / 1048576).toFixed(1) + ' MB');
  const when = (t) => { const d = new Date(t), now = new Date(); return d.toDateString() === now.toDateString() ? d.toLocaleTimeString('pl', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('pl', { day: 'numeric', month: 'short' }); };

  /* prosty, bezpieczny Markdown: najpierw cały tekst jest zamieniany na bezpieczny, dopiero potem dodajemy znaczniki */
  function md(src) {
    const blocks = [];
    let s = esc(src).replace(/```[\w+-]*\n?([\s\S]*?)```/g, (m, code) => { blocks.push('<pre><button class="cpy" data-cpy>Kopiuj</button><code>' + code.replace(/\n$/, '') + '</code></pre>'); return '\u0000' + (blocks.length - 1) + '\u0000'; });
    s = s.replace(/`([^`\n]+)`/g, '<code class="ic">$1</code>').replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>').replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?]|$)/g, '$1<i>$2</i>');
    const out = []; let list = null;
    for (const ln of s.split('\n')) {
      const m = ln.match(/^\s*([-*•]|\d+\.)\s+(.*)$/);
      if (m) { const tag = /\d/.test(m[1]) ? 'ol' : 'ul'; if (list !== tag) { if (list) out.push('</' + list + '>'); out.push('<' + tag + '>'); list = tag; } out.push('<li>' + m[2] + '</li>'); continue; }
      if (list) { out.push('</' + list + '>'); list = null; }
      const h = ln.match(/^#{1,3}\s+(.*)$/);
      out.push(h ? '<h4>' + h[1] + '</h4>' : ln.trim() === '' ? '<div class="sp"></div>' : '<div>' + ln + '</div>');
    }
    if (list) out.push('</' + list + '>');
    return out.join('').replace(/\u0000(\d+)\u0000/g, (m, i) => blocks[+i]);
  }

  let el = null, chatId = null, pending = [], live = null, list = [], prefill = null;
  const q = (s) => el && el.querySelector(s);

  function fchip(f, onRemove) {
    const c = document.createElement('span'); c.className = 'fchip';
    if (f.url) { const i = document.createElement('img'); i.src = f.url; c.append(i); }
    else { const i = document.createElement('span'); i.className = 'fi ' + f.kind; i.textContent = f.kind === 'pdf' ? 'PDF' : (f.name.split('.').pop() || 'TXT').slice(0, 4).toUpperCase(); c.append(i); }
    const t = document.createElement('span'); t.textContent = f.name.length > 22 ? f.name.slice(0, 20) + '…' : f.name; const sm = document.createElement('small'); sm.textContent = size(f.size); c.append(t, sm);
    if (onRemove) { const b = document.createElement('button'); b.innerHTML = ic('close').replace('class="i"', 'class="i" style="width:12px;height:12px"'); b.onclick = onRemove; c.append(b); }
    return c;
  }
  function toast(t) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; q('.chatmain').append(d); setTimeout(() => d.remove(), 3500); }
  const scroll = () => { const m = q('.msgs'); if (m) m.scrollTop = m.scrollHeight; };

  function bubble(role, text, files) {
    const d = document.createElement('div'); d.className = 'bub ' + role;
    if (files && files.length) { const w = document.createElement('div'); w.className = 'fchips'; files.forEach((f) => w.append(fchip(f))); d.append(w); }
    const b = document.createElement('div'); b.className = 'body'; if (role === 'user') b.textContent = text; else b.innerHTML = md(text); d.append(b); return d;
  }
  function empty() {
    const m = q('.msgs'); m.textContent = '';
    const e = document.createElement('div'); e.className = 'cempty';
    e.innerHTML = '<div class="big">' + ic('chat') + '</div><h2>W czym mogę pomóc?</h2><p>Pytaj o cokolwiek. Możesz przeciągnąć tu zdjęcia, PDF-y i pliki tekstowe, a AI je przeczyta.</p><div class="chips"></div>';
    ['Wytłumacz mi coś prostym językiem', 'Pomóż napisać uprzejmego maila', 'Zrób plan nauki na tydzień', 'Streść ten PDF (przeciągnij go tutaj)'].forEach((t) => { const c = document.createElement('button'); c.className = 'chip'; c.textContent = t; c.onclick = () => { const i = q('#cin'); i.value = t.replace(/ \(.*\)$/, ''); i.focus(); autosize(); }; e.querySelector('.chips').append(c); });
    m.append(e);
  }
  function autosize() { const t = q('#cin'); t.style.height = 'auto'; t.style.height = Math.min(160, t.scrollHeight) + 'px'; }
  function paintAttached() { const w = q('#attached'); w.textContent = ''; pending.forEach((f, i) => w.append(fchip(f, () => { pending.splice(i, 1); paintAttached(); }))); w.hidden = !pending.length; }
  function setStreaming(on) { const b = q('#sendb'); b.classList.toggle('stop', on); b.innerHTML = ic(on ? 'stop' : 'up'); b.disabled = false; }

  async function loadList() {
    list = await bridge.chatList(); const box = q('.clist .items'); if (!box) return; box.textContent = '';
    list.forEach((c, i) => {
      const b = document.createElement('button'); b.className = 'citem' + (c.id === chatId ? ' on' : ''); b.style.setProperty('--i', i);
      b.innerHTML = '<span class="t"></span><button class="x" title="Usuń rozmowę">' + ic('trash') + '</button>';
      const t = b.querySelector('.t'); t.textContent = c.title; const sm = document.createElement('small'); sm.textContent = when(c.updated); t.append(sm);
      b.onclick = (e) => { if (e.target.closest('.x')) return; openChat(c.id); };
      b.querySelector('.x').onclick = async () => { await bridge.chatDelete(c.id); if (chatId === c.id) newChat(); loadList(); };
      box.append(b);
    });
  }
  async function openChat(id) {
    const c = await bridge.chatGet(id); if (!c) return newChat();
    chatId = id; const m = q('.msgs'); m.textContent = '';
    c.messages.forEach((x) => m.append(bubble(x.role === 'user' ? 'user' : 'ai', x.text, x.files)));
    if (live && live.chatId === id) addLive();
    scroll(); loadList();
  }
  function newChat() { chatId = null; pending = []; paintAttached(); if (!live) empty(); else empty(); loadList(); const i = q('#cin'); if (i) i.focus(); }
  function addLive() {
    const m = q('.msgs'); let d = m.querySelector('.bub.live');
    if (!d) { d = bubble('ai', '', null); d.classList.add('live'); m.append(d); }
    const b = d.querySelector('.body');
    if (!live.text) b.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>'; else { b.innerHTML = md(live.text); b.classList.add('caret'); }
    scroll();
  }

  async function send(text) {
    if (live) return;
    text = (text != null ? text : q('#cin').value).trim(); if (!text && !pending.length) return;
    const files = pending.slice(); pending = []; paintAttached(); q('#cin').value = ''; autosize();
    const m = q('.msgs'); if (m.querySelector('.cempty')) m.textContent = '';
    m.append(bubble('user', text || 'Opisz załączony plik.', files)); live = { chatId, text: '' }; addLive(); setStreaming(true);
    let payload;
    try { payload = await Promise.all(files.map(async (f) => ({ name: f.name, type: f.type, data: await f.file.arrayBuffer() }))); } catch (e) { payload = []; }
    const r = await bridge.chatSend({ chatId, text, files: payload });
    if (!r.ok) { live = null; const l = m.querySelector('.bub.live'); if (l) l.remove(); setStreaming(false); const er = bubble('err', r.msg || 'Nie udało się wysłać.', null); m.append(er); scroll(); return; }
    chatId = r.chatId; live.chatId = chatId; loadList();
  }

  function onEvent(ev) {
    if (!live || ev.chatId !== live.chatId && !(live.chatId == null && ev.type === 'start')) { if (ev.type === 'title') loadList(); return; }
    if (ev.type === 'start') { live.chatId = ev.chatId; chatId = chatId || ev.chatId; return; }
    if (ev.type === 'chunk') { live.text += ev.text; if (el && !el.hidden && q('.msgs')) addLive(); return; }
    if (ev.type === 'title') { loadList(); return; }
    const had = live.text, id = live.chatId; live = null;
    if (!el || !q('.msgs')) return;
    setStreaming(false); const l = q('.bub.live');
    if (ev.type === 'done') { if (l) { l.classList.remove('live'); l.querySelector('.body').classList.remove('caret'); } loadList(); return; }
    if (l) { if (had && ev.type === 'stopped') { l.classList.remove('live'); l.querySelector('.body').classList.remove('caret'); } else l.remove(); }
    if (ev.type === 'error') { q('.msgs').append(bubble('err', ev.msg || 'Coś poszło nie tak.', null)); scroll(); }
  }
  if (window.api && window.api.onChat) window.api.onChat(onEvent);
  if (window.api && window.api.onChatPrefill) window.api.onChatPrefill((p) => { prefill = p; if (el && !el.hidden && cur === 'chat') applyPrefill(); else if (typeof go === 'function') go('chat'); });
  function applyPrefill() { if (!prefill || !el) return; const p = prefill; prefill = null; newChat(); q('#cin').value = p.text || ''; autosize(); if (p.send) send(); }

  function addFiles(fl) {
    const added = []; for (const f of fl) {
      const kind = kindOf(f);
      if (!kind) { toast('Nieobsługiwany plik: ' + f.name + '. Obsługuję zdjęcia, PDF i pliki tekstowe.'); continue; }
      if (f.size > 20 * 1048576 || (kind === 'image' && f.size > 5 * 1048576)) { toast('Plik „' + f.name + '” jest za duży (zdjęcie do 5 MB, inne do 20 MB).'); continue; }
      if (pending.length + added.length >= 6) { toast('Naraz można dodać do 6 plików.'); break; }
      added.push({ file: f, name: f.name, type: f.type, size: f.size, kind, url: kind === 'image' ? URL.createObjectURL(f) : '' });
    }
    pending.push(...added); paintAttached();
  }

  RENDER.chat = async (page) => {
    el = page; page.classList.add('fill');
    page.innerHTML = '<div class="chatwrap"><aside class="clist"><button class="btn primary" id="newc">' + ic('plus') + 'Nowa rozmowa</button><div class="items"></div></aside>' +
      '<section class="chatmain"><div class="msgs"></div><div class="composer"><div class="fchips" id="attached" hidden></div><div class="cbox"><button class="cbtn" id="attach" title="Dodaj plik">' + ic('clip') + '</button>' +
      '<textarea id="cin" rows="1" placeholder="Napisz wiadomość… (możesz przeciągnąć tu pliki)" spellcheck="false"></textarea><button class="sendb" id="sendb" title="Wyślij (Enter)">' + ic('up') + '</button></div><input type="file" id="fin" multiple hidden></div>' +
      '<div class="dropov">' + ic('download') + '<span>Upuść pliki, żeby je dodać</span><small class="note">Zdjęcia, PDF i pliki tekstowe</small></div></section></div>';
    const main = q('.chatmain'), cin = q('#cin');
    q('#newc').onclick = () => { if (live) return; newChat(); };
    q('#attach').onclick = () => q('#fin').click();
    q('#fin').onchange = (e) => { addFiles([...e.target.files]); e.target.value = ''; };
    q('#sendb').onclick = () => { if (live) bridge.chatStop(); else send(); };
    cin.addEventListener('input', autosize);
    cin.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); if (!live) send(); } });
    cin.addEventListener('paste', (e) => { const fl = [...(e.clipboardData ? e.clipboardData.files : [])]; if (fl.length) { e.preventDefault(); addFiles(fl); } });
    let depth = 0;
    main.addEventListener('dragenter', (e) => { e.preventDefault(); depth++; main.classList.add('drag'); });
    main.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
    main.addEventListener('dragleave', () => { depth = Math.max(0, depth - 1); if (!depth) main.classList.remove('drag'); });
    main.addEventListener('drop', (e) => { e.preventDefault(); depth = 0; main.classList.remove('drag'); addFiles([...e.dataTransfer.files]); });
    main.addEventListener('click', (e) => { const b = e.target.closest('[data-cpy]'); if (b) { bridge.barCopy && 0; navigator.clipboard.writeText(b.parentNode.querySelector('code').textContent).then(() => { b.textContent = 'Skopiowano ✓'; setTimeout(() => { b.textContent = 'Kopiuj'; }, 1400); }); } });
    setStreaming(!!live); paintAttached();
    await loadList();
    if (chatId && list.some((c) => c.id === chatId)) await openChat(chatId); else if (live && live.chatId == null) { empty(); addLive(); } else { chatId = null; empty(); }
    if (prefill) applyPrefill(); else setTimeout(() => cin.focus(), 60);
  };
})();
