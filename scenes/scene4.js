// scenes/scene4.js — вид сверху / полёт
// ─────────────────────────────────────────────────────────────────────────────
// СТРУКТУРА:
//   • BG: above_main.jpeg (на ней — кот, монах и дерево с дверью)
//   • Layer3 (above3.png): верхний слой — лианы поверх двери
//   • Layer2 (above2.png): средний слой — дверь без лиан, но ещё под покровом
//   • Снятие слоёв: клик по двери → философская реплика →
//                   слой уходит (fade-out) → открывается следующий
//
// ПОТОК КЛИКОВ ПО ДВЕРИ:
//   1-й клик (на layer3, лианы):
//       показывается SCENE4_OPEN_MSG1 на 5с — НЕЛЬЗЯ пропустить (story + dur).
//       по окончании → layer3 уходит.
//   2-й клик (на layer2):
//       SCENE4_OPEN_MSG2 (тоже не пропустить) → layer2 уходит →
//       чуть позже показывается SCENE4_OPEN_MSG3 (дверь уже видна).
//
// КОТ И МОНАХ:
//   Кликабельны в любой момент (если сейчас не идёт story-сообщение).
//   Реплики берутся из S4_CAT_MSGS / S4_MONK_MSGS, идут циклически.
//   Счётчики (S.catMsgIdx / S.monkMsgIdx) сохраняются в SaveManager.
// ─────────────────────────────────────────────────────────────────────────────

import { state }                         from '../src/state.js';
import { showLoading, hideLoading, showError,
         showMsgIn, isStoryActive,
         CURSOR_DEF, CURSOR_PTR }        from '../src/utils.js';
import { leaveMain, resumeMain }         from './main.js';
import { SaveManager }                   from '../src/save.js';
import { trackZoneClick }                from '../src/achievements.js';
import { S4_CAT_MSGS, S4_MONK_MSGS,
         S4_DURIAN_CAT_MSGS, S4_DURIAN_MONK_MSGS,
         SCENE4_OPEN_MSG1, SCENE4_OPEN_MSG2, SCENE4_OPEN_MSG3 } from '../src/dialogue.js';
import { getSelectedItem } from '../src/inventory.js';

// ── Scene state ────────────────────────────────────────────────────────────
const S = SaveManager.getScene('scene4');
S.scene4Unlocked = S.scene4Unlocked ?? false;
S.layer2Removed  = S.layer2Removed  ?? false;   // above2 снят
S.layer3Removed  = S.layer3Removed  ?? false;   // above3 (лианы) снят
S.catMsgIdx      = S.catMsgIdx      ?? 0;
S.monkMsgIdx     = S.monkMsgIdx     ?? 0;
S.durCatIdx      = S.durCatIdx      ?? 0;
S.durMonkIdx     = S.durMonkIdx     ?? 0;

// ── DOM ────────────────────────────────────────────────────────────────────
let el, bgEl, layer2El, layer3El, msgEl;

// ── BG natural dims (для выравнивания спрайтов-оверлеев и hit-зон) ────────
const BG_W = 2051, BG_H = 1154;
// Positional crop оверлейных спрайтов above2/above3 внутри BG (template match)
const SP_X = 784, SP_Y = 0, SP_W = 509, SP_H = 854;

// Hit-зоны кота и монаха (нормированные 0..1 относительно BG natural).
// Координаты сверены по самой картинке above_main.jpeg:
//   • кот (маленький рыжий) — чуть правее центра, около двух третей высоты
//   • монах (красное пятно) — ниже центра, левее кота
// Зоны пересекаются с прямоугольниками слоёв above2/above3 (X=0.38..0.63,
// Y=0..0.74), поэтому обработчик вешается в capture-фазе на el — срабатывает
// до layer-хендлеров и не даёт их stopPropagation заблокировать кот/монаха.
const CAT_ZONE  = { x0: 0.60, y0: 0.52, x1: 0.72, y1: 0.70 };
const MONK_ZONE = { x0: 0.48, y0: 0.68, x1: 0.63, y1: 0.85 };

// ── Displayed-BG math (object-fit:cover + object-position:top) ────────────
function _dispBG(vw, vh) {
  const bgA = BG_W / BG_H, vA = vw / vh;
  if (vA > bgA) {
    // viewport шире → BG растянута по ширине, снизу обрезана
    const dW = vw, dH = vw / bgA;
    return { x: 0, y: 0, w: dW, h: dH, scale: dW / BG_W };
  } else {
    // viewport уже → BG растянута по высоте, по бокам обрезана симметрично
    const dH = vh, dW = vh * bgA;
    return { x: (vw - dW) / 2, y: 0, w: dW, h: dH, scale: dH / BG_H };
  }
}

function _inZone(cx, cy, z) {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  const d = _dispBG(r.width, r.height);
  const nx = (cx - d.x) / (d.scale * BG_W);
  const ny = (cy - d.y) / (d.scale * BG_H);
  return nx >= z.x0 && nx <= z.x1 && ny >= z.y0 && ny <= z.y1;
}

// Позиционировать оверлеи строго поверх их natural pixel-crop в BG
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
  }
}

// ── Layer peel ────────────────────────────────────────────────────────────
function _peelLayer(which) {
  const node = which === 3 ? layer3El : layer2El;
  if (!node) return;
  // Снять можно только верхний видимый слой: layer3 → layer2 → BG
  if (which === 2 && !S.layer3Removed) return;
  if (which === 3 && S.layer3Removed)  return;
  node.classList.add('fade-out');
  // Держим node в DOM ещё кадр, потом убираем из render-tree
  setTimeout(() => { node.style.display = 'none'; }, 600);
  if (which === 3) S.layer3Removed = true;
  else             S.layer2Removed = true;
  SaveManager.setScene('scene4', S);
}

// ── Door click flow (philosophical messages) ───────────────────────────────
function _onDoorClick(which) {
  if (isStoryActive(msgEl)) return;           // во время story — игнор
  if (which === 3) {
    if (S.layer3Removed) return;
    // MSG1 — медитация, слои. 5с, нельзя пропустить. По завершении — peel.
    showMsgIn(msgEl, SCENE4_OPEN_MSG1, {
      story: true, dur: 5000,
      onDismiss: () => {
        if (state.activeScreen !== 'scene4') return;
        _peelLayer(3);
      },
    });
  } else if (which === 2) {
    if (!S.layer3Removed || S.layer2Removed) return;
    // MSG2 — страшно, но дверь. 4.5с. По завершении — peel + следом MSG3.
    showMsgIn(msgEl, SCENE4_OPEN_MSG2, {
      story: true, dur: 4500,
      onDismiss: () => {
        if (state.activeScreen !== 'scene4') return;
        _peelLayer(2);
        // Ждём, пока слой начнёт уходить (600мс fade) — тогда показываем MSG3
        setTimeout(() => {
          if (state.activeScreen !== 'scene4') return;
          showMsgIn(msgEl, SCENE4_OPEN_MSG3, { story: true, dur: 5500 });
        }, 800);
      },
    });
  }
}

// ── Capture-phase click — кот/монах (приоритет перед слоями) ──────────────
// Вешается на el через addEventListener('click', _, true). Срабатывает ДО
// хендлеров на layer2/layer3, поэтому их stopPropagation нас не блокирует.
// Back-btn остаётся работоспособной: её зона наверху слева, мимо cat/monk.
function _onElCapture(e) {
  if (state.activeScreen !== 'scene4') return;
  if (isStoryActive(msgEl)) return;
  // back-btn не трогаем — пусть обработает себя сам
  if (e.target && e.target.closest && e.target.closest('.back-btn')) return;

  const r = el.getBoundingClientRect();
  const pt = e.changedTouches?.[0] || e.touches?.[0] || e;
  const cx = pt.clientX - r.left;
  const cy = pt.clientY - r.top;

  if (_inZone(cx, cy, CAT_ZONE)) {
    e.stopPropagation();
    e.preventDefault?.();
    const sel = getSelectedItem();
    let msg;
    if (sel?.id === 'durian') {
      msg = S4_DURIAN_CAT_MSGS[S.durCatIdx % S4_DURIAN_CAT_MSGS.length];
      S.durCatIdx++;
    } else {
      msg = S4_CAT_MSGS[S.catMsgIdx % S4_CAT_MSGS.length];
      S.catMsgIdx++;
    }
    SaveManager.setScene('scene4', S);
    showMsgIn(msgEl, msg);
    trackZoneClick('scene4_cat');
    return;
  }
  if (_inZone(cx, cy, MONK_ZONE)) {
    e.stopPropagation();
    e.preventDefault?.();
    const sel = getSelectedItem();
    let msg;
    if (sel?.id === 'durian') {
      msg = S4_DURIAN_MONK_MSGS[S.durMonkIdx % S4_DURIAN_MONK_MSGS.length];
      S.durMonkIdx++;
    } else {
      msg = S4_MONK_MSGS[S.monkMsgIdx % S4_MONK_MSGS.length];
      S.monkMsgIdx++;
    }
    SaveManager.setScene('scene4', S);
    showMsgIn(msgEl, msg);
    trackZoneClick('scene4_monk');
    return;
  }
  // Иначе — событие идёт дальше (layer3 / layer2 / bg)
}

// ── Cursor hint (desktop) ──────────────────────────────────────────────────
// Слушаем mousemove на el, чтобы hover работал и поверх слоёв — тогда
// визуально понятно, что кот/монах кликабельны даже через layer.
function _onElMove(e) {
  if (state.activeScreen !== 'scene4') return;
  const r = el.getBoundingClientRect();
  const cx = e.clientX - r.left;
  const cy = e.clientY - r.top;
  const hot = _inZone(cx, cy, CAT_ZONE) || _inZone(cx, cy, MONK_ZONE);
  const cur = hot ? CURSOR_PTR : '';
  // Ставим курсор на все img — под указателем может быть любой слой
  bgEl.style.cursor     = cur || 'default';
  if (layer2El) layer2El.style.cursor = cur; // '' вернёт CSS-умолчание (pointer)
  if (layer3El) layer3El.style.cursor = cur;
}

// ── DOM creation ───────────────────────────────────────────────────────────
function createEl() {
  if (document.getElementById('scene4')) return;

  el = document.createElement('div');
  el.id = 'scene4';
  el.style.cssText = 'position:absolute;inset:0;display:none;z-index:55;overflow:hidden;';

  // Base BG — картинка с дверью, object-fit:cover для кадрирования
  bgEl = document.createElement('img');
  bgEl.src = 'assets/bg/above_main.jpeg';
  bgEl.className = 's4-bg';
  bgEl.style.cssText =
    'display:block;width:100%;height:100%;object-fit:cover;object-position:top;cursor:default;';

  // Layer 2 — средний оверлей (дверь без лиан)
  layer2El = document.createElement('img');
  layer2El.src = 'assets/bg/above2.png';
  layer2El.className = 's4-layer';
  layer2El.dataset.layer = '2';
  layer2El.style.zIndex = '60';

  // Layer 3 — верхний оверлей (лианы поверх двери)
  layer3El = document.createElement('img');
  layer3El.src = 'assets/bg/above3.png';
  layer3El.className = 's4-layer';
  layer3El.dataset.layer = '3';
  layer3El.style.zIndex = '61';

  const back = document.createElement('button');
  back.className = 'back-btn';
  back.textContent = '←';
  back.onclick = closeSceneScene4;
  back.addEventListener('touchend', e => {
    e.stopPropagation(); e.preventDefault(); closeSceneScene4();
  }, { passive: false });

  msgEl = document.createElement('div');
  msgEl.className = 'scene-msg';

  el.appendChild(bgEl);
  el.appendChild(layer2El);
  el.appendChild(layer3El);
  el.appendChild(back);
  el.appendChild(msgEl);
  document.getElementById('wrap').appendChild(el);

  // Resize — пересчитать позицию оверлеев
  window.addEventListener('resize', () => {
    if (state.activeScreen === 'scene4') _layoutLayers();
  });

  // Клик по верхнему слою — дверной флоу (layer3 → MSG1 → peel)
  const _tap3 = e => { e.stopPropagation(); e.preventDefault?.(); _onDoorClick(3); };
  layer3El.addEventListener('click', _tap3);
  layer3El.addEventListener('touchend', _tap3, { passive: false });

  // Клик по среднему слою — дверной флоу (layer2 → MSG2 → peel → MSG3)
  const _tap2 = e => { e.stopPropagation(); e.preventDefault?.(); _onDoorClick(2); };
  layer2El.addEventListener('click', _tap2);
  layer2El.addEventListener('touchend', _tap2, { passive: false });

  // Кот/монах — capture-фаза на el. Перехватывает клик ДО layer-хендлеров,
  // значит их stopPropagation нас не глушит, даже если зона под слоем.
  el.addEventListener('click',    _onElCapture, true);
  el.addEventListener('touchend', _onElCapture, true);

  // Cursor hint для desktop — смотрим на всю сцену
  el.addEventListener('mousemove', _onElMove);
  el.addEventListener('mouseleave', () => {
    bgEl.style.cursor = CURSOR_DEF;
    if (layer2El) layer2El.style.cursor = '';
    if (layer3El) layer3El.style.cursor = '';
  });
}

// ── Lifecycle ──────────────────────────────────────────────────────────────
export async function openSceneScene4() {
  leaveMain();
  createEl();
  el = document.getElementById('scene4');
  bgEl     = el.querySelector('.s4-bg');
  layer2El = el.querySelector('.s4-layer[data-layer="2"]');
  layer3El = el.querySelector('.s4-layer[data-layer="3"]');
  msgEl    = el.querySelector('.scene-msg');

  // Восстановить состояние слоёв
  if (S.layer3Removed) { layer3El.style.display = 'none'; }
  else { layer3El.style.display = ''; layer3El.classList.remove('fade-out'); }
  if (S.layer2Removed) { layer2El.style.display = 'none'; }
  else { layer2El.style.display = ''; layer2El.classList.remove('fade-out'); }

  S.scene4Unlocked = true;
  SaveManager.setScene('scene4', S);   // фиксируем сразу, иначе F5 внутри сцены сбросит

  showLoading('высота');

  const _onReady = () => {
    hideLoading();
    state.activeScreen = 'scene4';
    el.style.display   = 'block';
    requestAnimationFrame(_layoutLayers);
    trackZoneClick('scene4');
  };
  const _onFail = () => {
    hideLoading();
    showError('не удалось загрузить сцену');
  };
  bgEl.onerror = _onFail;
  bgEl.onload  = _onReady;
  if (bgEl.complete) {
    if (bgEl.naturalWidth) _onReady();
    else _onFail();
  }
}

export function closeSceneScene4() {
  state.activeScreen = 'main';
  if (el) el.style.display = 'none';
  SaveManager.setScene('scene4', S);
  resumeMain();
}
window.closeSceneScene4 = closeSceneScene4;
