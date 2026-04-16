// scenes/scene4.js — вид сверху / дверь в дерево
// Трёхслойная структура: above.png (BG) + above2.png (поверх) + above3.png (топ с лианами).
// Клик по верхнему слою снимает его. Когда оба оверлея сняты — дверь «обычная».
// Клик по двери → диалог → сцена 3.

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
S.scene4Unlocked  = S.scene4Unlocked  ?? false;
S.doorVisited     = S.doorVisited     ?? false;
S.layer3Removed   = S.layer3Removed   ?? false;  // above3 (лианы)
S.layer2Removed   = S.layer2Removed   ?? false;  // above2 (дверь без лиан)

// ── DOM ────────────────────────────────────────────────────────────────────
let el, canvas, ctx, msgEl;
let layer2El, layer3El;
let s4W = 0, s4H = 0;
const showMsg = (t, d) => showMsgIn(msgEl, t, d);

// ── BG natural dims (for pixel-perfect sprite alignment) ──────────────────
const BG_W = 2051, BG_H = 1154;
// Natural sprite position within BG (from template matching)
// sprite TL = (784, 0), size = (509, 854)
const SP_X = 784, SP_Y = 0, SP_W = 509, SP_H = 854;

// Compute displayed BG rect taking into account object-fit:cover + object-position:top
function _dispBG(vw, vh) {
  const bgA = BG_W / BG_H, vA = vw / vh;
  if (vA > bgA) {
    // viewport wider → BG scaled to viewport width; top-aligned, bottom cropped
    const dW = vw, dH = vw / bgA;
    return { x: 0, y: 0, w: dW, h: dH, scale: dW / BG_W };
  } else {
    // viewport narrower → BG scaled to viewport height; sides cropped equally
    const dH = vh, dW = vh * bgA;
    return { x: (vw - dW) / 2, y: 0, w: dW, h: dH, scale: dH / BG_H };
  }
}

// Place above2/above3 sprites to match their natural pixel position in BG
function _layoutLayers() {
  if (!el) return;
  const r = el.getBoundingClientRect();
  const d = _dispBG(r.width, r.height);
  const sx = d.x + SP_X * d.scale;
  const sy = d.y + SP_Y * d.scale;
  const sw = SP_W * d.scale;
  const sh = SP_H * d.scale;
  for (const node of [layer2El, layer3El]) {
    if (!node) continue;
    node.style.left   = sx + 'px';
    node.style.top    = sy + 'px';
    node.style.width  = sw + 'px';
    node.style.height = sh + 'px';
    node.style.transform = 'none';
  }
}

// ── Fireflies — pixel-art squares, random flight ──────────────────────────
const _FLY_COLS = ['#c8ff60','#60ffc0','#f0ffb0','#ffe880','#80ffee'];

const flies = Array.from({ length: 36 }, () => ({
  x:     Math.random(),
  y:     Math.random(),
  vx:    (Math.random() - 0.5) * 0.9,
  vy:    (Math.random() - 0.5) * 0.9,
  tick:  Math.random() * 200,
  sz:    3 + (Math.random() * 5 | 0),
  color: _FLY_COLS[(Math.random() * 5) | 0],
  phOff: Math.random() * Math.PI * 2,
}));

// ── Door sparks (между раундами диалога) ──────────────────────────────────
const _doorSparks = [];
const _SPARK_COLORS = ['#ffffff','#f0e8ff','#c8aaff','#b888ff',
                       '#9966ee','#ddaaff','#ffe8ff'];

function _spawnDoorBurst() {
  const cx = s4W * 0.50, cy = s4H * 0.18;
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

// ── Dialog state ──────────────────────────────────────────────────────────
let _doorClicked = false;

// ── Dialog flow ───────────────────────────────────────────────────────────
function _startDialog() {
  _doorClicked = true;
  _doRound(1);
}

function _doRound(round) {
  const { prompt, options } = DOOR_ROUNDS[round - 1];
  showChoiceIn(msgEl, prompt, options, () => _onPick(round));
}

function _onPick(round) {
  _spawnDoorBurst();
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

// ── Zone hit tests ────────────────────────────────────────────────────────
// Узкая зона двери — тёмный проём над статуёй в above.png
function _inDoor(cx, cy) {
  return cx > s4W * 0.46 && cx < s4W * 0.55 &&
         cy > s4H * 0.05 && cy < s4H * 0.18;
}
function _inCat(cx, cy) {
  return cx > s4W * 0.60 && cx < s4W * 0.72 &&
         cy > s4H * 0.44 && cy < s4H * 0.58;
}
function _inMonk(cx, cy) {
  return cx > s4W * 0.47 && cx < s4W * 0.60 &&
         cy > s4H * 0.56 && cy < s4H * 0.74;
}

// ── Flavor messages (rotate) ──────────────────────────────────────────────
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

  // Fireflies
  for (const f of flies) {
    f.tick++;
    f.x = (f.x + f.vx / s4W + 1) % 1;
    f.y = (f.y + f.vy / s4H + 1) % 1;
    const br = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(f.tick * 0.038 + f.phOff));
    const px = f.x * s4W | 0, py = f.y * s4H | 0;
    ctx.globalAlpha = br * 0.18;
    ctx.fillStyle = f.color;
    ctx.fillRect(px - f.sz, py - f.sz, f.sz * 3, f.sz * 3);
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

  animId = requestAnimationFrame(animate);
}

// ── Layer peel logic ──────────────────────────────────────────────────────
function _peelLayer(which) {
  const node = which === 3 ? layer3El : layer2El;
  if (!node) return;
  _spawnDoorBurst();
  node.classList.add('fade-out');
  setTimeout(() => { node.style.display = 'none'; }, 600);
  if (which === 3) { S.layer3Removed = true; }
  else             { S.layer2Removed = true; }
  SaveManager.setScene('scene4', S);
}

function _layersGone() {
  return S.layer3Removed && S.layer2Removed;
}

// ── DOM creation ───────────────────────────────────────────────────────────
function createEl() {
  if (document.getElementById('scene4')) return;

  el = document.createElement('div');
  el.id = 'scene4';
  el.style.cssText = 'position:absolute;inset:0;display:none;z-index:55;overflow:hidden;';

  // Base BG (above.png)
  const bg = document.createElement('img');
  bg.src = 'assets/bg/above_main.jpeg';
  bg.style.cssText =
    'display:block;width:100%;height:100%;object-fit:cover;object-position:top;';

  // Canvas (fireflies + sparks)
  canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
  ctx = canvas.getContext('2d');

  // Layer 2 — выше BG, ниже layer3: дверь без лиан
  layer2El = document.createElement('img');
  layer2El.src = 'assets/bg/above2.png';
  layer2El.className = 's4-layer';
  layer2El.dataset.layer = '2';
  layer2El.style.zIndex = '60';

  // Layer 3 — самый верх: лианы поверх двери
  layer3El = document.createElement('img');
  layer3El.src = 'assets/bg/above3.png';
  layer3El.className = 's4-layer';
  layer3El.dataset.layer = '3';
  layer3El.style.zIndex = '61';

  const back = document.createElement('button');
  back.className = 'back-btn';
  back.textContent = '←';
  back.onclick = closeSceneScene4;

  msgEl = document.createElement('div');
  msgEl.className = 'scene-msg';

  el.appendChild(bg);
  el.appendChild(canvas);
  el.appendChild(layer2El);
  el.appendChild(layer3El);
  el.appendChild(back);
  el.appendChild(msgEl);
  document.getElementById('wrap').appendChild(el);

  // Resize → пересчитать позицию спрайтов
  window.addEventListener('resize', () => {
    if (state.activeScreen === 'scene4') _layoutLayers();
  });

  // Слой 3 клик — снять верхнюю лиану
  layer3El.addEventListener('click', e => {
    e.stopPropagation();
    if (isStoryActive(msgEl)) return;
    _peelLayer(3);
  });
  layer3El.addEventListener('touchend', e => {
    e.preventDefault(); e.stopPropagation();
    if (isStoryActive(msgEl)) return;
    _peelLayer(3);
  }, { passive: false });

  // Слой 2 клик — снять средний слой
  layer2El.addEventListener('click', e => {
    e.stopPropagation();
    if (isStoryActive(msgEl)) return;
    _peelLayer(2);
  });
  layer2El.addEventListener('touchend', e => {
    e.preventDefault(); e.stopPropagation();
    if (isStoryActive(msgEl)) return;
    _peelLayer(2);
  }, { passive: false });

  function _handleTap(cx, cy) {
    if (state.activeScreen !== 'scene4') return;
    if (isStoryActive(msgEl)) return;

    // Дверь активна только когда оба оверлея сняты
    if (_layersGone() && !_doorClicked && _inDoor(cx, cy)) {
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
    const hot = (_layersGone() && !_doorClicked && _inDoor(cx, cy)) ||
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
  layer2El = el.querySelector('.s4-layer[data-layer="2"]');
  layer3El = el.querySelector('.s4-layer[data-layer="3"]');

  // Restore state
  _doorClicked  = false;   // диалог можно открыть заново при повторном заходе
  _catMsgIdx    = 0;
  _monkMsgIdx   = 0;

  // Состояние слоёв: если убраны — скрываем сразу
  if (S.layer3Removed && layer3El) layer3El.style.display = 'none';
  else if (layer3El) { layer3El.style.display = ''; layer3El.classList.remove('fade-out'); }
  if (S.layer2Removed && layer2El) layer2El.style.display = 'none';
  else if (layer2El) { layer2El.style.display = ''; layer2El.classList.remove('fade-out'); }

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
      _layoutLayers();
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
