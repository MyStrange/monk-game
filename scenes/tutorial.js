// scenes/tutorial.js — туториал перед main: панк, поджог магазина, колесо сансары
// Базируется на _TEMPLATE.js + паттерн main (sit/stand, walking, item×zone)

import { state }                                         from '../src/state.js';
import { showMsgIn, showLoading, hideLoading,
         showError, CURSOR_DEF, CURSOR_PTR }             from '../src/utils.js';
import { leaveMain, resumeMain }                         from './main.js';
import { getSelectedItem, addItem, makeItem }            from '../src/inventory.js';
import { renderHotbar, setHotbarMsgEl }                  from '../src/hotbar.js';
import { AudioSystem }                                   from '../src/audio.js';
import { SaveManager }                                   from '../src/save.js';
import { punkThoughts, tutHints, tutZoneMsgs }           from '../src/dialogue.js';

// ── Persistent scene state ────────────────────────────────────────────────
const S = SaveManager.getScene('tutorial');
S.trashKicked  ??= false;
S.bottleTaken  ??= false;
S.posterTaken  ??= false;
S.canisterUsed ??= false;
S.windowBroken ??= false;
S.fireStarted  ??= false;
S.completed    ??= false;
function saveTut() { SaveManager.setScene('tutorial', S); }

// ── DOM ────────────────────────────────────────────────────────────────────
let el, bgEl, canvas, ctx, msgEl;
let W = 0, H = 0;
const showMsg = (t, d) => showMsgIn(msgEl, t, d);

// ── BG ────────────────────────────────────────────────────────────────────
const BG_W = 1376, BG_H = 768;
const BG_AFTER  = 'assets/bg/tut_after.png';   // база — мусорка лежит, без постера/канистры
const BG_BROKEN = 'assets/bg/tut_broken.png';  // окно разбито
const BG_FIRE_A = 'assets/bg/tut_fire_a.png';  // огонь kadr A
const BG_FIRE_B = 'assets/bg/tut_fire_b.png';  // огонь kadr B
let _curBg = BG_AFTER;

// ── Overlay sprites (показываются до взаимодействия) ──────────────────────
const sprTrash  = new Image(); sprTrash.src  = 'assets/sprites/trash_standing.png';
const sprPoster = new Image(); sprPoster.src = 'assets/sprites/poster.png';
const sprCan    = new Image(); sprCan.src    = 'assets/sprites/canister.png';

// Расположение спрайтов в координатах фона (где они вырезались)
const SPR_POS = {
  trash:    { x: 110, y: 460, w: 208, h: 240 },
  poster:   { x: 388, y: 378, w: 90,  h: 110 },
  canister: { x: 823, y: 558, w: 112, h: 132 },
};

// ── Zones (BG px) ─────────────────────────────────────────────────────────
const ZONES_BG = {
  trash:    { x: 110, y: 460, w: 208, h: 240 },
  poster:   { x: 388, y: 378, w: 90,  h: 110 },
  canister: { x: 800, y: 540, w: 145, h: 165 },
  window:   { x: 175, y: 280, w: 320, h: 230 },  // витрина
  // cigarette — динамическая, считается у руки сидящего героя
};

// ── Hero (panк placeholder) ───────────────────────────────────────────────
const HERO_GROUND_Y = 720;
const HERO_SPEED    = 4;
const HERO_W        = 70;
const HERO_H        = 200;

const hero = {
  x: 320, y: HERO_GROUND_Y,
  targetX: null,
  facing: 'right',
  walking: false,
  smoking: false,
  running: false,
  hit: false,
};
const keysHeld = {};

// ── Coordinate scaling ────────────────────────────────────────────────────
function bgToCanvas(bgX, bgY) {
  return { x: bgX * W / BG_W, y: bgY * H / BG_H };
}
function _cigZoneBG() {
  return { x: hero.x + 18, y: hero.y - HERO_H * 0.45, w: 30, h: 22 };
}
function hitZoneBG(cx, cy) {
  const bx = cx * BG_W / W, by = cy * BG_H / H;
  if (hero.smoking) {
    const c = _cigZoneBG();
    if (bx >= c.x && bx < c.x + c.w && by >= c.y && by < c.y + c.h) return 'cigarette';
  }
  for (const [name, z] of Object.entries(ZONES_BG)) {
    if (name === 'poster'   && S.posterTaken)  continue;
    if (name === 'canister' && S.canisterUsed) continue;
    if (bx >= z.x && bx < z.x + z.w && by >= z.y && by < z.y + z.h) return name;
  }
  return null;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function _pick(arr) {
  return arr && arr.length ? arr[Math.floor(Math.random() * arr.length)] : '';
}
function _hasItem(id) { return state.inventory.some(i => i?.id === id); }

// ── Hint progression — repeats unobtrusive nudge ──────────────────────────
let _hintTimer = null;
function _scheduleHint(delay = 9000) {
  clearTimeout(_hintTimer);
  if (S.completed || hero.running || hero.hit) return;
  _hintTimer = setTimeout(_nextHint, delay);
}
function _nextHint() {
  let h = null;
  if      (!S.trashKicked)            h = tutHints.kickTrash;
  else if (!S.bottleTaken)            h = tutHints.takeBottle;
  else if (!S.posterTaken)            h = tutHints.takePoster;
  else if (!S.canisterUsed)           h = tutHints.fillBottle;
  else if (!_hasItem('molotov') &&
           !_hasItem('molotov_lit'))  h = tutHints.craftMolotov;
  else if (_hasItem('molotov') && !hero.smoking) h = tutHints.sitToSmoke;
  else if (hero.smoking && _hasItem('molotov'))  h = tutHints.lightFuse;
  else if (_hasItem('molotov_lit'))   h = tutHints.breakWindow;
  if (h) showMsg(h, 5500);
  _scheduleHint(13000);
}

// ── Item × zone interactions ──────────────────────────────────────────────
function interactItem(itemId, zone) {
  // bottle на канистру → bottle_fuel
  if (itemId === 'bottle' && zone === 'canister') {
    state.inventory[state.selectedSlot] = makeItem('bottle_fuel');
    state.selectedSlot = -1;
    S.canisterUsed = true;
    AudioSystem.playPickup();
    renderHotbar();
    saveTut();
    showMsg(_pick(tutZoneMsgs.fillBottle));
    setTimeout(() => showMsg(_pick(punkThoughts.bottleFuel)), 2400);
    return;
  }
  // molotov на сигарету (только сидя) → molotov_lit + авто-встать
  if (itemId === 'molotov' && zone === 'cigarette') {
    state.inventory[state.selectedSlot] = makeItem('molotov_lit');
    AudioSystem.playBell();
    renderHotbar();
    showMsg(_pick(tutZoneMsgs.fuseLit));
    setTimeout(() => {
      standUp();
      showMsg(_pick(punkThoughts.fuseLit));
    }, 1400);
    return;
  }
  // molotov_lit на окно → бросок и пожар
  if (itemId === 'molotov_lit' && zone === 'window') {
    state.inventory[state.selectedSlot] = null;
    state.selectedSlot = -1;
    S.windowBroken = true;
    _curBg = BG_BROKEN;
    AudioSystem.playPickup();  // звон стекла-заглушка
    renderHotbar();
    saveTut();
    showMsg(_pick(punkThoughts.break), 4000);
    _startFireSequence();
    return;
  }
  // мимо
  showMsg(_pick(tutZoneMsgs.miss));
}

// ── Zone clicks (without item) ────────────────────────────────────────────
function zoneClick(zone) {
  if (zone === 'trash') {
    if (!S.trashKicked) {
      S.trashKicked = true;
      AudioSystem.playPickup();
      saveTut();
      showMsg(_pick(tutZoneMsgs.kickTrash));
      setTimeout(() => showMsg(_pick(punkThoughts.kickTrash)), 2400);
      return;
    }
    if (!S.bottleTaken) {
      if (!addItem(makeItem('bottle'))) { showMsg('Инвентарь полон.'); return; }
      S.bottleTaken = true;
      AudioSystem.playPickup();
      renderHotbar();
      saveTut();
      showMsg(_pick(tutZoneMsgs.takeBottle));
      return;
    }
    showMsg(_pick(tutZoneMsgs.trashEmpty));
    return;
  }
  if (zone === 'poster' && !S.posterTaken) {
    if (!addItem(makeItem('poster'))) { showMsg('Инвентарь полон.'); return; }
    S.posterTaken = true;
    AudioSystem.playPickup();
    renderHotbar();
    saveTut();
    showMsg(_pick(tutZoneMsgs.takePoster));
    setTimeout(() => showMsg(_pick(punkThoughts.poster)), 2400);
    return;
  }
  if (zone === 'canister') {
    showMsg(_pick(tutZoneMsgs.canisterEmpty));
    return;
  }
  if (zone === 'window') {
    showMsg(_pick(tutZoneMsgs.windowIdle));
    return;
  }
}

// ── Sit-and-smoke (вместо медитации) ──────────────────────────────────────
function sitDown() {
  if (hero.smoking || hero.running || hero.hit) return;
  hero.smoking = true;
  hero.walking = false;
  hero.targetX = null;
  AudioSystem.setMode('sitting');
  showMsg(_pick(punkThoughts.smokeStart));
  _scheduleSmokeIdle();
}
export function standUp() {
  if (!hero.smoking) return;
  hero.smoking = false;
  AudioSystem.setMode('ambient');
  clearTimeout(_smokeIdleTimer);
}
let _smokeIdleTimer = null;
function _scheduleSmokeIdle() {
  clearTimeout(_smokeIdleTimer);
  _smokeIdleTimer = setTimeout(() => {
    if (hero.smoking && state.activeScreen === 'tutorial') {
      showMsg(_pick(punkThoughts.smokeIdle));
      _scheduleSmokeIdle();
    }
  }, 7000);
}

// ── Tap handler ───────────────────────────────────────────────────────────
function onTap(cx, cy) {
  if (state.activeScreen !== 'tutorial') return;
  if (hero.running || hero.hit) return;

  const item = getSelectedItem();
  const zone = hitZoneBG(cx, cy);

  if (item && zone) { interactItem(item.id, zone); _scheduleHint(); return; }
  if (zone)         { zoneClick(zone);            _scheduleHint(); return; }

  // empty click — walk
  if (!hero.smoking) {
    const bgX = Math.max(80, Math.min(BG_W - 80, cx * BG_W / W));
    hero.targetX = bgX;
  }
}

// ── Fire / escape / car / space sequence ──────────────────────────────────
let _fireFrameTimer = null;
function _startFireSequence() {
  // 1. broken view
  setTimeout(() => {
    S.fireStarted = true;
    saveTut();
    // 2. fire animation
    let toggle = false;
    _fireFrameTimer = setInterval(() => {
      _curBg = toggle ? BG_FIRE_A : BG_FIRE_B;
      toggle = !toggle;
    }, 380);
    // 3. escape after 2.6s
    setTimeout(_startEscape, 2600);
  }, 900);
}
function _startEscape() {
  hero.running = true;
  state.selectedSlot = -1;
  renderHotbar();
  showMsg(_pick(punkThoughts.escape), 4500);
}

const car = { x: 0, lit: false };
function _spawnCar() {
  car.x = BG_W + 200;
  car.lit = true;
}
function _onCarHit() {
  hero.hit = true;
  AudioSystem.playPickup();
  showMsg(_pick(punkThoughts.hit), 3000);
  setTimeout(_startSpaceSequence, 1700);
}

// ── Space warp finale ─────────────────────────────────────────────────────
let _stars = [];
let _spacePhase = 0;     // 0 = warp only, 1 = warp + text, 2 = fade-out
let _spaceStarted = false;
function _startSpaceSequence() {
  _spaceStarted = true;
  _stars = Array.from({ length: 220 }, () => ({
    x: (Math.random() - 0.5) * BG_W * 2,
    y: (Math.random() - 0.5) * BG_H * 2,
    z: Math.random() * 1200 + 1,
    size: 1 + Math.random() * 2,
    color: ['#ffffff', '#ffe080', '#a0c0ff', '#ff8060', '#c8a0ff'][Math.floor(Math.random()*5)],
  }));
  _spacePhase = 0;
  setTimeout(() => { _spacePhase = 1; }, 3500);
  setTimeout(() => { _spacePhase = 2; }, 7500);
  setTimeout(_finishTutorial, 9800);
}

function _finishTutorial() {
  S.completed = true;
  SaveManager.global.tutorialDone = true;
  SaveManager.save();
  saveTut();
  // closeSceneTutorial → resumeMain
  closeSceneTutorial();
}

// ── Punk hero pixel-art (placeholder, без спрайтов) ───────────────────────
function _drawPunk(sx, sy, tick) {
  const drawH = hero.smoking ? HERO_H * 0.65 : HERO_H;
  const bob = (hero.walking || hero.running) ? Math.sin(tick * 0.3) * 3 : 0;

  const cx = hero.x * sx;
  const top = (hero.y + bob - drawH) * sy;
  const w = HERO_W * sx, h = drawH * sy;

  ctx.save();
  if (hero.facing === 'left') {
    ctx.translate(cx + w/2, top);
    ctx.scale(-1, 1);
  } else {
    ctx.translate(cx - w/2, top);
  }
  ctx.imageSmoothingEnabled = false;

  // палитра
  const SKIN    = '#d4a888';
  const HAIR    = '#3aa040';
  const HAIR_DK = '#1d6020';
  const JACK    = '#1a1a20';
  const JACK_HL = '#2c2c34';
  const STUDS   = '#c0c0c0';
  const PANTS   = '#0d0d12';
  const BOOTS   = '#0a0a0a';

  if (hero.smoking) {
    // сидит, низкая поза
    // ноги (согнуты)
    ctx.fillStyle = PANTS;
    ctx.fillRect(w*0.1, h*0.55, w*0.8, h*0.30);
    ctx.fillStyle = BOOTS;
    ctx.fillRect(w*0.05, h*0.85, w*0.4, h*0.15);
    ctx.fillRect(w*0.55, h*0.85, w*0.4, h*0.15);
    // куртка
    ctx.fillStyle = JACK;
    ctx.fillRect(w*0.18, h*0.30, w*0.64, h*0.32);
    ctx.fillStyle = JACK_HL;
    ctx.fillRect(w*0.55, h*0.32, w*0.05, h*0.28);
    ctx.fillStyle = STUDS;
    ctx.fillRect(w*0.25, h*0.38, w*0.04, h*0.04);
    ctx.fillRect(w*0.40, h*0.42, w*0.04, h*0.04);
    ctx.fillRect(w*0.55, h*0.40, w*0.04, h*0.04);
    // голова
    ctx.fillStyle = SKIN;
    ctx.fillRect(w*0.30, h*0.05, w*0.40, h*0.26);
    // ирокез
    ctx.fillStyle = HAIR;
    ctx.fillRect(w*0.42, h*-0.04, w*0.18, h*0.10);
    ctx.fillRect(w*0.45, h*-0.10, w*0.12, h*0.05);
    ctx.fillStyle = HAIR_DK;
    ctx.fillRect(w*0.42, h*0.06, w*0.18, h*0.02);
    // глаза
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(w*0.38, h*0.16, w*0.05, h*0.03);
    ctx.fillRect(w*0.55, h*0.16, w*0.05, h*0.03);
    // сигарета у губ (правая сторона лица)
    ctx.fillStyle = '#fff8e0';
    ctx.fillRect(w*0.65, h*0.24, w*0.18, h*0.025);
    ctx.fillStyle = '#ff5020';
    ctx.fillRect(w*0.81, h*0.235, w*0.04, h*0.04);
  } else {
    // стоит / идёт
    // ноги
    ctx.fillStyle = PANTS;
    ctx.fillRect(w*0.20, h*0.55, w*0.25, h*0.40);
    ctx.fillRect(w*0.55, h*0.55, w*0.25, h*0.40);
    // ботинки
    ctx.fillStyle = BOOTS;
    ctx.fillRect(w*0.18, h*0.92, w*0.30, h*0.08);
    ctx.fillRect(w*0.52, h*0.92, w*0.30, h*0.08);
    // куртка
    ctx.fillStyle = JACK;
    ctx.fillRect(w*0.15, h*0.28, w*0.70, h*0.32);
    ctx.fillStyle = JACK_HL;
    ctx.fillRect(w*0.5, h*0.30, w*0.05, h*0.28);
    ctx.fillStyle = STUDS;
    ctx.fillRect(w*0.22, h*0.34, w*0.04, h*0.04);
    ctx.fillRect(w*0.32, h*0.40, w*0.04, h*0.04);
    ctx.fillRect(w*0.46, h*0.36, w*0.04, h*0.04);
    ctx.fillRect(w*0.62, h*0.40, w*0.04, h*0.04);
    ctx.fillRect(w*0.74, h*0.34, w*0.04, h*0.04);
    // руки (placeholder)
    ctx.fillStyle = JACK;
    ctx.fillRect(w*0.05, h*0.30, w*0.10, h*0.28);
    ctx.fillRect(w*0.85, h*0.30, w*0.10, h*0.28);
    ctx.fillStyle = SKIN;
    ctx.fillRect(w*0.06, h*0.55, w*0.08, h*0.05);
    ctx.fillRect(w*0.86, h*0.55, w*0.08, h*0.05);
    // голова
    ctx.fillStyle = SKIN;
    ctx.fillRect(w*0.30, h*0.03, w*0.40, h*0.22);
    // ирокез
    ctx.fillStyle = HAIR;
    ctx.fillRect(w*0.42, h*-0.06, w*0.18, h*0.10);
    ctx.fillRect(w*0.45, h*-0.12, w*0.12, h*0.06);
    ctx.fillStyle = HAIR_DK;
    ctx.fillRect(w*0.42, h*0.04, w*0.18, h*0.02);
    // глаза
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(w*0.38, h*0.13, w*0.05, h*0.03);
    ctx.fillRect(w*0.55, h*0.13, w*0.05, h*0.03);
  }
  ctx.restore();
}

// ── Smoke particles (when smoking) ────────────────────────────────────────
const smoke = [];
function _spawnSmoke() {
  const c = _cigZoneBG();
  smoke.push({
    bx: c.x + c.w * 0.6,
    by: c.y - 4,
    vy: -0.45 - Math.random() * 0.4,
    vx: (Math.random() - 0.5) * 0.4,
    life: 1.0,
    sz: 2 + Math.random() * 3,
  });
}
function _drawSmoke(sx, sy) {
  for (let i = smoke.length - 1; i >= 0; i--) {
    const p = smoke[i];
    p.bx += p.vx;
    p.by += p.vy;
    p.life -= 0.011;
    if (p.life <= 0) { smoke.splice(i, 1); continue; }
    ctx.globalAlpha = p.life * 0.5;
    ctx.fillStyle = '#a0a0a8';
    ctx.fillRect(Math.round(p.bx * sx), Math.round(p.by * sy), p.sz * sx, p.sz * sy);
  }
  ctx.globalAlpha = 1;
}

// ── Embers + sparks during fire ───────────────────────────────────────────
const embers = [];
function _spawnEmber() {
  embers.push({
    bx: 200 + Math.random() * 300,
    by: 380 + Math.random() * 100,
    vy: -0.6 - Math.random() * 0.8,
    vx: (Math.random() - 0.5) * 0.6,
    life: 1.0,
    sz: 1 + Math.random() * 2,
    color: Math.random() < 0.5 ? '#ffaa20' : '#ff4010',
  });
}
function _drawEmbers(sx, sy) {
  for (let i = embers.length - 1; i >= 0; i--) {
    const p = embers[i];
    p.bx += p.vx;
    p.by += p.vy;
    p.life -= 0.012;
    if (p.life <= 0) { embers.splice(i, 1); continue; }
    ctx.globalAlpha = p.life;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 6;
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.bx * sx), Math.round(p.by * sy), p.sz * sx, p.sz * sy);
  }
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

// ── Car (final hit) ───────────────────────────────────────────────────────
function _drawCar(sx, sy) {
  if (!car.lit) return;
  // Простые фары — два жёлтых rect, надвигающихся слева
  // car.x уменьшается в animate
  const cx = car.x * sx;
  const cy = (HERO_GROUND_Y - 60) * sy;
  ctx.save();
  ctx.shadowColor = '#fff080';
  ctx.shadowBlur = 35;
  ctx.fillStyle = '#fff8d0';
  ctx.fillRect(cx, cy, 30 * sx, 14 * sy);
  ctx.fillRect(cx + 50 * sx, cy, 30 * sx, 14 * sy);
  ctx.restore();
  // тёмная масса машины
  ctx.fillStyle = '#080810';
  ctx.fillRect(cx - 20 * sx, cy + 14 * sy, 130 * sx, 60 * sy);
}

// ── Space warp draw ───────────────────────────────────────────────────────
function _drawSpace() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  // звёзды
  const cx = W / 2, cy = H / 2;
  for (const s of _stars) {
    s.z -= 9;
    if (s.z <= 1) {
      s.z = 1200;
      s.x = (Math.random() - 0.5) * BG_W * 2;
      s.y = (Math.random() - 0.5) * BG_H * 2;
    }
    const k = 200 / s.z;
    const x = cx + s.x * k;
    const y = cy + s.y * k;
    if (x < -10 || x > W + 10 || y < -10 || y > H + 10) continue;
    const sz = Math.max(1, Math.round(s.size * k * 1.2));
    ctx.fillStyle = s.color;
    ctx.shadowColor = s.color;
    ctx.shadowBlur = 6 * k;
    ctx.fillRect(x, y, sz, sz);
  }
  ctx.shadowBlur = 0;

  // текст
  if (_spacePhase >= 1) {
    const fadeText = Math.min(1, (_spacePhase === 1 ? 1 : Math.max(0, 1 - (Date.now() - _spaceTextStart) / 2300)));
    ctx.globalAlpha = fadeText;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${Math.round(28 * W / BG_W)}px serif`;
    ctx.fillText('Колесо крутится.', W / 2, H * 0.42);
    ctx.fillText('Снова.', W / 2, H * 0.52);
    ctx.globalAlpha = 1;
  }

  // финальное затемнение
  if (_spacePhase === 2) {
    const t = Math.min(1, (Date.now() - _spaceFadeStart) / 2200);
    ctx.fillStyle = `rgba(0,0,0,${t})`;
    ctx.fillRect(0, 0, W, H);
  }
}
let _spaceTextStart = 0;
let _spaceFadeStart = 0;

// ── Main animation loop ───────────────────────────────────────────────────
let animId = null;
let tick   = 0;
function animate() {
  if (state.activeScreen !== 'tutorial') { animId = null; return; }
  ctx.clearRect(0, 0, W, H);
  tick++;

  // космос
  if (_spaceStarted) {
    if (_spacePhase === 1 && !_spaceTextStart) _spaceTextStart = Date.now();
    if (_spacePhase === 2 && !_spaceFadeStart) _spaceFadeStart = Date.now();
    _drawSpace();
    animId = requestAnimationFrame(animate);
    return;
  }

  // Sync background <img> src (DOM-based fade-friendly)
  if (bgEl && bgEl.dataset.cur !== _curBg) {
    bgEl.src = _curBg;
    bgEl.dataset.cur = _curBg;
  }

  const sx = W / BG_W, sy = H / BG_H;

  // Overlay sprites (только пока сцена не сгорела)
  if (!S.windowBroken && !S.fireStarted) {
    if (!S.trashKicked && sprTrash.complete && sprTrash.naturalWidth) {
      const p = SPR_POS.trash;
      ctx.drawImage(sprTrash, p.x * sx, p.y * sy, p.w * sx, p.h * sy);
    }
    if (!S.posterTaken && sprPoster.complete && sprPoster.naturalWidth) {
      const p = SPR_POS.poster;
      ctx.drawImage(sprPoster, p.x * sx, p.y * sy, p.w * sx, p.h * sy);
    }
    if (!S.canisterUsed && sprCan.complete && sprCan.naturalWidth) {
      const p = SPR_POS.canister;
      ctx.drawImage(sprCan, p.x * sx, p.y * sy, p.w * sx, p.h * sy);
    }
  }

  // Movement
  if (hero.running) {
    hero.x += HERO_SPEED * 1.6;
    hero.facing = 'right';
    hero.walking = true;
    if (hero.x >= BG_W * 0.78 && !car.lit) _spawnCar();
    if (hero.x >= BG_W * 0.92 && !hero.hit) _onCarHit();
  } else if (!hero.smoking && !hero.hit) {
    if (keysHeld['ArrowLeft'] || keysHeld['a'] || keysHeld['ф']) {
      hero.x = Math.max(80, hero.x - HERO_SPEED);
      hero.facing = 'left';
      hero.walking = true;
      hero.targetX = null;
    } else if (keysHeld['ArrowRight'] || keysHeld['d'] || keysHeld['в']) {
      hero.x = Math.min(BG_W - 80, hero.x + HERO_SPEED);
      hero.facing = 'right';
      hero.walking = true;
      hero.targetX = null;
    } else if (hero.targetX !== null) {
      const dx = hero.targetX - hero.x;
      if (Math.abs(dx) > HERO_SPEED) {
        hero.x += Math.sign(dx) * HERO_SPEED;
        hero.facing = dx > 0 ? 'right' : 'left';
        hero.walking = true;
      } else {
        hero.x = hero.targetX;
        hero.targetX = null;
        hero.walking = false;
      }
    } else {
      hero.walking = false;
    }
  }

  // Embers (когда пожар)
  if (S.fireStarted) {
    if (tick % 3 === 0) _spawnEmber();
    _drawEmbers(sx, sy);
  }

  // Car (если запустилась)
  if (car.lit) {
    car.x -= 14;
    _drawCar(sx, sy);
  }

  // Hero
  _drawPunk(sx, sy, tick);

  // Smoke
  if (hero.smoking) {
    if (tick % 14 === 0) _spawnSmoke();
  }
  if (smoke.length) _drawSmoke(sx, sy);

  // Hit white flash
  if (hero.hit) {
    const a = Math.max(0, 1 - (tick % 90) / 90);
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fillRect(0, 0, W, H);
  }

  animId = requestAnimationFrame(animate);
}

// ── DOM creation ──────────────────────────────────────────────────────────
function createEl() {
  if (document.getElementById('tutorial')) return;

  el = document.createElement('div');
  el.id = 'tutorial';
  el.style.cssText = 'position:absolute;inset:0;display:none;z-index:55;overflow:hidden;background:#000;';

  bgEl = document.createElement('img');
  bgEl.src = BG_AFTER;
  bgEl.dataset.cur = BG_AFTER;
  bgEl.style.cssText = 'display:block;width:100%;height:100%;object-fit:cover;';

  canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;cursor:default;';
  ctx = canvas.getContext('2d');

  const back = document.createElement('button');
  back.className = 'back-btn';
  back.textContent = '←';
  back.onclick = closeSceneTutorial;
  back.addEventListener('touchend', e => { e.stopPropagation(); e.preventDefault(); closeSceneTutorial(); }, { passive: false });

  msgEl = document.createElement('div');
  msgEl.className = 'scene-msg';

  el.appendChild(bgEl);
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
    if (state.activeScreen !== 'tutorial') return;
    const r = canvas.getBoundingClientRect();
    canvas.style.cursor = hitZoneBG(e.clientX - r.left, e.clientY - r.top) ? CURSOR_PTR : CURSOR_DEF;
  });
  canvas.addEventListener('mouseleave', () => { canvas.style.cursor = CURSOR_DEF; });

  document.addEventListener('keydown', _onKey);
  document.addEventListener('keyup',   e => { keysHeld[e.key] = false; });
}

function _onKey(e) {
  if (state.activeScreen !== 'tutorial') return;
  keysHeld[e.key] = true;
  const k = e.key.toLowerCase();
  if (k === 'arrowdown' || k === 's' || k === 'ы') sitDown();
  if (k === 'arrowup'   || k === 'w' || k === 'щ') standUp();
}

function _resize() {
  const wrap = document.getElementById('wrap');
  W = canvas.width  = wrap.offsetWidth;
  H = canvas.height = wrap.offsetHeight;
}

// ── Lifecycle ─────────────────────────────────────────────────────────────
const _waitImg = img => img.complete && img.naturalWidth
  ? Promise.resolve()
  : new Promise(r => { img.onload = r; img.onerror = r; });

export async function openSceneTutorial() {
  leaveMain();
  createEl();
  el = document.getElementById('tutorial');
  showLoading('туториал');

  bgEl.onerror = () => showError('не удалось загрузить туториал');
  await Promise.all([_waitImg(bgEl), _waitImg(sprTrash), _waitImg(sprPoster), _waitImg(sprCan)]);
  if (!bgEl.naturalWidth) return;

  hideLoading();
  state.activeScreen = 'tutorial';
  el.style.display   = 'block';

  // Hotbar showMsg → наш msgEl
  setHotbarMsgEl(msgEl);

  // Если повторный запуск — сбросим состояние сцены и инвентарь от туториала
  _resetTutorialIfReplay();

  requestAnimationFrame(() => {
    _resize();
    if (!animId) animate();
    showMsg(tutHints.intro, 5500);
    _scheduleHint(8000);
  });

  window.addEventListener('resize', _resize);
}

function _resetTutorialIfReplay() {
  // Если сцена уже была пройдена — сбросить флаги, чтобы можно было перепройти
  if (S.completed) {
    S.trashKicked = S.bottleTaken = S.posterTaken = S.canisterUsed = false;
    S.windowBroken = S.fireStarted = S.completed = false;
    saveTut();
  }
  // Сбросим runtime-состояние сцены
  hero.x = 320; hero.y = HERO_GROUND_Y;
  hero.targetX = null; hero.facing = 'right';
  hero.walking = false; hero.smoking = false;
  hero.running = false; hero.hit = false;
  smoke.length = 0; embers.length = 0;
  car.x = BG_W + 200; car.lit = false;
  _spaceStarted = false; _spacePhase = 0;
  _spaceTextStart = 0; _spaceFadeStart = 0;
  _stars = [];
  _curBg = BG_AFTER;
  if (_fireFrameTimer) { clearInterval(_fireFrameTimer); _fireFrameTimer = null; }
  // Уберём только tutorial-предметы из инвентаря
  for (let i = 0; i < state.inventory.length; i++) {
    const id = state.inventory[i]?.id;
    if (['bottle','bottle_fuel','molotov','molotov_lit','poster'].includes(id)) {
      state.inventory[i] = null;
    }
  }
  state.selectedSlot = -1;
  renderHotbar();
}

export function closeSceneTutorial() {
  state.activeScreen = 'main';
  if (el) el.style.display = 'none';
  if (animId) { cancelAnimationFrame(animId); animId = null; }
  if (_fireFrameTimer) { clearInterval(_fireFrameTimer); _fireFrameTimer = null; }
  clearTimeout(_hintTimer);
  clearTimeout(_smokeIdleTimer);
  AudioSystem.setMode('ambient');
  saveTut();
  // Восстановить msgEl у hotbar обратно на main-msg
  setHotbarMsgEl(document.getElementById('main-msg'));
  resumeMain();
}
window.closeSceneTutorial = closeSceneTutorial;
