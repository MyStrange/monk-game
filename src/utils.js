// src/utils.js — только примитивы UI
// Не знает ни об одном DOM-элементе сцены.

// ── Custom pixel-art cursors ────────────────────────────────────────────────
// Flame cursor (hotspot 18 3): candle flame tip at top, 36×54px (3× pixel-art scale)
const _SVG_DEF = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='54'%3E%3Crect x='18' y='3' width='6' height='6' fill='%23280900'/%3E%3Crect x='12' y='9' width='18' height='6' fill='%23280900'/%3E%3Crect x='6' y='15' width='30' height='12' fill='%23280900'/%3E%3Crect x='12' y='27' width='18' height='6' fill='%23280900'/%3E%3Crect x='18' y='33' width='6' height='21' fill='%23200800'/%3E%3Crect x='15' y='0' width='6' height='6' fill='%23fffce8'/%3E%3Crect x='9' y='6' width='18' height='6' fill='%23ffe060'/%3E%3Crect x='3' y='12' width='30' height='12' fill='%23f0a030'/%3E%3Crect x='9' y='24' width='18' height='6' fill='%23cc6010'/%3E%3Crect x='15' y='30' width='6' height='24' fill='%235a2e00'/%3E%3Crect x='15' y='6' width='6' height='9' fill='%23fffff0'/%3E%3C%2Fsvg%3E";
// Lotus cursor (hotspot 24 24): 8-petal gold lotus, 48×48px (3× scale)
const _SVG_PTR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Crect x='24' y='9' width='6' height='6' fill='%230a0812'/%3E%3Crect x='24' y='39' width='6' height='6' fill='%230a0812'/%3E%3Crect x='9' y='24' width='6' height='6' fill='%230a0812'/%3E%3Crect x='39' y='24' width='6' height='6' fill='%230a0812'/%3E%3Crect x='18' y='18' width='6' height='6' fill='%230a0812'/%3E%3Crect x='30' y='18' width='6' height='6' fill='%230a0812'/%3E%3Crect x='18' y='30' width='6' height='6' fill='%230a0812'/%3E%3Crect x='30' y='30' width='6' height='6' fill='%230a0812'/%3E%3Crect x='24' y='15' width='6' height='18' fill='%230a0812'/%3E%3Crect x='15' y='24' width='18' height='6' fill='%230a0812'/%3E%3Crect x='21' y='6' width='6' height='6' fill='%23f0c040'/%3E%3Crect x='21' y='36' width='6' height='6' fill='%23f0c040'/%3E%3Crect x='6' y='21' width='6' height='6' fill='%23f0c040'/%3E%3Crect x='36' y='21' width='6' height='6' fill='%23f0c040'/%3E%3Crect x='15' y='15' width='6' height='6' fill='%23f0c040'/%3E%3Crect x='27' y='15' width='6' height='6' fill='%23f0c040'/%3E%3Crect x='15' y='27' width='6' height='6' fill='%23f0c040'/%3E%3Crect x='27' y='27' width='6' height='6' fill='%23f0c040'/%3E%3Crect x='21' y='12' width='6' height='24' fill='%23f0c040'/%3E%3Crect x='12' y='21' width='24' height='6' fill='%23f0c040'/%3E%3Crect x='21' y='21' width='6' height='6' fill='%23fffce8'/%3E%3C%2Fsvg%3E";
// Full cursor CSS values — ready to assign to canvas.style.cursor
export const CURSOR_DEF = `url("${_SVG_DEF}") 18 3, default`;
export const CURSOR_PTR = `url("${_SVG_PTR}") 24 24, pointer`;

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
    if (e.target.closest(SEL)) { ring.style.display = 'block'; ring.classList.add('active'); }
  });
  document.addEventListener('mouseout', e => {
    if (e.target.closest(SEL)) { ring.style.display = 'none'; ring.classList.remove('active'); }
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

export function showLoading(_label = '') {
  const el = _getLoading();
  if (!el) return;
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
