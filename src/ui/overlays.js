// src/ui/overlays.js — глобальные оверлеи: loading, error, meditate-btn, fullscreen
// Простые UI-примитивы; ни одной зависимости от сцен.

import { UI_TIMING } from '../constants.js';

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
  setTimeout(() => { el.style.display = 'none'; }, UI_TIMING.LOADING_FADE_MS);
}

// ── Pray (meditate) button — top-level fixed UI ───────────────────────────
// Кнопка `#pray-btn` живёт на body-уровне (см. index.html) и видна только в
// сценах с ходячим героем/монахом. Каждая такая сцена дёргает setMeditateBtn(true)
// на open и setMeditateBtn(false) на close. CSS показывает кнопку через
// `body[data-meditate]`.
export function setMeditateBtn(show) {
  if (show) document.body.dataset.meditate = '1';
  else      delete document.body.dataset.meditate;
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
