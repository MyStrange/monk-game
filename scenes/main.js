// scenes/main.js — главная сцена: герой, зоны, медитация, символы

import { state }           from '../src/state.js';
import { showMsgIn }       from '../src/utils.js';
import { getSelectedItem, addItem, removeItem, makeItem } from '../src/inventory.js';
import { getZoneMsg }      from '../src/zone-msgs.js';
import { renderHotbar, setHotbarMsgEl } from '../src/hotbar.js';
import { AudioSystem }     from '../src/audio.js';
import { openScene }       from '../src/nav.js';
import { trackZoneClick, trackEmptyClick, trackSpotClick } from '../src/achievements.js';
import { SaveManager }     from '../src/save.js';
import {
  catMsgs, monkMsgs, MEDITATE_MSGS,
  catBuryMsg1, catBuryMsg2, catBuryDoneMsg,
} from '../src/dialogue.js';

// ── DOM ────────────────────────────────────────────────────────────────────
let canvas, ctx, msgEl;
let W = 0, H = 0;

// ── Background ─────────────────────────────────────────────────────────────
const bgImg = new Image();
bgImg.src = 'assets/bg/main.png';

// ── Sprites ────────────────────────────────────────────────────────────────
// hero_left/right.png: 1376×348, 5 frames (275×348 each)
// hero_sit.png:        1376×204, 5 frames (275×204 each)
// cat.png:             2048×338, 5 frames (~410×338)
// monk_red.png:        2000×464, 5 frames (400×464)
const heroImgR = new Image(); heroImgR.src = 'assets/sprites/hero_right.png';
const heroImgL = new Image(); heroImgL.src = 'assets/sprites/hero_left.png';
const heroImgS = new Image(); heroImgS.src = 'assets/sprites/hero_sit.png';
const catSheet  = new Image(); catSheet.src  = 'assets/sprites/cat.png';
const monkSheet = new Image(); monkSheet.src = 'assets/sprites/monk_red.png';

// ── Scene constants (in BG px, BG = 2000×1116) ────────────────────────────
const BG_W = 2000, BG_H = 1116;
const GROUND_Y      = 920;   // плоскость монаха/кота (фон)
const HERO_GROUND_Y = 980;   // плоскость героя — чуть ближе к камере
const HERO_SPEED = 5;  // BG px per frame

// Hero display size — proportional to sprite frame ratio (275/348 = 0.791)
const HERO_STAND_H = 420;
const HERO_STAND_W = Math.round(HERO_STAND_H * 275 / 348); // 332
// Sit sprite ratio: 275/204 = 1.348 — keep same width, compute height
const HERO_SIT_W   = HERO_STAND_W;                          // 332
const HERO_SIT_H   = Math.round(HERO_SIT_W * 204 / 275);    // 246
const HERO_FRAMES  = 5;

// Cat display size — frame ratio ~410/338 = 1.21
const CAT_H = 145;
const CAT_W = Math.round(CAT_H * 410 / 338); // 176
const CAT_X = 940;

// Monk display size — frame ratio 400/464 = 0.862
const MONK_H = 240;
const MONK_W = Math.round(MONK_H * 400 / 464); // 207
const MONK_X = 1120;

// ── Zones (BG px) → scaled on render ──────────────────────────────────────
const ZONES_BG = {
  statue:      { x: 680,   y: 160,            w: 160,    h: 200 },
  tree:        { x: 1600,  y: 300,            w: 200,    h: 580 },
  cat:         { x: CAT_X, y: GROUND_Y-CAT_H, w: CAT_W,  h: CAT_H },
  monk:        { x: MONK_X,y: GROUND_Y-MONK_H,w: MONK_W, h: MONK_H },
  bush:        { x: 0,     y: 580,            w: 500,    h: 420 },
  water:       { x: 0,     y: 920,            w: 1800,   h: 170 },
  dirt:        { x: 870,   y: 890,            w: 100,    h: 80 },
  inscription: { x: 700,   y: 760,            w: 180,    h: 110 },
};

// ── Persistent scene state ────────────────────────────────────────────────
const S = SaveManager.getScene('main');
S.stickPickedUp     = S.stickPickedUp     ?? false;
S.inscriptionCharge = S.inscriptionCharge ?? 0;
S.inscriptionReady  = S.inscriptionReady  ?? false;

function saveMain() { SaveManager.setScene('main', S); }

// ── Transient state (resets on reload) ────────────────────────────────────
let catBurying   = false;
let catBuryTimer = 0;
let inscriptionGlow = 0;

// ── Hero ───────────────────────────────────────────────────────────────────
const hero = {
  x: 300, y: HERO_GROUND_Y,
  targetX:  null,   // click-to-move target (BG px)
  facing:   'right',
  walking:  false,
  praying:  false,
  frame: 0, frameTick: 0,
};

// Held keys for smooth movement
const keysHeld = {};

// ── Meditation ─────────────────────────────────────────────────────────────
let meditationPhase  = 0;
let pSyms    = [];
let mParticles = [];
let draggedSym = null;

const THAI_CHARS = 'ธมอนภวตสกรคทยชพระศษสหฬ';

// ── Ambient fireflies (100, yellow pixel) ─────────────────────────────────
const flies = Array.from({ length: 100 }, () => ({
  x:          Math.random() * BG_W,
  y:          Math.random() * (BG_H * 0.5),
  vx:         (Math.random() - 0.5) * 0.8,
  vy:         (Math.random() - 0.5) * 0.4,
  brightness: Math.random(),
  bv:         (Math.random() - 0.5) * 0.02,
  sz:         Math.random() < 0.3 ? 3 : 2,  // occasional bigger pixel
}));

// ── Message cycling ────────────────────────────────────────────────────────
let catMsgIdx  = 0;
let monkMsgIdx = 0;
const interactCounts = {};

// ── Coordinate scaling ─────────────────────────────────────────────────────
function bgToCanvas(bgX, bgY) {
  return { x: bgX * W / BG_W, y: bgY * H / BG_H };
}
function hitZoneBG(cx, cy) {
  const bx = cx * BG_W / W, by = cy * BG_H / H;

  if (hero.praying || meditationPhase > 0) {
    const iz = ZONES_BG.inscription;
    if (bx >= iz.x && bx < iz.x + iz.w && by >= iz.y && by < iz.y + iz.h)
      return 'inscription';
  }
  for (const [name, z] of Object.entries(ZONES_BG)) {
    if (name === 'inscription' || name === 'dirt') continue;
    if (bx >= z.x && bx < z.x + z.w && by >= z.y && by < z.y + z.h) return name;
  }
  return null;
}

// ── showMsg ────────────────────────────────────────────────────────────────
const showMsg = (t, d) => showMsgIn(msgEl, t, d);

// ── Stick pickup ───────────────────────────────────────────────────────────
function pickUpStick() {
  if (S.stickPickedUp) { showMsg('Здесь больше ничего нет.'); return; }
  if (state.selectedSlot >= 0) { showMsg('Руки заняты.'); return; }
  S.stickPickedUp = true;
  addItem(makeItem('stick'));
  AudioSystem.playPickup();
  renderHotbar();
  showMsg('Ты нашёл палку в кустах. Зачем-то взял её.');
  saveMain();
}

// ── Cat burying sequence ───────────────────────────────────────────────────
function startBury() {
  catBurying   = true;
  catBuryTimer = 0;
  showMsg(catBuryMsg1);
  setTimeout(() => showMsg(catBuryMsg2), 2200);
}

// ── Meditation ─────────────────────────────────────────────────────────────
export function standUp() {
  hero.praying    = false;
  meditationPhase = 0;
  pSyms           = [];
  mParticles      = [];
  draggedSym      = null;
  AudioSystem.setMode('ambient');
}

function sitDown() {
  if (hero.praying) { standUp(); return; }
  hero.praying = true;
  AudioSystem.playPrayerSound();
  AudioSystem.setMode('meditation');
}

function _spawnSym() {
  if (!hero.praying) return;
  const ch = THAI_CHARS[Math.floor(Math.random() * THAI_CHARS.length)];
  const p  = bgToCanvas(hero.x, hero.y - HERO_STAND_H * 0.8);
  pSyms.push({ ch, x: p.x, y: p.y, vy: -0.6 - Math.random() * 0.4, life: 1.0,
                dragging: false, vx: (Math.random() - 0.5) * 0.3 });
}

function _symTick() {
  pSyms = pSyms.filter(s => {
    if (s.dragging) return true;
    s.x  += s.vx;
    s.y  += s.vy;
    s.life -= 0.003;
    return s.life > 0;
  });
}

// ── Zone click (no item) ───────────────────────────────────────────────────
function zoneClick(zone) {
  trackZoneClick(zone);

  if (hero.praying) {
    const k = `meditate:${zone}`;
    interactCounts[k] = (interactCounts[k] ?? 0) + 1;
    const arr = MEDITATE_MSGS[zone];
    if (arr) { showMsg(arr[interactCounts[k] % arr.length]); return; }
    if (zone === 'inscription') {
      if (S.inscriptionReady) { openScene('scene4'); return; }
      return;
    }
    return;
  }

  if (zone === 'bush')   { pickUpStick(); return; }
  if (zone === 'statue') { openScene('buddha'); return; }
  if (zone === 'tree')   { openScene('scene2'); return; }

  if (zone === 'cat') {
    showMsg(catMsgs[catMsgIdx % catMsgs.length]);
    catMsgIdx++;
    return;
  }
  if (zone === 'monk') {
    showMsg(monkMsgs[monkMsgIdx % monkMsgs.length]);
    monkMsgIdx++;
    return;
  }
}

// ── Item × zone ────────────────────────────────────────────────────────────
function interactItem(itemId, zone) {
  const item = getSelectedItem();
  trackZoneClick(zone);

  if (itemId === 'durian' && zone === 'cat') {
    const slot = state.inventory.findIndex(i => i?.id === 'durian');
    removeItem(slot);
    renderHotbar();
    AudioSystem.playCatMeow();
    startBury();
    return;
  }

  if ((itemId === 'jar' || itemId === 'jar_open') && zone === 'water') {
    if (itemId === 'jar' && !item.glowing && !item.released) {
      showMsg('У банки крышка. Воду не зачерпнёшь.'); return;
    }
    if (item.hasWater) { showMsg('Банка уже с водой.'); return; }
    item.hasWater    = true;
    item.label       = 'с водой';
    item.description = 'Открытая банка с водой. Холодная. Не расплещи.';
    state.selectedSlot = -1;
    renderHotbar();
    showMsg('Ты зачерпнул воды. Банка стала тяжелее.');
    return;
  }

  const msg = getZoneMsg(itemId, zone, item);
  if (msg) showMsg(msg);
}

// ── onTap ──────────────────────────────────────────────────────────────────
function onTap(cx, cy) {
  if (state.activeScreen !== 'main') return;
  trackSpotClick(cx, cy, 'main');

  if (draggedSym) {
    const iz = ZONES_BG.inscription;
    const ip = bgToCanvas(iz.x + iz.w / 2, iz.y + iz.h / 2);
    const dist = Math.hypot(cx - ip.x, cy - ip.y);
    if (dist < 60 && (hero.praying || meditationPhase > 0)) _deliverSym();
    draggedSym = null;
    return;
  }

  const item = getSelectedItem();
  const zone = hitZoneBG(cx, cy);

  if (item && zone) { interactItem(item.id, zone); return; }
  if (zone)         { zoneClick(zone); return; }

  // Empty click: walk to clicked position
  if (!hero.praying) {
    const bgX = Math.max(80, Math.min(BG_W - 80, cx * BG_W / W));
    hero.targetX = bgX;
  }
  trackEmptyClick();
}

function onDragStart(cx, cy) {
  if (state.activeScreen !== 'main') return;
  if (!hero.praying && meditationPhase <= 0) return;
  for (const s of pSyms) {
    if (Math.hypot(cx - s.x, cy - s.y) < 20) {
      s.dragging = true;
      draggedSym = s;
      return;
    }
  }
}

function onDragMove(cx, cy) {
  if (draggedSym) { draggedSym.x = cx; draggedSym.y = cy; }
}

function _deliverSym() {
  if (!draggedSym) return;
  pSyms = pSyms.filter(s => s !== draggedSym);
  draggedSym = null;
  S.inscriptionCharge = Math.min(S.inscriptionCharge + 1, 5);
  inscriptionGlow     = 1.0;
  AudioSystem.playBell();

  if (S.inscriptionCharge >= 5 && !S.inscriptionReady) {
    S.inscriptionReady = true;
    inscriptionGlow    = 2.0;
  }
  saveMain();
}

// ── Animation loop ─────────────────────────────────────────────────────────
let animId = null;
let tick   = 0;

function animate() {
  if (state.activeScreen !== 'main') { animId = null; return; }
  ctx.clearRect(0, 0, W, H);
  tick++;

  // Background
  if (bgImg.complete) ctx.drawImage(bgImg, 0, 0, W, H);

  const sx = W / BG_W, sy = H / BG_H;

  // ── Hero movement ─────────────────────────────────────────────────────────
  if (!hero.praying) {
    if (keysHeld['ArrowLeft']  || keysHeld['a'] || keysHeld['ф']) {
      hero.x       = Math.max(80, hero.x - HERO_SPEED);
      hero.facing  = 'left';
      hero.walking = true;
      hero.targetX = null;
    } else if (keysHeld['ArrowRight'] || keysHeld['d'] || keysHeld['в']) {
      hero.x       = Math.min(BG_W - 80, hero.x + HERO_SPEED);
      hero.facing  = 'right';
      hero.walking = true;
      hero.targetX = null;
    } else if (hero.targetX !== null) {
      const dx = hero.targetX - hero.x;
      if (Math.abs(dx) > HERO_SPEED) {
        hero.x      += Math.sign(dx) * HERO_SPEED;
        hero.facing  = dx > 0 ? 'right' : 'left';
        hero.walking = true;
      } else {
        hero.x       = hero.targetX;
        hero.targetX = null;
        hero.walking = false;
      }
    } else {
      hero.walking = false;
    }
  }

  // ── Fireflies: yellow pixel rects with glow ──────────────────────────────
  for (const f of flies) {
    f.x += f.vx; f.y += f.vy;
    f.brightness += f.bv;
    if (f.brightness < 0 || f.brightness > 1) f.bv *= -1;
    if (f.x < 0) f.x = BG_W; if (f.x > BG_W) f.x = 0;
    if (f.y < 0) f.y = BG_H * 0.5; if (f.y > BG_H * 0.5) f.y = 0;
    const alpha = 0.4 + f.brightness * 0.6;
    const px    = Math.round(f.x * sx);
    const py    = Math.round(f.y * sy);
    ctx.save();
    ctx.shadowColor = `rgba(255,210,40,${alpha})`;
    ctx.shadowBlur  = 6 + f.brightness * 12;
    ctx.fillStyle   = `rgba(255,220,80,${alpha})`;
    ctx.fillRect(px, py, f.sz, f.sz);
    ctx.restore();
  }

  // ── Cat ───────────────────────────────────────────────────────────────────
  const cp = bgToCanvas(CAT_X, GROUND_Y - CAT_H);
  if (catSheet.complete && catSheet.naturalWidth) {
    const frame  = catBurying ? Math.min(Math.floor(catBuryTimer / 10), HERO_FRAMES - 1)
                              : Math.floor(tick / 12) % HERO_FRAMES;
    const frameW = catSheet.naturalWidth / HERO_FRAMES;
    ctx.drawImage(catSheet, frame * frameW, 0, frameW, catSheet.naturalHeight,
      cp.x, cp.y, CAT_W * sx, CAT_H * sy);
  } else {
    ctx.fillStyle = '#f0c060';
    ctx.fillRect(cp.x, cp.y, CAT_W * sx, CAT_H * sy);
  }

  // ── Monk ──────────────────────────────────────────────────────────────────
  const mp = bgToCanvas(MONK_X, GROUND_Y - MONK_H);
  if (monkSheet.complete && monkSheet.naturalWidth) {
    const frameW = monkSheet.naturalWidth / HERO_FRAMES;
    const frame  = Math.floor(tick / 14) % HERO_FRAMES;
    ctx.drawImage(monkSheet, frame * frameW, 0, frameW, monkSheet.naturalHeight,
      mp.x, mp.y, MONK_W * sx, MONK_H * sy);
  } else {
    ctx.fillStyle = '#c04030';
    ctx.fillRect(mp.x, mp.y, MONK_W * sx, MONK_H * sy);
  }

  // ── Hero — рисуется после монаха/кота (ближе к камере) ───────────────────
  const hp  = bgToCanvas(hero.x, hero.y);
  const heroImg = hero.praying ? heroImgS : (hero.facing === 'left' ? heroImgL : heroImgR);
  const hW  = hero.praying ? HERO_SIT_W   : HERO_STAND_W;
  const hH  = hero.praying ? HERO_SIT_H   : HERO_STAND_H;
  if (heroImg.complete && heroImg.naturalWidth) {
    const frameW = heroImg.naturalWidth / HERO_FRAMES;
    const frame  = Math.floor(tick / 10) % HERO_FRAMES;
    ctx.drawImage(heroImg,
      frame * frameW, 0, frameW, heroImg.naturalHeight,
      hp.x - (hW / 2) * sx, hp.y - hH * sy, hW * sx, hH * sy);
  } else {
    ctx.fillStyle = '#c87040';
    ctx.fillRect(hp.x - 16 * sx, hp.y - hH * sy, 32 * sx, hH * sy);
  }

  // ── Cat burying timer ─────────────────────────────────────────────────────
  if (catBurying) {
    catBuryTimer++;
    if (catBuryTimer > 180) {
      catBurying = false;
      addItem(makeItem('dirt'));
      AudioSystem.playPickup();
      renderHotbar();
      showMsg(catBuryDoneMsg);
      saveMain();
    }
  }

  // ── Meditation overlay ────────────────────────────────────────────────────
  if (hero.praying && meditationPhase < 1) meditationPhase = Math.min(meditationPhase + 0.015, 1);
  if (!hero.praying && meditationPhase > 0) meditationPhase = Math.max(meditationPhase - 0.015, 0);

  if (meditationPhase > 0) {
    ctx.fillStyle = `rgba(20,10,40,${meditationPhase * 0.35})`;
    ctx.fillRect(0, 0, W, H);

    if (hero.praying && tick % 28 === 0) _spawnSym();
    _symTick();

    ctx.save();
    for (const s of pSyms) {
      ctx.globalAlpha = s.life * meditationPhase;
      ctx.fillStyle   = '#d4b8ff';
      ctx.font        = `${Math.round(24 * sx)}px serif`;
      ctx.textAlign   = 'center';
      ctx.fillText(s.ch, s.x, s.y);
    }
    ctx.restore();

    inscriptionGlow = Math.max(inscriptionGlow - 0.02, 0);
    const iz = bgToCanvas(ZONES_BG.inscription.x, ZONES_BG.inscription.y);
    const iw = ZONES_BG.inscription.w * sx;
    const ih = ZONES_BG.inscription.h * sy;

    ctx.save();
    ctx.globalAlpha = 0.5 + inscriptionGlow * 0.3;
    ctx.strokeStyle = S.inscriptionReady ? '#ffe080' : '#a090d0';
    ctx.lineWidth   = 2;
    ctx.strokeRect(iz.x, iz.y, iw, ih);

    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const r     = 18 * sx;
      const cx2   = iz.x + iw / 2 + Math.cos(angle) * r;
      const cy2   = iz.y + ih / 2 + Math.sin(angle) * r;
      ctx.fillStyle = i < S.inscriptionCharge ? '#ffe080' : '#504060';
      ctx.beginPath();
      ctx.arc(cx2, cy2, 4 * sx, 0, Math.PI * 2);
      ctx.fill();
    }

    if (S.inscriptionReady) {
      ctx.globalAlpha = 0.8 + inscriptionGlow * 0.2;
      ctx.fillStyle   = '#ffe080';
      ctx.font        = `${Math.round(32 * sx)}px serif`;
      ctx.textAlign   = 'center';
      ctx.fillText('ᩮ', iz.x + iw / 2, iz.y + ih / 2 + 8 * sy);
    }
    ctx.restore();
  }

  animId = requestAnimationFrame(animate);
}

// ── Keyboard ───────────────────────────────────────────────────────────────
function _onKey(e) {
  if (state.activeScreen !== 'main') return;
  const k = e.key.toLowerCase();
  if (k === 'arrowdown' || k === 's' || k === 'ы') sitDown();
  if (k === 'arrowup'   || k === 'w' || k === 'щ') standUp();
}

// ── leaveMain ─────────────────────────────────────────────────────────────
export function leaveMain() {
  standUp();
  draggedSym = null;
}

// ── Init ───────────────────────────────────────────────────────────────────
export function initMain() {
  canvas = document.getElementById('main-canvas');
  msgEl  = document.getElementById('main-msg');
  if (!canvas || !msgEl) {
    console.error('main.js: missing #main-canvas or #main-msg');
    return;
  }
  ctx = canvas.getContext('2d');
  setHotbarMsgEl(msgEl);

  // Pray button — только на мобильном (скрыт на десктопе через CSS)
  document.getElementById('pray-btn')?.addEventListener('click', sitDown);

  // Resize
  function resize() {
    const wrap = document.getElementById('wrap');
    W = canvas.width  = wrap.offsetWidth;
    H = canvas.height = wrap.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // Blur — сбросить залипший drag при переключении вкладки
  window.addEventListener('blur', () => { draggedSym = null; });

  // Mouse events
  canvas.addEventListener('click', e => {
    const r = canvas.getBoundingClientRect();
    onTap(e.clientX - r.left, e.clientY - r.top);
  });
  canvas.addEventListener('mousedown', e => {
    const r = canvas.getBoundingClientRect();
    onDragStart(e.clientX - r.left, e.clientY - r.top);
  });
  canvas.addEventListener('mousemove', e => {
    if (state.activeScreen !== 'main') return;
    const r  = canvas.getBoundingClientRect();
    const cx = e.clientX - r.left, cy = e.clientY - r.top;
    onDragMove(cx, cy);
    // Pointer cursor over clickable zones
    canvas.style.cursor = hitZoneBG(cx, cy) ? 'pointer' : 'default';
  });
  canvas.addEventListener('mouseup', () => {
    if (draggedSym) { _deliverSym(); draggedSym = null; }
  });
  canvas.addEventListener('mouseleave', () => {
    canvas.style.cursor = 'default';
  });

  // Touch events
  canvas.addEventListener('touchstart', e => {
    const t = e.touches[0];
    const r = canvas.getBoundingClientRect();
    onDragStart(t.clientX - r.left, t.clientY - r.top);
  }, { passive: true });
  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const t = e.touches[0];
    const r = canvas.getBoundingClientRect();
    onDragMove(t.clientX - r.left, t.clientY - r.top);
  }, { passive: false });
  canvas.addEventListener('touchend', e => {
    e.preventDefault();
    if (draggedSym) {
      const t = e.changedTouches[0];
      const r = canvas.getBoundingClientRect();
      draggedSym.x = t.clientX - r.left;
      draggedSym.y = t.clientY - r.top;
      _deliverSym();
      draggedSym = null;
    } else {
      const t = e.changedTouches[0];
      const r = canvas.getBoundingClientRect();
      onTap(t.clientX - r.left, t.clientY - r.top);
    }
  }, { passive: false });

  document.addEventListener('keydown', e => { keysHeld[e.key] = true; _onKey(e); });
  document.addEventListener('keyup',   e => { keysHeld[e.key] = false; });

  // Перезапуск анимации после скрытия вкладки
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && state.activeScreen === 'main' && !animId) animate();
  });

  animate();
}
