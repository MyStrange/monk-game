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
import { Particles }      from '../src/particles.js';
import { drawPixelGlow3 } from '../src/anims.js';
import { showMsgIn }                                         from '../src/ui/messages.js';
import { showLoading, hideLoading, showError }               from '../src/ui/overlays.js';
import { setCursor }                                         from '../src/ui/cursor.js';
import { HEART_MSGS, HEART_ACTIVE_MSGS, STAIRS_MSGS, OPENING_MSGS } from '../src/dialogue.js';
import { resumeMain, setMeditating } from './main.js';
import { SaveManager, useSceneState } from '../src/save.js';
import { AudioSystem }    from '../src/audio.js';
import { trackZoneClick, trackSceneVisit } from '../src/achievements.js';
import { getSelectedItem, removeItem } from '../src/inventory.js';
import { renderHotbar }   from '../src/hotbar.js';
import { coverRect, hitZone as _hitNormZone } from '../src/scene-base.js';

// ── BG aspect ratio ────────────────────────────────────────────────────────
import { SCENE_DEFS } from '../src/scene-defs.js';
const { bgW: BG_W, bgH: BG_H } = SCENE_DEFS.inside;   // 16:9, object-fit:cover адаптирует

// Активный фон подключается как второй <img> в createEl (dual-layer + opacity).
// Раньше тут был canvas-crop через _HEART_SPRITE — обрезало по прямоугольнику
// и выглядело криво. Теперь меняется весь кадр целиком через CSS transition.

// ── Hit zones (0..1 relative to BG) ───────────────────────────────────────
const HEART_ZONE   = { x0: 0.36, y0: 0.44, x1: 0.66, y1: 0.90 };
const OPENING_ZONE = { x0: 0.28, y0: 0.00, x1: 0.72, y1: 0.24 };
const STAIRS_ZONE  = { x0: 0.03, y0: 0.20, x1: 0.54, y1: 0.82 };

// ── Scene state ────────────────────────────────────────────────────────────
const [S] = useSceneState('inside', {
  heartIdx:       0,
  stairsIdx:      0,
  openingIdx:     0,
  heartActivated: false,
});

// Тексты сцены — в src/dialogue.js. См. HEART_MSGS, HEART_ACTIVE_MSGS,
// STAIRS_MSGS, OPENING_MSGS. До активации — сердце ноет, после — светится.

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
// Споры — Particles batch (160 частиц, индивидуальный sin-tick в animate).
const _spores = new Particles();

function _spawnSpores() {
  // Пользователь попросил «чуть больше». 50→100→160 — плотный насыщенный
  // дрейф, при этом каждая частица — 3 fillRect без shadowBlur, draw-loop
  // не проседает.
  _spores.spawnBatch(160, () => ({
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
  }), /* resetFirst= */ true);
}

// ── Mushroom glow (по бокам сцены) ───────────────────────────────────────
// Позиции и цвета сверены с inside.png через кластерный анализ ярких
// сине-зелёных пикселей (L-upper 261,302 / L-lower 167,561 / R-main 1194,404).
// Средний цвет каждой грозди: L-upper #4ecabd, L-lower #54ca99, R-main #49b0c6.
const MUSHROOMS = [
  // Левая стенка — две грозди
  { nx: 0.190, ny: 0.393, r: 0.070, rgb: '78,202,189',  phase: 0.0 }, // верхняя бирюзовая
  { nx: 0.121, ny: 0.730, r: 0.060, rgb: '84,202,153',  phase: 2.4 }, // нижняя зелёная
  // Правая стенка — одна большая яркая гроздь
  { nx: 0.868, ny: 0.525, r: 0.075, rgb: '73,176,198',  phase: 0.6 },
];

// ── Heart pulse центр (relative to BG) ────────────────────────────────────
// Было (0.50, 0.65) — пульс светился по центру кадра, а не на сердце.
// Центроид красной разницы между base и active даёт (0.584, 0.660).
const HEART_CX = 0.584, HEART_CY = 0.660;

let _tick = 0;

function animate() {
  if (state.activeScreen !== SCREENS.INSIDE) { animId = null; return; }
  ctx.clearRect(0, 0, W, H);
  _tick++;

  const R = _bgRect();

  // Споры — кастомный sin-tick (Particles.tick() не покрывает swayPhase/phase).
  _spores.forEach(p => {
    p.y         += p.vy;
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
    // Споры — 3-слойный pixel glow (общий из src/anims.js, обычная плотность).
    drawPixelGlow3(ctx, px, py, p.sz, p.col, br);
  });
  ctx.globalAlpha = 1;

  // Активное состояние теперь рисуется через второй <img> (bgActive) под canvas.
  // Никаких canvas.drawImage — меняется весь кадр целиком по CSS opacity.

  // ── Свечение боковых грибов ─────────────────────────────────────────────
  // Гладкий круговой градиент (createRadialGradient) вместо трёх fillRect —
  // даёт плавный soft-edge ореол, без пикселизации на краях.
  //   breath  — медленное дыхание (радиус + базовая яркость)
  //   shimmer — быстрая лёгкая вибрация яркости
  //   flash   — редкая короткая вспышка (~1% кадров, фазы разъезжаются)
  // Сглажено дополнительно через ctx.filter='blur(…)' — реальный постэффект.
  ctx.globalCompositeOperation = 'lighter';
  ctx.filter = 'blur(2px)';
  for (const m of MUSHROOMS) {
    const cx = R.x + m.nx * R.w;
    const cy = R.y + m.ny * R.h;

    const breath  = 0.65 + 0.35 * Math.sin(_tick * 0.032 + m.phase);
    const shimmer = 0.85 + 0.15 * Math.sin(_tick * 0.180 + m.phase * 5);
    const fp      = Math.sin(_tick * 0.009 + m.phase * 7);
    const flash   = fp > 0.985 ? 1.8 : 1.0;
    const al      = Math.min(1, breath * shimmer * flash);

    const radius = Math.min(R.w, R.h) * m.r * 4.2 * breath;
    const rgb = m.rgb;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    // Центр ярко, 30% — половина, 70% — слабо, край — прозрачно.
    // Плавная интерполяция alpha даёт soft glow без кольцевых артефактов.
    grad.addColorStop(0,    `rgba(${rgb},${(al * 0.85).toFixed(3)})`);
    grad.addColorStop(0.30, `rgba(${rgb},${(al * 0.45).toFixed(3)})`);
    grad.addColorStop(0.70, `rgba(${rgb},${(al * 0.12).toFixed(3)})`);
    grad.addColorStop(1,    `rgba(${rgb},0)`);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.filter = 'none';
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;

  // Пульс кристалла-сердца — плавный радиальный градиент (без пикселизации).
  const hx     = R.x + HEART_CX * R.w;
  const hy     = R.y + HEART_CY * R.h;
  const pulse  = 0.55 + 0.45 * Math.sin(_tick * 0.038);
  const hRadius = Math.min(R.w, R.h) * 0.22 * (0.75 + 0.25 * pulse);
  const hRgb   = S.heartActivated ? '255,128,96' : '96,255,238';

  ctx.globalCompositeOperation = 'lighter';
  ctx.filter = 'blur(3px)';
  const hGrad = ctx.createRadialGradient(hx, hy, 0, hx, hy, hRadius);
  hGrad.addColorStop(0,    `rgba(${hRgb},${(pulse * 0.55).toFixed(3)})`);
  hGrad.addColorStop(0.30, `rgba(${hRgb},${(pulse * 0.28).toFixed(3)})`);
  hGrad.addColorStop(0.70, `rgba(${hRgb},${(pulse * 0.08).toFixed(3)})`);
  hGrad.addColorStop(1,    `rgba(${hRgb},0)`);
  ctx.fillStyle = hGrad;
  ctx.beginPath();
  ctx.arc(hx, hy, hRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.filter = 'none';
  ctx.globalCompositeOperation = 'source-over';
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
  trackSceneVisit('inside_heart');
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
  el.className = 'scene-root';
  el.style.zIndex = '60';

  // Два BG-слоя: базовый (кристалл) и активный (сердце с цветком).
  // Активный — поверх базового, fade opacity 0→1 при доставке цветка.
  const bg = document.createElement('img');
  bg.src = 'assets/bg/inside.png';
  bg.className = 'scene-bg';

  bgActive = document.createElement('img');
  bgActive.src = 'assets/bg/inside_heart.png';
  bgActive.className = 'scene-canvas';   // те же inset/size что у канваса
  // Opacity/transition/pointer-events специфичны, остаются inline.
  bgActive.style.cssText = 'opacity:0;transition:opacity 1.6s ease-in;pointer-events:none;object-fit:cover;';

  canvas = document.createElement('canvas');
  canvas.className = 'scene-canvas';
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
    const hz = _hitZone(e.clientX - _iRect.left, e.clientY - _iRect.top);
    setCursor(hz === 'opening' ? 'up' : !!hz);
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
