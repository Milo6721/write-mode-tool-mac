'use strict';
/* Wspólne dla małych okien: położenie zrzutu tła pod matowym szkłem i światło podążające za kursorem */
function applyFrost(bg) {
  const lens = document.querySelector('.frost .lens');
  document.body.classList.remove('dark', 'light'); document.body.classList.add(bg && !bg.dark ? 'light' : 'dark');
  if (!bg) { lens.style.backgroundImage = 'none'; return; }
  const off = 60 - 12; // margines soczewki minus margines panelu (frost.css)
  lens.style.backgroundImage = 'url(' + bg.url + ')'; lens.style.backgroundSize = bg.dw + 'px ' + bg.dh + 'px';
  lens.style.backgroundPosition = (off - (bg.wx - bg.dx)) + 'px ' + (off - (bg.wy - bg.dy)) + 'px';
}
document.addEventListener('mousemove', (e) => {
  const f = document.querySelector('.frost'); if (!f) return; const r = f.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, root = document.documentElement.style;
  root.setProperty('--mx', x + 'px'); root.setProperty('--my', y + 'px'); root.setProperty('--ang', (Math.atan2(x - r.width / 2, -(y - r.height / 2)) * 180 / Math.PI + 180).toFixed(0) + 'deg');
});
function replay(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
