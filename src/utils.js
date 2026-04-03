// src/utils.js — только примитивы UI
// Не знает ни об одном DOM-элементе сцены.

// ── Custom pixel-art cursors ────────────────────────────────────────────────
// Default cursor: closed lotus bud 20×26, tip at top, hotspot (10,1). No shadow.
const _SVG_DEF = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='26'%3E%3Crect x='9' y='0' width='2' height='2' fill='%23fffce8'/%3E%3Crect x='8' y='2' width='4' height='3' fill='%23f0c040'/%3E%3Crect x='7' y='5' width='6' height='3' fill='%23f0c040'/%3E%3Crect x='4' y='6' width='4' height='4' fill='%23d4a028'/%3E%3Crect x='12' y='6' width='4' height='4' fill='%23d4a028'/%3E%3Crect x='7' y='8' width='6' height='3' fill='%23c09020'/%3E%3Crect x='5' y='11' width='10' height='2' fill='%238a6010'/%3E%3Crect x='3' y='12' width='2' height='2' fill='%235a7010'/%3E%3Crect x='15' y='12' width='2' height='2' fill='%235a7010'/%3E%3Crect x='9' y='13' width='2' height='10' fill='%235a7010'/%3E%3C%2Fsvg%3E";
// Hover cursor: open lotus 24×24, centered, hotspot (12,12). No shadow.
const _SVG_PTR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Crect x='10' y='3' width='3' height='3' fill='%23f0c040'/%3E%3Crect x='10' y='18' width='3' height='3' fill='%23f0c040'/%3E%3Crect x='3' y='10' width='3' height='3' fill='%23f0c040'/%3E%3Crect x='18' y='10' width='3' height='3' fill='%23f0c040'/%3E%3Crect x='7' y='7' width='3' height='3' fill='%23f0c040'/%3E%3Crect x='13' y='7' width='3' height='3' fill='%23f0c040'/%3E%3Crect x='7' y='13' width='3' height='3' fill='%23f0c040'/%3E%3Crect x='13' y='13' width='3' height='3' fill='%23f0c040'/%3E%3Crect x='10' y='6' width='3' height='12' fill='%23f0c040'/%3E%3Crect x='6' y='10' width='12' height='3' fill='%23f0c040'/%3E%3Crect x='10' y='10' width='3' height='3' fill='%23fffce8'/%3E%3C%2Fsvg%3E";
// Full cursor CSS values — ready to assign to canvas.style.cursor
export const CURSOR_DEF = `url("${_SVG_DEF}") 10 1, default`;
export const CURSOR_PTR = `url("${_SVG_PTR}") 12 12, pointer`;

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
