// scenes/scene3.js — поле огненных цветов (процедурная графика)

import { state }        from '../src/state.js';
import { showMsgIn, CURSOR_DEF, CURSOR_PTR, setCursor } from '../src/utils.js';
import { leaveMain, resumeMain } from './main.js';
import { getSelectedItem, addItem, removeItem, makeItem } from '../src/inventory.js';
import { renderHotbar } from '../src/hotbar.js';
import { SaveManager }  from '../src/save.js';
import { AudioSystem }  from '../src/audio.js';
import { trackZoneClick, trackEmptyClick } from '../src/achievements.js';
import { fireflowerPickupMsg } from '../src/dialogue.js';

// ── Scene state ────────────────────────────────────────────────────────────
const S = SaveManager.getScene('scene3');
S.fireFlowerPicked = S.fireFlowerPicked ?? false;
S.scene3Unlocked   = S.scene3Unlocked   ?? false;

// ── DOM ────────────────────────────────────────────────────────────────────
let el, canvas, ctx, msgEl;
let s3W = 0, s3H = 0;
const showMsg = (t, d) => showMsgIn(msgEl, t, d);

// ── Stars ──────────────────────────────────────────────────────────────────
const stars = Array.from({ length: 80 }, () => ({
  x: Math.random(), y: Math.random() * 0.55,
  r: 0.5 + Math.random() * 1.5,
  br: Math.random(),
  bv: (Math.random() - 0.5) * 0.01,
}));

// ── Plumeria flowers ───────────────────────────────────────────────────────
const flowers = [
  { x: 0.18, y: 0.55 }, { x: 0.35, y: 0.62 }, { x: 0.65, y: 0.58 },
  { x: 0.82, y: 0.53 }, { x: 0.28, y: 0.70 }, { x: 0.72, y: 0.68 },
];

// ── Animation ──────────────────────────────────────────────────────────────
let animId = null;
let tick   = 0;

// Градиенты не меняются между кадрами — кэшируем и пересоздаём только
// при ресайзе (когда s3W/s3H изменились). Иначе createLinearGradient
// дёргается 60 раз/сек × 2 градиента × 3 colorStops — лишняя нагрузка.
let _skyGrad = null, _groundGrad = null, _gradW = 0, _gradH = 0;
function _ensureGradients() {
  if (_gradW === s3W && _gradH === s3H && _skyGrad) return;
  _gradW = s3W; _gradH = s3H;
  _skyGrad = ctx.createLinearGradient(0, 0, 0, s3H);
  _skyGrad.addColorStop(0,    '#0a0420');
  _skyGrad.addColorStop(0.45, '#1a0840');
  _skyGrad.addColorStop(0.7,  '#3d1060');
  _skyGrad.addColorStop(1,    '#1a2010');
  _groundGrad = ctx.createLinearGradient(0, s3H * 0.72, 0, s3H);
  _groundGrad.addColorStop(0, '#0d1a08');
  _groundGrad.addColorStop(1, '#1a2808');
}

function draw() {
  ctx.clearRect(0, 0, s3W, s3H);
  _ensureGradients();

  // Sky gradient — night/dusk
  ctx.fillStyle = _skyGrad;
  ctx.fillRect(0, 0, s3W, s3H);

  // Stars
  for (const s of stars) {
    s.br += s.bv;
    if (s.br < 0 || s.br > 1) s.bv *= -1;
    ctx.globalAlpha = 0.4 + s.br * 0.6;
    ctx.fillStyle   = '#ffffff';
    ctx.beginPath();
    ctx.arc(s.x * s3W, s.y * s3H, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Ground
  ctx.fillStyle = _groundGrad;
  ctx.fillRect(0, s3H * 0.72, s3W, s3H * 0.28);

  // Palm silhouettes
  _drawPalm(ctx, s3W * 0.05, s3H * 0.72, s3W * 0.10, s3H * 0.35);
  _drawPalm(ctx, s3W * 0.92, s3H * 0.72, s3W * 0.09, s3H * 0.30);
  _drawPalm(ctx, s3W * 0.78, s3H * 0.72, s3W * 0.07, s3H * 0.25);

  // Jungle foliage edges
  ctx.fillStyle = '#0a1a05';
  ctx.fillRect(0, s3H * 0.65, s3W * 0.18, s3H * 0.1);
  ctx.fillRect(s3W * 0.82, s3H * 0.65, s3W * 0.18, s3H * 0.1);

  // Small plumeria flowers
  for (const f of flowers) {
    _drawPlumeria(ctx, f.x * s3W, f.y * s3H, 16 + Math.sin(tick * 0.04 + f.x * 10) * 2);
  }

  // Central fire flower glow
  if (!S.fireFlowerPicked) {
    const fx = s3W * 0.5;
    const fy = s3H * 0.58;
    const pulse = 1 + 0.15 * Math.sin(tick * 0.07);

    // Outer glow
    const grd = ctx.createRadialGradient(fx, fy, 0, fx, fy, 70 * pulse);
    grd.addColorStop(0,   'rgba(255,140,20,0.6)');
    grd.addColorStop(0.5, 'rgba(255,80,0,0.2)');
    grd.addColorStop(1,   'rgba(255,40,0,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(fx, fy, 70 * pulse, 0, Math.PI * 2);
    ctx.fill();

    _drawFireFlower(ctx, fx, fy, 28 * pulse);
  }
}

function _drawPalm(ctx, bx, by, trunkW, height) {
  ctx.fillStyle = '#060e04';
  // Trunk
  ctx.fillRect(bx - trunkW * 0.15, by - height, trunkW * 0.3, height);
  // Fronds
  ctx.save();
  ctx.translate(bx, by - height);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.save();
    ctx.rotate(a);
    ctx.fillStyle = '#061004';
    ctx.fillRect(-4, -trunkW * 1.8, 8, trunkW * 1.8);
    ctx.restore();
  }
  ctx.restore();
}

function _drawPlumeria(ctx, x, y, r) {
  ctx.save();
  ctx.translate(x, y);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    ctx.fillStyle = `rgba(255,200,150,0.7)`;
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6, r * 0.5, r * 0.3, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ffee80';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function _drawFireFlower(ctx, x, y, r) {
  // Petals
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const px = x + Math.cos(a) * r * 1.2;
    const py = y + Math.sin(a) * r * 1.2;
    ctx.fillStyle = i % 2 === 0 ? '#ff5500' : '#ff8800';
    ctx.beginPath();
    ctx.ellipse(px, py, r * 0.5, r * 0.8, a, 0, Math.PI * 2);
    ctx.fill();
  }
  // Center
  const cg = ctx.createRadialGradient(x, y, 0, x, y, r * 0.8);
  cg.addColorStop(0, '#fff8a0');
  cg.addColorStop(0.5, '#ffcc00');
  cg.addColorStop(1, '#ff8800');
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.8, 0, Math.PI * 2);
  ctx.fill();
}

function animate() {
  if (state.activeScreen !== 'scene3') { animId = null; return; }
  tick++;
  draw();
  animId = requestAnimationFrame(animate);
}

// ── onTap ──────────────────────────────────────────────────────────────────
function onTap(cx, cy) {
  if (state.activeScreen !== 'scene3') return;

  // Fire flower hit area
  if (!S.fireFlowerPicked &&
      Math.abs(cx - s3W * 0.5) < 40 && Math.abs(cy - s3H * 0.58) < 40) {
    S.fireFlowerPicked = true;
    SaveManager.setScene('scene3', S);   // авто-сейв: иначе F5 после pickup вернёт цветок
    // Через реестр ITEM_DEFS, а не литерал — иначе пропадает icon-рендер
    // и описание рассинхронизируется с другими источниками (CLAUDE.md).
    addItem(makeItem('fireflower'));
    AudioSystem.playPickup();
    renderHotbar();
    showMsg(fireflowerPickupMsg);
    trackZoneClick('fireflower');
    return;
  }

  trackEmptyClick();
}

// ── DOM creation ───────────────────────────────────────────────────────────
function createEl() {
  if (document.getElementById('scene3')) return;

  el = document.createElement('div');
  el.id = 'scene3';
  el.style.cssText = 'position:absolute;inset:0;display:none;z-index:55;overflow:hidden;';

  canvas = document.createElement('canvas');
  canvas.style.cssText = 'display:block;width:100%;height:100%;';
  ctx = canvas.getContext('2d');

  const back = document.createElement('button');
  back.className = 'back-btn';
  back.textContent = '←';
  back.onclick = closeSceneScene3;

  msgEl = document.createElement('div');
  msgEl.className = 'scene-msg';

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
  canvas.addEventListener('mousemove', e => {
    if (state.activeScreen !== 'scene3') return;
    const r = canvas.getBoundingClientRect();
    const cx = e.clientX - r.left, cy = e.clientY - r.top;
    setCursor(!S.fireFlowerPicked &&
      Math.abs(cx - s3W * 0.5) < 40 && Math.abs(cy - s3H * 0.58) < 40);
  });
  canvas.addEventListener('mouseleave', () => { setCursor(false); });
}

// ── Lifecycle ──────────────────────────────────────────────────────────────
export function openSceneScene3() {
  leaveMain();
  createEl();
  el = document.getElementById('scene3');
  S.scene3Unlocked  = true;
  SaveManager.setScene('scene3', S);   // фиксируем факт открытия сразу (иначе F5 сбросит)
  state.activeScreen = 'scene3';
  el.style.display   = 'block';

  requestAnimationFrame(() => {
    const r = el.getBoundingClientRect();
    s3W = canvas.width  = Math.round(r.width);
    s3H = canvas.height = Math.round(r.height);
    if (!animId) animate();
  });
}

export function closeSceneScene3() {
  state.activeScreen = 'main';
  if (el) el.style.display = 'none';
  if (animId) { cancelAnimationFrame(animId); animId = null; }
  SaveManager.setScene('scene3', S);
  resumeMain();
}
window.closeSceneScene3 = closeSceneScene3;
