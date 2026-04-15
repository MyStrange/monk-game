// scenes/scene4.js — вид сверху / дверь в дерево

import { state }         from '../src/state.js';
import { showMsgIn, showChoiceIn, isStoryActive,
         showLoading, hideLoading, showError,
         CURSOR_DEF, CURSOR_PTR } from '../src/utils.js';
import { leaveMain, resumeMain, standUp } from './main.js';
import { SaveManager }   from '../src/save.js';
import { trackZoneClick } from '../src/achievements.js';
import { scene4OpenMsg, DOOR_CLICK_MSG, DOOR_ROUNDS,
         DOOR_FINAL_QUESTION, DOOR_FINAL_YES_MSG,
         DOOR_FINAL_NO_MSG }    from '../src/dialogue.js';
import { openSceneScene3 }      from './scene3.js';

// ── Scene state ────────────────────────────────────────────────────────────
const S = SaveManager.getScene('scene4');
S.scene4Unlocked = S.scene4Unlocked ?? false;
S.doorVisited    = S.doorVisited    ?? false;

// ── DOM ────────────────────────────────────────────────────────────────────
let el, canvas, ctx, msgEl;
let s4W = 0, s4H = 0;
const showMsg = (t, d) => showMsgIn(msgEl, t, d);

// ── Fireflies — pixel-art squares, random flight ──────────────────────────
// 5 colours: warm yellow-green, cold blue-green, white, amber, pale cyan
const _FLY_COLS = ['#c8ff60','#60ffc0','#f0ffb0','#ffe880','#80ffee'];

const flies = Array.from({ length: 36 }, (_, i) => ({
  x:     Math.random(),
  y:     Math.random(),
  vx:    (Math.random() - 0.5) * 0.9,
  vy:    (Math.random() - 0.5) * 0.9,
  tick:  Math.random() * 200,
  sz:    3 + (Math.random() * 5 | 0),            // 3–7 px square
  color: _FLY_COLS[(Math.random() * 5) | 0],
  phOff: Math.random() * Math.PI * 2,            // blink phase offset
}));

// ── Door sparks (between dialog rounds) ───────────────────────────────────
const _doorSparks = [];
const _SPARK_COLORS = ['#ffffff','#f0e8ff','#c8aaff','#b888ff',
                       '#9966ee','#ddaaff','#ffe8ff'];

function _spawnDoorBurst() {
  const cx = s4W * 0.625, cy = s4H * 0.50;
  for (let i = 0; i < 28; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.8 + Math.random() * 2.4;
    _doorSparks.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.5,
      life: 0.6 + Math.random() * 0.4,
      color: _SPARK_COLORS[Math.floor(Math.random() * _SPARK_COLORS.length)],
      sz: 2 + (Math.random() * 2 | 0),
    });
  }
}

// ── Vegetation (procedural pixel rects, 3 stages around door) ─────────────
const _vegRects = [];
function _initVeg() {
  if (_vegRects.length) return;
  // Deterministic rects around door zone (x≈0.55-0.72, y≈0.32-0.68)
  const r = (n, min, max) =>
    min + ((n * 1664525 + 1013904223) & 0xfffff) / 0xfffff * (max - min);
  const GREENS = ['#1a4a0a','#245c10','#1e6a0a','#0a3a08','#2e7a14','#0e2a06'];
  for (let i = 0; i < 120; i++) {
    const seed = i * 137 + 7;
    _vegRects.push({
      px:    r(seed,      0.50, 0.76),
      py:    r(seed * 3,  0.27, 0.70),
      w:     r(seed * 7,  2,    8),
      h:     r(seed * 11, 2,    12),
      color: GREENS[i % 6],
      stage: 1 + (i % 3),
    });
  }
}

function _drawVegetation(stage) {
  for (const r of _vegRects) {
    if (r.stage > stage) continue;
    ctx.fillStyle = r.color;
    ctx.fillRect(r.px * s4W | 0, r.py * s4H | 0, r.w | 0, r.h | 0);
  }
}

// ── Dialog state ──────────────────────────────────────────────────────────
let _doorClicked = false;
let _vegStage    = 0;

// ── Dialog flow (story-priority + choice blocks) ──────────────────────────
function _startDialog() {
  _doorClicked = true;
  _initVeg();
  _doRound(1);
}

function _doRound(round) {
  const { prompt, options } = DOOR_ROUNDS[round - 1];
  showChoiceIn(msgEl, prompt, options, () => _onPick(round));
}

function _onPick(round) {
  _spawnDoorBurst();
  _vegStage = round;
  const delay = 1200;
  if (round < 3) {
    setTimeout(() => {
      if (state.activeScreen !== 'scene4') return;
      _doRound(round + 1);
    }, delay);
  } else {
    setTimeout(() => {
      if (state.activeScreen !== 'scene4') return;
      _doFinal();
    }, delay);
  }
}

function _doFinal() {
  showChoiceIn(msgEl, DOOR_FINAL_QUESTION,
    [{ text: 'Да' }, { text: 'Нет' }],
    value => {
      if (value === 'Да') {
        S.doorVisited = true;
        SaveManager.setScene('scene4', S);
        showMsg(DOOR_FINAL_YES_MSG, { story: true, dur: 2200 });
        setTimeout(() => {
          closeSceneScene4();
          openSceneScene3();
        }, 2000);
      } else {
        showMsg(DOOR_FINAL_NO_MSG, { story: true, dur: 4000 });
        setTimeout(() => {
          closeSceneScene4();
          standUp();
        }, 3800);
      }
    }
  );
}

// ── Zone hit tests (door on statue, cat, monk) ────────────────────────────
function _inDoor(cx, cy) {
  return cx > s4W * 0.40 && cx < s4W * 0.60 &&
         cy > s4H * 0.15 && cy < s4H * 0.45;
}
function _inCat(cx, cy) {
  return cx > s4W * 0.33 && cx < s4W * 0.47 &&
         cy > s4H * 0.66 && cy < s4H * 0.82;
}
function _inMonk(cx, cy) {
  return cx > s4W * 0.48 && cx < s4W * 0.62 &&
         cy > s4H * 0.72 && cy < s4H * 0.90;
}

// ── Flavor messages (rotate through) ──────────────────────────────────────
const _CAT_MSGS = [
  'Кот внизу. Отсюда он идеально круглый.',
  'Он смотрит вверх. Не на тебя — просто вверх.',
  'Кот лежит. Ты лежишь. Разница — в высоте.',
  'Всё, что нужно знать о коте, видно отсюда.',
];
const _MONK_MSGS = [
  'Красное пятно. Это был ты. Или будешь.',
  'Монах сидит. Ты видишь его макушку.',
  'Он не поднимет голову. Зачем?',
  'Отсюда слышно, как он дышит. Нет, не слышно. Но кажется.',
];
let _catMsgIdx = 0, _monkMsgIdx = 0;

// ── Animation ──────────────────────────────────────────────────────────────
let animId = null;

function animate() {
  if (state.activeScreen !== 'scene4') { animId = null; return; }
  ctx.clearRect(0, 0, s4W, s4H);

  // Fireflies — pixel-art coloured squares with glow
  for (const f of flies) {
    f.tick++;
    f.x = (f.x + f.vx / s4W + 1) % 1;
    f.y = (f.y + f.vy / s4H + 1) % 1;
    const br = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(f.tick * 0.038 + f.phOff));
    const px = f.x * s4W | 0, py = f.y * s4H | 0;
    // soft glow (larger rect, low alpha)
    ctx.globalAlpha = br * 0.18;
    ctx.fillStyle = f.color;
    ctx.fillRect(px - f.sz, py - f.sz, f.sz * 3, f.sz * 3);
    // core pixel square
    ctx.globalAlpha = br;
    ctx.fillRect(px, py, f.sz, f.sz);
  }
  ctx.globalAlpha = 1;

  // Sparks
  for (let i = _doorSparks.length - 1; i >= 0; i--) {
    const sp = _doorSparks[i];
    sp.x += sp.vx; sp.y += sp.vy; sp.vy += 0.06;
    sp.life -= 0.025;
    if (sp.life <= 0) { _doorSparks.splice(i, 1); continue; }
    ctx.globalAlpha = sp.life;
    ctx.fillStyle = sp.color;
    ctx.fillRect(sp.x | 0, sp.y | 0, sp.sz, sp.sz);
  }
  ctx.globalAlpha = 1;

  // Vegetation overlay
  if (_vegStage > 0) _drawVegetation(_vegStage);

  animId = requestAnimationFrame(animate);
}

// ── DOM creation ───────────────────────────────────────────────────────────
function createEl() {
  if (document.getElementById('scene4')) return;

  el = document.createElement('div');
  el.id = 'scene4';
  el.style.cssText = 'position:absolute;inset:0;display:none;z-index:55;overflow:hidden;';

  const bg = document.createElement('img');
  bg.src = 'assets/bg/above_main.jpeg';
  bg.style.cssText =
    'display:block;width:100%;height:100%;object-fit:cover;object-position:top;';

  canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
  ctx = canvas.getContext('2d');

  const back = document.createElement('button');
  back.className = 'back-btn';
  back.textContent = '←';
  back.onclick = closeSceneScene4;

  msgEl = document.createElement('div');
  msgEl.className = 'scene-msg';

  el.appendChild(bg); el.appendChild(canvas);
  el.appendChild(back); el.appendChild(msgEl);
  document.getElementById('wrap').appendChild(el);

  function _handleTap(cx, cy) {
    if (state.activeScreen !== 'scene4') return;
    // Story активна — showMsgIn сам сбаунсит, просто выходим
    if (isStoryActive(msgEl)) return;
    if (!_doorClicked && _inDoor(cx, cy)) {
      showMsg(DOOR_CLICK_MSG, {
        story: true,
        onDismiss: () => {
          if (state.activeScreen === 'scene4') _startDialog();
        },
      });
      return;
    }
    if (_inCat(cx, cy)) {
      showMsg(_CAT_MSGS[Math.min(_catMsgIdx, _CAT_MSGS.length - 1)]);
      _catMsgIdx++;
      return;
    }
    if (_inMonk(cx, cy)) {
      showMsg(_MONK_MSGS[Math.min(_monkMsgIdx, _MONK_MSGS.length - 1)]);
      _monkMsgIdx++;
      return;
    }
  }

  canvas.addEventListener('click', e => {
    const r = canvas.getBoundingClientRect();
    _handleTap(e.clientX - r.left, e.clientY - r.top);
  });
  canvas.addEventListener('touchend', e => {
    e.preventDefault();
    const t = e.changedTouches[0];
    const r = canvas.getBoundingClientRect();
    _handleTap(t.clientX - r.left, t.clientY - r.top);
  }, { passive: false });
  canvas.addEventListener('mousemove', e => {
    if (state.activeScreen !== 'scene4') return;
    const r = canvas.getBoundingClientRect();
    const cx = e.clientX - r.left, cy = e.clientY - r.top;
    const hot = (!_doorClicked && _inDoor(cx, cy)) ||
                _inCat(cx, cy) || _inMonk(cx, cy);
    canvas.style.cursor = hot ? CURSOR_PTR : CURSOR_DEF;
  });
  canvas.addEventListener('mouseleave', () => {
    canvas.style.cursor = CURSOR_DEF;
  });
}

// ── Lifecycle ──────────────────────────────────────────────────────────────
export async function openSceneScene4() {
  leaveMain();
  createEl();
  el = document.getElementById('scene4');
  canvas = el.querySelector('canvas');
  ctx    = canvas.getContext('2d');
  msgEl  = el.querySelector('.scene-msg');

  // Restore state
  _doorClicked  = S.doorVisited;
  _vegStage     = S.doorVisited ? 3 : 0;
  _catMsgIdx    = 0;
  _monkMsgIdx   = 0;
  if (S.doorVisited) _initVeg();

  S.scene4Unlocked = true;
  showLoading('высота');

  const bgImg = el.querySelector('img');
  bgImg.onerror = () => showError('не удалось загрузить сцену');
  bgImg.onload = () => {
    hideLoading();
    state.activeScreen = 'scene4';
    el.style.display = 'block';
    requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      s4W = canvas.width  = Math.round(r.width);
      s4H = canvas.height = Math.round(r.height);
      if (!animId) animate();
    });
    showMsg(scene4OpenMsg, { story: true });
    trackZoneClick('scene4');
  };
  if (bgImg.complete && bgImg.naturalWidth) bgImg.onload();
}

export function closeSceneScene4() {
  state.activeScreen = 'main';
  if (el) el.style.display = 'none';
  if (animId) { cancelAnimationFrame(animId); animId = null; }
  SaveManager.setScene('scene4', S);
  resumeMain();
}
window.closeSceneScene4 = closeSceneScene4;
