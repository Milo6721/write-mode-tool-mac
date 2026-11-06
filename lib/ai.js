'use strict';
/* Wspólny klient API Anthropic: strumieniowanie SSE z ponowieniem bez parametru "thinking" (używany przez czat, pasek poleceń, tłumacza i edytor akcji) */
const noThinking = new Set();

const post = (key, body, signal) => fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST', signal,
  headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
  body: JSON.stringify(body),
});

function errorText(status, msg) {
  if (status === 401) return 'Klucz API jest nieprawidłowy.';
  if (status === 429) return 'Przekroczono limit zapytań. Spróbuj za chwilę.';
  if (status === 413) return 'Pliki są za duże dla AI. Spróbuj z mniejszymi.';
  return 'Błąd AI: ' + (msg || status);
}

/* stream({ key, model, system, messages, maxTokens, signal, onText(delta, all), log }) -> { text, stop } albo { error } albo { aborted } */
async function stream({ key, model, system, messages, maxTokens = 4096, signal, onText, log = () => {} }) {
  if (!key) return { text: '', error: 'Brak klucza API. Dodaj klucz w Ustawieniach.' };
  const base = { model, max_tokens: maxTokens, stream: true, system, messages };
  try {
    let res = await post(key, noThinking.has(model) ? base : { ...base, thinking: { type: 'disabled' } }, signal);
    if (res.status === 400 && !noThinking.has(model)) { log('thinking param rejected for ' + model + ', retrying without'); noThinking.add(model); res = await post(key, base, signal); }
    if (!res.ok) { let msg = ''; try { msg = (await res.json()).error.message; } catch (e) { /* brak treści */ } return { text: '', error: errorText(res.status, msg) }; }
    const dec = new TextDecoder(); let buf = '', text = '', stop = '', apiErr = '';
    const handle = (line) => {
      line = line.trim(); if (!line.startsWith('data:')) return;
      let ev; try { ev = JSON.parse(line.slice(5)); } catch (e) { return; }
      if (ev.type === 'content_block_delta' && ev.delta && typeof ev.delta.text === 'string' && ev.delta.text) { text += ev.delta.text; if (onText) onText(ev.delta.text, text); }
      else if (ev.type === 'message_delta' && ev.delta && ev.delta.stop_reason) stop = ev.delta.stop_reason;
      else if (ev.type === 'error' && ev.error) apiErr = ev.error.message || ev.error.type || 'unknown';
    };
    for await (const part of res.body) {
      buf += dec.decode(part, { stream: true }); let i;
      while ((i = buf.indexOf('\n')) >= 0) { handle(buf.slice(0, i)); buf = buf.slice(i + 1); }
    }
    if (buf) handle(buf);
    if (!text) return { text: '', error: apiErr ? 'Błąd AI: ' + apiErr : 'AI nie zwróciło tekstu (' + (stop || 'brak powodu') + '). Spróbuj ponownie.' };
    return { text, stop };
  } catch (e) {
    if (e && e.name === 'AbortError') return { text: '', aborted: true };
    log('AI fetch error ' + (e && (e.stack || e)));
    return { text: '', error: 'Nie udało się połączyć z AI: ' + String((e && e.message) || e).slice(0, 120) };
  }
}

const complete = (opts) => stream({ ...opts, onText: null });

module.exports = { stream, complete };
