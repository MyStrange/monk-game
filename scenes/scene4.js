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
import { showLoading, hideLoading, showError }   from '../src/ui/overlays.js';
import { showMsgIn, showChoiceIn, isStoryActive } from '../src/ui/messages.js';
import { setCursor }                              from '../src/ui/cursor.js';
import { leaveMain, resumeMain }          from './main.js';
import { openScene }                      from '../src/nav.js';
import { SaveManager, useSceneState }     from '../src/save.js';
import { trackZoneClick, trackDurianOnMonkHead } from '../src/achievements.js';
import { S4_CAT_MSGS, S4_MONK_MSGS,
         S4_DURIAN_CAT_MSGS, S4_DURIAN_MONK_MSGS,
         S4_STATUE_MSGS, S4_ITEM_MSGS,
         SCENE4_OPEN_MSG3 }              from '../src/dialogue.js';
import { getSelectedItem }                from '../src/inventory.js';
import { waitImg, coverRect, hitZone }    from '../src/scene-base.js';

// ── Scene state ────────────────────────────────────────────────────────────
const [S] = useSceneState('scene4', {
  scene4Unlocked: false,
  layer2Removed:  false,
  layer3Removed:  false,
  catMsgIdx:      0,
  monkMsgIdx:     0,
  statueIdx:      0,
  durCatIdx:      0,
  durMonkIdx:     0,
  doorEntered:    false,
});

// ── DOM ────────────────────────────────────────────────────────────────────
let el, bgEl, layer2El, layer3El, msgEl, debugCv;
let _resizeObs = null;

// ── BG dims + layer sprite coords ─────────────────────────────────────────
import { SCENE_DEFS } from '../src/scene-defs.js';
const { bgW: BG_W, bgH: BG_H } = SCENE_DEFS.scene4;
const SP_X = 784, SP_Y = 0, SP_W = 509, SP_H = 854;

// ── Hit-зоны (normalized 0..1 в BG natural 2051×1154) ────────────────────
// Откалиброваны по реальным кликам:
//   trunk  (0.492, 0.209) — дверь в стволе
//   statue (0.501, 0.511) — статуя Будды на платформе
//   cat    (0.702, 0.611) — кот справа
//   monk   (0.642, 0.751) — монах ниже и левее кота
const TRUNK_ZONE  = { x0: 0.41, y0: 0.07, x1: 0.56, y1: 0.36 };
const STATUE_ZONE = { x0: 0.40, y0: 0.42, x1: 0.58, y1: 0.68 };
const CAT_ZONE    = { x0: 0.65, y0: 0.56, x1: 0.77, y1: 0.68 };
const MONK_ZONE   = { x0: 0.60, y0: 0.70, x1: 0.71, y1: 0.81 };

// Dev-хелпер. Выключен по умолчанию (зоны откалиброваны). Включить при
// необходимости правки: `window.__s4zones = true` в консоли → любой клик
// включит overlay с цветными прямоугольниками + лог nx/ny.
if (typeof window !== 'undefined') window.__s4zones = window.__s4zones ?? false;

// ── Displayed-BG math (object-fit:cover + object-position:top) ────────────
// coverRect из scene-base берёт object-position:top через параметр 'top'.
function _dispBG(vw, vh) { return coverRect(vw, vh, BG_W, BG_H, 'top'); }

function _inZone(cx, cy, z) {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return hitZone(cx, cy, z, _dispBG(r.width, r.height));
}

// Случайная строка или одна фраза из S4_ITEM_MSGS по ключу item:zone.
// Возвращает null если нет записи — тогда вызывающий использует fallback.
function _s4ItemMsg(sel, zone) {
  if (!sel) return null;
  const entry = S4_ITEM_MSGS[`${sel.id}:${zone}`];
  if (!entry) return null;
  return Array.isArray(entry)
    ? entry[Math.floor(Math.random() * entry.length)]
    : entry;
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
  _drawDebugZones();
}

// Отрисовка debug-зон: полупрозрачные прямоугольники поверх сцены.
// Вызывается при layout и при каждом клике (чтобы реагировало на
// `window.__s4zones = true/false` в рантайме без перезагрузки).
function _drawDebugZones() {
  if (!debugCv || !el) return;
  const r = el.getBoundingClientRect();
  debugCv.width  = r.width;
  debugCv.height = r.height;
  const ctx = debugCv.getContext('2d');
  ctx.clearRect(0, 0, r.width, r.height);
  if (!window.__s4zones) { debugCv.style.display = 'none'; return; }
  debugCv.style.display = 'block';

  const d = _dispBG(r.width, r.height);
  const paint = (z, fill, label) => {
    const x = d.x + z.x0 * BG_W * d.scale;
    const y = d.y + z.y0 * BG_H * d.scale;
    const w = (z.x1 - z.x0) * BG_W * d.scale;
    const h = (z.y1 - z.y0) * BG_H * d.scale;
    ctx.fillStyle   = fill;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = fill.replace(/[\d.]+\)$/, '1)');
    ctx.lineWidth   = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle   = '#fff';
    ctx.font        = 'bold 14px monospace';
    ctx.fillText(label, x + 6, y + 18);
  };
  paint(TRUNK_ZONE,  'rgba(240,200,60,0.35)',  'TRUNK');
  paint(STATUE_ZONE, 'rgba(80,200,120,0.35)', 'STATUE');
  paint(CAT_ZONE,    'rgba(230,80,80,0.45)',  'CAT');
  paint(MONK_ZONE,   'rgba(80,120,230,0.45)', 'MONK');
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

  // Dev-лог: нормализованные координаты для калибровки зон
  if (window.__s4zones) {
    const d = _dispBG(r.width, r.height);
    const nx = ((cx - d.x) / d.scale / BG_W).toFixed(3);
    const ny = ((cy - d.y) / d.scale / BG_H).toFixed(3);
    console.log(`[scene4 click] nx=${nx}, ny=${ny}`);
  }
  // Перерисовать debug-overlay (если тоггл менялся в рантайме)
  _drawDebugZones();

  const sel = getSelectedItem();

  // TRUNK — ствол (верхний проём). С предметом — флейвор, без — дверной флоу.
  if (_inZone(cx, cy, TRUNK_ZONE)) {
    e.stopPropagation();
    e.preventDefault?.();
    const im = _s4ItemMsg(sel, 'trunk');
    if (im) { showMsgIn(msgEl, im); trackZoneClick('scene4_trunk'); return; }
    _onTrunkClick();
    trackZoneClick('scene4_trunk');
    return;
  }

  // STATUE — статуя (всегда, вне зависимости от слоёв)
  if (_inZone(cx, cy, STATUE_ZONE)) {
    if (isStoryActive(msgEl)) return;
    e.stopPropagation();
    e.preventDefault?.();
    const im = _s4ItemMsg(sel, 'statue');
    const msg = im ?? S4_STATUE_MSGS[S.statueIdx % S4_STATUE_MSGS.length];
    if (!im) { S.statueIdx++; SaveManager.setScene('scene4', S); }
    showMsgIn(msgEl, msg);
    trackZoneClick('scene4_statue');
    return;
  }

  // CAT
  if (_inZone(cx, cy, CAT_ZONE)) {
    if (isStoryActive(msgEl)) return;
    e.stopPropagation();
    e.preventDefault?.();
    let msg;
    const im = _s4ItemMsg(sel, 'cat');
    if (im) {
      msg = im;
    } else if (sel?.id === 'durian') {
      msg = S4_DURIAN_CAT_MSGS[S.durCatIdx % S4_DURIAN_CAT_MSGS.length];
      S.durCatIdx++;
      SaveManager.setScene('scene4', S);
    } else {
      msg = S4_CAT_MSGS[S.catMsgIdx % S4_CAT_MSGS.length];
      S.catMsgIdx++;
      SaveManager.setScene('scene4', S);
    }
    showMsgIn(msgEl, msg);
    trackZoneClick('scene4_cat');
    return;
  }

  // MONK
  if (_inZone(cx, cy, MONK_ZONE)) {
    if (isStoryActive(msgEl)) return;
    e.stopPropagation();
    e.preventDefault?.();
    let msg;
    const im = _s4ItemMsg(sel, 'monk');
    if (im) {
      msg = im;
    } else if (sel?.id === 'durian') {
      msg = S4_DURIAN_MONK_MSGS[S.durMonkIdx % S4_DURIAN_MONK_MSGS.length];
      S.durMonkIdx++;
      SaveManager.setScene('scene4', S);
      trackDurianOnMonkHead();
    } else {
      msg = S4_MONK_MSGS[S.monkMsgIdx % S4_MONK_MSGS.length];
      S.monkMsgIdx++;
      SaveManager.setScene('scene4', S);
    }
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
  el.className = 'scene-root';
  el.style.zIndex = '55';

  bgEl = document.createElement('img');
  bgEl.src = 'assets/bg/above_main.jpeg';
  // s4-bg оставлен — layout.js использует класс, плюс добавляем общий
  // scene-bg (object-fit:cover) + модификатор --top (object-position:top).
  bgEl.className = 's4-bg scene-bg scene-bg--top';

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

  // Debug-canvas для визуализации зон (видим когда window.__s4zones=true).
  // zIndex 70 — выше слоёв 60/61, но НИЖЕ back-btn (который имеет свой z).
  // pointer-events:none — клики проходят сквозь к capture-handler на el.
  debugCv = document.createElement('canvas');
  debugCv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:70;pointer-events:none;display:none;';

  el.appendChild(bgEl);
  el.appendChild(layer2El);
  el.appendChild(layer3El);
  el.appendChild(debugCv);
  el.appendChild(back);
  el.appendChild(msgEl);
  document.getElementById('wrap').appendChild(el);

  // ResizeObserver точнее window.resize: реагирует на любое изменение размера
  // контейнера (включая rotate на мобильных без события resize), и сам
  // отключается при disconnect() в close — не нужен внешний removeEventListener.
  _resizeObs = new ResizeObserver(() => {
    if (state.activeScreen === SCREENS.SCENE4) _layoutLayers();
  });
  _resizeObs.observe(el);

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
  if (_resizeObs) { _resizeObs.disconnect(); _resizeObs = null; }
  SaveManager.setScene('scene4', S);
  resumeMain();
}
window.closeSceneScene4 = closeSceneScene4;
