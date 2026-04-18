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
import { resumeMain, setMeditating } from './main.js';
import { SaveManager }    from '../src/save.js';
import { AudioSystem }    from '../src/audio.js';
import { trackZoneClick } from '../src/achievements.js';
import { getSelectedItem, removeItem } from '../src/inventory.js';
import { renderHotbar }   from '../src/hotbar.js';
import { coverRect, hitZone as _hitNormZone } from '../src/scene-base.js';

// ── BG aspect ratio ────────────────────────────────────────────────────────
const BG_W = 1920, BG_H = 1080;   // 16:9, object-fit:cover адаптирует

// Активный фон подключается как второй <img> в createEl (dual-layer + opacity).
// Раньше тут был canvas-crop через _HEART_SPRITE — обрезало по прямоугольнику
// и выглядело криво. Теперь меняется весь кадр целиком через CSS transition.

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

// Сообщения после активации (сердце с гибискусом)
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
// Клик по отверстию = выход вверх к сцене парения. Сообщения короткие,
// потому что сразу после них запускается переход (1.4с).
const OPENING_MSGS = [
  'Ты поднимаешься. Свет сверху зовёт обратно.',
  'Отверстие шире, чем казалось. Ты выходишь.',
  'Вверх. Туда, откуда пришёл.',
];

// ── DOM refs ────────────────────────────────────────────────────────────────
let el, canvas, ctx, msgEl;
let bgActive = null;   // второй <img> — активный фон с цветком
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
  // Пользователь попросил «чуть больше». 50→100→160 — плотный насыщенный
  // дрейф, при этом каждая частица — 3 fillRect без shadowBlur, draw-loop
  // не проседает.
  _spores = Array.from({ length: 160 }, () => ({
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

// ── Mushroom glow (по бокам сцены — бирюзово-голубые, зелёно-бирюзовые) ──
// Позиции и цвета сверены с inside.png: грибы нарисованы в PNG, а мы
// поверх рисуем мягкий пульсирующий ореол того же оттенка что и шляпка,
// чтобы они выглядели как будто правда светятся.
const MUSHROOMS = [
  // Левая стенка
  { nx: 0.09,  ny: 0.30, r: 0.055, col: '#4aa8d8', phase: 0.0 }, // верхняя синяя гроздь
  { nx: 0.05,  ny: 0.43, r: 0.030, col: '#3ac8c0', phase: 1.2 }, // маленькая бирюзовая
  { nx: 0.10,  ny: 0.62, r: 0.038, col: '#60e0a0', phase: 2.4 }, // нижняя зелёная
  // Правая стенка
  { nx: 0.925, ny: 0.46, r: 0.060, col: '#4ac8e0', phase: 0.6 }, // главная яркая гроздь
  { nx: 0.92,  ny: 0.27, r: 0.028, col: '#60e8a0', phase: 1.8 }, // верхняя маленькая
  { nx: 0.905, ny: 0.72, r: 0.032, col: '#48c0c8', phase: 3.0 }, // нижняя
];

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

  // Активное состояние теперь рисуется через второй <img> (bgActive) под canvas.
  // Никаких canvas.drawImage — меняется весь кадр целиком по CSS opacity.

  // ── Свечение боковых грибов ─────────────────────────────────────────────
  // Каждый гриб пульсирует независимо (phase), цвет ореола = цвету шляпки.
  // Alpha'ы подняты (было 0.05/0.12/0.22 — едва видно на тёмном дереве,
  // теперь 0.08/0.22/0.40) — свечение реально читается.
  ctx.globalCompositeOperation = 'lighter';   // аддитивное смешение на тёмном дереве
  for (const m of MUSHROOMS) {
    const cx = Math.round(R.x + m.nx * R.w);
    const cy = Math.round(R.y + m.ny * R.h);
    const pulse = 0.65 + 0.35 * Math.sin(_tick * 0.032 + m.phase);
    const baseR = Math.round(Math.min(R.w, R.h) * m.r * pulse);
    ctx.fillStyle = m.col;
    ctx.globalAlpha = pulse * 0.08;  ctx.fillRect(cx - baseR*4, cy - baseR*4, baseR*8, baseR*8);
    ctx.globalAlpha = pulse * 0.22;  ctx.fillRect(cx - baseR*2, cy - baseR*2, baseR*4, baseR*4);
    ctx.globalAlpha = pulse * 0.40;  ctx.fillRect(cx - baseR,   cy - baseR,   baseR*2, baseR*2);
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;

  // Пульс кристалла-сердца
  const hx    = Math.round(R.x + HEART_CX * R.w);
  const hy    = Math.round(R.y + HEART_CY * R.h);
  const pulse = 0.55 + 0.45 * Math.sin(_tick * 0.038);
  const baseR = Math.round(Math.min(R.w, R.h) * 0.07 * pulse);

  // Цвет ореола зависит от состояния: тёплый (гибискус) или бирюзовый (кристалл)
  ctx.fillStyle = S.heartActivated ? '#ff8060' : '#60ffee';
  ctx.globalAlpha = pulse * 0.06;  ctx.fillRect(hx - baseR*3, hy - baseR*3, baseR*6, baseR*6);
  ctx.globalAlpha = pulse * 0.12;  ctx.fillRect(hx - baseR*2, hy - baseR*2, baseR*4, baseR*4);
  ctx.globalAlpha = pulse * 0.22;  ctx.fillRect(hx - baseR,   hy - baseR,   baseR*2, baseR*2);

  ctx.globalAlpha = 1;
  animId = requestAnimationFrame(animate);
}

// ── Применить гибискус к сердцу ────────────────────────────────────────────
// Поднять opacity активного BG — синхронно с S.heartActivated.
// Вызывается из _applyFlower и из openSceneInside (если уже активировано).
function _showActiveBG(instant = false) {
  if (!bgActive) return;
  if (instant) {
    // При переоткрытии сцены — показать сразу без transition, иначе каждый
    // заход проигрывал бы 1.6с fade-in что выглядит тупо.
    bgActive.style.transition = 'none';
    bgActive.style.opacity = '1';
    // Forced reflow чтобы отключение transition реально применилось
    void bgActive.offsetWidth;
    bgActive.style.transition = 'opacity 1.6s ease-in';
  } else {
    bgActive.style.opacity = '1';
  }
}

function _applyFlower() {
  const slot = state.inventory.findIndex(i => i?.id === 'flower');
  if (slot === -1) return;
  removeItem(slot);
  renderHotbar();
  S.heartActivated = true;
  SaveManager.setScene('inside', S);
  _showActiveBG();       // плавное появление активного фона
  AudioSystem.playBell?.();
  showMsg('Красный цветок касается кристалла. Сердце отзывается. Ты не знаешь чьё.', { story: true, dur: 5500 });
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
    // Клик по отверстию наверху дупла — выход обратно в сцену парения.
    // Короткая story-подсказка и через неё переход (чтобы не было резкого
    // прыжка без контекста).
    showMsg(OPENING_MSGS[S.openingIdx % OPENING_MSGS.length], { story: true, dur: 1400 });
    S.openingIdx++;
    SaveManager.setScene('inside', S);
    setTimeout(() => {
      if (state.activeScreen !== SCREENS.INSIDE) return;  // guard на случай back-btn
      _exitToScene4();
    }, 1400);
    return;
  }
  SaveManager.setScene('inside', S);
}

// ── DOM creation ───────────────────────────────────────────────────────────
function createEl() {
  if (document.getElementById('inside')) return;

  el = document.createElement('div');
  el.id = 'inside';
  el.style.cssText = 'position:absolute;inset:0;display:none;z-index:60;overflow:hidden;';

  // Два BG-слоя: базовый (кристалл) и активный (сердце с цветком).
  // Раньше мы кропали меняющуюся область из второй картинки и клеили
  // на canvas — пользователь справедливо жаловался на обрез. Теперь
  // вторая картинка — полноразмерный <img> с opacity:0, и при активации
  // поднимаем opacity до 1 через CSS transition. Меняется ВСЁ, без кропа.
  const bg = document.createElement('img');
  bg.src = 'assets/bg/inside.png';
  bg.style.cssText = 'display:block;width:100%;height:100%;object-fit:cover;';

  bgActive = document.createElement('img');
  bgActive.src = 'assets/bg/inside_heart.png';
  bgActive.style.cssText =
    'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;' +
    'opacity:0;transition:opacity 1.6s ease-in;pointer-events:none;';

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

  el.appendChild(bg); el.appendChild(bgActive);
  el.appendChild(canvas); el.appendChild(back); el.appendChild(msgEl);
  document.getElementById('wrap').appendChild(el);

  canvas.addEventListener('click', e => {
    onTap(e.clientX - _iRect.left, e.clientY - _iRect.top);
  });
  canvas.addEventListener('touchend', e => {
    e.preventDefault();
    const t = e.changedTouches[0];
    onTap(t.clientX - _iRect.left, t.clientY - _iRect.top);
  }, { passive: false });
  canvas.addEventListener('mousemove', e => {
    if (state.activeScreen !== SCREENS.INSIDE) return;
    setCursor(!!_hitZone(e.clientX - _iRect.left, e.clientY - _iRect.top));
  });
  canvas.addEventListener('mouseleave', () => setCursor(false));
  _iCacheRect();
  window.addEventListener('resize', _iCacheRect);
  window.addEventListener('scroll', _iCacheRect, { passive: true });
}

// Кэш rect — заменяет три getBoundingClientRect на событие.
let _iRect = { left: 0, top: 0, width: 0, height: 0 };
function _iCacheRect() { if (canvas) _iRect = canvas.getBoundingClientRect(); }

// ── Lifecycle ──────────────────────────────────────────────────────────────
export async function openSceneInside() {
  createEl();
  el       = document.getElementById('inside');
  canvas   = el.querySelector('canvas');
  ctx      = canvas.getContext('2d');
  msgEl    = el.querySelector('.scene-msg');
  // Вторая картинка — активный BG. При переоткрытии сцены createEl()
  // early-returns, и модульная `bgActive` может быть null → достаём из DOM.
  const imgs = el.querySelectorAll('img');
  bgActive = imgs[1] ?? bgActive;

  // Спрятать scene4 под нами — мы вошли через дверь в стволе
  const s4 = document.getElementById('scene4');
  if (s4) s4.style.display = 'none';

  showLoading('внутри');
  const bgImg = imgs[0];      // базовый inside.png — его и ждём

  const _onReady = () => {
    hideLoading();
    state.activeScreen = SCREENS.INSIDE;
    el.style.display   = 'block';
    // Если сердце уже активировано в прошлый заход — сразу показать активный BG
    // без fade-in анимации (иначе каждое переоткрытие проигрывало бы 1.6с).
    if (S.heartActivated) _showActiveBG(true);
    setCursor(false);
    if (AudioSystem.setMode) AudioSystem.setMode('sitting');
    requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      W = canvas.width  = Math.round(r.width);
      H = canvas.height = Math.round(r.height);
      _iCacheRect();
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

// Общая чистка inside. Используется и back-кнопкой, и выходом через отверстие.
function _tearDownInside() {
  if (el) el.style.display = 'none';
  if (animId) { cancelAnimationFrame(animId); animId = null; }
  window.removeEventListener('resize', _iCacheRect);
  window.removeEventListener('scroll', _iCacheRect);
  setCursor(false);
  SaveManager.setScene('inside', S);
}

export function closeSceneInside() {
  // Back-кнопка: возвращаемся в main, но по сюжету герой остаётся в медитации
  // (он только что общался с сердцем — из этого состояния не выходят одним щелчком).
  state.activeScreen = SCREENS.MAIN;
  _tearDownInside();
  setMeditating(true);   // ключевой момент — герой остаётся сидеть
  resumeMain();
}

// Выход через отверстие в потолке дупла — возвращаемся в сцену парения (scene4).
// Scene4 статична (canvas не анимируется) и её DOM ещё жив под нами,
// просто скрыт — достаточно снова показать и переключить activeScreen.
function _exitToScene4() {
  state.activeScreen = SCREENS.SCENE4;
  _tearDownInside();
  const s4 = document.getElementById('scene4');
  if (s4) s4.style.display = 'block';
  // F5 в scene4 должен возвращать в scene4, а не в inside
  SaveManager.global.lastScene = 'scene4';
  SaveManager.save();
}
window.closeSceneInside = closeSceneInside;
