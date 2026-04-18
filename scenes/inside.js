// scenes/inside.js — внутренность дерева: лестница, светящиеся грибы, хрустальное сердце
// Открывается по клику по стволу в scene4 после снятия обоих слоёв.
//
// Зоны (нормализованные 0..1):
//   HEART_ZONE   — кристалл-сердце в центре
//   OPENING_ZONE — круглое отверстие наверху (лес снаружи)
//   STAIRS_ZONE  — деревянная лестница слева
//
// Частицы: бирюзово-голубые споры дрейфуют вверх (без shadowBlur).
// Пульс сердца: мягкий прямоугольный ореол вокруг кристалла.

import { state }          from '../src/state.js';
import { SCREENS }        from '../src/constants.js';
import { showMsgIn, showLoading, hideLoading, showError, setCursor } from '../src/utils.js';
import { resumeMain }     from './main.js';
import { SaveManager }    from '../src/save.js';
import { AudioSystem }    from '../src/audio.js';
import { trackZoneClick } from '../src/achievements.js';
import { getSelectedItem, removeItem } from '../src/inventory.js';
import { renderHotbar }   from '../src/hotbar.js';
import { coverRect, hitZone as _hitNormZone } from '../src/scene-base.js';

// ── BG aspect ratio ────────────────────────────────────────────────────────
const BG_W = 1920, BG_H = 1080;   // 16:9, object-fit:cover адаптирует

// ── Heart sprite image (активное состояние с лотосом) ─────────────────────
// Нормализованные координаты области, которая меняется между base и active:
//   x0=0.36 y0=0.33 → x1=0.69 y1=0.92  (ниша с кристаллом в правой части)
const _HEART_SPRITE = { nx0: 0.36, ny0: 0.33, nx1: 0.69, ny1: 0.92 };
const _heartImg = new Image();
_heartImg.src = 'assets/bg/inside_heart.png';

// ── Hit zones (0..1 relative to BG) ───────────────────────────────────────
const HEART_ZONE   = { x0: 0.36, y0: 0.44, x1: 0.66, y1: 0.90 };
const OPENING_ZONE = { x0: 0.28, y0: 0.00, x1: 0.72, y1: 0.24 };
const STAIRS_ZONE  = { x0: 0.03, y0: 0.20, x1: 0.54, y1: 0.82 };

// ── Scene state ────────────────────────────────────────────────────────────
const S = SaveManager.getScene('inside');
S.heartIdx      = S.heartIdx      ?? 0;
S.stairsIdx     = S.stairsIdx     ?? 0;
S.openingIdx    = S.openingIdx    ?? 0;
S.heartActivated = S.heartActivated ?? false;

// Сообщения до активации (кристальное сердце)
const HEART_MSGS = [
  'Хрусталь холодный. Внутри что-то мерцает — но не отзывается.',
  'Что-то ждёт. Возможно — тебя. Возможно — нет.',
  'Кристалл помнит. Но не говорит что именно.',
  'Холодный и тихий. Как будто спит.',
];

// Сообщения после активации (сердце с лотосом)
const HEART_ACTIVE_MSGS = [
  'Это — ты. Всё, что искал снаружи, было здесь.',
  'Сердце не бьётся. Оно светит.',
  'Ты дотронулся. Ничего не изменилось. Изменилось всё.',
  'Тёплое. Не остывает. Никогда.',
];
const STAIRS_MSGS = [
  'Ступени ведут не вверх и не вниз. Просто — дальше.',
  'Каждая ступень — вопрос, который ты уже задавал.',
  'Дерево помнит каждого, кто поднимался. Теперь — и тебя.',
  'Ты можешь идти вверх. Ты можешь стоять. Дерево подождёт.',
];
const OPENING_MSGS = [
  'Там, откуда ты пришёл. Теперь ты знаешь путь.',
  'Снаружи — лес. Внутри — тоже. Разница только в том, кто смотрит.',
  'Свет приходит сверху. Но источник — здесь.',
];

// ── DOM refs ────────────────────────────────────────────────────────────────
let el, canvas, ctx, msgEl;
let W = 0, H = 0;
let animId = null;

const showMsg = (t, d) => showMsgIn(msgEl, t, d);

// ── Cover math ─────────────────────────────────────────────────────────────
// Вынесено в src/scene-base.js (coverRect + hitZone).
function _bgRect() { return coverRect(W, H, BG_W, BG_H, 'center'); }
function _inZone(cx, cy, z) { return _hitNormZone(cx, cy, z, _bgRect()); }

function _hitZone(cx, cy) {
  if (_inZone(cx, cy, HEART_ZONE))   return 'heart';
  if (_inZone(cx, cy, OPENING_ZONE)) return 'opening';
  if (_inZone(cx, cy, STAIRS_ZONE))  return 'stairs';
  return null;
}

// ── Spore particles ────────────────────────────────────────────────────────
const _SPORE_COLS = [
  '#40e0d0','#20c8b8','#60ece4','#38d4c8',
  '#80f4ec','#50dcd4','#c0fff8','#a0f0e8',
];
let _spores = [];

function _spawnSpores() {
  _spores = Array.from({ length: 50 }, () => ({
    x:         Math.random(),
    y:         Math.random(),
    vy:        -(0.0005 + Math.random() * 0.0018),
    swayAmp:   0.004 + Math.random() * 0.014,
    swayFreq:  0.006 + Math.random() * 0.013,
    swayPhase: Math.random() * Math.PI * 2,
    phase:     Math.random() * Math.PI * 2,
    phaseRate: 0.009 + Math.random() * 0.020,
    sz:        1 + Math.floor(Math.random() * 3),
    col:       _SPORE_COLS[Math.floor(Math.random() * _SPORE_COLS.length)],
  }));
}

// ── Heart pulse центр (relative to BG) ────────────────────────────────────
const HEART_CX = 0.50, HEART_CY = 0.65;

let _tick = 0;

function animate() {
  if (state.activeScreen !== SCREENS.INSIDE) { animId = null; return; }
  ctx.clearRect(0, 0, W, H);
  _tick++;

  const R = _bgRect();

  // Споры
  for (const p of _spores) {
    p.y        += p.vy;
    p.swayPhase += p.swayFreq;
    p.phase     += p.phaseRate;
    if (p.y < -0.06) {
      p.y = 1.0 + Math.random() * 0.20;
      p.x = Math.random();
      p.swayPhase = Math.random() * Math.PI * 2;
    }
    const sway = Math.sin(p.swayPhase) * p.swayAmp;
    const br   = 0.42 + 0.58 * (0.5 + 0.5 * Math.sin(p.phase));
    const px   = Math.round(R.x + (p.x + sway) * R.w);
    const py   = Math.round(R.y + p.y * R.h);
    const s    = p.sz;
    ctx.fillStyle = p.col;
    ctx.globalAlpha = br * 0.13;  ctx.fillRect(px - s*2, py - s*2, s*5, s*5);
    ctx.globalAlpha = br * 0.35;  ctx.fillRect(px - s,   py - s,   s*3, s*3);
    ctx.globalAlpha = br;         ctx.fillRect(px,        py,       s,   s);
  }

  // ── Спрайт активного сердца (лотос) ──────────────────────────────────────
  if (S.heartActivated && _heartImg.complete && _heartImg.naturalWidth) {
    const { nx0, ny0, nx1, ny1 } = _HEART_SPRITE;
    const iw = _heartImg.naturalWidth, ih = _heartImg.naturalHeight;
    ctx.globalAlpha = 1;
    ctx.drawImage(
      _heartImg,
      iw * nx0, ih * ny0, iw * (nx1 - nx0), ih * (ny1 - ny0),  // src
      R.x + nx0 * R.w, R.y + ny0 * R.h,                         // dst pos
      (nx1 - nx0) * R.w, (ny1 - ny0) * R.h                      // dst size
    );
  }

  // Пульс кристалла-сердца
  const hx    = Math.round(R.x + HEART_CX * R.w);
  const hy    = Math.round(R.y + HEART_CY * R.h);
  const pulse = 0.55 + 0.45 * Math.sin(_tick * 0.038);
  const baseR = Math.round(Math.min(R.w, R.h) * 0.07 * pulse);

  // Цвет ореола зависит от состояния: тёплый (лотос) или бирюзовый (кристалл)
  ctx.fillStyle = S.heartActivated ? '#ff8060' : '#60ffee';
  ctx.globalAlpha = pulse * 0.06;  ctx.fillRect(hx - baseR*3, hy - baseR*3, baseR*6, baseR*6);
  ctx.globalAlpha = pulse * 0.12;  ctx.fillRect(hx - baseR*2, hy - baseR*2, baseR*4, baseR*4);
  ctx.globalAlpha = pulse * 0.22;  ctx.fillRect(hx - baseR,   hy - baseR,   baseR*2, baseR*2);

  ctx.globalAlpha = 1;
  animId = requestAnimationFrame(animate);
}

// ── Применить лотос к сердцу ───────────────────────────────────────────────
function _applyFlower() {
  const slot = state.inventory.findIndex(i => i?.id === 'flower');
  if (slot === -1) return;
  removeItem(slot);
  renderHotbar();
  S.heartActivated = true;
  SaveManager.setScene('inside', S);
  AudioSystem.playBell?.();
  showMsg('Лотос касается кристалла. Сердце отзывается. Ты не знаешь чьё.', { story: true, dur: 5500 });
}

// ── onTap ──────────────────────────────────────────────────────────────────
function onTap(cx, cy) {
  if (state.activeScreen !== SCREENS.INSIDE) return;
  const zone = _hitZone(cx, cy);
  if (!zone) return;
  trackZoneClick(`inside_${zone}`);

  if (zone === 'heart') {
    const item = getSelectedItem();
    if (item?.id === 'flower' && !S.heartActivated) {
      _applyFlower();
      return;
    }
    const msgs = S.heartActivated ? HEART_ACTIVE_MSGS : HEART_MSGS;
    showMsg(msgs[S.heartIdx % msgs.length]);
    S.heartIdx++;
  } else if (zone === 'stairs') {
    showMsg(STAIRS_MSGS[S.stairsIdx % STAIRS_MSGS.length]);
    S.stairsIdx++;
  } else {
    showMsg(OPENING_MSGS[S.openingIdx % OPENING_MSGS.length]);
    S.openingIdx++;
  }
  SaveManager.setScene('inside', S);
}

// ── DOM creation ───────────────────────────────────────────────────────────
function createEl() {
  if (document.getElementById('inside')) return;

  el = document.createElement('div');
  el.id = 'inside';
  el.style.cssText = 'position:absolute;inset:0;display:none;z-index:60;overflow:hidden;';

  const bg = document.createElement('img');
  bg.src = 'assets/bg/inside.png';
  bg.style.cssText = 'display:block;width:100%;height:100%;object-fit:cover;';

  canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
  ctx = canvas.getContext('2d');

  const back = document.createElement('button');
  back.className = 'back-btn';
  back.textContent = '←';
  back.onclick = closeSceneInside;
  back.addEventListener('touchend', e => {
    e.stopPropagation(); e.preventDefault(); closeSceneInside();
  }, { passive: false });

  msgEl = document.createElement('div');
  msgEl.className = 'scene-msg';

  el.appendChild(bg); el.appendChild(canvas); el.appendChild(back); el.appendChild(msgEl);
  document.getElementById('wrap').appendChild(el);

  canvas.addEventListener('click', e => {
    const r = canvas.getBoundingClientRect();
    onTap(e.clientX - r.left, e.clientY - r.top);
  });
  canvas.addEventListener('touchend', e => {
    e.preventDefault();
    const t = e.changedTouches[0];
    const r = canvas.getBoundingClientRect();
    onTap(t.clientX - r.left, t.clientY - r.top);
  }, { passive: false });
  canvas.addEventListener('mousemove', e => {
    if (state.activeScreen !== SCREENS.INSIDE) return;
    const r = canvas.getBoundingClientRect();
    setCursor(!!_hitZone(e.clientX - r.left, e.clientY - r.top));
  });
  canvas.addEventListener('mouseleave', () => setCursor(false));
}

// ── Lifecycle ──────────────────────────────────────────────────────────────
export async function openSceneInside() {
  createEl();
  el     = document.getElementById('inside');
  canvas = el.querySelector('canvas');
  ctx    = canvas.getContext('2d');
  msgEl  = el.querySelector('.scene-msg');

  // Спрятать scene4 под нами — мы вошли через дверь в стволе
  const s4 = document.getElementById('scene4');
  if (s4) s4.style.display = 'none';

  showLoading('внутри');
  const bgImg = el.querySelector('img');

  const _onReady = () => {
    hideLoading();
    state.activeScreen = SCREENS.INSIDE;
    el.style.display   = 'block';
    setCursor(false);
    if (AudioSystem.setMode) AudioSystem.setMode('sitting');
    requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      W = canvas.width  = Math.round(r.width);
      H = canvas.height = Math.round(r.height);
      _spawnSpores();
      if (!animId) animate();
    });
    setTimeout(() => {
      if (state.activeScreen !== SCREENS.INSIDE) return;
      showMsgIn(msgEl, 'Ты внутри. Тихо. Пахнет деревом и чем-то давно забытым.', { story: true });
    }, 500);
  };

  const _onFail = () => {
    hideLoading();
    // Тихо возвращаемся в scene4 — без fullscreen-ошибки
    const s4 = document.getElementById('scene4');
    if (s4) s4.style.display = 'block';
  };
  // Тот же double-fire баг что был в buddha: если bg уже cached, И onload,
  // И if(complete) ветка срабатывали одновременно → двойной _spawnSpores +
  // два параллельных animate-цикла. Теперь строго один путь.
  if (bgImg.complete) {
    if (bgImg.naturalWidth) _onReady(); else _onFail();
  } else {
    bgImg.addEventListener('error', _onFail,  { once: true });
    bgImg.addEventListener('load',  _onReady, { once: true });
  }
}

export function closeSceneInside() {
  state.activeScreen = SCREENS.MAIN;
  if (el) el.style.display = 'none';
  if (animId) { cancelAnimationFrame(animId); animId = null; }
  setCursor(false);
  SaveManager.setScene('inside', S);
  resumeMain();
}
window.closeSceneInside = closeSceneInside;
