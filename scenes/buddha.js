// scenes/buddha.js — Будда: светлячки, желание, ухо, диалог философов

import { state }         from '../src/state.js';
import { showMsgIn, showLoading, hideLoading, showError } from '../src/utils.js';
import { leaveMain }     from './main.js';
import { getSelectedItem, addItem, removeItem, makeItem, getItemSlot } from '../src/inventory.js';
import { renderHotbar }  from '../src/hotbar.js';
import { SaveManager }   from '../src/save.js';
import { AudioSystem }   from '../src/audio.js';
import { trackZoneClick, trackSpotClick } from '../src/achievements.js';
import {
  catchMsg10, wishDoneMsg,
  earMsg, durianAfterDialog, DIALOG,
} from '../src/dialogue.js';

// ── Scene state ────────────────────────────────────────────────────────────
const S = SaveManager.getScene('buddha');
S.earUsed        = S.earUsed        ?? false;
S.wishPlaying    = S.wishPlaying    ?? false;
S.durianPickedUp = S.durianPickedUp ?? false;

// ── DOM ────────────────────────────────────────────────────────────────────
let el, bCanvas, wishCanvas, bCtx, wCtx, bMsgEl;
let bW = 0, bH = 0;
const showMsg = (t, d) => showMsgIn(bMsgEl, t, d);

// ── Fireflies ──────────────────────────────────────────────────────────────
let bFlies = [];
function _spawnFlies(n) {
  bFlies = Array.from({ length: n }, () => ({
    x:  Math.random() * bW,
    y:  Math.random() * bH,
    vx: (Math.random() - 0.5) * 1.2,
    vy: (Math.random() - 0.5) * 0.8,
    sz: 2 + Math.random() * 2,
    br: Math.random(),
    bv: (Math.random() - 0.5) * 0.025,
    alive: true,
  }));
}

// ── Epic wish release animation ─────────────────────────────────────────────
// Светлячки вырываются из позиции банки в инвентаре (низ экрана),
// летят по большим петлям со светящимися следами.
let wishFlies = [];
let wishTick  = 0;
const WISH_DURATION = 160; // frames @ ~60fps = ~2.7s

function _startWish(jar) {
  S.wishPlaying = true;
  wishTick  = 0;

  // Старт — примерно позиция хотбара внизу экрана
  const startX = bW * 0.5;
  const startY = bH * 0.88;

  wishFlies = Array.from({ length: 10 }, (_, i) => {
    const phase = (i / 10) * Math.PI * 2;
    return {
      t:          0,
      phase,
      riseSpeed:  1.2 + Math.random() * 0.8,
      orbitR:     50 + Math.random() * 70,
      orbitSpeed: 0.045 + Math.random() * 0.025,
      loopR:      25 + Math.random() * 45,
      loopSpeed:  0.11 + Math.random() * 0.07,
      x:          startX + (Math.random() - 0.5) * 30,
      y:          startY,
      trail:      [],
      alpha:      1.0,
    };
  });

  setTimeout(() => {
    S.wishPlaying   = false;
    jar.glowing     = true;
    jar.released    = true;
    jar.caught      = 0;
    jar.label       = 'банка';
    jar.description = 'Светляковая жижка. Внутри мерцает тихий свет — след от десяти светлячков.';
    renderHotbar();
    showMsg(wishDoneMsg, 4000);
  }, (WISH_DURATION / 60) * 1000 + 200);
}

// ── Fly-room bubble dialog ──────────────────────────────────────────────────
let flyroomEl     = null;
let flyroomAnimId = null;
let _frAnimateFn  = null;  // ref to canvas animate fn, для перезапуска

// Dialog state
let _dlgLines   = [];
let _dlgIdx     = 0;
let _dlgActive  = false;
let _dlgOnEnd   = null;
let _pauseTimer = null;
let _pauseClicks = 0;

// Bubble DOM refs
let _bubA = null, _bubB = null, _bubNarr = null, _pauseDots = null;

function _buildFlyroom() {
  if (document.getElementById('flyroom')) return;

  flyroomEl = document.createElement('div');
  flyroomEl.id = 'flyroom';
  flyroomEl.style.cssText = 'position:absolute;inset:0;display:none;z-index:65;overflow:hidden;cursor:pointer;';

  const bg = document.createElement('img');
  bg.src = 'assets/bg/flyroom.jpeg';
  bg.style.cssText = 'display:block;width:100%;height:100%;object-fit:cover;pointer-events:none;';

  const frCanvas = document.createElement('canvas');
  frCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';

  // Speech bubbles
  _bubA = document.createElement('div');
  _bubA.className = 'fly-bubble bubble-a';
  _bubA.style.cssText = 'left:35%;bottom:36%;';

  _bubB = document.createElement('div');
  _bubB.className = 'fly-bubble bubble-b';
  _bubB.style.cssText = 'left:65%;bottom:36%;';

  _bubNarr = document.createElement('div');
  _bubNarr.className = 'fly-bubble bubble-narrator';
  _bubNarr.style.cssText = 'left:50%;bottom:10%;max-width:72%;';

  // Pause dots indicator
  _pauseDots = document.createElement('div');
  _pauseDots.className = 'fly-pause-dots';
  _pauseDots.innerHTML = '<span>·</span><span>·</span><span>·</span>';
  _pauseDots.style.display = 'none';

  const back = document.createElement('button');
  back.className = 'back-btn';
  back.textContent = '←';
  back.onclick = e => { e.stopPropagation(); flyroomEl.style.display = 'none'; };

  flyroomEl.appendChild(bg);
  flyroomEl.appendChild(frCanvas);
  flyroomEl.appendChild(_bubA);
  flyroomEl.appendChild(_bubB);
  flyroomEl.appendChild(_bubNarr);
  flyroomEl.appendChild(_pauseDots);
  flyroomEl.appendChild(back);
  document.getElementById('wrap').appendChild(flyroomEl);

  // Click anywhere to advance
  flyroomEl.addEventListener('click', () => _dlgClick());
  flyroomEl.addEventListener('touchend', e => { e.preventDefault(); _dlgClick(); }, { passive: false });

  // Canvas glow animation
  let frW = 0, frH = 0;
  const frCtx = frCanvas.getContext('2d');
  const flyGlows = [
    { x: 0.35, y: 0.68, color: '#ffcc40' },
    { x: 0.65, y: 0.68, color: '#80c8ff' },
  ];
  let frTick = 0;
  _frAnimateFn = function frAnimate() {
    if (flyroomEl.style.display === 'none') { flyroomAnimId = null; return; }
    const r = frCanvas.getBoundingClientRect();
    if (r.width !== frW)  { frW = frCanvas.width  = Math.round(r.width); }
    if (r.height !== frH) { frH = frCanvas.height = Math.round(r.height); }
    frCtx.clearRect(0, 0, frW, frH);
    frTick++;
    for (const g of flyGlows) {
      const alpha = 0.5 + 0.5 * Math.sin(frTick * 0.05);
      const grd   = frCtx.createRadialGradient(g.x*frW, g.y*frH, 0, g.x*frW, g.y*frH, 28);
      grd.addColorStop(0, g.color + 'ff');
      grd.addColorStop(1, g.color + '00');
      frCtx.globalAlpha = alpha;
      frCtx.fillStyle   = grd;
      frCtx.beginPath();
      frCtx.arc(g.x*frW, g.y*frH, 28, 0, Math.PI * 2);
      frCtx.fill();
    }
    frCtx.globalAlpha = 1;
    flyroomAnimId = requestAnimationFrame(_frAnimateFn);
  };
  bg.onload = () => { _frAnimateFn(); };
  if (bg.complete && bg.naturalWidth) bg.onload();
}

function _dlgHideAll() {
  _bubA.style.display = _bubB.style.display = _bubNarr.style.display = 'none';
  _pauseDots.style.display = 'none';
}

function _dlgShowLine(line) {
  _dlgHideAll();
  if (line.type === 'pause') {
    _pauseClicks = 0;
    _pauseDots.style.display = 'flex';
    _pauseTimer = setTimeout(_dlgNext, 2000);
    return;
  }
  let bub;
  if (!line.speaker)       bub = _bubNarr;
  else if (line.speaker === 'А') bub = _bubA;
  else                     bub = _bubB;
  bub.textContent  = line.text;
  bub.style.display = 'block';
}

function _dlgNext() {
  clearTimeout(_pauseTimer);
  _dlgIdx++;
  if (_dlgIdx >= _dlgLines.length) {
    _dlgActive = false;
    _dlgHideAll();
    flyroomEl.style.display = 'none';
    _dlgOnEnd?.();
    return;
  }
  _dlgShowLine(_dlgLines[_dlgIdx]);
}

function _dlgClick() {
  if (!_dlgActive) return;
  const cur = _dlgLines[_dlgIdx];
  if (cur?.type === 'pause') {
    _pauseClicks++;
    if (_pauseClicks >= 3) { clearTimeout(_pauseTimer); _dlgNext(); }
  } else {
    _dlgNext();
  }
}

function startFireflyDialog() {
  if (!flyroomEl) _buildFlyroom();
  flyroomEl.style.display = 'block';
  // Перезапустить анимацию если остановилась (после закрытия и повторного открытия)
  if (flyroomAnimId === null && _frAnimateFn) _frAnimateFn();
  _dlgLines  = DIALOG;
  _dlgIdx    = 0;
  _dlgActive = true;
  _dlgOnEnd  = () => {
    addItem(makeItem('durian'));
    renderHotbar();
    showMsg(durianAfterDialog, 4500);
  };
  setTimeout(() => _dlgShowLine(_dlgLines[0]), 200);
}

// ── interactItem ───────────────────────────────────────────────────────────
function interactItem(itemId, zone) {
  // Glowstick on ear
  if (itemId === 'glowstick' && zone === 'ear' && !S.earUsed) {
    S.earUsed = true;
    removeItem(getItemSlot('glowstick'));  // removeItem sets selectedSlot=-1
    renderHotbar();
    showMsg(earMsg, 3500);
    setTimeout(startFireflyDialog, 2800);
  }
  // All other item×zone: no actions here (zone msgs handled via zone-msgs.js)
}

// ── onTap ──────────────────────────────────────────────────────────────────
function onTap(cx, cy) {
  if (state.activeScreen !== 'buddha') return;

  const item = getSelectedItem();
  trackZoneClick('buddha');
  trackSpotClick(cx, cy, 'buddha');

  // Ear hit zone
  if (!S.earUsed && cx > bW*0.60 && cx < bW*0.73 && cy > bH*0.44 && cy < bH*0.60) {
    if (item) { interactItem(item.id, 'ear'); return; }
  }

  // Jar: catch firefly
  if (item && (item.id === 'jar' || item.id === 'jar_open')) {
    if (item.released) { showMsg('В банке уже был свет. Хватит.'); return; }
    for (let i = 0; i < bFlies.length; i++) {
      const f = bFlies[i];
      if (!f.alive) continue;
      if (Math.hypot(cx - f.x, cy - f.y) < f.sz * 5 + 14) {
        f.alive = false;
        item.caught = (item.caught ?? 0) + 1;

        // Deselect — предмет больше не в руке после успешного действия
        state.selectedSlot = -1;
        renderHotbar();

        if (item.caught >= 10) {
          setTimeout(() => {
            showMsg(catchMsg10, 4000);
            _startWish(item);
          }, 300);
        }
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

  // ── Ambient fireflies (yellow pixels with glow) ───────────────────────────
  for (const f of bFlies) {
    if (!f.alive) continue;
    f.x += f.vx; f.y += f.vy;
    f.br += f.bv;
    if (f.br < 0 || f.br > 1) f.bv *= -1;
    if (f.x < 0) f.x = bW; if (f.x > bW) f.x = 0;
    if (f.y < 0) f.y = bH; if (f.y > bH) f.y = 0;
    const a = 0.4 + f.br * 0.6;
    bCtx.save();
    bCtx.shadowColor = `rgba(255,210,40,${a})`;
    bCtx.shadowBlur  = 6 + f.br * 10;
    bCtx.fillStyle   = `rgba(255,220,80,${a})`;
    bCtx.fillRect(Math.round(f.x), Math.round(f.y), Math.ceil(f.sz), Math.ceil(f.sz));
    bCtx.restore();
  }

  // ── Epic wish release animation ────────────────────────────────────────────
  wCtx.clearRect(0, 0, bW, bH);
  if (S.wishPlaying && wishFlies.length) {
    wishTick++;
    const prog = wishTick / WISH_DURATION;

    for (const wf of wishFlies) {
      wf.t++;
      // Rising center with slow drift
      const cx = bW * 0.5 + Math.sin(wf.t * 0.018 + wf.phase) * bW * 0.18;
      const cy = bH * 0.88 - wf.t * wf.riseSpeed;

      // Large spiral orbit
      const ox = Math.cos(wf.t * wf.orbitSpeed + wf.phase) * wf.orbitR;
      const oy = Math.sin(wf.t * wf.orbitSpeed + wf.phase) * wf.orbitR * 0.55;

      // Secondary smaller loop
      const lx = Math.cos(wf.t * wf.loopSpeed) * wf.loopR;
      const ly = Math.sin(wf.t * wf.loopSpeed) * wf.loopR * 0.7;

      wf.x = cx + ox + lx;
      wf.y = cy + oy + ly;
      wf.alpha = Math.max(1.0 - prog * 1.1, 0);

      // Trail
      wf.trail.push({ x: wf.x, y: wf.y });
      if (wf.trail.length > 38) wf.trail.shift();

      // Draw trail
      wCtx.save();
      for (let ti = 0; ti < wf.trail.length; ti++) {
        const p  = wf.trail[ti];
        const ta = (ti / wf.trail.length) * wf.alpha * 0.65;
        wCtx.shadowColor = `rgba(255,200,0,${ta * 0.8})`;
        wCtx.shadowBlur  = 10;
        wCtx.fillStyle   = `rgba(255,220,60,${ta})`;
        wCtx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
      }
      // Fly itself — bright core
      wCtx.shadowColor = `rgba(255,240,100,${wf.alpha})`;
      wCtx.shadowBlur  = 18 + Math.sin(wf.t * 0.25) * 8;
      wCtx.fillStyle   = `rgba(255,255,180,${wf.alpha})`;
      wCtx.fillRect(Math.round(wf.x) - 1, Math.round(wf.y) - 1, 4, 4);
      wCtx.restore();
    }
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

  el.appendChild(bg);
  el.appendChild(bCanvas);
  el.appendChild(wishCanvas);
  el.appendChild(back);
  el.appendChild(bMsgEl);
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
  if (S.wishPlaying) { showMsg('Подожди...'); return; }
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
