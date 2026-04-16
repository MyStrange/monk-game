// scenes/scene4.js — вид сверху / полёт
// ─────────────────────────────────────────────────────────────────────────────
// МИНИМАЛЬНАЯ ВЕРСИЯ (полный редизайн в процессе):
// • 3 слоя-картинки стопкой: above_main.jpeg (BG с дверью) + above2.png
//   (средний оверлей) + above3.png (верхний — лианы)
// • клик по верхнему слою → он плавно исчезает (CSS transition) →
//   открывается следующий
// • когда оба оверлея сняты — в BG видна дверь (пока без взаимодействия,
//   логику навесим позже)
// • навигация: открыть из main, закрыть back-кнопкой → resumeMain()
// • сохраняется состояние снятых слоёв (S.layer2Removed / S.layer3Removed)
//   и факт разблокировки сцены (S.scene4Unlocked)
//
// ЧТО УДАЛЕНО в этой версии (будет восстановлено/переписано позже):
//   — светлячки, искры, canvas с анимацией
//   — диалог с дверью (философы) и переход в scene3
//   — flavor-сообщения по клику на кота/монаха
// ─────────────────────────────────────────────────────────────────────────────

import { state }                         from '../src/state.js';
import { showLoading, hideLoading, showError } from '../src/utils.js';
import { leaveMain, resumeMain }         from './main.js';
import { SaveManager }                   from '../src/save.js';
import { trackZoneClick }                from '../src/achievements.js';

// ── Scene state ────────────────────────────────────────────────────────────
const S = SaveManager.getScene('scene4');
S.scene4Unlocked = S.scene4Unlocked ?? false;
S.layer2Removed  = S.layer2Removed  ?? false;   // above2 снят
S.layer3Removed  = S.layer3Removed  ?? false;   // above3 (лианы) снят

// ── DOM ────────────────────────────────────────────────────────────────────
let el, layer2El, layer3El;

// ── BG natural dims (для выравнивания спрайтов-оверлеев) ──────────────────
const BG_W = 2051, BG_H = 1154;
// Positional crop оверлейных спрайтов above2/above3 внутри BG (template match)
const SP_X = 784, SP_Y = 0, SP_W = 509, SP_H = 854;

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

// ── DOM creation ───────────────────────────────────────────────────────────
function createEl() {
  if (document.getElementById('scene4')) return;

  el = document.createElement('div');
  el.id = 'scene4';
  el.style.cssText = 'position:absolute;inset:0;display:none;z-index:55;overflow:hidden;';

  // Base BG — картинка с дверью, object-fit:cover для кадрирования
  const bg = document.createElement('img');
  bg.src = 'assets/bg/above_main.jpeg';
  bg.style.cssText =
    'display:block;width:100%;height:100%;object-fit:cover;object-position:top;';

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

  el.appendChild(bg);
  el.appendChild(layer2El);
  el.appendChild(layer3El);
  el.appendChild(back);
  document.getElementById('wrap').appendChild(el);

  // Resize — пересчитать позицию оверлеев
  window.addEventListener('resize', () => {
    if (state.activeScreen === 'scene4') _layoutLayers();
  });

  // Клик по верхнему слою — снять его
  const _tap3 = e => { e.stopPropagation(); e.preventDefault?.(); _peelLayer(3); };
  layer3El.addEventListener('click', _tap3);
  layer3El.addEventListener('touchend', _tap3, { passive: false });

  // Клик по среднему слою — снять его (только когда верхний уже снят)
  const _tap2 = e => { e.stopPropagation(); e.preventDefault?.(); _peelLayer(2); };
  layer2El.addEventListener('click', _tap2);
  layer2El.addEventListener('touchend', _tap2, { passive: false });
}

// ── Lifecycle ──────────────────────────────────────────────────────────────
export async function openSceneScene4() {
  leaveMain();
  createEl();
  el = document.getElementById('scene4');
  layer2El = el.querySelector('.s4-layer[data-layer="2"]');
  layer3El = el.querySelector('.s4-layer[data-layer="3"]');

  // Восстановить состояние слоёв
  if (S.layer3Removed) { layer3El.style.display = 'none'; }
  else { layer3El.style.display = ''; layer3El.classList.remove('fade-out'); }
  if (S.layer2Removed) { layer2El.style.display = 'none'; }
  else { layer2El.style.display = ''; layer2El.classList.remove('fade-out'); }

  S.scene4Unlocked = true;
  SaveManager.setScene('scene4', S);   // фиксируем сразу, иначе F5 внутри сцены сбросит

  showLoading('высота');

  const bgImg = el.querySelector('img');
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
  bgImg.onerror = _onFail;
  bgImg.onload  = _onReady;
  if (bgImg.complete) {
    if (bgImg.naturalWidth) _onReady();
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
