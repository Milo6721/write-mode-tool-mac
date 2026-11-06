'use strict';
/* Tłumacz w locie: tekst zaznaczony w dowolnej aplikacji, tłumaczenie na żywo w szklanej bańce obok kursora */
(() => {
  const demo = location.search.includes('demo');
  const $ = (s) => document.querySelector(s);
  const B = demo ? null : window.api;
  const LANGS = [['angielski', 'English'], ['niemiecki', 'German'], ['francuski', 'French'], ['hiszpański', 'Spanish'], ['włoski', 'Italian'], ['polski', 'Polish'], ['ukraiński', 'Ukrainian'], ['rosyjski', 'Russian'],
    ['portugalski', 'Portuguese'], ['holenderski', 'Dutch'], ['czeski', 'Czech'], ['szwedzki', 'Swedish'], ['turecki', 'Turkish'], ['japoński', 'Japanese'], ['chiński', 'Chinese'], ['koreański', 'Korean'], ['arabski', 'Arabic']];
  let text = '', lang = 'English', out = '', busy = false;
  const res = $('#res'), plName = (en) => (LANGS.find((l) => l[1] === en) || [en])[0];

  function setBusy(b) { busy = b; document.body.classList.toggle('busy', b); $('#copy').disabled = b || !out; $('#rep').disabled = b || !out; }
  function go() {
    out = ''; $('#langName').textContent = plName(lang); res.className = 'res'; res.innerHTML = '<span class="dots"><i></i><i></i><i></i></span>'; setBusy(true);
    if (B) B.bubbleTranslate({ text, lang });
    else { const t = 'Hello, thank you for the quick reply. I read the proposal and it looks good. Shall we talk on Thursday?'.split(' '); let i = 0; const iv = setInterval(() => { if (i >= t.length) { clearInterval(iv); ev({ type: 'done' }); return; } ev({ type: 'chunk', text: (i ? ' ' : '') + t[i++] }); }, 90); }
  }
  function ev(e) {
    if (e.type === 'chunk') { out += e.text; res.className = 'res live'; res.textContent = out; res.scrollTop = res.scrollHeight; return; }
    setBusy(false); res.classList.remove('live');
    if (e.type === 'error') { res.className = 'res err'; res.textContent = e.msg; out = ''; $('#copy').disabled = true; $('#rep').disabled = true; }
  }
  function langs() {
    const box = $('#langs'); if (!box.hidden) { box.hidden = true; return; }
    box.innerHTML = LANGS.map(([pl, en], i) => '<button style="--i:' + i + '" data-l="' + en + '" class="' + (en === lang ? 'on' : '') + '">' + pl + '</button>').join(''); box.hidden = false;
    box.querySelectorAll('button').forEach((b) => { b.onclick = () => { lang = b.dataset.l; box.hidden = true; if (text) go(); }; });
  }
  function open(d) {
    applyFrost(d.bg); document.body.classList.remove('closing', 'busy'); replay($('#panel'), 'in'); $('#langs').hidden = true; text = d.text || ''; lang = d.lang || 'English'; out = '';
    $('#src').textContent = text ? '“' + text.replace(/\s+/g, ' ') + '”' : ''; $('#langName').textContent = plName(lang);
    if (!text) { res.className = 'res empty'; res.textContent = 'Zaznacz tekst w dowolnej aplikacji i naciśnij skrót jeszcze raz.'; setBusy(false); $('#copy').disabled = true; $('#rep').disabled = true; return; }
    if (!d.hasKey) { res.className = 'res err'; res.textContent = 'Brak klucza API. Dodaj go w Ustawieniach.'; setBusy(false); return; }
    go();
  }
  $('#langBtn').onclick = langs; $('#x').onclick = () => { if (B) B.bubbleClose(); };
  $('#copy').onclick = () => { if (out) { if (B) B.bubbleCopy(out); $('#copy').lastChild.textContent = 'Skopiowano ✓'; setTimeout(() => { $('#copy').lastChild.textContent = 'Kopiuj'; }, 1400); } };
  $('#rep').onclick = () => { if (out && B) B.bubbleReplace(out); };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (!$('#langs').hidden) $('#langs').hidden = true; else if (B) B.bubbleClose(); } });
  if (B) { B.onBubbleOpen(open); B.onBubbleEv(ev); B.onBubbleClosing(() => document.body.classList.add('closing')); }
  else open({ text: 'Hej, dzięki za szybką odpowiedź. Przeczytałem propozycję i wygląda dobrze. Pogadajmy w czwartek?', lang: 'English', bg: null, hasKey: true });
})();
