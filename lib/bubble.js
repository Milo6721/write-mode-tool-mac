'use strict';
/* Tłumacz w locie: zaznaczasz tekst, naciskasz skrót i obok kursora pojawia się szklana bańka z tłumaczeniem */
const ai = require('./ai');

function init(ctx) {
  const { BrowserWindow, ipcMain, screen, path, log } = ctx;
  let win = null, ready = false, st = { text: '', app: '' }, abort = null;
  const W = 392, H = 344;
  const emit = (ev) => { if (win && !win.isDestroyed()) win.webContents.send('bubble:ev', ev); };

  function create() {
    ready = false;
    win = new BrowserWindow({ width: W, height: H, show: false, frame: false, transparent: true, resizable: false, skipTaskbar: true, alwaysOnTop: true, hasShadow: false, focusable: true, backgroundColor: '#00000000',
      webPreferences: { preload: path.join(ctx.root, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
    win.setAlwaysOnTop(true, 'screen-saver'); win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    win.loadFile(path.join(ctx.root, 'renderer', 'bubble.html')); win.webContents.once('did-finish-load', () => { ready = true; });
    win.on('blur', () => { if (!process.env.WT_SMOKE) hide(true); });
  }
  function hide(anim) {
    if (abort) { abort.abort(); abort = null; }
    if (!win || win.isDestroyed() || !win.isVisible()) return;
    if (anim) { win.webContents.send('bubble:closing'); setTimeout(() => { if (win && !win.isDestroyed() && win.isVisible()) win.hide(); }, 160); } else win.hide();
  }
  async function open() {
    if (!win || win.isDestroyed()) create();
    if (win.isVisible()) { hide(true); return; }
    for (let i = 0; i < 60 && !ready; i++) await ctx.sleep(40);
    const cursor = screen.getCursorScreenPoint(), display = screen.getDisplayNearestPoint(cursor), wa = display.workArea;
    const x = Math.max(wa.x, Math.min(cursor.x - 24, wa.x + wa.width - W)), y = Math.max(wa.y, Math.min(cursor.y + 20, wa.y + wa.height - H));
    const bounds = { x, y, width: W, height: H };
    const [sel, shot] = await Promise.all([ctx.grabSelection(), ctx.shoot(display, bounds)]);
    st = { text: String((sel && sel.text) || '').trim().slice(0, 8000), app: (sel && sel.app) || '' };
    win.setBounds(bounds);
    win.webContents.send('bubble:open', { text: st.text, lang: ctx.cfg().bubbleLang || ctx.cfg().lastLang || 'English', bg: shot, hasKey: !!ctx.getKey() });
    ctx.app.focus({ steal: true }); win.show(); win.focus();
  }

  ipcMain.on('bubble:translate', async (e, p) => {
    p = p || {}; const text = String(p.text || st.text).slice(0, 8000), lang = String(p.lang || 'English').slice(0, 40);
    if (!text.trim()) { emit({ type: 'error', msg: 'Zaznacz tekst i naciśnij skrót jeszcze raz.' }); return; }
    if (!ctx.getKey()) { emit({ type: 'error', msg: 'Brak klucza API. Dodaj go w Ustawieniach.' }); return; }
    ctx.cfg().bubbleLang = lang; ctx.saveCfg();
    if (abort) abort.abort(); const ac = new AbortController(); abort = ac;
    const r = await ai.stream({ key: ctx.getKey(), model: ctx.modelFor('translate'), system: ctx.SYSTEM, signal: ac.signal, maxTokens: 2048, log,
      messages: [{ role: 'user', content: ctx.buildPrompt('translate', lang, text) }], onText: (d) => emit({ type: 'chunk', text: d }) });
    if (abort === ac) abort = null;
    if (r.aborted) return; if (r.error) emit({ type: 'error', msg: r.error }); else emit({ type: 'done' });
  });
  ipcMain.on('bubble:close', () => hide(true));
  ipcMain.on('bubble:copy', (e, t) => ctx.clipboard.writeText(String(t || '')));
  ipcMain.on('bubble:replace', async (e, t) => { hide(); await ctx.replaceText(st.app, String(t || '')); });
  return { open, hide, window: () => win };
}

module.exports = { init };
