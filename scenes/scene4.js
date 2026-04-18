// scenes/scene4.js — вид сверху
// ─────────────────────────────────────────────────────────────────────────────
// ЗОНЫ (normalized 0..1 относительно BG 2051×1154):
//   TRUNK_ZONE  — тёмный арочный проём в стволе (над статуей)
//   STATUE_ZONE — золотая статуя Будды на платформе
//   CAT_ZONE    — маленький кот справа
//   MONK_ZONE   — монах в красном, ниже центра
//
// ПОТОК КЛИКА ПО СТВОЛУ:
//   Фаза 1 (layer3 на месте):
//       showChoiceIn — вопрос про дерево (3 варианта) → ответ-реплика →
//       layer3 уходит (анимация спрайта1 открывается)
//   Фаза 2 (layer2 на месте):
//       showChoiceIn — вопрос про дверь (3 варианта) → ответ-реплика →
//       layer2 уходит → "Дверь была всегда..."
//   Фаза 3 (оба сняты):
//       один финальный клик — "Ты входишь..."
//
// КУРСОР: управляется централизованно через setCursor() из utils.js
// ─────────────────────────────────────────────────────────────────────────────

import { state }                          from '../src/state.js';
import { SCREENS }                        from '../src/constants.js';
import { showLoading, hideLoading, showError,
         showMsgIn, showChoiceIn, isStoryActive,
         setCursor }                      from '../src/utils.js';
import { leaveMain, resumeMain }          from './main.js';
import { openScene }                      from '../src/nav.js';
import { SaveManager }                    from '../src/save.js';
import { trackZoneClick }                 from '../src/achievements.js';
import { S4_CAT_MSGS, S4_MONK_MSGS,
         S4_DURIAN_CAT_MSGS, S4_DURIAN_MONK_MSGS,
         S4_STATUE_MSGS,
         SCENE4_OPEN_MSG3 }              from '../src/dialogue.js';
import { getSelectedItem }                from '../src/inventory.js';
import { waitImg, coverRect, hitZone }    from '../src/scene-base.js';

// ── Scene state ────────────────────────────────────────────────────────────
const S = SaveManager.getScene('scene4');
S.scene4Unlocked = S.scene4Unlocked ?? false;
S.layer2Removed  = S.layer2Removed  ?? false;
S.layer3Removed  = S.layer3Removed  ?? false;
S.catMsgIdx      = S.catMsgIdx      ?? 0;
S.monkMsgIdx     = S.monkMsgIdx     ?? 0;
S.statueIdx      = S.statueIdx      ?? 0;
S.durCatIdx      = S.durCatIdx      ?? 0;
S.durMonkIdx     = S.durMonkIdx     ?? 0;
S.doorEntered    = S.doorEntered    ?? false;

// ── DOM ────────────────────────────────────────────────────────────────────
let el, bgEl, layer2El, layer3El, msgEl;
let _onResize = null;

// ── BG dims + layer sprite coords ─────────────────────────────────────────
const BG_W = 2051, BG_H = 1154;
const SP_X = 784, SP_Y = 0, SP_W = 509, SP_H = 854;

// ── Hit-зоны (normalized 0..1 в BG natural) ───────────────────────────────
// Сверены по above_main.jpeg; CAT/MONK используют capture-фазу чтобы
// перехватить клик даже если они под прямоугольником layer2/layer3 img.
const TRUNK_ZONE  = { x0: 0.41, y0: 0.07, x1: 0.56, y1: 0.36 };
const STATUE_ZONE = { x0: 0.39, y0: 0.42, x1: 0.60, y1: 0.78 };
const CAT_ZONE    = { x0: 0.61, y0: 0.51, x1: 0.68, y1: 0.70 };
const MONK_ZONE   = { x0: 0.48, y0: 0.70, x1: 0.61, y1: 0.84 };

// ── Displayed-BG math (object-fit:cover + object-position:top) ────────────
// coverRect из scene-base берёт object-position:top через параметр 'top'.
function _dispBG(vw, vh) { return coverRect(vw, vh, BG_W, BG_H, 'top'); }

function _inZone(cx, cy, z) {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return hitZone(cx, cy, z, _dispBG(r.width, r.height));
}

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
  if (which === 2 && !S.layer3Removed) return;
  if (which === 3 && S.layer3Removed)  return;
  node.classList.add('fade-out');
  setTimeout(() => { node.style.display = 'none'; }, 600);
  if (which === 3) S.layer3Removed = true;
  else             S.layer2Removed = true;
  SaveManager.setScene('scene4', S);
}

// ── Trunk click — flow с выбором ───────────────────────────────────────────
const _Q1_RESP = {
  'Снаружи':  'Снаружи — только отражения твоих же вопросов. Настоящее — глубже.',
  'Внутри':   'Ты уже знаешь куда смотреть. Просто ещё не посмотрел.',
  'Не знаю':  'Незнание — честный ответ. И первый шаг. Слои начинают расступаться.',
};
const _Q2_RESP = {
  'Темноту':  'В темноте глаза привыкают. А потом видят то, что было там всегда.',
  'Себя':     'Встреча с собой — самое важное путешествие. Дверь это чувствует.',
  'Боюсь':    'Страх указывает именно туда, куда нужно идти. Иди.',
};

function _onTrunkClick() {
  if (isStoryActive(msgEl)) return;

  if (!S.layer3Removed) {
    // Фаза 1: вопрос про дерево
    showChoiceIn(msgEl,
      'Где ты ищешь ответы?',
      [{text: 'Снаружи'}, {text: 'Внутри'}, {text: 'Не знаю'}],
      val => {
        const resp = _Q1_RESP[val] || 'Слои начинают расступаться.';
        showMsgIn(msgEl, resp, {
          story: true, dur: 2800,
          onDismiss: () => {
            if (state.activeScreen !== SCREENS.SCENE4) return;
            _peelLayer(3);
          },
        });
      }
    );
  } else if (!S.layer2Removed) {
    // Фаза 2: вопрос про дверь
    showChoiceIn(msgEl,
      'Что ты найдёшь, если посмотришь внутрь?',
      [{text: 'Темноту'}, {text: 'Себя'}, {text: 'Боюсь'}],
      val => {
        const resp = _Q2_RESP[val] || 'Дверь чувствует тебя.';
        showMsgIn(msgEl, resp, {
          story: true, dur: 2800,
          onDismiss: () => {
            if (state.activeScreen !== SCREENS.SCENE4) return;
            _peelLayer(2);
            setTimeout(() => {
              if (state.activeScreen !== SCREENS.SCENE4) return;
              showMsgIn(msgEl, SCENE4_OPEN_MSG3, { story: true, dur: 5500 });
            }, 800);
          },
        });
      }
    );
  } else {
    // Фаза 3: войти → открывает сцену внутри дерева
    S.doorEntered = true;
    SaveManager.setScene('scene4', S);
    openScene('inside');
  }
}

// ── Capture-phase handler — все зоны ─────────────────────────────────────
// Срабатывает ДО layer2/layer3 handlers → работает даже через прозрачные img.
function _onElCapture(e) {
  if (state.activeScreen !== SCREENS.SCENE4) return;
  if (e.target && e.target.closest && e.target.closest('.back-btn')) return;

  const r = el.getBoundingClientRect();
  const pt = e.changedTouches?.[0] || e.touches?.[0] || e;
  const cx = pt.clientX - r.left;
  const cy = pt.clientY - r.top;

  // TRUNK — только ствол (верхний проём) активирует дверной флоу
  if (_inZone(cx, cy, TRUNK_ZONE)) {
    e.stopPropagation();
    e.preventDefault?.();
    _onTrunkClick();
    trackZoneClick('scene4_trunk');
    return;
  }

  // STATUE — статуя (всегда, вне зависимости от слоёв)
  if (_inZone(cx, cy, STATUE_ZONE)) {
    if (isStoryActive(msgEl)) return;
    e.stopPropagation();
    e.preventDefault?.();
    const msg = S4_STATUE_MSGS[S.statueIdx % S4_STATUE_MSGS.length];
    S.statueIdx++;
    SaveManager.setScene('scene4', S);
    showMsgIn(msgEl, msg);
    trackZoneClick('scene4_statue');
    return;
  }

  // CAT
  if (_inZone(cx, cy, CAT_ZONE)) {
    if (isStoryActive(msgEl)) return;
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

  // MONK
  if (_inZone(cx, cy, MONK_ZONE)) {
    if (isStoryActive(msgEl)) return;
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
  // Прочие клики (фон, листва) — событие идёт дальше
}

// ── Cursor hint (desktop) ──────────────────────────────────────────────────
function _onElMove(e) {
  if (state.activeScreen !== SCREENS.SCENE4) return;
  const r = el.getBoundingClientRect();
  const cx = e.clientX - r.left;
  const cy = e.clientY - r.top;
  // Зоны клика + видимые слои — всё интерактивно
  const overVisible = (!S.layer3Removed && e.target === layer3El)
                   || (!S.layer2Removed && e.target === layer2El);
  const overZone = _inZone(cx, cy, TRUNK_ZONE)  ||
                   _inZone(cx, cy, STATUE_ZONE) ||
                   _inZone(cx, cy, CAT_ZONE)    ||
                   _inZone(cx, cy, MONK_ZONE);
  setCursor(overZone || overVisible);
}

// ── DOM creation ───────────────────────────────────────────────────────────
function createEl() {
  if (document.getElementById('scene4')) return;

  el = document.createElement('div');
  el.id = 'scene4';
  el.style.cssText = 'position:absolute;inset:0;display:none;z-index:55;overflow:hidden;';

  bgEl = document.createElement('img');
  bgEl.src = 'assets/bg/above_main.jpeg';
  bgEl.className = 's4-bg';
  bgEl.style.cssText = 'display:block;width:100%;height:100%;object-fit:cover;object-position:top;';

  layer2El = document.createElement('img');
  layer2El.src = 'assets/bg/above2.png';
  layer2El.className = 's4-layer';
  layer2El.dataset.layer = '2';
  layer2El.style.zIndex = '60';

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

  // Сохраняем ссылку, чтобы снять listener в closeSceneScene4 —
  // без этого он висел навсегда и тикал при каждом resize всю сессию.
  _onResize = () => { if (state.activeScreen === SCREENS.SCENE4) _layoutLayers(); };
  window.addEventListener('resize', _onResize);

  // Все зоны — capture-фаза на el (срабатывает ДО layer-хендлеров)
  el.addEventListener('click',    _onElCapture, true);
  el.addEventListener('touchend', _onElCapture, true);

  // Курсор — mousemove на el, mouseleave сбрасывает
  el.addEventListener('mousemove',  _onElMove);
  el.addEventListener('mouseleave', () => setCursor(false));
}

// ── Lifecycle ──────────────────────────────────────────────────────────────
// waitImg теперь из src/scene-base.js.
export async function openSceneScene4() {
  leaveMain();
  createEl();
  el       = document.getElementById('scene4');
  bgEl     = el.querySelector('.s4-bg');
  layer2El = el.querySelector('.s4-layer[data-layer="2"]');
  layer3El = el.querySelector('.s4-layer[data-layer="3"]');
  msgEl    = el.querySelector('.scene-msg');

  if (S.layer3Removed) { layer3El.style.display = 'none'; }
  else { layer3El.style.display = ''; layer3El.classList.remove('fade-out'); }
  if (S.layer2Removed) { layer2El.style.display = 'none'; }
  else { layer2El.style.display = ''; layer2El.classList.remove('fade-out'); }

  S.scene4Unlocked = true;
  SaveManager.setScene('scene4', S);

  showLoading('высота');

  // Ждём ВСЕ три картинки: фон + оба слоя-спрайта.
  // Без этого игрок видел pop-in слоёв поверх уже открытой сцены.
  await Promise.all([waitImg(bgEl), waitImg(layer2El), waitImg(layer3El)]);

  if (!bgEl.naturalWidth) {
    hideLoading();
    resumeMain();
    showError('не удалось загрузить сцену');
    return;
  }

  hideLoading();
  state.activeScreen = SCREENS.SCENE4;
  el.style.display   = 'block';
  setCursor(false);
  requestAnimationFrame(_layoutLayers);
  trackZoneClick('scene4');
}

export function closeSceneScene4() {
  state.activeScreen = SCREENS.MAIN;
  if (el) el.style.display = 'none';
  setCursor(false);
  if (_onResize) { window.removeEventListener('resize', _onResize); _onResize = null; }
  SaveManager.setScene('scene4', S);
  resumeMain();
}
window.closeSceneScene4 = closeSceneScene4;
