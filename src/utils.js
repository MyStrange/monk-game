// src/utils.js — только примитивы UI
// Не знает ни об одном DOM-элементе сцены.

// ── Custom pixel-art cursors ────────────────────────────────────────────────
// Flame cursor (hotspot 6 1): candle flame, tip at top, 12×18px
// Shadow rects offset +1+1 behind gold flame body; thin wick at bottom
const _SVG_DEF = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='18'%3E%3Crect x='6' y='1' width='2' height='2' fill='%23280900'/%3E%3Crect x='4' y='3' width='6' height='2' fill='%23280900'/%3E%3Crect x='2' y='5' width='10' height='4' fill='%23280900'/%3E%3Crect x='4' y='9' width='6' height='2' fill='%23280900'/%3E%3Crect x='6' y='11' width='2' height='7' fill='%23200800'/%3E%3Crect x='5' y='0' width='2' height='2' fill='%23fffce8'/%3E%3Crect x='3' y='2' width='6' height='2' fill='%23ffe060'/%3E%3Crect x='1' y='4' width='10' height='4' fill='%23f0a030'/%3E%3Crect x='3' y='8' width='6' height='2' fill='%23cc6010'/%3E%3Crect x='5' y='10' width='2' height='8' fill='%235a2e00'/%3E%3Crect x='5' y='2' width='2' height='3' fill='%23fffff0'/%3E%3C%2Fsvg%3E";
// Lotus cursor (hotspot 8 8): 8-petal gold lotus, centered, 16×16px
// Shadow +1+1, gold petals + cross, bright center
const _SVG_PTR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Crect x='8' y='3' width='2' height='2' fill='%230a0812'/%3E%3Crect x='8' y='13' width='2' height='2' fill='%230a0812'/%3E%3Crect x='3' y='8' width='2' height='2' fill='%230a0812'/%3E%3Crect x='13' y='8' width='2' height='2' fill='%230a0812'/%3E%3Crect x='6' y='6' width='2' height='2' fill='%230a0812'/%3E%3Crect x='10' y='6' width='2' height='2' fill='%230a0812'/%3E%3Crect x='6' y='10' width='2' height='2' fill='%230a0812'/%3E%3Crect x='10' y='10' width='2' height='2' fill='%230a0812'/%3E%3Crect x='8' y='5' width='2' height='6' fill='%230a0812'/%3E%3Crect x='5' y='8' width='6' height='2' fill='%230a0812'/%3E%3Crect x='7' y='2' width='2' height='2' fill='%23f0c040'/%3E%3Crect x='7' y='12' width='2' height='2' fill='%23f0c040'/%3E%3Crect x='2' y='7' width='2' height='2' fill='%23f0c040'/%3E%3Crect x='12' y='7' width='2' height='2' fill='%23f0c040'/%3E%3Crect x='5' y='5' width='2' height='2' fill='%23f0c040'/%3E%3Crect x='9' y='5' width='2' height='2' fill='%23f0c040'/%3E%3Crect x='5' y='9' width='2' height='2' fill='%23f0c040'/%3E%3Crect x='9' y='9' width='2' height='2' fill='%23f0c040'/%3E%3Crect x='7' y='4' width='2' height='8' fill='%23f0c040'/%3E%3Crect x='4' y='7' width='8' height='2' fill='%23f0c040'/%3E%3Crect x='7' y='7' width='2' height='2' fill='%23fffce8'/%3E%3C%2Fsvg%3E";
// Full cursor CSS values — ready to assign to canvas.style.cursor
export const CURSOR_DEF = `url("${_SVG_DEF}") 6 1, default`;
export const CURSOR_PTR = `url("${_SVG_PTR}") 8 8, pointer`;

// ── Hover glow animation (desktop only) ─────────────────────────────────────
// Pulsing golden ring around interactive elements on hover.
// Call once after DOM is ready (from game.js).
export function initHoverAnim() {
  if (window.matchMedia('(pointer:coarse)').matches) return;
  const ring = document.createElement('div');
  ring.id = 'hover-glow';
  document.body.appendChild(ring);

  document.addEventListener('mousemove', e => {
    ring.style.left = e.clientX + 'px';
    ring.style.top  = e.clientY + 'px';
  });

  const SEL = 'button, .slot, .back-btn, #menu-btn, .ui-btn';
  document.addEventListener('mouseover', e => {
    if (e.target.closest(SEL)) ring.style.display = 'block';
  });
  document.addEventListener('mouseout', e => {
    if (e.target.closest(SEL)) ring.style.display = 'none';
  });
}

// ── Mobile detection ───────────────────────────────────────────────────────
export const isMobile = () =>
  window.matchMedia('(pointer:coarse)').matches || window.innerWidth < 768;

// ── Scene messages ─────────────────────────────────────────────────────────
// Каждая сцена делает: const showMsg = (t,d) => showMsgIn(myMsgEl, t, d)
let _msgTimer = null;
export function showMsgIn(el, text, dur = 3200) {
  if (!el) return;
  el.textContent = text;
  el.classList.add('visible');
  clearTimeout(_msgTimer);
  _msgTimer = setTimeout(() => el.classList.remove('visible'), dur);
}

// ── Loading overlay ────────────────────────────────────────────────────────
let _loadingEl = null;
function _getLoading() {
  if (!_loadingEl) _loadingEl = document.getElementById('loading-overlay');
  return _loadingEl;
}

export function showLoading(label = '') {
  const el = _getLoading();
  if (!el) return;
  const txt = el.querySelector('.loading-label');
  if (txt) txt.textContent = label;
  el.style.display = 'flex';
  el.style.opacity  = '1';
}

export function hideLoading() {
  const el = _getLoading();
  if (!el) return;
  el.style.opacity = '0';
  setTimeout(() => { el.style.display = 'none'; }, 400);
}

// ── Error overlay ──────────────────────────────────────────────────────────
export function showError(text) {
  const el = document.getElementById('error-overlay');
  if (!el) { alert(text); return; }
  const msg = el.querySelector('.error-msg');
  if (msg) msg.textContent = text;
  el.style.display = 'flex';
  el.onclick = () => { el.style.display = 'none'; };
}

// ── Fullscreen ─────────────────────────────────────────────────────────────
export function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
}
