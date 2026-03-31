// src/utils.js — только примитивы UI
// Не знает ни об одном DOM-элементе сцены.

// ── Custom pixel-art cursors ────────────────────────────────────────────────
// Arrow cursor (hotspot 0 0): gold arrow with dark shadow, 16×25px
const _SVG_DEF = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='25'%3E%3Crect x='1' y='1' width='3' height='3' fill='%230a0812'/%3E%3Crect x='1' y='4' width='3' height='3' fill='%230a0812'/%3E%3Crect x='4' y='4' width='3' height='3' fill='%230a0812'/%3E%3Crect x='1' y='7' width='3' height='3' fill='%230a0812'/%3E%3Crect x='4' y='7' width='3' height='3' fill='%230a0812'/%3E%3Crect x='7' y='7' width='3' height='3' fill='%230a0812'/%3E%3Crect x='1' y='10' width='3' height='3' fill='%230a0812'/%3E%3Crect x='4' y='10' width='3' height='3' fill='%230a0812'/%3E%3Crect x='7' y='10' width='3' height='3' fill='%230a0812'/%3E%3Crect x='10' y='10' width='3' height='3' fill='%230a0812'/%3E%3Crect x='1' y='13' width='3' height='3' fill='%230a0812'/%3E%3Crect x='4' y='13' width='3' height='3' fill='%230a0812'/%3E%3Crect x='7' y='13' width='3' height='3' fill='%230a0812'/%3E%3Crect x='4' y='16' width='3' height='3' fill='%230a0812'/%3E%3Crect x='7' y='16' width='3' height='3' fill='%230a0812'/%3E%3Crect x='10' y='16' width='3' height='3' fill='%230a0812'/%3E%3Crect x='7' y='19' width='3' height='3' fill='%230a0812'/%3E%3Crect x='10' y='19' width='3' height='3' fill='%230a0812'/%3E%3Crect x='13' y='19' width='3' height='3' fill='%230a0812'/%3E%3Crect x='10' y='22' width='3' height='3' fill='%230a0812'/%3E%3Crect x='13' y='22' width='3' height='3' fill='%230a0812'/%3E%3Crect x='0' y='0' width='3' height='3' fill='%23f0c040'/%3E%3Crect x='0' y='3' width='3' height='3' fill='%23f0c040'/%3E%3Crect x='3' y='3' width='3' height='3' fill='%23f0c040'/%3E%3Crect x='0' y='6' width='3' height='3' fill='%23f0c040'/%3E%3Crect x='3' y='6' width='3' height='3' fill='%23f0c040'/%3E%3Crect x='6' y='6' width='3' height='3' fill='%23f0c040'/%3E%3Crect x='0' y='9' width='3' height='3' fill='%23f0c040'/%3E%3Crect x='3' y='9' width='3' height='3' fill='%23f0c040'/%3E%3Crect x='6' y='9' width='3' height='3' fill='%23f0c040'/%3E%3Crect x='9' y='9' width='3' height='3' fill='%23f0c040'/%3E%3Crect x='0' y='12' width='3' height='3' fill='%23f0c040'/%3E%3Crect x='3' y='12' width='3' height='3' fill='%23f0c040'/%3E%3Crect x='6' y='12' width='3' height='3' fill='%23f0c040'/%3E%3Crect x='3' y='15' width='3' height='3' fill='%23f0c040'/%3E%3Crect x='6' y='15' width='3' height='3' fill='%23f0c040'/%3E%3Crect x='9' y='15' width='3' height='3' fill='%23f0c040'/%3E%3Crect x='6' y='18' width='3' height='3' fill='%23f0c040'/%3E%3Crect x='9' y='18' width='3' height='3' fill='%23f0c040'/%3E%3Crect x='12' y='18' width='3' height='3' fill='%23f0c040'/%3E%3Crect x='9' y='21' width='3' height='3' fill='%23f0c040'/%3E%3Crect x='12' y='21' width='3' height='3' fill='%23f0c040'/%3E%3C/svg%3E";
// Cross cursor (hotspot 6 6): gold diamond/plus for interactive hover, 16×16px
const _SVG_PTR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Crect x='7' y='1' width='3' height='3' fill='%230a0812'/%3E%3Crect x='4' y='4' width='3' height='3' fill='%230a0812'/%3E%3Crect x='7' y='4' width='3' height='3' fill='%230a0812'/%3E%3Crect x='10' y='4' width='3' height='3' fill='%230a0812'/%3E%3Crect x='1' y='7' width='3' height='3' fill='%230a0812'/%3E%3Crect x='4' y='7' width='3' height='3' fill='%230a0812'/%3E%3Crect x='7' y='7' width='3' height='3' fill='%230a0812'/%3E%3Crect x='10' y='7' width='3' height='3' fill='%230a0812'/%3E%3Crect x='13' y='7' width='3' height='3' fill='%230a0812'/%3E%3Crect x='4' y='10' width='3' height='3' fill='%230a0812'/%3E%3Crect x='7' y='10' width='3' height='3' fill='%230a0812'/%3E%3Crect x='10' y='10' width='3' height='3' fill='%230a0812'/%3E%3Crect x='7' y='13' width='3' height='3' fill='%230a0812'/%3E%3Crect x='6' y='0' width='3' height='3' fill='%23f0c040'/%3E%3Crect x='3' y='3' width='3' height='3' fill='%23f0c040'/%3E%3Crect x='6' y='3' width='3' height='3' fill='%23f0c040'/%3E%3Crect x='9' y='3' width='3' height='3' fill='%23f0c040'/%3E%3Crect x='0' y='6' width='3' height='3' fill='%23f0c040'/%3E%3Crect x='3' y='6' width='3' height='3' fill='%23f0c040'/%3E%3Crect x='6' y='6' width='3' height='3' fill='%23f0c040'/%3E%3Crect x='9' y='6' width='3' height='3' fill='%23f0c040'/%3E%3Crect x='12' y='6' width='3' height='3' fill='%23f0c040'/%3E%3Crect x='3' y='9' width='3' height='3' fill='%23f0c040'/%3E%3Crect x='6' y='9' width='3' height='3' fill='%23f0c040'/%3E%3Crect x='9' y='9' width='3' height='3' fill='%23f0c040'/%3E%3Crect x='6' y='12' width='3' height='3' fill='%23f0c040'/%3E%3C/svg%3E";
// Full cursor CSS values — ready to assign to canvas.style.cursor
export const CURSOR_DEF = `url("${_SVG_DEF}") 0 0, default`;
export const CURSOR_PTR = `url("${_SVG_PTR}") 6 6, pointer`;

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
