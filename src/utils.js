// src/utils.js — только примитивы UI
// Не знает ни об одном DOM-элементе сцены.

import { UI_TIMING } from './constants.js';

// ── Custom pixel-art cursors ────────────────────────────────────────────────
// Default: chunky bud 20×28 — 5 blocks, no fine details, hotspot (10, 2)
const _SVG_DEF = "data:image/svg+xml,%3Csvg width='20' height='28' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='8' y='0' width='4' height='4' fill='%23fffce8'/%3E%3Crect x='6' y='4' width='8' height='6' fill='%23f0c040'/%3E%3Crect x='4' y='10' width='12' height='6' fill='%23d4a028'/%3E%3Crect x='6' y='16' width='8' height='4' fill='%23c09020'/%3E%3Crect x='8' y='20' width='4' height='8' fill='%234a6018'/%3E%3C%2Fsvg%3E";
// Hover: chunky open lotus 20×20 — 9 blocks, centered, hotspot (10, 10)
const _SVG_PTR = "data:image/svg+xml,%3Csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='8' y='2' width='4' height='6' fill='%23f0c040'/%3E%3Crect x='8' y='12' width='4' height='6' fill='%23f0c040'/%3E%3Crect x='2' y='8' width='6' height='4' fill='%23f0c040'/%3E%3Crect x='12' y='8' width='6' height='4' fill='%23f0c040'/%3E%3Crect x='4' y='4' width='4' height='4' fill='%23d4a028'/%3E%3Crect x='12' y='4' width='4' height='4' fill='%23d4a028'/%3E%3Crect x='4' y='12' width='4' height='4' fill='%23d4a028'/%3E%3Crect x='12' y='12' width='4' height='4' fill='%23d4a028'/%3E%3Crect x='8' y='8' width='4' height='4' fill='%23fffce8'/%3E%3C%2Fsvg%3E";
// Arrow LEFT 20×20, hotspot (0,10) — solid filled triangle + shaft, tip at left edge.
// Triangle widens symmetrically around y=10; shaft 8px tall extends right to x=20.
const _SVG_ARL = "data:image/svg+xml,%3Csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='10' y='0' width='2' height='2' fill='%23f0c040'/%3E%3Crect x='8' y='2' width='4' height='2' fill='%23f0c040'/%3E%3Crect x='6' y='4' width='6' height='2' fill='%23f0c040'/%3E%3Crect x='4' y='6' width='8' height='2' fill='%23f0c040'/%3E%3Crect x='2' y='8' width='10' height='2' fill='%23f0c040'/%3E%3Crect x='0' y='10' width='12' height='2' fill='%23f0c040'/%3E%3Crect x='2' y='12' width='10' height='2' fill='%23f0c040'/%3E%3Crect x='4' y='14' width='8' height='2' fill='%23f0c040'/%3E%3Crect x='6' y='16' width='6' height='2' fill='%23f0c040'/%3E%3Crect x='8' y='18' width='4' height='2' fill='%23f0c040'/%3E%3Crect x='12' y='6' width='8' height='8' fill='%23f0c040'/%3E%3Crect x='0' y='10' width='2' height='2' fill='%23fffce8'/%3E%3C%2Fsvg%3E";
// Arrow RIGHT 20×20, hotspot (19,10) — mirror of LEFT, tip at right edge
const _SVG_ARR = "data:image/svg+xml,%3Csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='8' y='0' width='2' height='2' fill='%23f0c040'/%3E%3Crect x='8' y='2' width='4' height='2' fill='%23f0c040'/%3E%3Crect x='8' y='4' width='6' height='2' fill='%23f0c040'/%3E%3Crect x='8' y='6' width='8' height='2' fill='%23f0c040'/%3E%3Crect x='8' y='8' width='10' height='2' fill='%23f0c040'/%3E%3Crect x='8' y='10' width='12' height='2' fill='%23f0c040'/%3E%3Crect x='8' y='12' width='10' height='2' fill='%23f0c040'/%3E%3Crect x='8' y='14' width='8' height='2' fill='%23f0c040'/%3E%3Crect x='8' y='16' width='6' height='2' fill='%23f0c040'/%3E%3Crect x='8' y='18' width='4' height='2' fill='%23f0c040'/%3E%3Crect x='0' y='6' width='8' height='8' fill='%23f0c040'/%3E%3Crect x='18' y='10' width='2' height='2' fill='%23fffce8'/%3E%3C%2Fsvg%3E";
// Arrow UP 20×20, hotspot (10,0) — solid filled triangle on top, 4px shaft below
const _SVG_ARU = "data:image/svg+xml,%3Csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='9' y='0' width='2' height='2' fill='%23f0c040'/%3E%3Crect x='7' y='2' width='6' height='2' fill='%23f0c040'/%3E%3Crect x='5' y='4' width='10' height='2' fill='%23f0c040'/%3E%3Crect x='3' y='6' width='14' height='2' fill='%23f0c040'/%3E%3Crect x='1' y='8' width='18' height='2' fill='%23f0c040'/%3E%3Crect x='0' y='10' width='20' height='2' fill='%23f0c040'/%3E%3Crect x='8' y='12' width='4' height='8' fill='%23f0c040'/%3E%3Crect x='9' y='0' width='2' height='2' fill='%23fffce8'/%3E%3C%2Fsvg%3E";
// Full cursor CSS values — ready to assign to canvas.style.cursor
export const CURSOR_DEF         = `url("${_SVG_DEF}") 10 2, default`;
export const CURSOR_PTR         = `url("${_SVG_PTR}") 10 10, pointer`;
export const CURSOR_ARROW_LEFT  = `url("${_SVG_ARL}") 0 10, pointer`;
export const CURSOR_ARROW_RIGHT = `url("${_SVG_ARR}") 19 10, pointer`;
export const CURSOR_ARROW_UP    = `url("${_SVG_ARU}") 10 0, pointer`;

// ── Centralised cursor — все сцены вызывают это вместо element.style.cursor ─
// Всегда выставляем курсор явно (не через CSS-fallback), чтобы работало
// корректно во всех сценах включая те, где нет <canvas>.
//
// Режимы:
//   setCursor(false / 'def' / null)     → обычный (бутон)
//   setCursor(true  / 'ptr')            → hover (лотос)
//   setCursor('left' | 'right' | 'up')  → стрелка перехода между сценами
export function setCursor(mode) {
  let css;
  if (mode === true || mode === 'ptr')   css = CURSOR_PTR;
  else if (mode === 'left')              css = CURSOR_ARROW_LEFT;
  else if (mode === 'right')             css = CURSOR_ARROW_RIGHT;
  else if (mode === 'up')                css = CURSOR_ARROW_UP;
  else                                   css = CURSOR_DEF;
  document.body.style.cursor = css;
}

// ── Edge navigation helper — переход между сценами через край экрана ───────
// Единая точка для всех сцен: левый/правый/верхний край ведёт к другой сцене.
// Ширина зоны считается в display-пикселях контейнера.
//
// Использование в сцене:
//   const nav = { left: { scene: 'achievements' }, right: { scene: 'foo' } };
//   // в mousemove:
//   const m = edgeNavMode(el, e, nav);   // 'left' | 'right' | 'up' | null
//   if (m) { setCursor(m); return; }
//   // в click:
//   if (tryEdgeNavClick(el, e, nav)) return;
//
// up — это НЕ полоса сверху, а зона (не все сцены имеют такой переход);
// если нужен up, передать { up: { scene, zone: { x0,y0,x1,y1 } } } с normalized
// координатами относительно контейнера.
export const EDGE_NAV_PX = 60;

function _getXY(el, e) {
  const r  = el.getBoundingClientRect();
  const pt = e.changedTouches?.[0] || e.touches?.[0] || e;
  return { cx: pt.clientX - r.left, cy: pt.clientY - r.top, w: r.width, h: r.height };
}

export function edgeNavMode(el, e, config) {
  if (!el || !config) return null;
  const { cx, cy, w, h } = _getXY(el, e);
  if (config.left  && cx < EDGE_NAV_PX)     return 'left';
  if (config.right && cx > w - EDGE_NAV_PX) return 'right';
  if (config.up) {
    const z = config.up.zone;
    if (z) {
      if (cx >= z.x0 * w && cx <= z.x1 * w &&
          cy >= z.y0 * h && cy <= z.y1 * h) return 'up';
    } else if (cy < EDGE_NAV_PX) return 'up';
  }
  return null;
}

// Пытается навигировать по краю. Возвращает true если перешли (click поглощён).
// Импортирует openScene лениво чтобы избежать циклической зависимости.
export async function tryEdgeNavClick(el, e, config) {
  const m = edgeNavMode(el, e, config);
  if (!m) return false;
  const target = config[m]?.scene;
  if (!target) return false;
  e.stopPropagation?.();
  e.preventDefault?.();
  const { openScene } = await import('./nav.js');
  openScene(target);
  return true;
}

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
      document.body.style.cursor === CURSOR_PTR
    );
    if (isHot) { ring.style.display = 'block'; ring.classList.add('active'); }
    else        { ring.style.display = 'none';  ring.classList.remove('active'); }
  });
}

// ── Mobile detection ───────────────────────────────────────────────────────
export const isMobile = () =>
  window.matchMedia('(pointer:coarse)').matches || window.innerWidth < 768;

// ── Scene messages — replacement + story priority ─────────────────────────
// Два типа:
//   • regular (default) — одно активное сообщение, автоскрытие по таймеру,
//     новый вызов МГНОВЕННО заменяет предыдущий.
//   • story ({story:true}) — имеет приоритет. Пока висит, regular-вызовы
//     игнорируются и дёргают текущее сообщение (bounce).
//     Закрывается по клику (или через dur, если задано).
//
// Вызовы:
//   showMsgIn(el, text)                       // regular, 3200мс
//   showMsgIn(el, text, 5000)                 // regular, кастом dur
//   showMsgIn(el, text, {story:true})         // story, click-to-dismiss
//   showMsgIn(el, text, {story:true, dur:4000}) // story с автотаймером
//   showMsgIn(el, text, {story:true, onDismiss: fn}) // callback после закрытия
const _msgState = new WeakMap();
function _getMsgState(el) {
  let s = _msgState.get(el);
  if (!s) { s = { current: null, storyActive: false, storyDismiss: null };
            _msgState.set(el, s); }
  return s;
}
// Мгновенное удаление — без fade-out, чтобы не было наложения двух сообщений
// и последующего дёрганья при смене подсказки.
function _removeItem(item) {
  if (!item) return;
  item.remove();
}
function _bounce(item) {
  if (!item) return;
  item.classList.remove('bounce');
  void item.offsetWidth; // reflow чтобы анимация перезапустилась
  item.classList.add('bounce');
}

export function showMsgIn(el, text, durOrOpts = {}) {
  if (!el) return;
  const opts  = typeof durOrOpts === 'number' ? { dur: durOrOpts } : durOrOpts;
  const story = !!opts.story;
  const s     = _getMsgState(el);

  // Story активна и это regular → bounce текущее сообщение, drop новое
  if (s.storyActive && !story) { _bounce(s.current); return; }

  // Убираем предыдущее (story или regular) — новый story заменяет всё
  if (s.storyDismiss) { s.storyDismiss(true); s.storyDismiss = null; }
  _removeItem(s.current);

  const item = document.createElement('div');
  item.className = 'scene-msg-item' + (story ? ' story' : '');
  item.textContent = text;
  el.appendChild(item);
  requestAnimationFrame(() => item.classList.add('visible'));
  s.current = item;

  if (story) {
    s.storyActive = true;
    const dur = opts.dur ?? null;
    let timer = null;
    let capListener = null;

    const dismiss = (silent = false) => {
      if (s.current !== item) return;
      if (timer) { clearTimeout(timer); timer = null; }
      if (capListener) {
        document.removeEventListener('click',    capListener, true);
        document.removeEventListener('touchend', capListener, true);
        capListener = null;
      }
      s.storyActive  = false;
      s.storyDismiss = null;
      s.current      = null;
      _removeItem(item);
      if (!silent && opts.onDismiss) opts.onDismiss();
    };
    s.storyDismiss = dismiss;

    if (dur != null) {
      timer = setTimeout(() => dismiss(), dur);
      // Глобальное правило: пока story-сообщение с дюрацией висит,
      // любой клик по странице ПОКАЧИВАЕТ окно (но не закрывает).
      // Это даёт пользователю визуальный фидбек «подожди, я ещё читаю».
      // Раньше такое было только в scene2 (камни), теперь везде.
      setTimeout(() => {
        capListener = () => _bounce(s.current);
        document.addEventListener('click',    capListener, true);
        document.addEventListener('touchend', capListener, true);
      }, UI_TIMING.STORY_CAP_DELAY);
    } else {
      // Без дюрации — закрывается по ЛЮБОМУ клику (click-to-dismiss).
      setTimeout(() => {
        capListener = () => dismiss();
        document.addEventListener('click',    capListener, true);
        document.addEventListener('touchend', capListener, true);
      }, UI_TIMING.STORY_CAP_DELAY);
    }
  } else {
    const dur = opts.dur ?? 3200;
    setTimeout(() => {
      if (s.current !== item) return;
      s.current = null;
      _removeItem(item);
    }, dur);
  }
}

// Проверить, показывается ли сейчас сюжетное сообщение
export function isStoryActive(el) {
  return !!el && _getMsgState(el).storyActive;
}

// Программно закрыть текущее сюжетное сообщение
export function dismissStoryIn(el) {
  const s = _getMsgState(el);
  if (s.storyDismiss) s.storyDismiss();
}

// ── Single choice block — вопрос + кнопки ответов ─────────────────────────
// Один элемент внизу: сверху prompt, под ним кнопки. Блокирует всё как story.
// options: [{text, value?}] — value передаётся в onPick, иначе text
// onPick(value, text) вызывается при выборе; блок удаляется автоматически.
export function showChoiceIn(el, prompt, options, onPick) {
  if (!el) return;
  const s = _getMsgState(el);
  // Убираем текущее (story или regular)
  if (s.storyDismiss) { s.storyDismiss(true); s.storyDismiss = null; }
  _removeItem(s.current);

  const box = document.createElement('div');
  box.className = 'scene-choice';

  const p = document.createElement('div');
  p.className = 'scene-choice-prompt';
  p.textContent = prompt;                   // \n → перенос (CSS white-space:pre-line)
  box.appendChild(p);

  const btns = document.createElement('div');
  btns.className = 'scene-choice-btns';

  // Гард от двойных кликов и повторного срабатывания во время фейда
  let picked = false;
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'scene-choice-btn';
    btn.textContent = opt.text;
    btn.onclick = () => {
      if (picked) return;
      picked = true;
      s.storyActive  = false;
      s.storyDismiss = null;
      s.current      = null;
      // Блокируем повторные клики, пока блок уезжает
      box.style.pointerEvents = 'none';
      box.classList.remove('visible');
      // Ждём завершения CSS-фейда (transition .25s), и только после удаления
      // блока запускаем onPick — иначе ответ появляется поверх уезжающего блока.
      setTimeout(() => {
        box.remove();
        onPick?.(opt.value ?? opt.text, opt.text);
      }, UI_TIMING.MSG_FADE_MS);
    };
    btns.appendChild(btn);
  });
  box.appendChild(btns);

  el.appendChild(box);
  requestAnimationFrame(() => box.classList.add('visible'));
  s.current      = box;
  s.storyActive  = true;
  s.storyDismiss = () => {
    s.storyActive = false;
    s.storyDismiss = null;
    s.current = null;
    box.classList.remove('visible');
    setTimeout(() => box.remove(), UI_TIMING.MSG_BOUNCE_MS - 150);
  };
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
  setTimeout(() => { el.style.display = 'none'; }, UI_TIMING.LOADING_FADE_MS);
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
  // Yellow / orange / white palette
  const COLORS = ['#f0c040','#ffe066','#ffb020','#ff8800','#ffd080','#fff0a0','#ffffff','#ffcc44','#ffa030','#ffe8b0'];
  const N = 80;
  let flies = [], animId = null;

  function _spawnFlies() {
    const W = canvas.width, H = canvas.height;
    flies = Array.from({length: N}, () => {
      const r = Math.random();
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -(Math.random() * 0.55 + 0.1),
        sz: r < 0.15 ? 3 : 2,  // smaller: max 3px
        col: COLORS[Math.floor(Math.random() * COLORS.length)],
        phase: Math.random() * Math.PI * 2,
        rate:  Math.random() * 0.022 + 0.007,
      };
    });
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
      // pulse: 0.3…1.0, same formula as scene4
      const br = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(f.phase));
      f.x += f.vx + Math.sin(f.phase * 0.6) * 0.35;
      f.y += f.vy;
      if (f.y < -8)    { f.y = H + 4; f.x = Math.random() * W; }
      if (f.x < -8)    f.x = W + 4;
      if (f.x > W + 8) f.x = -4;
      const px = Math.round(f.x), py = Math.round(f.y);
      ctx.fillStyle = f.col;
      // soft glow halo — larger rect at low alpha (project style, no shadowBlur)
      ctx.globalAlpha = br * 0.22;
      ctx.fillRect(px - f.sz, py - f.sz, f.sz * 3, f.sz * 3);
      // outer halo ring
      ctx.globalAlpha = br * 0.10;
      ctx.fillRect(px - f.sz * 2, py - f.sz * 2, f.sz * 5, f.sz * 5);
      // bright pixel core
      ctx.globalAlpha = br;
      ctx.fillRect(px, py, f.sz, f.sz);
    }
    ctx.globalAlpha = 1;
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
