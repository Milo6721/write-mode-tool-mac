'use strict';
/* Aktualizacje: sprawdzanie wydań na GitHubie, pobranie w aplikacji (z kontrolą sumy SHA-256) i podmiana aplikacji jednym kliknięciem */
const crypto = require('crypto');
const { spawn } = require('child_process');
const { Readable } = require('stream');

const REPO = 'Milo6721/write-mode-tool-mac';
const SITE = 'https://milo6721.github.io/write-mode-tool-mac/';
const parse = (s) => { const m = String(s || '').match(/(\d+)\.(\d+)\.(\d+)/); return m ? [+m[1], +m[2], +m[3]] : null; };
const newer = (a, b) => { for (let i = 0; i < 3; i++) { if (a[i] !== b[i]) return a[i] > b[i]; } return false; };

function init(ctx) {
  const { app, ipcMain, shell, fs, path, os, log } = ctx;
  let info = { state: 'idle', current: app.getVersion(), latest: '', notes: '', page: SITE, progress: 0, error: '', checkedAt: 0, canInstall: false };
  let asset = null, timer = null;
  const emit = () => { const w = ctx.getHome(); if (w && !w.isDestroyed()) w.webContents.send('update:ev', info); if (ctx.onChange) ctx.onChange(info); };
  const set = (p) => { info = { ...info, ...p }; emit(); };
  const appRoot = () => { const m = String(app.getPath('exe')).match(/^(.*?\.app)\//); return m ? m[1] : ''; };
  const writable = () => { const r = appRoot(); if (!r) return false; try { fs.accessSync(path.dirname(r), fs.constants.W_OK); fs.accessSync(r, fs.constants.W_OK); return true; } catch (e) { return false; } };

  async function check(manual) {
    if (info.state === 'downloading' || info.state === 'installing') return info;
    set({ state: 'checking', error: '' });
    try {
      let latest, notes = '', url = SITE;
      if (process.env.WT_FAKE_UPDATE) { latest = process.env.WT_FAKE_UPDATE; notes = 'Nowy czat z plikami, edytor akcji i pasek poleceń.'; asset = null; }
      else {
        const res = await fetch('https://api.github.com/repos/' + REPO + '/releases/latest', { headers: { 'User-Agent': 'WriteTools', Accept: 'application/vnd.github+json' } });
        if (!res.ok) throw new Error('GitHub: ' + res.status);
        const r = await res.json(), v = parse(r.name) || parse(r.tag_name); if (!v) throw new Error('Brak numeru wersji w wydaniu');
        latest = v.join('.'); notes = String(r.body || '').slice(0, 600); url = r.html_url || SITE;
        const want = 'Write-Tools-' + (process.arch === 'arm64' ? 'arm64' : 'x64') + '.dmg';
        const a = (r.assets || []).find((x) => x.name === want);
        asset = a ? { name: a.name, url: a.browser_download_url, size: a.size, digest: String(a.digest || '') } : null;
      }
      const cur = parse(app.getVersion()), lat = parse(latest);
      const has = !!(cur && lat && newer(lat, cur));
      set({ state: has ? 'available' : 'uptodate', latest, notes, page: url, checkedAt: Date.now(), canInstall: has && app.isPackaged && !!(asset || process.env.WT_FAKE_UPDATE) });
      if (has && !manual && cfgSkipped() !== latest) ctx.notify('Dostępna nowa wersja Write Tools ' + latest + '. Otwórz Ustawienia, żeby ją zainstalować.');
    } catch (e) {
      log('update check failed ' + (e && e.message));
      set({ state: manual ? 'error' : 'idle', error: 'Nie udało się sprawdzić aktualizacji. Sprawdź połączenie z internetem.', checkedAt: Date.now() });
    }
    return info;
  }
  const cfgSkipped = () => ctx.cfg().skippedVersion || '';

  async function download() {
    if (!asset) throw new Error('Brak pliku do pobrania dla tego komputera.');
    const dir = path.join(app.getPath('temp'), 'write-tools-update'); fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, asset.name), res = await fetch(asset.url, { headers: { 'User-Agent': 'WriteTools' }, redirect: 'follow' });
    if (!res.ok) throw new Error('Pobieranie nie powiodło się (' + res.status + ')');
    const total = +res.headers.get('content-length') || asset.size || 0, hash = crypto.createHash('sha256'), out = fs.createWriteStream(file);
    let got = 0, last = 0;
    await new Promise((resolve, reject) => {
      const src = Readable.fromWeb(res.body);
      src.on('data', (c) => { got += c.length; hash.update(c); if (total && Date.now() - last > 120) { last = Date.now(); set({ progress: Math.min(99, Math.round(got * 100 / total)) }); } });
      src.on('error', reject); out.on('error', reject); out.on('finish', resolve); src.pipe(out);
    });
    if (asset.digest.startsWith('sha256:') && asset.digest.slice(7) !== hash.digest('hex')) { try { fs.unlinkSync(file); } catch (e) { /* plik już usunięty */ } throw new Error('Suma kontrolna pobranego pliku się nie zgadza. Spróbuj ponownie.'); }
    return file;
  }

  async function install() {
    if (info.state !== 'available') return { ok: false, msg: 'Nie ma nowej wersji do zainstalowania.' };
    if (!app.isPackaged) return { ok: false, msg: 'Aktualizacja działa tylko w zainstalowanej aplikacji.' };
    try {
      set({ state: 'downloading', progress: 0, error: '' });
      const dmg = await download();
      if (!writable()) { set({ state: 'available', progress: 0 }); shell.openPath(dmg); return { ok: true, manual: true, msg: 'Aplikacja nie ma uprawnień do samopodmiany. Otworzyłem plik instalacyjny: przeciągnij Write Tools do Programów.' }; }
      set({ state: 'installing', progress: 100 });
      const script = path.join(os.tmpdir(), 'write-tools-update.sh'), root = appRoot();
      fs.writeFileSync(script, [
        '#!/bin/bash', 'DMG="$1"; APP="$2"; PID="$3"; MNT=$(mktemp -d /tmp/wt-mnt.XXXXXX)',
        'hdiutil attach "$DMG" -nobrowse -noverify -noautoopen -mountpoint "$MNT" -quiet || { open "$APP"; exit 1; }',
        'while kill -0 "$PID" 2>/dev/null; do sleep 0.3; done',
        'NEW=$(ls -d "$MNT"/*.app 2>/dev/null | head -n 1)',
        'if [ -n "$NEW" ]; then rm -rf "$APP.old"; if mv "$APP" "$APP.old"; then if ditto "$NEW" "$APP"; then rm -rf "$APP.old"; xattr -cr "$APP" 2>/dev/null; else rm -rf "$APP"; mv "$APP.old" "$APP"; fi; fi; fi',
        'hdiutil detach "$MNT" -quiet -force; rm -f "$DMG"', 'open "$APP"', '',
      ].join('\n'), { mode: 0o755 });
      spawn('/bin/bash', [script, dmg, root, String(process.pid)], { detached: true, stdio: 'ignore' }).unref();
      setTimeout(() => { app.isQuitting = true; app.quit(); }, 600);
      return { ok: true };
    } catch (e) {
      log('update install failed ' + (e && e.message)); set({ state: 'available', progress: 0, error: String((e && e.message) || e).slice(0, 160) });
      return { ok: false, msg: info.error };
    }
  }

  ipcMain.handle('update:get', () => info);
  ipcMain.handle('update:check', () => check(true));
  ipcMain.handle('update:install', () => install());
  ipcMain.handle('update:skip', () => { ctx.cfg().skippedVersion = info.latest; ctx.saveCfg(); return true; });
  ipcMain.on('update:page', () => shell.openExternal(info.page || SITE));
  return {
    info: () => info,
    start() { setTimeout(() => check(false), process.env.WT_FAKE_UPDATE ? 3000 : 20000); timer = setInterval(() => check(false), 6 * 3600 * 1000); },
    stop() { clearInterval(timer); },
  };
}

module.exports = { init };
