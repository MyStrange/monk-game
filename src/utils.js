// src/utils.js — только примитивы UI
// Не знает ни об одном DOM-элементе сцены.

// ── Custom pixel-art cursors ────────────────────────────────────────────────
// Default: chunky bud 20×28 — 5 blocks, no fine details, hotspot (10, 2)
const _SVG_DEF = "data:image/svg+xml,%3Csvg width='20' height='28' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='8' y='0' width='4' height='4' fill='%23fffce8'/%3E%3Crect x='6' y='4' width='8' height='6' fill='%23f0c040'/%3E%3Crect x='4' y='10' width='12' height='6' fill='%23d4a028'/%3E%3Crect x='6' y='16' width='8' height='4' fill='%23c09020'/%3E%3Crect x='8' y='20' width='4' height='8' fill='%234a6018'/%3E%3C%2Fsvg%3E";
// Hover: chunky open lotus 20×20 — 9 blocks, centered, hotspot (10, 10)
const _SVG_PTR = "data:image/svg+xml,%3Csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='8' y='2' width='4' height='6' fill='%23f0c040'/%3E%3Crect x='8' y='12' width='4' height='6' fill='%23f0c040'/%3E%3Crect x='2' y='8' width='6' height='4' fill='%23f0c040'/%3E%3Crect x='12' y='8' width='6' height='4' fill='%23f0c040'/%3E%3Crect x='4' y='4' width='4' height='4' fill='%23d4a028'/%3E%3Crect x='12' y='4' width='4' height='4' fill='%23d4a028'/%3E%3Crect x='4' y='12' width='4' height='4' fill='%23d4a028'/%3E%3Crect x='12' y='12' width='4' height='4' fill='%23d4a028'/%3E%3Crect x='8' y='8' width='4' height='4' fill='%23fffce8'/%3E%3C%2Fsvg%3E";
// Full cursor CSS values — ready to assign to canvas.style.cursor
export const CURSOR_DEF = `url("${_SVG_DEF}") 10 2, default`;
export const CURSOR_PTR = `url("${_SVG_PTR}") 10 10, pointer`;

// ── Hover glow animation (desktop only) ─────────────────────────────────────
// Pulsing golden ring around interactive elements on hover.
// Detects both DOM buttons and canvas game objects (via cursor check).
// Call once after DOM is ready (from game.js).
export function initHoverAnim() {
  if (window.matchMedia('(pointer:coarse)').matches) return;
  const ring = document.createElement('div');
  ring.id = 'hover-glow';
  document.body.appendChild(ring);

  const SEL = 'button, .slot, .back-btn, #menu-btn, .ui-btn';

  document.addEventListener('mousemove', e => {
    ring.style.left = e.clientX + 'px';
    ring.style.top  = e.clientY + 'px';
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const isHot = el && (
      el.closest(SEL) ||
      (el.tagName === 'CANVAS' && el.style.cursor === CURSOR_PTR)
    );
    if (isHot) { ring.style.display = 'block'; ring.classList.add('active'); }
    else        { ring.style.display = 'none';  ring.classList.remove('active'); }
  });
}

// ── Mobile detection ───────────────────────────────────────────────────────
export const isMobile = () =>
  window.matchMedia('(pointer:coarse)').matches || window.innerWidth < 768;

// ── Scene messages — stacking system ──────────────────────────────────────
// Each call creates a .scene-msg-item child that slides in and auto-removes.
// Multiple calls stack messages above each other with smooth animation.
// Каждая сцена делает: const showMsg = (t,d) => showMsgIn(myMsgEl, t, d)
export function showMsgIn(el, text, dur = 3200) {
  if (!el) return;
  const item = document.createElement('div');
  item.className = 'scene-msg-item';
  item.textContent = text;
  el.appendChild(item);
  requestAnimationFrame(() => item.classList.add('visible'));
  setTimeout(() => {
    item.classList.remove('visible');
    setTimeout(() => item.remove(), 300);
  }, dur);
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

// ── Portrait rotate overlay — pixel fireflies ──────────────────────────────
export function initRotateOverlay() {
  if (!window.matchMedia('(pointer:coarse)').matches) return; // desktop: skip
  const overlay = document.getElementById('rotate-overlay');
  const canvas  = document.getElementById('rotate-canvas');
  if (!overlay || !canvas) return;

  const ctx = canvas.getContext('2d');
  const COLORS = ['#c8ff60','#60ffc0','#f0ffb0','#ffe880','#a0ffcc','#b8ffb0','#ffffff'];
  const N = 60;
  let flies = [], animId = null;

  function _spawnFlies() {
    const W = canvas.width, H = canvas.height;
    flies = Array.from({length: N}, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -(Math.random() * 0.6 + 0.15),
      sz: Math.random() < 0.4 ? 4 : 2,
      col: COLORS[Math.floor(Math.random() * COLORS.length)],
      phase: Math.random() * Math.PI * 2,
      rate:  Math.random() * 0.025 + 0.008,
    }));
  }

  function _resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    if (flies.length === 0) _spawnFlies();
  }

  function _tick() {
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    for (const f of flies) {
      f.phase += f.rate;
      const alpha = 0.35 + 0.65 * Math.abs(Math.sin(f.phase));
      f.x += f.vx + Math.sin(f.phase * 0.6) * 0.35;
      f.y += f.vy;
      if (f.y < -8)    { f.y = H + 4; f.x = Math.random() * W; }
      if (f.x < -8)    f.x = W + 4;
      if (f.x > W + 8) f.x = -4;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowBlur  = f.sz * 6;
      ctx.shadowColor = f.col;
      ctx.fillStyle   = f.col;
      ctx.fillRect(Math.round(f.x), Math.round(f.y), f.sz, f.sz);
      ctx.restore();
    }
    animId = requestAnimationFrame(_tick);
  }

  function _start() { _resize(); if (!animId) animId = requestAnimationFrame(_tick); }
  function _stop()  { if (animId) { cancelAnimationFrame(animId); animId = null; } }

  const mq = window.matchMedia('(orientation:portrait)');
  function _onOrient() { mq.matches ? _start() : _stop(); }
  mq.addEventListener('change', _onOrient);
  window.addEventListener('resize', () => { if (mq.matches) _resize(); });
  _onOrient();
}

// ── Fullscreen ─────────────────────────────────────────────────────────────
export function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
}
