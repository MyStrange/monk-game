// scenes/buddha.js — Будда: светлячки, желание, ухо, диалог философов

import { state }         from '../src/state.js';
import { showMsgIn, showLoading, hideLoading, showError } from '../src/utils.js';
import { leaveMain }     from './main.js';
import { getSelectedItem, addItem, removeItem, makeItem, getItemSlot } from '../src/inventory.js';
import { renderHotbar }  from '../src/hotbar.js';
import { SaveManager }   from '../src/save.js';
import { AudioSystem }   from '../src/audio.js';
import { DialogEngine }  from '../src/dialog-engine.js';
import { trackZoneClick } from '../src/achievements.js';
import {
  catchMsgs, catchMsg10, wishDoneMsg,
  bubbleMsgs, earMsg, durianAfterDialog, DIALOG,
} from '../src/dialogue.js';

// ── Scene state ────────────────────────────────────────────────────────────
const S = SaveManager.getScene('buddha');
S.earUsed       = S.earUsed       ?? false;
S.wishPlaying   = S.wishPlaying   ?? false;
S.durianPickedUp = S.durianPickedUp ?? false;

// ── DOM ────────────────────────────────────────────────────────────────────
let el, bCanvas, wishCanvas, bCtx, wCtx, bMsgEl;
let bW = 0, bH = 0;
const showMsg = (t, d) => showMsgIn(bMsgEl, t, d);

// ── Fireflies ──────────────────────────────────────────────────────────────
let bFlies = [];
function _spawnFlies(n) {
  bFlies = Array.from({ length: n }, () => ({
    x:   Math.random() * bW,
    y:   Math.random() * bH,
    vx:  (Math.random() - 0.5) * 1.2,
    vy:  (Math.random() - 0.5) * 0.8,
    sz:  2 + Math.random() * 3,
    br:  Math.random(),
    bv:  (Math.random() - 0.5) * 0.025,
    alive: true,
  }));
}

// ── Wish animation ─────────────────────────────────────────────────────────
let wishFlies = [];
let wishTick  = 0;

function _startWish(jar) {
  S.wishPlaying = true;
  wishTick  = 0;
  wishFlies = Array.from({ length: 10 }, (_, i) => ({
    x:  bW * 0.5 + (Math.random() - 0.5) * 60,
    y:  bH * 0.9,
    vx: (Math.random() - 0.5) * 1.5,
    vy: -2 - Math.random() * 1.5,
    br: 1.0,
    done: false,
  }));
  // After 2.5s: finalize
  setTimeout(() => {
    S.wishPlaying  = false;
    jar.glowing    = true;
    jar.released   = true;
    jar.caught     = 0;
    jar.label      = 'банка';
    jar.description = 'Светляковая жижка. Внутри мерцает тихий свет — след от десяти светлячков.';
    renderHotbar();
    showMsg(wishDoneMsg, 4000);
  }, 2500);
}

// ── Fly-room dialog ────────────────────────────────────────────────────────
let flyroomEl   = null;
let dialogEngine = null;
let flyroomAnimId = null;

function _buildFlyroom() {
  if (document.getElementById('flyroom')) return;

  flyroomEl = document.createElement('div');
  flyroomEl.id = 'flyroom';
  flyroomEl.style.cssText = 'position:absolute;inset:0;display:none;z-index:65;overflow:hidden;';

  const bg = document.createElement('img');
  bg.src = 'assets/bg/flyroom.jpeg';
  bg.style.cssText = 'display:block;width:100%;height:100%;object-fit:cover;';

  const frCanvas = document.createElement('canvas');
  frCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';

  const dlgEl = document.createElement('div');
  dlgEl.id = 'dialog-box';
  dlgEl.className = 'dialog-box';
  dlgEl.style.display = 'none';

  const back = document.createElement('button');
  back.className = 'back-btn';
  back.textContent = '←';
  back.onclick = () => { flyroomEl.style.display = 'none'; };

  flyroomEl.appendChild(bg);
  flyroomEl.appendChild(frCanvas);
  flyroomEl.appendChild(dlgEl);
  flyroomEl.appendChild(back);
  document.getElementById('wrap').appendChild(flyroomEl);

  dialogEngine = new DialogEngine(dlgEl);

  // Glow animation
  let frW = 0, frH = 0;
  const frCtx = frCanvas.getContext('2d');
  const flyGlows = [
    { x: 0.35, y: 0.68, color: '#ffcc40' },
    { x: 0.65, y: 0.68, color: '#80c8ff' },
  ];
  let frTick = 0;
  function frAnimate() {
    if (flyroomEl.style.display === 'none') { flyroomAnimId = null; return; }
    const r = frCanvas.getBoundingClientRect();
    if (r.width !== frW) { frW = frCanvas.width  = Math.round(r.width); }
    if (r.height !== frH) { frH = frCanvas.height = Math.round(r.height); }
    frCtx.clearRect(0, 0, frW, frH);
    frTick++;
    for (const g of flyGlows) {
      const alpha = 0.5 + 0.5 * Math.sin(frTick * 0.05);
      const grd   = frCtx.createRadialGradient(g.x * frW, g.y * frH, 0, g.x * frW, g.y * frH, 28);
      grd.addColorStop(0, g.color + 'ff');
      grd.addColorStop(1, g.color + '00');
      frCtx.globalAlpha = alpha;
      frCtx.fillStyle   = grd;
      frCtx.beginPath();
      frCtx.arc(g.x * frW, g.y * frH, 28, 0, Math.PI * 2);
      frCtx.fill();
    }
    frCtx.globalAlpha = 1;
    flyroomAnimId = requestAnimationFrame(frAnimate);
  }

  bg.onload = () => { frAnimate(); };
  if (bg.complete && bg.naturalWidth) bg.onload();
}

function startFireflyDialog() {
  if (!flyroomEl) _buildFlyroom();
  flyroomEl.style.display = 'block';
  if (!flyroomAnimId) {
    // Will auto-start via bg.onload / already running
  }

  setTimeout(() => {
    dialogEngine.play(DIALOG, () => {
      flyroomEl.style.display = 'none';
      addItem(makeItem('durian'));
      renderHotbar();
      showMsg(durianAfterDialog, 4500);
    });
  }, 200);
}

// ── interactItem ───────────────────────────────────────────────────────────
function interactItem(itemId, zone) {
  const item = getSelectedItem();

  // Glowstick on ear
  if (itemId === 'glowstick' && zone === 'ear' && !S.earUsed) {
    S.earUsed = true;
    removeItem(getItemSlot('glowstick'));
    renderHotbar();
    showMsg(earMsg, 3500);
    setTimeout(startFireflyDialog, 2800);
    return;
  }

  const msg = getZoneMsg(itemId, zone, item);
  if (msg) showMsg(msg);
}

// Inline getZoneMsg since zone-msgs may not have ear entries
function getZoneMsg(itemId, zone, item) {
  // ear — handled separately in interactItem
  return null;
}

// ── onTap ──────────────────────────────────────────────────────────────────
function onTap(cx, cy) {
  if (state.activeScreen !== 'buddha') return;

  const item = getSelectedItem();
  trackZoneClick('buddha');

  // Ear hit zone (only if not used)
  if (!S.earUsed && cx > bW * 0.60 && cx < bW * 0.73 && cy > bH * 0.44 && cy < bH * 0.60) {
    if (item) { interactItem(item.id, 'ear'); return; }
  }

  // Jar: catch firefly
  if (item && (item.id === 'jar' || item.id === 'jar_open')) {
    if (item.released) { showMsg('В банке уже был свет. Хватит.'); return; }
    // Find a fly near click
    for (let i = 0; i < bFlies.length; i++) {
      const f = bFlies[i];
      if (!f.alive) continue;
      if (Math.hypot(cx - f.x, cy - f.y) < f.sz * 5 + 14) {
        f.alive = false;
        item.caught = (item.caught ?? 0) + 1;

        // Bubble msg
        const bidx = Math.min(item.caught - 1, bubbleMsgs.length - 1);
        showMsg(bubbleMsgs[bidx], 1800);

        if (item.caught <= 9) {
          setTimeout(() => showMsg(catchMsgs[item.caught - 1], 3500), 600);
        }

        if (item.caught >= 10) {
          setTimeout(() => {
            showMsg(catchMsg10, 4000);
            _startWish(item);
          }, 600);
        }

        renderHotbar();
        return;
      }
    }
  }
}

// ── Animation ──────────────────────────────────────────────────────────────
let animId = null;
let bTick  = 0;

function animate() {
  if (state.activeScreen !== 'buddha') { animId = null; return; }
  bCtx.clearRect(0, 0, bW, bH);
  bTick++;

  // Ambient fireflies
  for (const f of bFlies) {
    if (!f.alive) continue;
    f.x += f.vx; f.y += f.vy;
    f.br += f.bv;
    if (f.br < 0 || f.br > 1) f.bv *= -1;
    if (f.x < 0) f.x = bW; if (f.x > bW) f.x = 0;
    if (f.y < 0) f.y = bH; if (f.y > bH) f.y = 0;
    const a = 0.4 + f.br * 0.6;
    bCtx.fillStyle = `rgba(160,255,100,${a})`;
    bCtx.beginPath();
    bCtx.arc(f.x, f.y, f.sz, 0, Math.PI * 2);
    bCtx.fill();
  }

  // Wish animation
  if (S.wishPlaying) {
    wishTick++;
    wCtx.clearRect(0, 0, bW, bH);
    for (const wf of wishFlies) {
      wf.x += wf.vx; wf.y += wf.vy;
      wf.br = Math.max(wf.br - 0.008, 0);
      wCtx.fillStyle = `rgba(255,255,160,${wf.br})`;
      wCtx.beginPath();
      wCtx.arc(wf.x, wf.y, 4, 0, Math.PI * 2);
      wCtx.fill();
    }
  } else {
    wCtx.clearRect(0, 0, bW, bH);
  }

  animId = requestAnimationFrame(animate);
}

// ── DOM creation ───────────────────────────────────────────────────────────
function createEl() {
  if (document.getElementById('buddha')) return;

  el = document.createElement('div');
  el.id = 'buddha';
  el.style.cssText = 'position:absolute;inset:0;display:none;z-index:55;overflow:hidden;';

  const bg = document.createElement('img');
  bg.src = 'assets/bg/buddha.jpeg';
  bg.style.cssText = 'display:block;width:100%;height:100%;object-fit:cover;';

  bCanvas = document.createElement('canvas');
  bCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;cursor:default;';
  bCtx = bCanvas.getContext('2d');

  wishCanvas = document.createElement('canvas');
  wishCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
  wCtx = wishCanvas.getContext('2d');

  const back = document.createElement('button');
  back.className = 'back-btn';
  back.textContent = '←';
  back.onclick = closeSceneBuddha;

  bMsgEl = document.createElement('div');
  bMsgEl.className = 'scene-msg';

  el.appendChild(bg); el.appendChild(bCanvas);
  el.appendChild(wishCanvas);
  el.appendChild(back); el.appendChild(bMsgEl);
  document.getElementById('wrap').appendChild(el);

  bCanvas.addEventListener('click', e => {
    const r = bCanvas.getBoundingClientRect();
    onTap(e.clientX - r.left, e.clientY - r.top);
  });
  bCanvas.addEventListener('touchend', e => {
    e.preventDefault();
    const t = e.changedTouches[0];
    const r = bCanvas.getBoundingClientRect();
    onTap(t.clientX - r.left, t.clientY - r.top);
  }, { passive: false });
}

// ── Lifecycle ──────────────────────────────────────────────────────────────
export async function openSceneBuddha() {
  leaveMain();
  createEl();
  el = document.getElementById('buddha');
  showLoading('будда');

  const bgImg = el.querySelector('img');
  bgImg.onerror = () => showError('не удалось загрузить сцену');
  bgImg.onload  = () => {
    hideLoading();
    state.activeScreen = 'buddha';
    el.style.display   = 'block';
    requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      bW = bCanvas.width = wishCanvas.width  = Math.round(r.width);
      bH = bCanvas.height = wishCanvas.height = Math.round(r.height);
      _spawnFlies(30);
      if (!animId) animate();
    });
  };
  if (bgImg.complete && bgImg.naturalWidth) bgImg.onload();
}

export function closeSceneBuddha() {
  // Block if wish playing
  if (S.wishPlaying) { showMsg('Подожди...'); return; }
  // Block if jar has flies
  const jar = state.inventory.find(i => i?.id === 'jar' || i?.id === 'jar_open');
  if (jar && jar.caught > 0) {
    showMsg('В банке ещё светлячки. Выпусти их сначала.');
    return;
  }
  state.activeScreen = 'main';
  if (el) el.style.display = 'none';
  if (animId) { cancelAnimationFrame(animId); animId = null; }
  SaveManager.setScene('buddha', S);
}
window.closeSceneBuddha = closeSceneBuddha;
