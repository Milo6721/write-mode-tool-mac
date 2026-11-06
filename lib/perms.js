'use strict';
/* Zgody systemowe: stan na żywo (Dostępność, Nagrywanie ekranu), testy Automatyzacji dla Wiadomości, Notatek, Przypomnień, Kontaktów i System Events */
const { execFile } = require('child_process');

const PANES = {
  accessibility: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility',
  screen: 'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture',
  automation: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Automation',
  contacts: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Contacts',
  notifications: 'x-apple.systempreferences:com.apple.Notifications-Settings.extension',
};
const TESTS = {
  events: { script: 'tell application "System Events" to get name of first process whose frontmost is true' },
  messages: { script: 'tell application "Messages" to get name' },
  notes: { script: 'tell application "Notes" to get name' },
  reminders: { script: 'tell application "Reminders" to get name' },
  contacts: { script: "Application('Contacts').name()", lang: 'JavaScript' },
};

function runOsa(script, lang) {
  return new Promise((resolve) => {
    execFile('osascript', [...(lang ? ['-l', lang] : []), '-e', script], { timeout: 20000 }, (err, out, errOut) => resolve({ ok: !err, err: err ? String(errOut || err.message) : '' }));
  });
}

function init(ctx) {
  const { ipcMain, shell, systemPreferences, desktopCapturer, log } = ctx;
  const cached = () => ctx.cfg().perms || {};

  const screenState = () => { try { return systemPreferences.getMediaAccessStatus('screen'); } catch (e) { return 'unknown'; } };
  const status = () => {
    let acc = false; try { acc = systemPreferences.isTrustedAccessibilityClient(false); } catch (e) { acc = false; }
    return { accessibility: acc ? 'granted' : 'denied', screen: screenState(), tests: cached() };
  };

  async function test(kind) {
    const t = TESTS[kind]; if (!t) return { state: 'unknown' };
    const r = await runOsa(t.script, t.lang);
    let state = 'granted';
    if (!r.ok) state = /-1743|not allowed|nie ma zgody|not authorized/i.test(r.err) ? 'denied' : 'unknown';
    const c = ctx.cfg(); c.perms = { ...(c.perms || {}), [kind]: { state, at: Date.now() } }; ctx.saveCfg();
    log('perm test ' + kind + ' -> ' + state);
    return { state, at: Date.now(), err: state === 'unknown' ? r.err.slice(0, 160) : '' };
  }

  ipcMain.handle('perms:status', () => status());
  ipcMain.handle('perms:test', (e, kind) => test(String(kind)));
  ipcMain.handle('perms:request', async (e, kind) => {
    if (kind === 'accessibility') { try { systemPreferences.isTrustedAccessibilityClient(true); } catch (err) { /* ignorujemy */ } }
    else if (kind === 'screen') { try { await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1, height: 1 } }); } catch (err) { /* ignorujemy */ } }
    return status();
  });
  ipcMain.on('perms:open', (e, kind) => { const u = PANES[String(kind)]; if (u) shell.openExternal(u); });
  return { status };
}

module.exports = { init };
