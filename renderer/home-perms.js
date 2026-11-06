'use strict';
/* Zgody systemowe: stan na żywo, prośby o dostęp i szybkie przejście do Ustawień systemowych */
(() => {
  const ITEMS = [
    { k: 'accessibility', name: 'Dostępność', why: 'Potrzebna, żeby czytać zaznaczony tekst i wklejać wynik z powrotem do innych programów.', icon: 'select', grad: '#5ac8fa,#0a84ff', live: true, open: 'accessibility' },
    { k: 'screen', name: 'Nagrywanie ekranu', why: 'Daje efekt szkła: aplikacja widzi, co jest pod oknem. Bez tego okno jest zwykłe, a nie przezroczyste.', icon: 'sparkle', grad: '#c68bff,#7a5cff', live: true, open: 'screen' },
    { k: 'events', name: 'Automatyzacja: System Events', why: 'Do naciskania skrótów Kopiuj i Wklej w innych programach.', icon: 'bolt', grad: '#ffb35a,#ff453a', test: true, open: 'automation' },
    { k: 'messages', name: 'Automatyzacja: Wiadomości', why: 'Do wysyłania tekstu do znajomych (sam szkic albo od razu).', icon: 'chat', grad: '#7be495,#1fae6b', test: true, open: 'automation' },
    { k: 'notes', name: 'Automatyzacja: Notatki', why: 'Do zapisywania wyników w Notatkach.', icon: 'edit', grad: '#ffd36b,#ff9f0a', test: true, open: 'automation' },
    { k: 'reminders', name: 'Automatyzacja: Przypomnienia', why: 'Do dodawania zadań z tekstu do Przypomnień.', icon: 'check', grad: '#ff9ed2,#d6409f', test: true, open: 'automation' },
    { k: 'contacts', name: 'Automatyzacja: Kontakty', why: 'Do wyboru osoby z Twoich kontaktów przy wysyłaniu.', icon: 'user', grad: '#6ee7e0,#0f9fa8', test: true, open: 'automation' },
  ];
  let el = null, S = null, busy = {};

  const stateOf = (it) => {
    if (it.live) return S[it.k] === 'granted' ? 'ok' : S[it.k] === 'denied' || S[it.k] === 'restricted' ? 'no' : 'un';
    const t = (S.tests || {})[it.k]; return !t ? 'un' : t.state === 'granted' ? 'ok' : t.state === 'denied' ? 'no' : 'un';
  };
  const LABEL = { ok: ['Zezwolono', 'check'], no: ['Brak zgody', 'close'], un: ['Nie sprawdzono', 'refresh'] };

  async function refresh(repaint) { S = await bridge.permsStatus(); const n = ITEMS.filter((i) => i.live && stateOf(i) !== 'ok').length; setPermBadge(n); if (repaint && el && !el.hidden && cur === 'perms') paint(); }

  function paint() {
    const ok = ITEMS.filter((i) => stateOf(i) === 'ok').length, pct = Math.round(ok * 100 / ITEMS.length);
    el.innerHTML = '<header class="ph rise"><h1>Zgody systemowe</h1><p>Write Tools prosi macOS o kilka zgód. Tu widzisz, co działa, a czego brakuje, i możesz to naprawić jednym kliknięciem.</p></header>' +
      '<div class="card glass psum rise"><div class="bigring">' + ringSvg(pct, 96, 9) + '<div class="rc"><b>' + ok + '/' + ITEMS.length + '</b><span>gotowe</span></div></div><div><h3>' + (ok === ITEMS.length ? 'Wszystko gotowe' : 'Brakuje kilku zgód') + '</h3><p class="note" style="margin-top:4px;max-width:420px">' +
      (ok === ITEMS.length ? 'Aplikacja ma dostęp do wszystkiego, czego potrzebuje.' : 'Kliknij „Sprawdź” przy Automatyzacji albo „Poproś”. macOS zapyta o zgodę. Po zmianie w Ustawieniach systemowych wróć tutaj, a stan odświeży się sam.') + '</p></div></div>' +
      '<div class="pgrid">' + ITEMS.map((it) => {
        const st = stateOf(it), [lab, icn] = LABEL[st];
        return '<div class="card glass pcard rise" data-k="' + it.k + '"><span class="pi" style="background:linear-gradient(160deg,' + it.grad + ')">' + ic(it.icon) + '</span><div class="pt"><b>' + esc(it.name) + '</b><span>' + esc(it.why) + '</span></div>' +
          '<span class="pst ' + st + '"><i>' + (st === 'ok' ? '✓' : st === 'no' ? '✕' : '•') + '</i>' + lab + '</span><div class="pbtns">' +
          (it.test ? '<button class="btn sm" data-a="test">' + (busy[it.k] ? 'Sprawdzam…' : 'Sprawdź') + '</button>' : (st === 'ok' ? '' : '<button class="btn sm primary" data-a="req">Poproś</button>')) +
          (st === 'ok' ? '' : '<button class="btn sm" data-a="open">Otwórz ustawienia</button>') + '</div></div>';
      }).join('') + '</div><p class="note rise" style="margin-top:16px">„Sprawdź” przy Automatyzacji krótko uruchamia daną aplikację w tle, żeby macOS mógł zapytać o zgodę.</p>';
    rise(el); decorate(el); animateRings(el);
    $$('.pcard', el).forEach((c) => {
      const it = ITEMS.find((x) => x.k === c.dataset.k);
      $$('[data-a]', c).forEach((b) => { b.onclick = async () => {
        const a = b.dataset.a;
        if (a === 'open') bridge.permsOpen(it.open);
        else if (a === 'req') { await bridge.permsRequest(it.k); bridge.permsOpen(it.open); await refresh(true); }
        else if (a === 'test') { busy[it.k] = true; paint(); await bridge.permsTest(it.k); busy[it.k] = false; await refresh(true); }
      }; });
    });
  }

  RENDER.perms = async (page) => { el = page; await refresh(false); paint(); };
  window.refreshPerms = () => refresh(true);
  window.addEventListener('focus', () => { if (typeof cur !== 'undefined') refresh(true); });
})();
