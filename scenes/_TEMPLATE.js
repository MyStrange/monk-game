// scenes/_TEMPLATE.js — ШАБЛОН СЦЕНЫ
// ─────────────────────────────────────────────────────────────────────────
// Использование:
//   1. cp _TEMPLATE.js my_scene.js
//   2. Заменить все SCENEID на реальный id (snake_case)
//   3. Заполнить ZONES, msgs, interactItem, особую логику
//   4. Добавить в src/nav.js → NAV_MAP
//   5. Добавить window.closeSceneSCENEID в game.js
// ─────────────────────────────────────────────────────────────────────────

import { state }                                  from '../src/state.js';
import { showMsgIn, showLoading, hideLoading,
         showError }                              from '../src/utils.js';
import { leaveMain }                              from './main.js';
import { getSelectedItem }                        from '../src/inventory.js';
import { getZoneMsg }                             from '../src/zone-msgs.js';
import { SaveManager }                            from '../src/save.js';

// ── SCENE STATE (только флаги этой сцены) ─────────────────────────────────
const S = SaveManager.getScene('SCENEID');
// Пример:
// S.someFlag  ?? (S.someFlag  = false);
// S.someCount ?? (S.someCount = 0);

// ── DOM ────────────────────────────────────────────────────────────────────
let el, canvas, ctx, msgEl;
let W = 0, H = 0;
const showMsg = (t, d) => showMsgIn(msgEl, t, d);

// ── ZONES (доли 0..1 от W/H) ──────────────────────────────────────────────
// fx,fy = левый верхний угол, fw,fh = ширина/высота
const ZONES = {
  // example: { fx: 0.2, fy: 0.3, fw: 0.15, fh: 0.25 },
};

function hitZone(cx, cy) {
  for (const [name, z] of Object.entries(ZONES)) {
    if (cx >= z.fx * W && cx < (z.fx + z.fw) * W &&
        cy >= z.fy * H && cy < (z.fy + z.fh) * H) return name;
  }
  return null;
}

// ── ITEM × ZONE INTERACTIONS ───────────────────────────────────────────────
// combos.js = только предмет×предмет. Предмет×зона — здесь.
function interactItem(itemId, zone) {
  // if (itemId === 'stick' && zone === 'example') {
  //   // действие
  //   return;
  // }
  const msg = getZoneMsg(itemId, zone, getSelectedItem());
  if (msg) showMsg(msg);
}

// ── ZONE CLICKS (без предмета) ─────────────────────────────────────────────
function zoneClick(zone) {
  const msg = getZoneMsg(null, zone);
  if (msg) showMsg(msg);
}

// ── TAP HANDLER ────────────────────────────────────────────────────────────
function onTap(cx, cy) {
  if (state.activeScreen !== 'SCENEID') return;
  const item = getSelectedItem();
  const zone = hitZone(cx, cy);

  if (item && zone) { interactItem(item.id, zone); return; }
  if (zone)         { zoneClick(zone); return; }
  // empty click
}

// ── ANIMATION ──────────────────────────────────────────────────────────────
let animId = null;
function animate(t) {
  if (state.activeScreen !== 'SCENEID') { animId = null; return; }
  ctx.clearRect(0, 0, W, H);
  // draw here
  animId = requestAnimationFrame(animate);
}

// ── DOM CREATION ───────────────────────────────────────────────────────────
function createEl() {
  if (document.getElementById('SCENEID')) return;

  el = document.createElement('div');
  el.id = 'SCENEID';
  el.style.cssText = 'position:absolute;inset:0;display:none;z-index:55;overflow:hidden;';

  const bg = document.createElement('img');
  bg.src = 'assets/bg/SCENEID.jpeg';
  bg.style.cssText = 'display:block;width:100%;height:100%;object-fit:cover;';

  canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;cursor:default;';
  ctx = canvas.getContext('2d');

  const back = document.createElement('button');
  back.className = 'back-btn';
  back.textContent = '←';
  back.onclick = closeSceneSCENEID;

  msgEl = document.createElement('div');
  msgEl.className = 'scene-msg';

  el.appendChild(bg);
  el.appendChild(canvas);
  el.appendChild(back);
  el.appendChild(msgEl);
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
}

// ── LIFECYCLE ──────────────────────────────────────────────────────────────
export async function openSceneSCENEID() {
  leaveMain();
  createEl();
  el = document.getElementById('SCENEID');
  showLoading('SCENEID');

  const bgImg = el.querySelector('img');
  bgImg.onerror = () => showError('не удалось загрузить сцену');
  bgImg.onload  = () => {
    hideLoading();
    state.activeScreen = 'SCENEID';
    el.style.display   = 'block';
    requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      W = canvas.width  = Math.round(r.width);
      H = canvas.height = Math.round(r.height);
      if (!animId) animate(0);
    });
  };
  if (bgImg.complete && bgImg.naturalWidth) bgImg.onload();
}

export function closeSceneSCENEID() {
  state.activeScreen = 'main';
  if (el) el.style.display = 'none';
  if (animId) { cancelAnimationFrame(animId); animId = null; }
  SaveManager.setScene('SCENEID', S);
}
window.closeSceneSCENEID = closeSceneSCENEID;
