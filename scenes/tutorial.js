// scenes/tutorial.js — туториал перед main: панк, поджог магазина, колесо сансары
// Базируется на _TEMPLATE.js + паттерн main (sit/stand, walking, item×zone)

import { state }                                         from '../src/state.js';
import { showMsgIn }                                     from '../src/ui/messages.js';
import { showLoading, hideLoading, showError,
         setMeditateBtn }                                from '../src/ui/overlays.js';
import { CURSOR_DEF, CURSOR_PTR }                        from '../src/ui/cursor.js';
import { leaveMain, resumeMain }                         from './main.js';
import { getSelectedItem, addItem, makeItem }            from '../src/inventory.js';
import { renderHotbar, setHotbarMsgEl }                  from '../src/hotbar.js';
import { AudioSystem }                                   from '../src/audio.js';
import { SaveManager }                                   from '../src/save.js';
import { punkThoughts, tutHints, tutZoneMsgs,
         trafficLightMsgs, stepMessages,
         tutBottleOnTrash, tutBottleAfterPick }          from '../src/dialogue.js';
// Общая walk-логика. Свой sprite/draw оставляем (панк ≠ монах).
import { tickHeroMove }                                  from '../src/hero.js';
import { Particles }                                     from '../src/particles.js';
import { waitImg }                                       from '../src/scene-base.js';

// ── Persistent scene state ────────────────────────────────────────────────
const S = SaveManager.getScene('tutorial');
S.trashKicked  ??= false;
S.bottleTaken  ??= false;
S.posterTaken  ??= false;
S.canisterUsed ??= false;
S.windowBroken ??= false;
S.fireStarted  ??= false;
S.completed    ??= false;
S.tutorialStep ??= 0;   // 0..10, см. HL_ZONES
function saveTut() { SaveManager.setScene('tutorial', S); }

// ── DOM ────────────────────────────────────────────────────────────────────
let el, bgEl, canvas, ctx, msgEl;
let W = 0, H = 0;
const showMsg = (t, d) => showMsgIn(msgEl, t, d);

// ── BG ────────────────────────────────────────────────────────────────────
import { SCENE_DEFS } from '../src/scene-defs.js';
const { bgW: BG_W, bgH: BG_H, heroXMax: HERO_X_MAX_DEF } = SCENE_DEFS.tutorial;
const BG_START  = 'assets/bg/tut_start.png';   // база — всё на местах
const BG_BROKEN = 'assets/bg/tut_broken.png';  // окно разбито
const BG_FIRE_A = 'assets/bg/tut_fire_a.png';  // огонь kadr A
const BG_FIRE_B = 'assets/bg/tut_fire_b.png';  // огонь kadr B
let _curBg = BG_START;

// ── Overlay sprites — прямоугольные crop'ы из tut_after (полностью непрозрачные) ─
const sprTrashFallen  = new Image(); sprTrashFallen.src  = 'assets/sprites/trash_fallen.png';
const sprBottleTaken  = new Image(); sprBottleTaken.src  = 'assets/sprites/bottle_taken.png';
const sprPosterGone   = new Image(); sprPosterGone.src   = 'assets/sprites/poster_gone.png';
const sprCanisterGone = new Image(); sprCanisterGone.src = 'assets/sprites/canister_gone.png';

// Расположение спрайтов-после в координатах фона (где они вырезались)
const SPR_POS = {
  trash_fallen:   { x: 60,  y: 455, w: 350, h: 265 },  // упавшая мусорка + мусор + бутылка
  bottle_taken:   { x: 308, y: 600, w: 52,  h: 90  },  // патч tut_start чтобы скрыть бутылку
  poster_gone:    { x: 385, y: 360, w: 97,  h: 140 },
  canister_gone:  { x: 785, y: 540, w: 190, h: 180 },
};

// ── Hero movement — упор в светофор ───────────────────────────────────────
const HERO_X_MAX  = HERO_X_MAX_DEF;  // BG-px, дальше нельзя — см. SCENE_DEFS.tutorial
let _trafficMsgIdx = 0;

// ── Onboarding step → подсвечиваемая зона/слот ───────────────────────────
function _currentStepHighlights() {
  // Возвращает массив зон для подсветки на BG: [{cx, cy, r}, ...]
  // и идентификаторы слотов хотбара для пульсации: ['bottle', 'poster', ...]
  switch (S.tutorialStep) {
    case 1: return { zones: [HL_ZONES.trash_kick], slots: [] };
    case 2: return { zones: [HL_ZONES.bottle],     slots: [] };
    case 3: return { zones: [],                    slots: ['bottle'] };
    case 4: return { zones: [HL_ZONES.canister, HL_ZONES.trash_kick, HL_ZONES.poster, HL_ZONES.window], slots: [] };
    case 5: return { zones: [HL_ZONES.poster],     slots: [] };
    case 6: return { zones: [],                    slots: ['bottle_fuel', 'poster'] };
    case 7: return { zones: [],                    slots: [] };  // подсказка S/↓
    case 8: return { zones: [],                    slots: ['molotov'] };  // + динамическая cigarette подсветка
    case 9: return { zones: [HL_ZONES.window],     slots: ['molotov_lit'] };
    default: return { zones: [], slots: [] };
  }
}
function _advanceStep(to) {
  if (S.tutorialStep < to) {
    S.tutorialStep = to;
    saveTut();
    _onStepEnter(to);
  }
}
function _onStepEnter(step) {
  const m = stepMessages[step];
  if (m) showMsg(m, 5000);
}

// ── Zones (BG px) ─────────────────────────────────────────────────────────
// trash широкая — покрывает и стоящую бочку, и упавшую кучу + бутылку
const ZONES_BG = {
  trash:    { x: 60,  y: 455, w: 350, h: 265 },
  poster:   { x: 388, y: 378, w: 90,  h: 110 },
  canister: { x: 800, y: 540, w: 145, h: 165 },
  window:   { x: 175, y: 280, w: 320, h: 230 },  // витрина
  // cigarette — динамическая, считается у руки сидящего героя
};

// ── Onboarding step-machine (центр и радиус подсветки на BG) ─────────────
// Шаги:
// 0 — intro: подсказка ходить (стрелки/A·D, клик)
// 1 — kick trash (подсветить мусорку)
// 2 — pick bottle (подсветить лежащую бутылку)
// 3 — select bottle in hotbar (подсветить слот)
// 4 — bottle on canister (подсветить канистру)
// 5 — pick poster (подсветить плакат)
// 6 — combine bottle_fuel + poster (подсветить слоты)
// 7 — sit & smoke (подсказка)
// 8 — molotov on cigarette
// 9 — molotov_lit on window
// 10+ — finale (без подсветки, авто-сценарий)
const HL_ZONES = {
  trash_kick: { cx: 200, cy: 540, r: 95  },  // целая мусорка
  bottle:     { cx: 334, cy: 645, r: 36  },  // лежащая бутылка
  canister:   { cx: 873, cy: 620, r: 55  },
  poster:     { cx: 433, cy: 433, r: 50  },
  window:     { cx: 335, cy: 395, r: 110 },
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

// ── Глухой звук «ПАМ» при пинке мусорки и разбивании окна ────────────────
function _playKick() {
  const ac = AudioSystem.ctx;
  if (!ac) return;
  const now = ac.currentTime;
  // Низкий thump
  const osc = ac.createOscillator();
  const g   = ac.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.exponentialRampToValueAtTime(40, now + 0.18);
  g.gain.setValueAtTime(0.35, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
  osc.connect(g); g.connect(AudioSystem.masterGain);
  osc.start(now); osc.stop(now + 0.35);
  // Шумок-удар
  const buf = ac.createBuffer(1, ac.sampleRate * 0.12, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const noise = ac.createBufferSource();
  const ng    = ac.createGain();
  const flt   = ac.createBiquadFilter();
  flt.type = 'lowpass'; flt.frequency.value = 700;
  noise.buffer = buf;
  ng.gain.value = 0.18;
  noise.connect(flt); flt.connect(ng); ng.connect(AudioSystem.masterGain);
  noise.start(now);
}

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
  // bottle обратно по мусорке — ироничный отказ
  if (itemId === 'bottle' && zone === 'trash') {
    showMsg(_pick(tutBottleOnTrash));
    return;
  }
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
    _advanceStep(5);
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
    _playKick();  // звон + удар
    renderHotbar();
    saveTut();
    showMsg(_pick(punkThoughts.break), 4000);
    _advanceStep(10);
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
      _playKick();  // глухой ПАМ
      saveTut();
      showMsg(tutBottleAfterPick);
      _advanceStep(2);
      return;
    }
    if (!S.bottleTaken) {
      if (!addItem(makeItem('bottle'))) { showMsg('Инвентарь полон.'); return; }
      S.bottleTaken = true;
      AudioSystem.playPickup();
      renderHotbar();
      saveTut();
      showMsg(_pick(tutZoneMsgs.takeBottle));
      _advanceStep(3);
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
    _advanceStep(6);
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
    hero.targetX = bgX;  // ограничится HERO_X_MAX в animate
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
// ── Car hit: drama sequence — white flash → black → philosophy → space ───
let _hitFadeStart = 0;     // ms timestamp когда начался чёрный фейд
let _hitDeepBlack = false; // полный чёрный установлен
function _onCarHit() {
  hero.hit = true;
  _playKick();              // глухой удар
  // 0–0.6s: белая вспышка (рисуется в animate)
  // 1.0s: начинаем фейд в чёрный
  setTimeout(() => { _hitFadeStart = Date.now(); }, 1000);
  // 2.5s: уже плотный чёрный — пускаем sad chord
  setTimeout(() => { _hitDeepBlack = true; _playSadChord(); }, 2500);
  // 3.5s: первая философская строка
  setTimeout(() => showMsg('Этот мир тебя ещё держит.', 4500), 3500);
  // 7s: вторая строка
  setTimeout(() => showMsg(_pick(punkThoughts.hit), 4500), 7000);
  // 11s: третья строка
  setTimeout(() => showMsg('Бунт был не дверью. Бунт был петлёй.', 4500), 11000);
  // 16s: четвёртая
  setTimeout(() => showMsg('Колесо ждёт. Оно не торопится.', 4500), 16000);
  // 21s: уход в космос
  setTimeout(_startSpaceSequence, 21000);
}

// Грустный аккорд — низкий минор через AudioSystem.ctx
function _playSadChord() {
  const ac = AudioSystem.ctx;
  if (!ac) return;
  AudioSystem.setMode('silent');  // приглушить ambient
  const now = ac.currentTime;
  // A minor: A2 (110), C3 (130.8), E3 (164.8) + low octave 55
  const notes = [55, 110, 130.81, 164.81, 220];
  for (const f of notes) {
    const osc = ac.createOscillator();
    const g   = ac.createGain();
    osc.type = 'sine'; osc.frequency.value = f;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.09, now + 1.5);
    g.gain.linearRampToValueAtTime(0.06, now + 8);
    g.gain.linearRampToValueAtTime(0, now + 16);
    osc.connect(g); g.connect(AudioSystem.masterGain);
    osc.start(now); osc.stop(now + 17);
  }
  // Одинокая нота-капля повторяется
  const _drip = (delay) => {
    const t = now + delay;
    const osc = ac.createOscillator();
    const g   = ac.createGain();
    osc.type = 'sine'; osc.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.13, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 4);
    osc.connect(g); g.connect(AudioSystem.masterGain);
    osc.start(t); osc.stop(t + 4.2);
  };
  [3, 7.5, 12].forEach(_drip);
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
// Все системы частиц через src/particles.js → Particles класс. Spawn
// сохраняет vx/vy/life/decay; tick() обновляет всё одинаково; draw —
// своим стилем.
const smoke  = new Particles();
const embers = new Particles();

function _spawnSmoke() {
  const c = _cigZoneBG();
  smoke.spawn({
    x:  c.x + c.w * 0.6,
    y:  c.y - 4,
    vx: (Math.random() - 0.5) * 0.4,
    vy: -0.45 - Math.random() * 0.4,
    life:  1.0,
    decay: 0.011,
    sz:    2 + Math.random() * 3,
  });
}
function _drawSmoke(sx, sy) {
  smoke.tick();
  smoke.forEach(p => {
    ctx.globalAlpha = p.life * 0.5;
    ctx.fillStyle   = '#a0a0a8';
    ctx.fillRect(Math.round(p.x * sx), Math.round(p.y * sy), p.sz * sx, p.sz * sy);
  });
  ctx.globalAlpha = 1;
}

// ── Embers + sparks during fire ───────────────────────────────────────────
function _spawnEmber() {
  embers.spawn({
    x:  200 + Math.random() * 300,
    y:  380 + Math.random() * 100,
    vx: (Math.random() - 0.5) * 0.6,
    vy: -0.6 - Math.random() * 0.8,
    life:  1.0,
    decay: 0.012,
    sz:    1 + Math.random() * 2,
    color: Math.random() < 0.5 ? '#ffaa20' : '#ff4010',
  });
}
function _drawEmbers(sx, sy) {
  embers.tick();
  embers.forEach(p => {
    ctx.globalAlpha = p.life;
    ctx.shadowColor = p.color;
    ctx.shadowBlur  = 6;
    ctx.fillStyle   = p.color;
    ctx.fillRect(Math.round(p.x * sx), Math.round(p.y * sy), p.sz * sx, p.sz * sy);
  });
  ctx.shadowBlur  = 0;
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

  // Overlay sprites — после-состояние, рисуем поверх старта (только до пожара)
  if (!S.windowBroken && !S.fireStarted) {
    if (S.trashKicked && sprTrashFallen.complete && sprTrashFallen.naturalWidth) {
      const p = SPR_POS.trash_fallen;
      ctx.drawImage(sprTrashFallen, p.x * sx, p.y * sy, p.w * sx, p.h * sy);
    }
    // Бутылка взята → накладываем патч tut_start чтобы скрыть её из trash_fallen
    if (S.trashKicked && S.bottleTaken && sprBottleTaken.complete && sprBottleTaken.naturalWidth) {
      const p = SPR_POS.bottle_taken;
      ctx.drawImage(sprBottleTaken, p.x * sx, p.y * sy, p.w * sx, p.h * sy);
    }
    if (S.posterTaken && sprPosterGone.complete && sprPosterGone.naturalWidth) {
      const p = SPR_POS.poster_gone;
      ctx.drawImage(sprPosterGone, p.x * sx, p.y * sy, p.w * sx, p.h * sy);
    }
    if (S.canisterUsed && sprCanisterGone.complete && sprCanisterGone.naturalWidth) {
      const p = SPR_POS.canister_gone;
      ctx.drawImage(sprCanisterGone, p.x * sx, p.y * sy, p.w * sx, p.h * sy);
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
    // Walk-логика монаха общая → tickHeroMove из src/hero.js.
    // hero.targetX обработается там же; границы 80…HERO_X_MAX (упор в светофор).
    const prevX = hero.x;
    tickHeroMove(hero, keysHeld, {
      minX: 80, maxX: HERO_X_MAX, speed: HERO_SPEED,
    });
    // Подсказка про светофор — когда упираемся в правую границу
    if (hero.x >= HERO_X_MAX && prevX < HERO_X_MAX && !S.windowBroken) {
      const arr = trafficLightMsgs;
      showMsg(arr[Math.min(_trafficMsgIdx, arr.length - 1)]);
      _trafficMsgIdx++;
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

  // Hit drama: 0–1s белая вспышка, далее затемнение в чёрный
  if (hero.hit) {
    const ms = _hitFadeStart ? (Date.now() - _hitFadeStart) : 0;
    if (!_hitFadeStart) {
      // Белая вспышка (первая секунда после удара) — быстрый fade-out
      const a = Math.max(0, 1 - (Date.now() % 1500) / 1000);
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.fillRect(0, 0, W, H);
    } else {
      // Чёрный fade-in за 1.5 сек, потом плотный чёрный
      const fade = Math.min(1, ms / 1500);
      ctx.fillStyle = `rgba(0,0,0,${fade})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  // Onboarding auto-advance + подсветка зон
  _checkAutoAdvance();
  if (!hero.running && !hero.hit && !S.windowBroken) _drawHighlights(sx, sy, tick);
  _pulseHotbarSlots(tick);

  animId = requestAnimationFrame(animate);
}

// ── Onboarding: автопродвижение шагов на ключевых событиях ───────────────
function _checkAutoAdvance() {
  // 0 → 1: первый шаг героя (отъехал от стартовой 320)
  if (S.tutorialStep === 0 && Math.abs(hero.x - 320) > 30) _advanceStep(1);
  // 3 → 4: бутылка выбрана в хотбаре
  if (S.tutorialStep === 3 && getSelectedItem()?.id === 'bottle') _advanceStep(4);
  // 6 → 7: молотов скрафчен
  if (S.tutorialStep === 6 && _hasItem('molotov')) _advanceStep(7);
  // 7 → 8: герой сел
  if (S.tutorialStep === 7 && hero.smoking) _advanceStep(8);
  // 8 → 9: молотов горит
  if (S.tutorialStep === 8 && _hasItem('molotov_lit')) _advanceStep(9);
}

// ── Пульсирующее золотое кольцо над зоной (через canvas) ──────────────────
function _drawHighlights(sx, sy, tick) {
  const { zones } = _currentStepHighlights();
  if (!zones || !zones.length) return;
  // также cigarette в режиме курения (шаг 8)
  const all = [...zones];
  if (S.tutorialStep === 8 && hero.smoking) {
    const c = _cigZoneBG();
    all.push({ cx: c.x + c.w / 2, cy: c.y + c.h / 2, r: 22 });
  }
  const t = tick * 0.06;
  for (const z of all) {
    const px = z.cx * sx, py = z.cy * sy;
    const baseR = z.r * Math.min(sx, sy);
    // Двойное кольцо: внутреннее + внешнее (расходящаяся волна)
    for (let i = 0; i < 2; i++) {
      const phase = (t + i * 0.5) % 1;
      const r = baseR * (1 + phase * 0.45);
      const alpha = (1 - phase) * 0.85;
      ctx.save();
      ctx.strokeStyle = `rgba(255,210,80,${alpha})`;
      ctx.lineWidth = Math.max(2, 4 * Math.min(sx, sy));
      ctx.shadowColor = '#ffd040';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    // Сплошное кольцо + центральная точка
    ctx.save();
    ctx.strokeStyle = 'rgba(255,232,128,0.55)';
    ctx.lineWidth = Math.max(1.5, 2 * Math.min(sx, sy));
    ctx.beginPath();
    ctx.arc(px, py, baseR * 0.85, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// ── Пульсация слотов хотбара (через box-shadow на DOM) ───────────────────
const _hbPulseTracked = new Set();
function _pulseHotbarSlots(tick) {
  const { slots } = _currentStepHighlights();
  const ids = new Set(slots || []);
  const hb = document.getElementById('hotbar');
  if (!hb) return;
  const els = hb.querySelectorAll('.slot');
  els.forEach((el) => {
    const idx = parseInt(el.dataset.idx, 10);
    const item = state.inventory[idx];
    const match = item && ids.has(item.id);
    if (match) {
      const a = 0.5 + 0.5 * Math.sin(tick * 0.18);
      el.style.boxShadow = `0 0 ${12 + a * 14}px ${4 + a * 4}px rgba(255,210,80,${0.45 + a * 0.4})`;
      el.style.outline = '2px solid rgba(255,232,128,0.9)';
      _hbPulseTracked.add(el);
    } else if (_hbPulseTracked.has(el)) {
      el.style.boxShadow = '';
      el.style.outline = '';
      _hbPulseTracked.delete(el);
    }
  });
}

// ── DOM creation ──────────────────────────────────────────────────────────
function createEl() {
  if (document.getElementById('tutorial')) return;

  el = document.createElement('div');
  el.id = 'tutorial';
  el.style.cssText = 'position:absolute;inset:0;display:none;z-index:55;overflow:hidden;background:#000;';

  bgEl = document.createElement('img');
  bgEl.src = BG_START;
  bgEl.dataset.cur = BG_START;
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
    // Курсор: только при hover на интерактивную зону. Иначе — наследуем от body
  // (соседний чат настроил пиксельный flame-cursor через CSS с !important).
  const z = hitZoneBG(e.clientX - r.left, e.clientY - r.top);
  canvas.style.cursor = z ? CURSOR_PTR : '';
  });
  canvas.addEventListener('mouseleave', () => { canvas.style.cursor = ''; });

  document.addEventListener('keydown', _onKey);
  document.addEventListener('keyup',   e => { keysHeld[e.key] = false; });

  // Pray button event — глобальный dispatcher (см. main.js init).
  // В туториале «медитация» = присесть и закурить.
  window.addEventListener('app:meditate', () => {
    if (state.activeScreen === 'tutorial') sitDown();
  });
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
// waitImg — общий helper из src/scene-base.js (раньше дублировался локально).

export async function openSceneTutorial() {
  leaveMain();
  createEl();
  el = document.getElementById('tutorial');
  showLoading('туториал');

  bgEl.onerror = () => showError('не удалось загрузить туториал');
  await Promise.all([waitImg(bgEl), waitImg(sprTrashFallen), waitImg(sprBottleTaken), waitImg(sprPosterGone), waitImg(sprCanisterGone)]);
  if (!bgEl.naturalWidth) return;

  hideLoading();
  state.activeScreen = 'tutorial';
  el.style.display   = 'block';
  // Pray-кнопка — top-level фиксированная UI, видна в сценах с ходячим героем.
  setMeditateBtn(true);

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
  _curBg = BG_START;
  _trafficMsgIdx = 0;
  _hitFadeStart = 0;
  _hitDeepBlack = false;
  S.tutorialStep = 0;
  saveTut();
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
  // Снять подсветку с слотов хотбара
  _hbPulseTracked.forEach(el => { el.style.boxShadow = ''; el.style.outline = ''; });
  _hbPulseTracked.clear();
  // Восстановить msgEl у hotbar обратно на main-msg
  setHotbarMsgEl(document.getElementById('main-msg'));
  resumeMain();
}
window.closeSceneTutorial = closeSceneTutorial;
