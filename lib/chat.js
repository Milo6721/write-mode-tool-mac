'use strict';
/* Czat w oknie głównym: historia rozmów na dysku, załączniki (zdjęcia, PDF, pliki tekstowe), odpowiedź strumieniowana */
const ai = require('./ai');

const IMG = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' };
const TEXT_EXT = new Set(['txt', 'md', 'markdown', 'csv', 'tsv', 'json', 'js', 'ts', 'jsx', 'tsx', 'py', 'rb', 'go', 'rs', 'java', 'kt', 'swift', 'c', 'h', 'cpp', 'cs', 'php', 'html', 'css', 'xml', 'yml', 'yaml', 'toml', 'ini', 'log', 'sh', 'sql', 'tex']);
const MAX_FILE = 20 * 1024 * 1024, MAX_IMG = 5 * 1024 * 1024, MAX_TEXT = 200000, BUDGET = 18 * 1024 * 1024;
const SYSTEM = 'You are the assistant inside the Mac app Write Tools. Reply in the language the user writes in (Polish by default). Be concise, warm and practical. ' +
  'You may format with simple Markdown: **bold**, lists, `inline code` and fenced code blocks. When the user attaches files, read them carefully and answer about their content.';

function kindOf(name, type) {
  const ext = (String(name).split('.').pop() || '').toLowerCase();
  if (IMG[ext]) return { kind: 'image', mime: IMG[ext] };
  if (ext === 'pdf') return { kind: 'pdf', mime: 'application/pdf' };
  if (TEXT_EXT.has(ext) || String(type || '').startsWith('text/')) return { kind: 'text', mime: 'text/plain' };
  return null;
}

function init(ctx) {
  const { app, ipcMain, fs, path, log } = ctx;
  const dbFile = () => path.join(app.getPath('userData'), 'chats.json');
  const filesDir = (id) => path.join(app.getPath('userData'), 'chatfiles', id);
  let db = null, abort = null;
  const load = () => {
    if (db) return db;
    try { db = JSON.parse(fs.readFileSync(dbFile(), 'utf8')); } catch (e) { db = null; }
    if (!db || !Array.isArray(db.chats)) db = { chats: [] };
    return db;
  };
  const save = () => { fs.mkdirSync(path.dirname(dbFile()), { recursive: true }); fs.writeFileSync(dbFile(), JSON.stringify(db), 'utf8'); };
  const emit = (ev) => { const w = ctx.getHome(); if (w && !w.isDestroyed()) w.webContents.send('chat:ev', ev); };
  const meta = (f) => ({ name: f.name, kind: f.kind, size: f.size });

  /* wiadomości w formacie API: pliki z ostatnich wiadomości jako bloki, starsze tylko jako wzmianka (limit rozmiaru) */
  function apiMessages(chat) {
    const msgs = chat.messages.slice(-30); let budget = BUDGET;
    const out = [];
    for (let i = msgs.length - 1; i >= 0; i--) {
      const m = msgs[i];
      if (m.role === 'assistant') { out.unshift({ role: 'assistant', content: m.text || '…' }); continue; }
      const blocks = [];
      for (const f of m.files || []) {
        let buf = null;
        if (budget > 0) { try { buf = fs.readFileSync(f.path); } catch (e) { buf = null; } }
        if (!buf || buf.length > budget) { blocks.push({ type: 'text', text: '[Załącznik „' + f.name + '” nie jest już dołączony do tej rozmowy]' }); continue; }
        budget -= buf.length;
        if (f.kind === 'image') blocks.push({ type: 'image', source: { type: 'base64', media_type: f.mime, data: buf.toString('base64') } });
        else if (f.kind === 'pdf') blocks.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: buf.toString('base64') } });
        else blocks.push({ type: 'text', text: 'Plik „' + f.name + '”:\n```\n' + buf.toString('utf8').slice(0, MAX_TEXT) + '\n```' });
      }
      blocks.push({ type: 'text', text: m.text || 'Opisz załączony plik.' });
      out.unshift({ role: 'user', content: blocks });
    }
    while (out.length && out[0].role !== 'user') out.shift();
    return out;
  }

  async function titleFor(chat, firstText) {
    try {
      const r = await ai.complete({ key: ctx.getKey(), model: 'claude-haiku-5-5', system: 'Write a title of at most 5 words for this conversation, in the same language as the message. Output only the title, no quotes.', messages: [{ role: 'user', content: String(firstText).slice(0, 500) }], maxTokens: 30, log });
      const t = String(r.text || '').replace(/["„”\n]/g, '').trim().slice(0, 50);
      if (t) { chat.title = t; save(); emit({ type: 'title', chatId: chat.id, title: t }); }
    } catch (e) { /* tytuł z AI jest opcjonalny */ }
  }

  ipcMain.handle('chat:list', () => load().chats.slice().sort((a, b) => b.updated - a.updated).map((c) => ({ id: c.id, title: c.title || 'Nowa rozmowa', updated: c.updated, count: c.messages.length })));
  ipcMain.handle('chat:get', (e, id) => {
    const c = load().chats.find((x) => x.id === id); if (!c) return null;
    return { id: c.id, title: c.title, messages: c.messages.map((m) => ({ role: m.role, text: m.text, ts: m.ts, files: (m.files || []).map(meta) })) };
  });
  ipcMain.handle('chat:delete', (e, id) => {
    const d = load(); d.chats = d.chats.filter((c) => c.id !== id);
    try { fs.rmSync(filesDir(String(id)), { recursive: true, force: true }); } catch (err) { /* brak plików */ }
    save(); return true;
  });
  ipcMain.handle('chat:rename', (e, id, title) => { const c = load().chats.find((x) => x.id === id); if (c) { c.title = String(title || '').trim().slice(0, 60) || c.title; save(); } return true; });
  ipcMain.on('chat:stop', () => { if (abort) abort.abort(); });

  ipcMain.handle('chat:send', async (e, p) => {
    p = p || {}; load();
    const text = String(p.text || '').slice(0, 20000), files = Array.isArray(p.files) ? p.files.slice(0, 6) : [];
    if (!text.trim() && !files.length) return { ok: false, msg: 'Napisz wiadomość albo dodaj plik.' };
    if (abort) return { ok: false, msg: 'Poczekaj, aż AI skończy odpowiadać.' };
    const key = ctx.getKey(); if (!key) return { ok: false, msg: 'Brak klucza API. Dodaj go w Ustawieniach.' };
    let chat = p.chatId ? db.chats.find((c) => c.id === p.chatId) : null;
    const isNew = !chat;
    if (!chat) { chat = { id: ctx.uid(), title: '', created: Date.now(), updated: Date.now(), messages: [] }; db.chats.unshift(chat); }
    const saved = [], dir = filesDir(chat.id), mid = ctx.uid();
    for (let i = 0; i < files.length; i++) {
      const f = files[i], k = kindOf(f.name, f.type); if (!k) { if (isNew) db.chats.shift(); return { ok: false, msg: 'Nieobsługiwany plik: ' + String(f.name).slice(0, 40) + '. Obsługuję zdjęcia (PNG, JPG, GIF, WebP), PDF i pliki tekstowe.' }; }
      const buf = Buffer.from(f.data || []);
      if (buf.length > MAX_FILE || (k.kind === 'image' && buf.length > MAX_IMG)) { if (isNew) db.chats.shift(); return { ok: false, msg: 'Plik „' + String(f.name).slice(0, 40) + '” jest za duży (zdjęcie do 5 MB, inne do 20 MB).' }; }
      fs.mkdirSync(dir, { recursive: true });
      const safe = mid + '-' + i + '-' + String(f.name).replace(/[^\w.\-]+/g, '_').slice(-60), fp = path.join(dir, safe);
      fs.writeFileSync(fp, buf); saved.push({ name: String(f.name).slice(0, 80), kind: k.kind, mime: k.mime, size: buf.length, path: fp });
    }
    const ts = Date.now();
    chat.messages.push({ role: 'user', text, ts, files: saved }); chat.updated = ts;
    if (!chat.title) chat.title = (text.trim() || (saved[0] && saved[0].name) || 'Nowa rozmowa').slice(0, 40);
    save();
    const chatId = chat.id, ac = new AbortController(); abort = ac;
    (async () => {
      emit({ type: 'start', chatId });
      const r = await ai.stream({ key, model: ctx.model(), system: SYSTEM, messages: apiMessages(chat), maxTokens: 4096, signal: ac.signal, log, onText: (d) => emit({ type: 'chunk', chatId, text: d }) });
      abort = null;
      if (r.aborted) { emit({ type: 'stopped', chatId }); return; }
      if (r.error) { emit({ type: 'error', chatId, msg: r.error }); return; }
      chat.messages.push({ role: 'assistant', text: r.text, ts: Date.now() }); chat.updated = Date.now(); save();
      emit({ type: 'done', chatId });
      if (chat.messages.length === 2) titleFor(chat, text || (saved[0] && saved[0].name) || '');
    })().catch((err) => { abort = null; log('chat error ' + (err && err.stack)); emit({ type: 'error', chatId, msg: 'Coś poszło nie tak. Spróbuj ponownie.' }); });
    return { ok: true, chatId, title: chat.title, files: saved.map(meta) };
  });
}

module.exports = { init, kindOf };
