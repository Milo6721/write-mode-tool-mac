'use strict';
/* Ustawienia: trzy skróty z nagrywaniem, usługi z prawego przycisku, zachowanie, model, aktualizacje i klucz API */
(() => {
  const HK = [
    ['main', 'Menu akcji', 'Otwiera menu akcji dla zaznaczonego tekstu w dowolnej aplikacji'],
    ['bar', 'Pasek poleceń', 'Szklany pasek jak Spotlight: piszesz polecenie dla Write Tools'],
    ['trans', 'Tłumacz w locie', 'Bańka z tłumaczeniem zaznaczonego tekstu obok kursora'],
  ];
  const KEYMAP = { Command: '⌘', Control: '⌃', Alt: '⌥', Shift: '⇧', Space: 'Spacja' };
  const keycaps = (acc) => acc.split('+').map((k) => '<kbd>' + esc(KEYMAP[k] || k) + '</kbd>').join('');
  const sw = (k, on) => '<button class="sw" role="switch" aria-checked="' + !!on + '" data-k="' + k + '"><i></i></button>';
  function toAccel(e) {
    const m = []; if (e.metaKey) m.push('Command'); if (e.ctrlKey) m.push('Control'); if (e.altKey) m.push('Alt'); if (e.shiftKey) m.push('Shift');
    const c = e.code; let k = null;
    if (/^Key[A-Z]$/.test(c)) k = c.slice(3); else if (/^Digit\d$/.test(c)) k = c.slice(5); else if (/^F\d{1,2}$/.test(c)) k = c; else if (c === 'Space') k = 'Space';
    if (!k || (!m.length && !/^F\d/.test(k))) return null; return m.concat(k).join('+');
  }
  let el = null;
  const q = (s) => el.querySelector(s);

  window.paintUpdateRow = function paintUpdateRow() {
    const box = el && q('#updrow'); if (!box) return; const u = window.UPD || {}, cur = u.current || (S && S.version) || '';
    const when = u.checkedAt ? ' · sprawdzono ' + new Date(u.checkedAt).toLocaleTimeString('pl', { hour: '2-digit', minute: '2-digit' }) : '';
    const title = { checking: 'Sprawdzam…', uptodate: 'Masz najnowszą wersję', available: 'Dostępna wersja ' + u.latest, downloading: 'Pobieram… ' + (u.progress || 0) + '%', installing: 'Instaluję i uruchamiam ponownie…', error: u.error || 'Nie udało się sprawdzić', idle: 'Sprawdź, czy jest nowa wersja' }[u.state || 'idle'];
    const busyNow = u.state === 'checking' || u.state === 'downloading' || u.state === 'installing';
    let btns = '';
    if (u.state === 'available' && u.canInstall) btns = '<button class="btn primary" data-u="install">' + ic('refresh') + 'Zainstaluj i uruchom ponownie</button><button class="btn" data-u="page">Co nowego</button><button class="btn" data-u="skip">Pomiń</button>';
    else if (u.state === 'available') btns = '<button class="btn primary" data-u="page">Otwórz stronę pobierania</button>';
    else btns = '<button class="btn" data-u="check"' + (busyNow ? ' disabled' : '') + '>' + ic('refresh') + 'Sprawdź teraz</button>';
    box.innerHTML = '<div class="srow updrow"><div class="st"><b>' + esc(title) + '</b><span>Write Tools ' + esc(cur) + esc(when) + '</span>' +
      (u.state === 'downloading' ? '<div class="pbar" style="margin-top:8px;width:260px"><i style="width:' + (u.progress || 0) + '%"></i></div>' : '') +
      (u.state === 'available' && u.notes ? '<div class="updnote">' + esc(u.notes) + '</div>' : '') + '<span class="msg" id="updmsg"></span></div><div class="ctl" style="flex-wrap:wrap;justify-content:flex-end">' + btns + '</div></div>';
    $$('[data-u]', box).forEach((b) => { b.onclick = async () => {
      const a = b.dataset.u;
      if (a === 'check') await bridge.updateCheck();
      else if (a === 'page') bridge.updatePage();
      else if (a === 'skip') { await bridge.updateSkip(); $('#updmsg', box).textContent = 'Pominięto tę wersję.'; }
      else if (a === 'install') { const r = await bridge.updateInstall(); const m = $('#updmsg', box); if (m) { m.className = 'msg' + (r.ok ? ' ok' : ''); m.textContent = r.msg || ''; } }
    }; });
  };

  RENDER.settings = async (page) => {
    el = page; const s = await bridge.settingsGet(); window.S = S = s; setHk(s.hotkeys.main.label); window.UPD = s.update || window.UPD; const sv = s.services, fast = !s.model || s.model.includes('haiku');
    el.innerHTML = '<header class="ph rise"><h1>Ustawienia</h1><p>Skróty, usługi z prawego przycisku, aktualizacje i zachowanie aplikacji.</p></header>' +
      '<div class="sec rise">Skróty klawiszowe</div><div class="card glass group rise">' + HK.map(([k, n, d]) => '<div class="srow" data-hk="' + k + '"><div class="st"><b>' + n + '</b><span>' + d + '</span></div><div class="ctl"><div class="keys">' + keycaps(s.hotkeys[k].acc) + '<span class="hint">Naciśnij nowy skrót…</span></div><button class="btn" data-rec>Zmień</button></div></div>').join('') +
      '<div class="presets" id="presets">' + s.presets.map((p) => '<button class="chip" data-acc="' + esc(p.acc) + '">' + esc(p.label) + '</button>').join('') + '</div><div class="msg" id="hkMsg" style="padding-bottom:10px"></div></div>' +
      '<div class="sec rise">Usługi w menu prawego przycisku</div><div class="card glass group rise">' +
      [['menu', 'Write Tools', 'Pełne menu akcji'], ['lang', 'Przetłumacz', 'Od razu wybór języka'], ['chat', 'Wyślij w Wiadomościach', 'Wybór osoby z Kontaktów'], ['mail', 'Wyślij e-mailem', 'Szkic w aplikacji Mail']].map(([k, n, d]) => '<div class="srow"><div class="st"><b>' + n + '</b><span>' + d + '</span></div>' + sw('svc.' + k, sv[k]) + '</div>').join('') + '</div>' +
      '<div class="sec rise">Zachowanie</div><div class="card glass group rise">' +
      [['login', 'Uruchamiaj po zalogowaniu', 'Aplikacja startuje razem z komputerem', s.login], ['showHome', 'Pokaż to okno po uruchomieniu', 'Inaczej aplikacja startuje cicho w tle', s.showHome], ['tray', 'Ikona w pasku menu', 'Szybki dostęp bez otwierania okna', s.tray], ['autoSend', 'Wysyłaj wiadomości od razu', 'Bez podglądu szkicu. Uwaga: AI może się pomylić', s.autoSend]].map(([k, n, d, v]) => '<div class="srow"><div class="st"><b>' + n + '</b><span>' + d + '</span></div>' + sw(k, v) + '</div>').join('') + '</div>' +
      '<div class="sec rise">Model AI</div><div class="card glass group rise"><div class="srow"><div class="st"><b>Jakość odpowiedzi</b><span>Szybki jest tańszy, dokładny lepiej pisze długie teksty</span></div><div class="seg" id="seg"><i style="transform:translateX(' + (fast ? 0 : 100) + '%)"></i><button data-m="" class="' + (fast ? 'on' : '') + '">Szybki</button><button data-m="claude-sonnet-5-5" class="' + (fast ? '' : 'on') + '">Dokładny</button></div></div></div>' +
      '<div class="sec rise">Aktualizacje</div><div class="card glass group rise"><div id="updrow"></div></div>' +
      '<div class="sec rise">Klucz API Anthropic</div><div class="card glass group rise"><div class="srow" style="padding-bottom:12px"><div class="st"><b>Klucz</b><span>Zapisany zaszyfrowany na tym komputerze</span></div><span class="pill ' + (s.hasKey ? 'ok' : 'no') + '" id="keyPill">' + (s.hasKey ? 'Zapisany' : 'Brak klucza') + '</span></div>' +
      '<div class="keyin"><input id="keyIn" type="password" placeholder="sk-ant-…" spellcheck="false" autocomplete="off"><button class="btn primary" id="keySave">Zapisz</button><button class="btn" id="keyGet">Zdobądź klucz</button></div><div class="msg" id="keyMsg" style="padding-bottom:12px"></div></div>' +
      '<p class="note rise" style="margin-top:18px">Write Tools ' + esc(s.version) + ' · projekt niezależny, nie jest produktem Apple Inc. ani Anthropic PBC.</p>';
    paintUpdateRow();
    $$('.sw', el).forEach((b) => { b.onclick = async () => { const on = b.getAttribute('aria-checked') !== 'true'; b.setAttribute('aria-checked', on); await bridge.settingsSet(b.dataset.k, on); }; });
    $$('#seg button', el).forEach((b, i) => { b.onclick = async () => { $$('#seg button', el).forEach((x) => x.classList.toggle('on', x === b)); $('#seg i', el).style.transform = 'translateX(' + i * 100 + '%)'; await bridge.settingsSet('model', b.dataset.m); }; });

    const msg = (t, ok) => { const m = q('#hkMsg'); m.className = 'msg' + (ok ? ' ok' : ''); m.textContent = t; };
    const apply = async (kind, acc) => {
      const row = q('[data-hk="' + kind + '"]'), box = row.querySelector('.keys'), r = await bridge.setHotkey(acc, kind);
      if (r.ok) { s.hotkeys[kind] = { acc, label: r.label }; box.innerHTML = keycaps(acc) + '<span class="hint">Naciśnij nowy skrót…</span>'; if (kind === 'main') setHk(r.label); msg('Zapisano: ' + r.label, true); }
      else { box.classList.remove('bad'); void box.offsetWidth; box.classList.add('bad'); msg(r.msg || 'Ten skrót jest zajęty przez system lub inną aplikację.', false); }
    };
    $$('#presets .chip', el).forEach((b) => { b.onclick = () => apply('main', b.dataset.acc); });
    $$('[data-hk]', el).forEach((row) => {
      const kind = row.dataset.hk, btn = row.querySelector('[data-rec]'), box = row.querySelector('.keys');
      const start = () => {
        if (rec) return; rec = true; box.classList.add('rec'); btn.textContent = 'Anuluj';
        const stop = () => { rec = false; box.classList.remove('rec'); btn.textContent = 'Zmień'; window.removeEventListener('keydown', onKey, true); btn.onclick = start; };
        const onKey = (e) => {
          e.preventDefault(); e.stopPropagation(); if (e.key === 'Escape') return stop(); if (['Meta', 'Control', 'Alt', 'Shift'].includes(e.key)) return;
          const acc = toAccel(e); if (!acc) { box.classList.remove('bad'); void box.offsetWidth; box.classList.add('bad'); msg('Dodaj klawisz ⌘, ⌃ lub ⌥ i literę.', false); return; }
          stop(); apply(kind, acc);
        };
        btn.onclick = stop; window.addEventListener('keydown', onKey, true);
      };
      btn.onclick = start;
    });
    q('#keyGet').onclick = () => bridge.openConsole();
    q('#keySave').onclick = async () => {
      const v = q('#keyIn').value.trim(); if (!v) return; const r = await bridge.setKey(v), m = q('#keyMsg');
      if (r === 'ok' || r === true) { m.className = 'msg ok'; m.textContent = 'Klucz zapisany.'; q('#keyIn').value = ''; const p = q('#keyPill'); p.className = 'pill ok'; p.textContent = 'Zapisany'; }
      else { m.className = 'msg'; m.textContent = r === 'bad' ? 'To nie wygląda na klucz API. Zaczyna się od sk-ant- i nie ma spacji ani polskich liter.' : 'Szyfrowanie systemowe jest niedostępne.'; }
    };
  };
})();
