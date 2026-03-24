// src/utils.js — только примитивы UI
// Не знает ни об одном DOM-элементе сцены.

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
