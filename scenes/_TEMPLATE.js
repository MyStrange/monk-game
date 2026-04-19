// scenes/_TEMPLATE.js — ШАБЛОН СЦЕНЫ
// ─────────────────────────────────────────────────────────────────────────
// Использование:
//   1. cp _TEMPLATE.js my_scene.js
//   2. Заменить все SCENEID на реальный id (snake_case)
//   3. Добавить ассеты в src/assets.js
//   4. Заполнить ZONES, msgs, interactItem, особую логику
//   5. Добавить в src/nav.js → NAV_MAP
//   6. Добавить window.closeSceneSCENEID в game.js
// ─────────────────────────────────────────────────────────────────────────

import { state }                                  from '../src/state.js';
import { SCREENS }                                from '../src/constants.js';
import { showMsgIn, showLoading, hideLoading,
         showError, setCursor }                   from '../src/utils.js';
import { leaveMain, resumeMain }                  from './main.js';
import { getSelectedItem }                        from '../src/inventory.js';
import { getZoneMsg }                             from '../src/zone-msgs.js';
import { SaveManager }                            from '../src/save.js';
import { ASSET }                                  from '../src/assets.js';
import { waitImg, coverRect, hitZone as rectHitZone,
         buildSceneDOM, bindSceneInput }          from '../src/scene-base.js';

// ── SCENE STATE (только флаги этой сцены) ─────────────────────────────────
const S = SaveManager.getScene('SCENEID');
// S.someFlag  ??= false;

// ── DOM (заполняются в createEl через buildSceneDOM) ──────────────────────
let el, canvas, ctx, msgEl;
let W = 0, H = 0;
const showMsg = (t, d) => showMsgIn(msgEl, t, d);

// ── BG natural size — для coverRect (нужно чтобы зоны работали на любом
//    соотношении экрана). Смотри size картинки и пропиши тут.
const BG_W = 1376, BG_H = 768;

// ── ZONES (нормализованные 0..1 от BG) ────────────────────────────────────
// Используй формат {fx, fy, fw, fh}  или  {x0, y0, x1, y1} — rectHitZone
// понимает оба. Для внутри-canvas зон координаты пересчитываются через
// coverRect(W, H, BG_W, BG_H).
const ZONES = {
  // example: { fx: 0.2, fy: 0.3, fw: 0.15, fh: 0.25 },
};

function findZone(cx, cy) {
  const R = coverRect(W, H, BG_W, BG_H);
  for (const [name, z] of Object.entries(ZONES)) {
    if (rectHitZone(cx, cy, z, R)) return name;
  }
  return null;
}

// ── TAP HANDLER ────────────────────────────────────────────────────────────
function onTap(cx, cy) {
  if (state.activeScreen !== SCREENS.SCENEID) return;
  const item = getSelectedItem();
  const zone = findZone(cx, cy);

  if (item && zone) {
    const msg = getZoneMsg(item.id, zone, item);
    if (msg) showMsg(msg);
    return;
  }
  if (zone) {
    const msg = getZoneMsg(null, zone);
    if (msg) showMsg(msg);
    return;
  }
  // empty click
}

// ── ANIMATION ──────────────────────────────────────────────────────────────
let animId = null;
function animate() {
  if (state.activeScreen !== SCREENS.SCENEID) { animId = null; return; }
  ctx.clearRect(0, 0, W, H);
  // draw here
  animId = requestAnimationFrame(animate);
}

// ── DOM CREATION ───────────────────────────────────────────────────────────
function createEl() {
  if (document.getElementById('SCENEID')) return;

  const built = buildSceneDOM({
    id:      'SCENEID',
    bgSrc:   ASSET('bg/SCENEID'),
    zIndex:  '55',
    onClose: closeSceneSCENEID,
  });
  el = built.el; canvas = built.canvas; ctx = built.ctx; msgEl = built.msgEl;

  bindSceneInput(canvas, {
    onTap,
    onHover:    (cx, cy) => setCursor(!!findZone(cx, cy)),
    onLeave:    () => setCursor(false),
    activeCheck: () => state.activeScreen === SCREENS.SCENEID,
  });
}

// ── LIFECYCLE ──────────────────────────────────────────────────────────────
export async function openSceneSCENEID() {
  leaveMain();
  createEl();
  const bgImg = el.querySelector('img.scene-bg');
  showLoading('SCENEID');
  await waitImg(bgImg);
  if (!bgImg.naturalWidth) {
    hideLoading();
    resumeMain();
    showError('не удалось загрузить сцену');
    return;
  }
  hideLoading();
  state.activeScreen = SCREENS.SCENEID;
  el.style.display   = 'block';
  requestAnimationFrame(() => {
    const r = el.getBoundingClientRect();
    W = canvas.width  = Math.round(r.width);
    H = canvas.height = Math.round(r.height);
    if (!animId) animate();
  });
}

export function closeSceneSCENEID() {
  state.activeScreen = SCREENS.MAIN;
  if (el) el.style.display = 'none';
  if (animId) { cancelAnimationFrame(animId); animId = null; }
  SaveManager.setScene('SCENEID', S);
  resumeMain();
}
window.closeSceneSCENEID = closeSceneSCENEID;
