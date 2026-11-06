'use strict';
/* Pasek poleceń (jak Spotlight, ale tylko dla Write Tools): szybkie polecenia lokalne i polecenia po ludzku, które AI zamienia na czynność w aplikacji */
const ai = require('./ai');

const PAGES = [
  { id: 'start', label: 'Start', kw: 'start pulpit główna dom' },
  { id: 'chat', label: 'Czat', kw: 'czat rozmowa chat asystent ai' },
  { id: 'study', label: 'Fiszki i quizy', kw: 'fiszki quizy nauka powtórki uczyć' },
  { id: 'stats', label: 'Statystyki', kw: 'statystyki wyniki postępy wykres' },
  { id: 'actions', label: 'Edytor akcji', kw: 'akcje edytor własne polecenia' },
  { id: 'people', label: 'Personalizacja', kw: 'personalizacja ton osoby' },
  { id: 'perms', label: 'Zgody systemowe', kw: 'zgody uprawnienia dostępność automatyzacja' },
  { id: 'settings', label: 'Ustawienia', kw: 'ustawienia skróty aktualizacje klucz api' },
];
const QUICK = [
  { id: 'q-cards', label: 'Fiszki z zaznaczonego tekstu', tool: { tool: 'make_cards' }, needs: true },
  { id: 'q-quiz', label: 'Quiz z zaznaczonego tekstu', tool: { tool: 'make_quiz' }, needs: true },
  { id: 'q-en', label: 'Przetłumacz na angielski', tool: { tool: 'translate', lang: 'English' }, needs: true },
  { id: 'q-pl', label: 'Przetłumacz na polski', tool: { tool: 'translate', lang: 'Polish' }, needs: true },
];
const SETTINGS = new Set(['autoSend', 'tray', 'showHome', 'login', 'svc.menu', 'svc.lang', 'svc.chat', 'svc.mail']);
const ROUTER = 'You are the command router of the Mac app Write Tools. The user types a short command in a command bar. Choose exactly ONE tool and reply with ONLY one JSON object, no other text. Tools:\n' +
  '{"tool":"open_page","page":"start|chat|study|stats|actions|people|perms|settings"}\n' +
  '{"tool":"study_deck","name":"<name of one of the existing decks>"}\n' +
  '{"tool":"make_cards","text":"<literal text to use, or empty string to use the selection or clipboard>"}\n' +
  '{"tool":"make_quiz","text":"<literal text, or empty string to use the selection or clipboard>"}\n' +
  '{"tool":"translate","lang":"<target language name in English>","text":"<literal text, or empty string to use the selection or clipboard>"}\n' +
  '{"tool":"set_setting","key":"autoSend|tray|showHome|login|svc.menu|svc.lang|svc.chat|svc.mail","value":true or false}\n' +
  '{"tool":"chat","prompt":"<message to send to the chat assistant>"}\n' +
  '{"tool":"answer","text":"<short direct answer, at most 3 sentences, in the language of the command>"}\n' +
  'Rules: use "answer" only for quick factual questions that need no files or long text. Use "chat" for anything longer, creative or conversational. ' +
  '"context" tells whether the user has a selection or clipboard text available. If the user says "to", "tego", "this" or similar and context is not none, use that context. Never invent decks.';

function parseJson(txt) {
  const s = String(txt || '').replace(/```(?:json)?/gi, ''), a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a < 0 || b <= a) return null; try { return JSON.parse(s.slice(a, b + 1)); } catch (e) { return null; }
}

function init(ctx) {
  const { BrowserWindow, ipcMain, screen, path, log } = ctx;
  let win = null, ready = false, info = { text: '', kind: '', app: '' }, busy = false;
  const W = 700;
  const emit = (ev) => { if (win && !win.isDestroyed()) win.webContents.send('bar:ev', ev); };

  function create() {
    ready = false;
    win = new BrowserWindow({ width: W, height: 140, show: false, frame: false, transparent: true, resizable: false, skipTaskbar: true, alwaysOnTop: true, hasShadow: false, focusable: true, backgroundColor: '#00000000',
      webPreferences: { preload: path.join(ctx.root, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
    win.setAlwaysOnTop(true, 'screen-saver'); win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    win.loadFile(path.join(ctx.root, 'renderer', 'bar.html')); win.webContents.once('did-finish-load', () => { ready = true; });
    win.on('blur', () => { if (!process.env.WT_SMOKE && !busy) hide(true); });
  }
  function hide(anim) {
    if (!win || win.isDestroyed() || !win.isVisible()) return;
    if (anim) { win.webContents.send('bar:closing'); setTimeout(() => { if (win && !win.isDestroyed() && win.isVisible()) win.hide(); }, 160); } else win.hide();
  }
  async function open() {
    if (!win || win.isDestroyed()) create();
    if (win.isVisible()) { hide(true); return; }
    for (let i = 0; i < 60 && !ready; i++) await ctx.sleep(40);
    const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()), wa = display.workArea;
    const bounds = { x: Math.round(wa.x + (wa.width - W) / 2), y: Math.round(wa.y + wa.height * 0.18), width: W, height: 140 };
    const [sel, shot] = await Promise.all([ctx.grabSelection(), ctx.shoot(display, bounds)]);
    let text = String((sel && sel.text) || '').trim(), kind = text ? 'selection' : '';
    if (!text) { const c = String(ctx.clipboard.readText() || '').trim(); if (c) { text = c; kind = 'clipboard'; } }
    info = { text: text.slice(0, 12000), kind, app: (sel && sel.app) || '' };
    win.setBounds(bounds);
    win.webContents.send('bar:open', { kind, preview: text.replace(/\s+/g, ' ').slice(0, 90), bg: shot, hasKey: !!ctx.getKey(), pages: PAGES, quick: QUICK.filter((q) => !q.needs || text), decks: ctx.decks() });
    ctx.app.focus({ steal: true }); win.show(); win.focus();
  }

  async function makeSet(action, text) {
    if (!text) return { kind: 'error', text: 'Brak tekstu. Zaznacz tekst albo skopiuj go do schowka i spróbuj jeszcze raz.' };
    emit({ text: action === 'quiz' ? 'Układam pytania…' : 'Tworzę fiszki…' });
    const r = await ai.complete({ key: ctx.getKey(), model: ctx.modelFor(action === 'quiz' ? 'quiz' : 'flashcards'), system: ctx.SYSTEM, maxTokens: 4096, log,
      messages: [{ role: 'user', content: ctx.buildPrompt(action, '', text.slice(0, 12000)) }] });
    if (r.error) return { kind: 'error', text: r.error };
    const res = ctx.studyCreate(action, r.text); if (!res.ok) return { kind: 'error', text: res.msg };
    return { kind: 'deck', id: res.id, name: res.name, count: res.count, deckKind: res.kind };
  }

  async function runTool(t, command) {
    t = t || {}; const text = String(t.text || '').trim() || info.text;
    switch (t.tool) {
      case 'open_page': { const p = PAGES.find((x) => x.id === t.page); if (!p) return { kind: 'error', text: 'Nie znam takiej strony.' }; ctx.showHome(p.id); return { kind: 'info', text: 'Otwieram: ' + p.label, close: true }; }
      case 'study_deck': {
        const q = String(t.name || '').toLowerCase(), d = ctx.decks().find((x) => x.name.toLowerCase() === q) || ctx.decks().find((x) => x.name.toLowerCase().includes(q) || q.includes(x.name.toLowerCase()));
        if (!d) return { kind: 'error', text: 'Nie znalazłem takiego zestawu.' }; ctx.showHome('deck:' + d.id); return { kind: 'info', text: 'Otwieram zestaw: ' + d.name, close: true };
      }
      case 'make_cards': return makeSet('flashcards', text);
      case 'make_quiz': return makeSet('quiz', text);
      case 'translate': {
        if (!text) return { kind: 'error', text: 'Brak tekstu do przetłumaczenia. Zaznacz go albo skopiuj.' };
        emit({ text: 'Tłumaczę…' });
        const r = await ai.complete({ key: ctx.getKey(), model: ctx.modelFor('translate'), system: ctx.SYSTEM, maxTokens: 2048, log, messages: [{ role: 'user', content: ctx.buildPrompt('translate', String(t.lang || 'English'), text.slice(0, 12000)) }] });
        return r.error ? { kind: 'error', text: r.error } : { kind: 'text', title: 'Tłumaczenie · ' + String(t.lang || 'English'), text: r.text.trim() };
      }
      case 'set_setting': {
        const k = String(t.key || ''); if (!SETTINGS.has(k)) return { kind: 'error', text: 'Tego ustawienia nie mogę zmienić.' };
        ctx.applySetting(k, !!t.value); return { kind: 'info', text: 'Zmieniono ustawienie: ' + k + ' → ' + (t.value ? 'włączone' : 'wyłączone') };
      }
      case 'chat': { const p = String(t.prompt || command || '').trim(); ctx.showHome('chat'); setTimeout(() => { const h = ctx.getHome(); if (h && !h.isDestroyed()) h.webContents.send('chat:prefill', { text: p, send: true }); }, 900); return { kind: 'info', text: 'Przenoszę do czatu…', close: true }; }
      case 'answer': return { kind: 'text', title: 'Odpowiedź', text: String(t.text || '').trim() || 'Nie mam odpowiedzi.' };
      default: return { kind: 'error', text: 'Nie rozumiem tego polecenia.' };
    }
  }

  ipcMain.handle('bar:ask', async (e, command) => {
    command = String(command || '').trim().slice(0, 800); if (!command || busy) return { kind: 'error', text: 'Napisz polecenie.' };
    if (!ctx.getKey()) return { kind: 'error', text: 'Brak klucza API. Dodaj go w Ustawieniach.' };
    busy = true;
    try {
      emit({ text: 'Rozumiem polecenie…' });
      const r = await ai.complete({ key: ctx.getKey(), model: 'claude-haiku-5-5', system: ROUTER, maxTokens: 500, log,
        messages: [{ role: 'user', content: JSON.stringify({ command, context: info.text ? info.kind : 'none', contextPreview: info.text.slice(0, 200), decks: ctx.decks().map((d) => d.name).slice(0, 40) }) }] });
      if (r.error) return { kind: 'error', text: r.error };
      const tool = parseJson(r.text) || { tool: 'chat', prompt: command };
      log('bar tool ' + JSON.stringify(tool).slice(0, 200));
      return await runTool(tool, command);
    } catch (err) { log('bar error ' + (err && err.stack)); return { kind: 'error', text: 'Coś poszło nie tak. Spróbuj ponownie.' }; }
    finally { busy = false; }
  });
  ipcMain.handle('bar:exec', async (e, tool) => { if (busy) return { kind: 'error', text: 'Poczekaj chwilę.' }; busy = true; try { return await runTool(tool, ''); } finally { busy = false; } });
  ipcMain.on('bar:close', () => hide(true));
  ipcMain.on('bar:resize', (e, h) => { if (win && !win.isDestroyed() && win.isVisible()) { const b = win.getBounds(); win.setBounds({ x: b.x, y: b.y, width: b.width, height: Math.max(100, Math.min(600, Math.round(h))) }); } });
  ipcMain.on('bar:copy', (e, t) => ctx.clipboard.writeText(String(t || '')));
  return { open, hide, window: () => win };
}

module.exports = { init, PAGES };
