// scenes/main.js — главная сцена: герой, зоны, медитация, символы

import { state }           from '../src/state.js';
import { showMsgIn }       from '../src/utils.js';
import { getSelectedItem, addItem, removeItem, makeItem } from '../src/inventory.js';
import { getZoneMsg }      from '../src/zone-msgs.js';
import { renderHotbar, setHotbarMsgEl } from '../src/hotbar.js';
import { AudioSystem }     from '../src/audio.js';
import { openScene }       from '../src/nav.js';
import { trackZoneClick, trackEmptyClick } from '../src/achievements.js';
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
const heroSheet  = new Image(); heroSheet.src  = 'assets/sprites/hero.png';
const catSheet   = new Image(); catSheet.src   = 'assets/sprites/cat.png';
const monkSheet  = new Image(); monkSheet.src  = 'assets/sprites/monk.png';

// ── Scene constants (in BG px, BG = 2000×1116) ────────────────────────────
const BG_W = 2000, BG_H = 1116;
const GROUND_Y = 920;

// Hero sprite
const HERO_W = 96, HERO_H = 128;
// Cat sprite
const CAT_W = 80, CAT_H = 80;
const CAT_X = 940;
// Monk sprite
const MONK_W = 80, MONK_H = 96;
const MONK_X = 1120;

// ── Zones (BG px) → scaled on render ──────────────────────────────────────
// Zone coords as fraction of BG dimensions
const ZONES_BG = {
  statue:      { x: 680, y: 160, w: 160, h: 200 },
  tree:        { x: 1600, y: 300, w: 200, h: 580 },
  cat:         { x: CAT_X, y: GROUND_Y - CAT_H, w: CAT_W, h: CAT_H },
  monk:        { x: MONK_X, y: GROUND_Y - MONK_H, w: MONK_W, h: MONK_H },
  bush:        { x: 0, y: 580, w: 500, h: 420 },
  water:       { x: 0, y: 920, w: 1800, h: 170 },
  dirt:        { x: 870, y: 890, w: 100, h: 80 },   // only visible after cat buries
  inscription: { x: 700, y: 760, w: 180, h: 110 },  // only in meditation
};

// ── Scene state ────────────────────────────────────────────────────────────
let stickPickedUp  = false;
let catBurying     = false;
let catBuryTimer   = 0;
let dirtReady      = false;
let dirtPickedUp   = false;
let inscriptionCharge = 0;
let inscriptionReady  = false;
let inscriptionGlow   = 0;

// ── Hero ───────────────────────────────────────────────────────────────────
const hero = {
  x: 300, y: GROUND_Y,
  vx: 0,
  walking: false,
  praying: false,
  frame: 0,
  frameTick: 0,
};

// ── Meditation ─────────────────────────────────────────────────────────────
let meditationPhase  = 0;   // 0..1 crossfade
let meditationEnergy = 0;
let pSyms    = [];  // floating Thai symbols
let mParticles = [];
let draggedSym = null;

const THAI_CHARS = 'ธมอนภวตสกรคทยชพระศษสหฬ';

// ── Ambient fireflies ──────────────────────────────────────────────────────
const flies = Array.from({ length: 50 }, () => ({
  x: Math.random() * BG_W,
  y: Math.random() * (BG_H * 0.5),
  vx: (Math.random() - 0.5) * 0.8,
  vy: (Math.random() - 0.5) * 0.4,
  brightness: Math.random(),
  bv: (Math.random() - 0.5) * 0.02,
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

  // Inscription only in meditation
  if (hero.praying || meditationPhase > 0) {
    const iz = ZONES_BG.inscription;
    if (bx >= iz.x && bx < iz.x + iz.w && by >= iz.y && by < iz.y + iz.h)
      return 'inscription';
  }

  // Dirt only if ready
  if (dirtReady && !dirtPickedUp) {
    const dz = ZONES_BG.dirt;
    if (bx >= dz.x && bx < dz.x + dz.w && by >= dz.y && by < dz.y + dz.h)
      return 'dirt';
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
  if (stickPickedUp) { showMsg('Здесь больше ничего нет.'); return; }
  if (state.selectedSlot >= 0) { showMsg('Руки заняты.'); return; }
  stickPickedUp = true;
  addItem(makeItem('stick'));
  AudioSystem.playPickup();
  renderHotbar();
  showMsg('Ты нашёл палку в кустах. Зачем-то взял её.');
}

// ── Dirt pickup ────────────────────────────────────────────────────────────
function pickUpDirt() {
  if (!dirtReady || dirtPickedUp) return;
  if (state.selectedSlot >= 0) { showMsg('Руки заняты.'); return; }
  dirtPickedUp = true;
  dirtReady    = false;
  const dirtItem = { id: 'dirt', name: 'земля', label: 'земля',
    description: 'Свежая земля. Кот постарался.' };
  addItem(dirtItem);
  AudioSystem.playPickup();
  renderHotbar();
  showMsg('Ты подобрал горстку земли.');
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
  hero.praying   = false;
  meditationPhase = 0;
  pSyms          = [];
  mParticles     = [];
  draggedSym     = null;
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
  const p  = bgToCanvas(hero.x, hero.y - HERO_H * 0.8);
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

  // While meditating — special messages
  if (hero.praying) {
    const k = `meditate:${zone}`;
    interactCounts[k] = (interactCounts[k] ?? 0) + 1;
    const arr = MEDITATE_MSGS[zone];
    if (arr) {
      showMsg(arr[interactCounts[k] % arr.length]);
      return;
    }
    if (zone === 'inscription') {
      if (inscriptionReady) { openScene('scene4'); return; }
      return;
    }
    return;
  }

  // Normal clicks
  if (zone === 'bush')   { pickUpStick(); return; }
  if (zone === 'dirt')   { pickUpDirt();  return; }
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

  // Durian → cat
  if (itemId === 'durian' && zone === 'cat') {
    const slot = state.inventory.findIndex(i => i?.id === 'durian');
    removeItem(slot);
    renderHotbar();
    AudioSystem.playCatMeow();
    startBury();
    return;
  }

  // jar / jar_open → water
  if ((itemId === 'jar' || itemId === 'jar_open') && zone === 'water') {
    if (itemId === 'jar' && !item.glowing && !item.released) {
      showMsg('У банки крышка. Воду не зачерпнёшь.'); return;
    }
    if (item.hasWater) { showMsg('Банка уже с водой.'); return; }
    item.hasWater    = true;
    item.label       = 'с водой';
    item.description = 'Открытая банка с водой. Холодная. Не расплещи.';
    renderHotbar();
    showMsg('Ты зачерпнул воды. Банка стала тяжелее.');
    return;
  }

  const msg = getZoneMsg(itemId, zone, item);
  if (msg) showMsg(msg);
}

// ── onTap ─────────────────────────────────────────────────────────────────
function onTap(cx, cy) {
  if (state.activeScreen !== 'main') return;

  // Dragged symbol drop
  if (draggedSym) {
    const iz = ZONES_BG.inscription;
    const ip = bgToCanvas(iz.x + iz.w / 2, iz.y + iz.h / 2);
    const dist = Math.hypot(cx - ip.x, cy - ip.y);
    if (dist < 60 && (hero.praying || meditationPhase > 0)) {
      _deliverSym();
    }
    draggedSym = null;
    return;
  }

  const item = getSelectedItem();
  const zone = hitZoneBG(cx, cy);

  if (item && zone) { interactItem(item.id, zone); return; }
  if (zone)         { zoneClick(zone); return; }
  trackEmptyClick();
}

function onDragStart(cx, cy) {
  if (state.activeScreen !== 'main') return;
  if (!hero.praying && meditationPhase <= 0) return;
  // Hit-test a floating symbol
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
  inscriptionCharge = Math.min(inscriptionCharge + 1, 5);
  inscriptionGlow   = 1.0;
  AudioSystem.playBell();

  if (inscriptionCharge >= 5 && !inscriptionReady) {
    inscriptionReady = true;
    inscriptionGlow  = 2.0;
  }
}

// ── Animation loop ─────────────────────────────────────────────────────────
let animId    = null;
let tick      = 0;
let padTick   = 0;

function animate() {
  if (state.activeScreen !== 'main') { animId = null; return; }
  ctx.clearRect(0, 0, W, H);
  tick++;

  // Background
  if (bgImg.complete) ctx.drawImage(bgImg, 0, 0, W, H);

  // Scale factor
  const sx = W / BG_W, sy = H / BG_H;

  // Fireflies
  for (const f of flies) {
    f.x += f.vx; f.y += f.vy;
    f.brightness += f.bv;
    if (f.brightness < 0 || f.brightness > 1) f.bv *= -1;
    if (f.x < 0) f.x = BG_W; if (f.x > BG_W) f.x = 0;
    if (f.y < 0) f.y = BG_H * 0.5; if (f.y > BG_H * 0.5) f.y = 0;
    const alpha = 0.3 + f.brightness * 0.7;
    ctx.fillStyle = `rgba(180,255,120,${alpha})`;
    ctx.beginPath();
    ctx.arc(f.x * sx, f.y * sy, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Dirt pile
  if (dirtReady && !dirtPickedUp) {
    const dp = bgToCanvas(ZONES_BG.dirt.x + 20, ZONES_BG.dirt.y + 10);
    ctx.fillStyle = '#6b3a1f';
    ctx.fillRect(dp.x, dp.y, 40 * sx, 24 * sy);
  }

  // Hero (simple rect until sprites load)
  const hp = bgToCanvas(hero.x, hero.y);
  if (heroSheet.complete && heroSheet.naturalWidth) {
    // Spritesheet frame — walking: frames 0-3 top row, sitting: frame 4
    const frameW = heroSheet.naturalWidth / 5;
    const frameH = heroSheet.naturalHeight;
    const frame  = hero.praying ? 4 : Math.floor(tick / 8) % 4;
    ctx.drawImage(heroSheet, frame * frameW, 0, frameW, frameH,
      hp.x - (HERO_W / 2) * sx, hp.y - HERO_H * sy, HERO_W * sx, HERO_H * sy);
  } else {
    ctx.fillStyle = '#c87040';
    ctx.fillRect(hp.x - 16 * sx, hp.y - HERO_H * sy, 32 * sx, HERO_H * sy);
  }

  // Cat
  const cp = bgToCanvas(CAT_X, GROUND_Y - CAT_H);
  if (catSheet.complete && catSheet.naturalWidth) {
    const frame  = catBurying ? Math.min(Math.floor(catBuryTimer / 8), 3) : Math.floor(tick / 12) % 2;
    const frameW = catSheet.naturalWidth / 4;
    ctx.drawImage(catSheet, frame * frameW, 0, frameW, catSheet.naturalHeight,
      cp.x, cp.y, CAT_W * sx, CAT_H * sy);
  } else {
    ctx.fillStyle = '#f0c060';
    ctx.fillRect(cp.x, cp.y, CAT_W * sx, CAT_H * sy);
  }

  // Monk
  const mp = bgToCanvas(MONK_X, GROUND_Y - MONK_H);
  if (monkSheet.complete && monkSheet.naturalWidth) {
    ctx.drawImage(monkSheet, 0, 0, monkSheet.naturalWidth, monkSheet.naturalHeight,
      mp.x, mp.y, MONK_W * sx, MONK_H * sy);
  } else {
    ctx.fillStyle = '#c04030';
    ctx.fillRect(mp.x, mp.y, MONK_W * sx, MONK_H * sy);
  }

  // Cat burying
  if (catBurying) {
    catBuryTimer++;
    if (catBuryTimer > 180) {
      catBurying = false;
      dirtReady  = true;
      showMsg(catBuryDoneMsg);
    }
  }

  // Meditation phase fade-in
  if (hero.praying && meditationPhase < 1) meditationPhase = Math.min(meditationPhase + 0.015, 1);
  if (!hero.praying && meditationPhase > 0) meditationPhase = Math.max(meditationPhase - 0.015, 0);

  // Meditation overlay
  if (meditationPhase > 0) {
    ctx.fillStyle = `rgba(20,10,40,${meditationPhase * 0.35})`;
    ctx.fillRect(0, 0, W, H);

    // Spawn symbols
    if (hero.praying && tick % 28 === 0) _spawnSym();
    _symTick();

    // Draw symbols
    ctx.save();
    for (const s of pSyms) {
      ctx.globalAlpha = s.life * meditationPhase;
      ctx.fillStyle   = '#d4b8ff';
      ctx.font        = `${Math.round(24 * sx)}px serif`;
      ctx.textAlign   = 'center';
      ctx.fillText(s.ch, s.x, s.y);
    }
    ctx.restore();

    // Inscription zone
    inscriptionGlow = Math.max(inscriptionGlow - 0.02, 0);
    const iz = bgToCanvas(ZONES_BG.inscription.x, ZONES_BG.inscription.y);
    const iw = ZONES_BG.inscription.w * sx;
    const ih = ZONES_BG.inscription.h * sy;

    ctx.save();
    ctx.globalAlpha = 0.5 + inscriptionGlow * 0.3;
    ctx.strokeStyle = inscriptionReady ? '#ffe080' : '#a090d0';
    ctx.lineWidth   = 2;
    ctx.strokeRect(iz.x, iz.y, iw, ih);

    // Charge dots
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const r     = 18 * sx;
      const cx2   = iz.x + iw / 2 + Math.cos(angle) * r;
      const cy2   = iz.y + ih / 2 + Math.sin(angle) * r;
      ctx.fillStyle = i < inscriptionCharge ? '#ffe080' : '#504060';
      ctx.beginPath();
      ctx.arc(cx2, cy2, 4 * sx, 0, Math.PI * 2);
      ctx.fill();
    }

    // Inscription glyph if ready
    if (inscriptionReady) {
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

  // Pray button
  document.getElementById('pray-btn')?.addEventListener('click', sitDown);

  // Resize
  function resize() {
    const wrap = document.getElementById('wrap');
    W = canvas.width  = wrap.offsetWidth;
    H = canvas.height = wrap.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // Input
  canvas.addEventListener('click', e => {
    const r = canvas.getBoundingClientRect();
    onTap(e.clientX - r.left, e.clientY - r.top);
  });
  canvas.addEventListener('mousedown', e => {
    const r = canvas.getBoundingClientRect();
    onDragStart(e.clientX - r.left, e.clientY - r.top);
  });
  canvas.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    onDragMove(e.clientX - r.left, e.clientY - r.top);
  });
  canvas.addEventListener('mouseup', () => {
    if (draggedSym) {
      // treat as tap at current position
      _deliverSym();
      draggedSym = null;
    }
  });
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

  document.addEventListener('keydown', _onKey);

  animate();
}
