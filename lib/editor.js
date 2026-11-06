'use strict';
/* Edytor akcji: lista wbudowanych akcji (do podglądu i duplikowania), test akcji na przykładowym tekście, import i eksport własnych akcji */
const ai = require('./ai');

const LABELS = {
  slack: 'Wersja na Slack lub Teams', tasks: 'Notatki na zadania', refuse: 'Uprzejma odmowa', flashcards: 'Fiszki', quiz: 'Quiz z tekstu', hardwords: 'Trudne słowa',
  official: 'Pismo urzędowe', bizen: 'Angielski biznesowy', headings: 'Nagłówki i akapity', commit: 'Komunikat commita', precheck: 'Sprawdź przed wysłaniem', explain: 'Wyjaśnij kod',
  translate: 'Przetłumacz', reply: 'Odpowiedz', calendar: 'Do kalendarza',
};
const EXTRA = {
  translate: 'Translate the text into English. Translate the meaning into natural, everyday language and prefer a native word over a borrowed word that merely looks the same. Preserve tone, formatting and line breaks. Output only the translation.',
  reply: 'The text is a message the user received. Write the user\'s reply to it in a polite, concise tone. Reply in the language of the message. Write only the body of the reply, ready to send.',
  calendar: 'Find every task, appointment, meeting and deadline in the text and list them one per line as "RRRR-MM-DD GG:MM | tytuł". Resolve relative dates such as "jutro" or "w piątek" to real dates.',
};

function init(ctx) {
  const { ipcMain, dialog, fs, log } = ctx;
  let abort = null;
  const emit = (ev) => { const w = ctx.getHome(); if (w && !w.isDestroyed()) w.webContents.send('actions:ev', ev); };

  ipcMain.handle('actions:builtin', () => Object.keys(LABELS).map((id) => ({ id, label: LABELS[id], prompt: ctx.ACTIONS[id] || EXTRA[id] || '' })).filter((a) => a.prompt));
  ipcMain.handle('actions:test', async (e, p) => {
    p = p || {}; const prompt = String(p.prompt || '').slice(0, 2000).trim(), text = String(p.text || '').slice(0, 6000).trim();
    if (!prompt || !text) return { ok: false, msg: 'Wpisz polecenie i przykładowy tekst.' };
    if (abort) abort.abort();
    const ac = new AbortController(); abort = ac;
    (async () => {
      const r = await ai.stream({ key: ctx.getKey(), model: p.quality ? 'claude-sonnet-5-5' : ctx.model(), system: ctx.SYSTEM, signal: ac.signal, log, maxTokens: 2048,
        messages: [{ role: 'user', content: 'Apply this instruction to the text: ' + prompt + '\n\n<text>\n' + text + '\n</text>' }], onText: (d) => emit({ type: 'chunk', text: d }) });
      if (abort === ac) abort = null;
      if (r.aborted) return; if (r.error) emit({ type: 'error', msg: r.error }); else emit({ type: 'done' });
    })().catch(() => emit({ type: 'error', msg: 'Test się nie udał. Spróbuj ponownie.' }));
    return { ok: true };
  });
  ipcMain.on('actions:stop', () => { if (abort) abort.abort(); });

  ipcMain.handle('actions:export', async () => {
    const list = ctx.cfg().actions || []; if (!list.length) return { ok: false, msg: 'Nie masz jeszcze własnych akcji do wyeksportowania.' };
    const w = ctx.getHome(), r = await dialog.showSaveDialog(w || undefined, { title: 'Eksport akcji', defaultPath: 'write-tools-akcje.json', filters: [{ name: 'JSON', extensions: ['json'] }] });
    if (r.canceled || !r.filePath) return { ok: false, canceled: true };
    fs.writeFileSync(r.filePath, JSON.stringify({ app: 'Write Tools', version: 1, actions: list.map((a) => ({ name: a.name, prompt: a.prompt, icon: a.icon || '', quality: !!a.quality })) }, null, 2), 'utf8');
    return { ok: true, count: list.length };
  });
  ipcMain.handle('actions:import', async () => {
    const w = ctx.getHome(), r = await dialog.showOpenDialog(w || undefined, { title: 'Import akcji', properties: ['openFile'], filters: [{ name: 'JSON', extensions: ['json'] }] });
    if (r.canceled || !r.filePaths[0]) return { ok: false, canceled: true };
    let data; try { data = JSON.parse(fs.readFileSync(r.filePaths[0], 'utf8')); } catch (e) { return { ok: false, msg: 'Ten plik nie jest poprawnym eksportem akcji.' }; }
    const incoming = Array.isArray(data) ? data : data && data.actions; if (!Array.isArray(incoming)) return { ok: false, msg: 'W pliku nie ma akcji.' };
    const cur = ctx.cfg().actions || [], names = new Set(cur.map((a) => a.name.toLowerCase()));
    const add = ctx.cleanActions(incoming.map((a) => ({ ...a, id: '' }))).filter((a) => !names.has(a.name.toLowerCase()));
    ctx.cfg().actions = ctx.cleanActions([...cur, ...add]); ctx.saveCfg();
    return { ok: true, added: add.length, actions: ctx.cfg().actions };
  });
}

module.exports = { init, LABELS };
