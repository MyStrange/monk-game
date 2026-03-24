// scenes/scene4.js — вид сверху / полёт, 28 светлячков

import { state }         from '../src/state.js';
import { showMsgIn, showLoading, hideLoading, showError } from '../src/utils.js';
import { leaveMain }     from './main.js';
import { SaveManager }   from '../src/save.js';
import { trackZoneClick } from '../src/achievements.js';
import { scene4OpenMsg } from '../src/dialogue.js';

// ── Scene state ────────────────────────────────────────────────────────────
const S = SaveManager.getScene('scene4');
S.scene4Unlocked = S.scene4Unlocked ?? false;

// ── DOM ────────────────────────────────────────────────────────────────────
let el, canvas, ctx, msgEl;
let s4W = 0, s4H = 0;
const showMsg = (t, d) => showMsgIn(msgEl, t, d);

// ── Fireflies — deterministic seed-based ──────────────────────────────────
function _seeded(seed) { return ((seed * 1664525 + 1013904223) & 0xffffffff) >>> 0; }

const flies = Array.from({ length: 28 }, (_, i) => {
  const s1 = _seeded(i * 73 + 1);
  const s2 = _seeded(s1);
  const s3 = _seeded(s2);
  const s4 = _seeded(s3);
  return {
    x:    (s1 / 0xffffffff),
    y:    (s2 / 0xffffffff),
    vx:   ((s3 / 0xffffffff) - 0.5) * 1.2,
    vy:   ((s4 / 0xffffffff) - 0.5) * 0.8,
    tick: i * 23,
    sz:   1.5 + (s1 % 10) / 10 * 2,
  };
});

// ── Animation ──────────────────────────────────────────────────────────────
let animId = null;

function animate() {
  if (state.activeScreen !== 'scene4') { animId = null; return; }
  ctx.clearRect(0, 0, s4W, s4H);

  for (const f of flies) {
    f.tick++;
    f.x = (f.x + f.vx / s4W + 1) % 1;
    f.y = (f.y + f.vy / s4H + 1) % 1;
    const br = 0.4 + 0.6 * Math.abs(Math.sin(f.tick * 0.04));
    ctx.globalAlpha = br;
    ctx.fillStyle   = '#b0ffa0';
    ctx.beginPath();
    ctx.arc(f.x * s4W, f.y * s4H, f.sz, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

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
  bg.style.cssText = 'display:block;width:100%;height:100%;object-fit:cover;object-position:top;';

  canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
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
}

// ── Lifecycle ──────────────────────────────────────────────────────────────
export async function openSceneScene4() {
  leaveMain();
  createEl();
  el = document.getElementById('scene4');
  S.scene4Unlocked = true;
  showLoading('высота');

  const bgImg = el.querySelector('img');
  bgImg.onerror = () => showError('не удалось загрузить сцену');
  bgImg.onload  = () => {
    hideLoading();
    state.activeScreen = 'scene4';
    el.style.display   = 'block';
    requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      s4W = canvas.width  = Math.round(r.width);
      s4H = canvas.height = Math.round(r.height);
      if (!animId) animate();
    });
    showMsg(scene4OpenMsg, 4000);
    trackZoneClick('scene4');
  };
  if (bgImg.complete && bgImg.naturalWidth) bgImg.onload();
}

export function closeSceneScene4() {
  state.activeScreen = 'main';
  if (el) el.style.display = 'none';
  if (animId) { cancelAnimationFrame(animId); animId = null; }
  SaveManager.setScene('scene4', S);
}
window.closeSceneScene4 = closeSceneScene4;
