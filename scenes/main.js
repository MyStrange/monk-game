// scenes/main.js — главная сцена: герой, зоны, медитация, символы

import { state }           from '../src/state.js';
import { SCREENS }         from '../src/constants.js';
import { showMsgIn, showLoading, hideLoading, showChoiceIn, isStoryActive,
         CURSOR_DEF, CURSOR_PTR, setCursor } from '../src/utils.js';
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
  MONK_Q1_RESP, MONK_Q2_RESP, MONK_Q3_RESP, MONK_FINAL_MSG, FLOWER_GIVEN_MSG,
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
const GROUND_Y      = 920;   // единая плоскость героя/монаха/кота
const HERO_GROUND_Y = GROUND_Y;
const HERO_SPEED = 5;  // BG px per frame

// Hero display size — proportional to sprite frame ratio (275/348 = 0.791)
const HERO_STAND_H = 420;
// Vertical offset compensation for left sprite (BG px, positive = lower).
// Left sprite last visible row = 317, right = 344 → diff 27px × (420/348) ≈ 33 BG px
const HERO_LEFT_YOFF = 33;
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
  bush:        { x: 20,    y: 900,            w: 320,    h: 216 },
  water:       { x: 900,   y: 920,            w: 900,    h: 170 },
  dirt:        { x: 870,   y: 890,            w: 100,    h: 80 },
  inscription: { x: 700,   y: 760,            w: 180,    h: 110 },
};

// ── Persistent scene state ────────────────────────────────────────────────
const S = SaveManager.getScene('main');
S.stickPickedUp     = S.stickPickedUp     ?? false;
S.inscriptionCharge = S.inscriptionCharge ?? 0;
S.inscriptionReady  = S.inscriptionReady  ?? false;
S.monkDialogDone    = S.monkDialogDone    ?? false;
S.wantMoreSounds    = S.wantMoreSounds    ?? false;

function saveMain() { SaveManager.setScene('main', S); }

// ── Transient state (resets on reload) ────────────────────────────────────
let catBurying   = false;
let catBuryTimer = 0;
let inscriptionGlow = 0;
let _symDropStatueShown = false;  // подсказка показывается 1 раз за сессию

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
let _justDelivered = false;  // блокирует click после mouseup с _deliverSym
let statueParticles = [];  // вспышки при доставке символа

const THAI_CHARS = 'ธมอนภวตสกรคทยชพระศษสหฬาิีุูเแโใไ';
const PURPLE_PALETTE = [
  '#ffffff','#f0e8ff','#e2d4ff','#c8aaff',
  '#b888ff','#9966ee','#ddaaff','#ffe8ff','#ccbbff','#aa88ee',
];

// ── Pixel-art Thai glyph (cached, drawn at 10px → scaled up) ───────────────
let _thaiGlyphPurple = null;
let _thaiGlyphGold   = null;
function _makeThaiGlyph(color) {
  const c = document.createElement('canvas');
  c.width = 48; c.height = 14;
  const tc = c.getContext('2d');
  tc.fillStyle = color;
  tc.font = 'bold 10px sans-serif';
  tc.textAlign = 'center'; tc.textBaseline = 'middle';
  tc.fillText('ธรรม', 24, 7);
  return c;
}

// ── Ambient fireflies (240, yellow pixel, varied sizes + glow) ────────────
const _SIZES = [1,1,2,2,2,2,3,3,3,4,5];
const flies = Array.from({ length: 240 }, () => ({
  x:          Math.random() * BG_W,
  y:          Math.random() * (BG_H * 0.6),
  vx:         (Math.random() - 0.5) * 0.9,
  vy:         (Math.random() - 0.5) * 0.5,
  brightness: Math.random(),
  bv:         (Math.random() < 0.5 ? 1 : -1) * (0.018 + Math.random() * 0.028),
  sz:         _SIZES[Math.floor(Math.random() * _SIZES.length)],
  glow:       Math.random() < 0.32 ? 2.4 : 1.0,  // 32% с усиленным ореолом
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
    if (name === 'bush' && S.stickPickedUp) continue;
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
  if (!addItem(makeItem('stick'))) { showMsg('Инвентарь полон.'); return; }
  S.stickPickedUp = true;
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
  setTimeout(() => {
    // Guard: не кидаем сообщение в main если игрок успел уйти в другую сцену
    if (state.activeScreen !== SCREENS.MAIN) return;
    showMsg(catBuryMsg2);
  }, 2200);
}

// ── Meditation ─────────────────────────────────────────────────────────────
export function standUp() {
  hero.praying      = false;
  meditationPhase   = 0;
  pSyms             = [];
  mParticles        = [];
  draggedSym        = null;
  statueParticles   = [];
  AudioSystem.setMode('ambient');
}

function sitDown() {
  if (hero.praying) { standUp(); return; }
  hero.praying = true;
  AudioSystem.playPrayerSound();
  AudioSystem.setMode('sitting');
}

function _spawnSym() {
  if (!hero.praying) return;
  const ch   = THAI_CHARS[Math.floor(Math.random() * THAI_CHARS.length)];
  const p    = bgToCanvas(hero.x, hero.y - HERO_STAND_H * 0.8);
  const path = Math.floor(Math.random() * 4);
  pSyms.push({
    ch,
    x: p.x, y: p.y, x0: p.x, y0: p.y,
    t: 0, path,
    phase:      Math.random() * Math.PI * 2,
    ampX:       20 + Math.random() * (path === 1 ? 55 : 26),
    freqX:      0.35 + Math.random() * 0.55,
    riseSpeed:  0.38 + Math.random() * 0.32,
    life:       1.0,
    dragging:   false,
    vx: 0, vy: 0, ax: 0,
    size:       26 + Math.random() * 36,
    color:      PURPLE_PALETTE[Math.floor(Math.random() * PURPLE_PALETTE.length)],
  });
}

function _symTick() {
  for (let i = pSyms.length - 1; i >= 0; i--) {
    const s = pSyms[i];
    if (s.dragging) continue;
    s.t++;
    const sec = s.t / 60;
    switch (s.path) {
      case 0: s.x = s.x0 + Math.sin(sec * s.freqX * Math.PI + s.phase) * s.ampX; break;
      case 1: s.x = s.x0 + Math.sin(sec * s.freqX * 1.2 + s.phase) * (s.ampX * 1.9); break;
      case 2: s.x = s.x0
            + Math.sin(sec * s.freqX * 1.8 + s.phase) * s.ampX
            + Math.cos(sec * s.freqX * 0.9) * (s.ampX * 0.45); break;
      case 3: {
        const spiralR = s.ampX * (0.35 + 0.65 * Math.abs(Math.sin(sec * 0.7)));
        s.x = s.x0 + spiralR * Math.cos(sec * s.freqX * 2.4 + s.phase); break;
      }
    }
    s.y = s.y0 - (s.riseSpeed * s.t + 0.0008 * s.t * s.t);
    s.life -= 0.0008;
    if (s.life <= 0 || s.y < -80) pSyms.splice(i, 1);
  }
}

// ── Monk meditation dialogue ──────────────────────────────────────────────
// Запускается один раз: герой сидит + клик по монаху = философский разговор.
// После — в инвентаре появляется лотос.
function _startMonkDialog() {
  if (isStoryActive(msgEl)) return;

  showChoiceIn(msgEl,
    'Монах открыл глаза. Первый раз за долгое время.\nСмотрит сквозь тебя, как сквозь воду.\n— Чего ты ищешь на самом деле?',
    [{ text: 'Покоя' }, { text: 'Смысла' }, { text: 'Не знаю' }],
    val => {
      const r1 = MONK_Q1_RESP[val] ?? 'Ответ уже есть. Ты просто ещё не видишь.';
      showMsgIn(msgEl, r1, {
        story: true, dur: 3800,
        onDismiss: () => {
          if (state.activeScreen !== SCREENS.MAIN) return;
          showChoiceIn(msgEl,
            'Он кивает — медленно, будто слышал это много раз.\n— А что остаётся, когда отпускаешь поиск?',
            [{ text: 'Страшно' }, { text: 'Тишина' }, { text: 'Ничего' }],
            val2 => {
              const r2 = MONK_Q2_RESP[val2] ?? 'Именно. Ничего лишнего.';
              showMsgIn(msgEl, r2, {
                story: true, dur: 3800,
                onDismiss: () => {
                  if (state.activeScreen !== SCREENS.MAIN) return;
                  showChoiceIn(msgEl,
                    'Голос монаха тише ветра в ветвях.\n— Последний вопрос. Где покой перестаёт прятаться от тебя?',
                    [{ text: 'Внутри' }, { text: 'Не там' }, { text: 'Везде' }],
                    val3 => {
                      const r3 = MONK_Q3_RESP[val3] ?? 'Там, где ты позволяешь ему быть.';
                      showMsgIn(msgEl, r3, {
                        story: true, dur: 3400,
                        onDismiss: () => {
                          if (state.activeScreen !== SCREENS.MAIN) return;
                          showMsgIn(msgEl, MONK_FINAL_MSG, {
                            story: true, dur: 6000,
                            onDismiss: () => {
                              if (state.activeScreen !== SCREENS.MAIN) return;
                              S.monkDialogDone = true;
                              saveMain();
                              if (!addItem(makeItem('flower'))) {
                                showMsg('Инвентарь полон. Освободи место — лотос ждёт.');
                                return;
                              }
                              renderHotbar();
                              AudioSystem.playBell?.();
                              showMsg(FLOWER_GIVEN_MSG);
                            },
                          });
                        },
                      });
                    }
                  );
                },
              });
            }
          );
        },
      });
    }
  );
}

// ── Zone click (no item) ───────────────────────────────────────────────────
function zoneClick(zone) {
  trackZoneClick(zone);

  if (hero.praying) {
    // Первый разговор с монахом — только пока ещё не было диалога
    if (zone === 'monk' && !S.monkDialogDone) {
      _startMonkDialog();
      return;
    }

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
    AudioSystem.playCatMeow();
    showMsg(catMsgs[catMsgIdx % catMsgs.length]);
    catMsgIdx++;
    return;
  }
  if (zone === 'monk') {
    showMsg(monkMsgs[monkMsgIdx % monkMsgs.length]);
    monkMsgIdx++;
    return;
  }

  if (zone === 'water') {
    AudioSystem.playWater();
    const WATER_MSGS = [
      'Вода отражает всё что есть. И кое-что чего нет.',
      'Тихая. Холодная. Никуда не спешит.',
      'Под поверхностью ничего не видно. Это успокаивает.',
      'Если смотреть долго, начинаешь видеть что-то. Лучше не смотреть долго.',
    ];
    interactCounts.water = (interactCounts.water ?? 0) + 1;
    showMsg(WATER_MSGS[interactCounts.water % WATER_MSGS.length]);
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
    AudioSystem.playWater();
    showMsg('Ты зачерпнул воды. Банка стала тяжелее.');
    return;
  }

  const msg = getZoneMsg(itemId, zone, item);
  if (msg) showMsg(msg);
}

// ── onTap ──────────────────────────────────────────────────────────────────
function onTap(cx, cy) {
  if (_justDelivered) { _justDelivered = false; return; }
  if (state.activeScreen !== SCREENS.MAIN) return;
  trackSpotClick(cx, cy, 'main');

  if (draggedSym) {
    // Доставка только при реальном перетаскивании на надпись.
    const iz = ZONES_BG.inscription;
    const ip = bgToCanvas(iz.x + iz.w / 2, iz.y + iz.h / 2);
    const dist = Math.hypot(cx - ip.x, cy - ip.y);
    if (_dragMoved && dist < 60 && (hero.praying || meditationPhase > 0)) _deliverSym();
    if (draggedSym) { draggedSym.dragging = false; draggedSym = null; }
    _dragMoved = false;
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

// Отслеживаем, было ли реальное перетаскивание (мышь/палец двигались).
// Без движения — это тап/клик и доставка НЕ происходит.
let _dragStartX = 0, _dragStartY = 0, _dragMoved = false;
const _DRAG_THRESHOLD = 10; // px — сколько надо сдвинуться, чтобы считать «перетаскиванием»

function onDragStart(cx, cy) {
  if (state.activeScreen !== SCREENS.MAIN) return;
  if (!hero.praying && meditationPhase <= 0) return;
  for (const s of pSyms) {
    if (Math.hypot(cx - s.x, cy - s.y) < 52) {
      s.dragging = true;
      draggedSym = s;
      _dragStartX = cx; _dragStartY = cy;
      _dragMoved = false;
      return;
    }
  }
}

// Проверить, попадает ли точка по живому символу (для курсора)
function _hitSym(cx, cy) {
  if (!hero.praying && meditationPhase <= 0) return false;
  for (const s of pSyms) {
    if (Math.hypot(cx - s.x, cy - s.y) < 52) return true;
  }
  return false;
}

function onDragMove(cx, cy) {
  if (draggedSym) {
    draggedSym.x = cx; draggedSym.y = cy;
    if (!_dragMoved &&
        Math.hypot(cx - _dragStartX, cy - _dragStartY) > _DRAG_THRESHOLD) {
      _dragMoved = true;
    }
  }
}

function _deliverSym() {
  if (!draggedSym) return;
  pSyms = pSyms.filter(s => s !== draggedSym);
  draggedSym = null;
  S.inscriptionCharge = Math.min(S.inscriptionCharge + 1, 5);
  inscriptionGlow     = 1.0;
  AudioSystem.playBell();

  // Burst of sparks at inscription zone
  const iz  = ZONES_BG.inscription;
  const ip  = bgToCanvas(iz.x + iz.w / 2, iz.y + iz.h / 2);
  const csx = W / BG_W, csy = H / BG_H;
  const spd = Math.min(csx, csy);
  for (let i = 0; i < 32; i++) {
    const angle = Math.random() * Math.PI * 2;
    const v     = (1.8 + Math.random() * 3.8) * spd;
    const col   = i % 3 === 0 ? '#ffe080' : (i % 3 === 1 ? '#cc88ff' : '#ffffff');
    statueParticles.push({
      x: ip.x, y: ip.y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v - 2.2 * spd,
      life: 1.0,
      lv: 0.020 + Math.random() * 0.018,
      sz: Math.max(1, Math.round((1 + Math.random() * 2) * spd)),
      color: col,
    });
  }

  if (S.inscriptionCharge >= 5 && !S.inscriptionReady) {
    S.inscriptionReady  = true;
    inscriptionGlow     = 2.0;
    // Extra large burst for completion
    for (let i = 0; i < 24; i++) {
      const angle = Math.random() * Math.PI * 2;
      const v     = (3 + Math.random() * 6) * spd;
      statueParticles.push({
        x: ip.x, y: ip.y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v - 4 * spd,
        life: 1.0,
        lv: 0.012 + Math.random() * 0.012,
        sz: Math.max(1, Math.round((2 + Math.random() * 3) * spd)),
        color: i % 2 === 0 ? '#ffe080' : '#ffffff',
      });
    }
  }
  saveMain();
}

// ── Символ брошен на статую — звук + предложение слышать больше ────────────
function _onSymDropStatue() {
  AudioSystem.playSymbolTone?.(Math.floor(Math.random() * PURPLE_PALETTE.length));
  if (S.wantMoreSounds || _symDropStatueShown || isStoryActive(msgEl)) return;
  _symDropStatueShown = true;
  showMsgIn(msgEl,
    'Символ коснулся статуи. Ничего не произошло. Звук, правда, был очень даже.',
    {
      story: true, dur: 3800,
      onDismiss: () => {
        if (state.activeScreen !== SCREENS.MAIN || S.wantMoreSounds) return;
        showChoiceIn(msgEl, 'Хочешь слышать больше?',
          [{ text: 'Да' }, { text: 'Нет' }],
          v => {
            if (v !== 'Да') return;
            S.wantMoreSounds = true;
            saveMain();
            showMsg('Теперь каждый символ звучит по-своему.');
          }
        );
      },
    }
  );
}

// ── Animation loop ─────────────────────────────────────────────────────────
let animId = null;
let tick   = 0;

function animate() {
  if (state.activeScreen !== SCREENS.MAIN) { animId = null; return; }
  ctx.clearRect(0, 0, W, H);
  tick++;

  // Background
  // naturalWidth==0 на некоторых браузерах при ошибке загрузки даже если complete=true
  if (bgImg.complete && bgImg.naturalWidth) ctx.drawImage(bgImg, 0, 0, W, H);

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
    const fsz   = Math.max(1, Math.round(f.sz * sx));
    ctx.save();
    ctx.shadowColor = `rgba(255,210,40,${alpha})`;
    ctx.shadowBlur  = (18 + f.brightness * 28) * (f.glow ?? 1.0) * sx;
    ctx.fillStyle   = `rgba(255,220,80,${alpha})`;
    ctx.fillRect(px, py, fsz, fsz);
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
  const heroImg = hero.praying ? heroImgS : (hero.facing === 'left' ? heroImgL : heroImgR);
  const hW  = hero.praying ? HERO_SIT_W   : HERO_STAND_W;
  const hH  = hero.praying ? HERO_SIT_H   : HERO_STAND_H;
  const heroYOff = (!hero.praying && hero.facing === 'left') ? HERO_LEFT_YOFF : 0;
  const hp  = bgToCanvas(hero.x, hero.y + heroYOff);
  if (heroImg.complete && heroImg.naturalWidth) {
    const frameW   = heroImg.naturalWidth / HERO_FRAMES;
    const frameTick = hero.praying ? 20 : 10;
    const frame    = Math.floor(tick / frameTick) % HERO_FRAMES;
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

    if (hero.praying) {
      if (tick % 22 === 0) _spawnSym();
      if (tick % 22 === 11 && Math.random() < 0.45) _spawnSym();
    }
    _symTick();

    // Symbols — purple/white palette, per-symbol colour + glow
    ctx.save();
    for (const s of pSyms) {
      const a = s.life * meditationPhase;
      ctx.globalAlpha = a;
      ctx.shadowColor = s.color ?? '#c8aaff';
      ctx.shadowBlur  = 10;
      ctx.fillStyle   = s.color ?? '#c8aaff';
      ctx.font        = `${Math.round((s.size ?? 24) * sx)}px serif`;
      ctx.textAlign   = 'center';
      ctx.fillText(s.ch, s.x, s.y);
    }
    ctx.restore();

    // Sparkle particles (delivery burst) — in-place cleanup, no filter alloc
    ctx.save();
    for (let i = statueParticles.length - 1; i >= 0; i--) {
      const p = statueParticles[i];
      p.x += p.vx; p.y += p.vy;
      p.vy += 0.14; p.vx *= 0.97;
      p.life -= p.lv;
      if (p.life <= 0) { statueParticles.splice(i, 1); continue; }
      ctx.globalAlpha = p.life * meditationPhase;
      ctx.shadowColor = p.color;
      ctx.shadowBlur  = 6;
      ctx.fillStyle   = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.sz, p.sz);
    }
    ctx.restore();

    // Thai pixel inscription on statue
    if (!_thaiGlyphPurple) _thaiGlyphPurple = _makeThaiGlyph('#c0a0ff');
    if (!_thaiGlyphGold)   _thaiGlyphGold   = _makeThaiGlyph('#ffe080');
    {
      const tsz  = ZONES_BG.statue;
      const tPos = bgToCanvas(tsz.x + tsz.w * 0.5, tsz.y + tsz.h * 1.05);
      const tScale = Math.max(1.2, 1.8 * sx);
      const gW = 48, gH = 14;
      const glyph = S.inscriptionReady ? _thaiGlyphGold : _thaiGlyphPurple;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = Math.min(
        0.18 + S.inscriptionCharge * 0.10 + inscriptionGlow * 0.38
        + (S.inscriptionReady ? 0.28 : 0),
        0.92
      );
      ctx.shadowColor = S.inscriptionReady ? '#ffd040' : '#7744bb';
      ctx.shadowBlur  = (2 + inscriptionGlow * 14) * tScale;
      ctx.drawImage(glyph,
        Math.round(tPos.x - gW * tScale / 2),
        Math.round(tPos.y - gH * tScale / 2),
        Math.round(gW * tScale),
        Math.round(gH * tScale));
      ctx.restore();
    }

    inscriptionGlow = Math.max(inscriptionGlow - 0.02, 0);
    const iz = bgToCanvas(ZONES_BG.inscription.x, ZONES_BG.inscription.y);
    const iw = ZONES_BG.inscription.w * sx;
    const ih = ZONES_BG.inscription.h * sy;

    ctx.save();
    // Charge dots (без рамки/обводки)
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const r     = 16 * sx;
      const cx2   = iz.x + iw / 2 + Math.cos(angle) * r;
      const cy2   = iz.y + ih / 2 + Math.sin(angle) * r;
      ctx.globalAlpha = 0.6 + inscriptionGlow * 0.3;
      ctx.fillStyle   = i < S.inscriptionCharge ? '#ffe080' : '#302040';
      ctx.beginPath();
      ctx.arc(cx2, cy2, 3 * sx, 0, Math.PI * 2);
      ctx.fill();
    }
    // Символ — виден всегда: тусклый пока не заряжен, яркий когда готов
    const _symAlpha = S.inscriptionReady
      ? 0.85 + inscriptionGlow * 0.15
      : 0.12 + S.inscriptionCharge * 0.05 + inscriptionGlow * 0.15;
    ctx.globalAlpha  = _symAlpha;
    ctx.fillStyle    = S.inscriptionReady ? '#ffe080' : '#9080d0';
    ctx.font         = `${Math.round(44 * sx)}px serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ᩮ', iz.x + iw / 2, iz.y + ih / 2);
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }

  animId = requestAnimationFrame(animate);
}

// ── Keyboard ───────────────────────────────────────────────────────────────
function _onKey(e) {
  if (state.activeScreen !== SCREENS.MAIN) return;
  const k = e.key.toLowerCase();
  if (k === 'arrowdown' || k === 's' || k === 'ы') sitDown();
  if (k === 'arrowup'   || k === 'w' || k === 'щ') standUp();
}

// ── resumeMain — вызывается из closeScene* чтобы перезапустить loop ───────
export function resumeMain() {
  // Фиксируем возврат на main: F5 теперь не будет бросать назад в закрытую сцену.
  SaveManager.global.lastScene = 'main';
  SaveManager.save();
  if (state.activeScreen === SCREENS.MAIN && !animId) animate();
}

// ── leaveMain ─────────────────────────────────────────────────────────────
export function leaveMain() {
  standUp();
  draggedSym = null;
  // Прерываем анимацию закопки землёй: иначе при возврате в main тик-счётчик
  // дотянется до 180 и выстрелит stale сообщение/подарок земли.
  if (catBurying) { catBurying = false; catBuryTimer = 0; }
}

// ── Init ───────────────────────────────────────────────────────────────────
export async function initMain() {
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

  // Resize. Кэшируем canvas rect — его читают все event handlers и при 60fps
  // mousemove это форсит layout на каждый кадр. Обновляем только на resize
  // и scroll (ios toolbar skims viewport).
  let _cRect = { left: 0, top: 0 };
  function resize() {
    const wrap = document.getElementById('wrap');
    W = canvas.width  = wrap.offsetWidth;
    H = canvas.height = wrap.offsetHeight;
    _cRect = canvas.getBoundingClientRect();
  }
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('scroll', () => { _cRect = canvas.getBoundingClientRect(); }, { passive: true });

  // Blur — сбросить залипший drag при переключении вкладки
  window.addEventListener('blur', () => { draggedSym = null; });

  // Mouse events — используют кэшированный _cRect, не вызывая getBoundingClientRect
  canvas.addEventListener('click', e => {
    onTap(e.clientX - _cRect.left, e.clientY - _cRect.top);
  });
  canvas.addEventListener('mousedown', e => {
    onDragStart(e.clientX - _cRect.left, e.clientY - _cRect.top);
  });
  canvas.addEventListener('mousemove', e => {
    if (state.activeScreen !== SCREENS.MAIN) return;
    const cx = e.clientX - _cRect.left, cy = e.clientY - _cRect.top;
    onDragMove(cx, cy);
    // Pointer cursor over clickable zones OR meditation symbols
    setCursor(hitZoneBG(cx, cy) || _hitSym(cx, cy));
  });
  canvas.addEventListener('mouseup', e => {
    if (!draggedSym) return;
    const cx  = e.clientX - _cRect.left, cy = e.clientY - _cRect.top;
    const sym = draggedSym;
    const iz  = ZONES_BG.inscription;
    const ip  = bgToCanvas(iz.x + iz.w / 2, iz.y + iz.h / 2);
    if (_dragMoved && Math.hypot(cx - ip.x, cy - ip.y) < 80 && (hero.praying || meditationPhase > 0)) {
      _deliverSym();
      _justDelivered = true;
    } else if (_dragMoved) {
      // Перетащили не к надписи — проверяем статую
      const bx = cx * BG_W / W, by = cy * BG_H / H;
      const sz = ZONES_BG.statue;
      if (bx >= sz.x && bx < sz.x + sz.w && by >= sz.y && by < sz.y + sz.h) _onSymDropStatue();
    } else if (S.wantMoreSounds && sym) {
      // Простой тап по символу → кристальный тон по цвету
      AudioSystem.playSymbolTone?.(PURPLE_PALETTE.indexOf(sym.col));
    }
    if (draggedSym) { draggedSym.dragging = false; draggedSym = null; }
    _dragMoved = false;
  });
  canvas.addEventListener('mouseleave', () => {
    setCursor(false);
  });

  // Touch events
  canvas.addEventListener('touchstart', e => {
    const t = e.touches[0];
    const cx = t.clientX - _cRect.left, cy = t.clientY - _cRect.top;
    onDragStart(cx, cy);
  }, { passive: true });
  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const t = e.touches[0];
    onDragMove(t.clientX - _cRect.left, t.clientY - _cRect.top);
  }, { passive: false });
  canvas.addEventListener('touchend', e => {
    e.preventDefault();
    const t = e.changedTouches[0];
    const cx = t.clientX - _cRect.left, cy = t.clientY - _cRect.top;
    if (draggedSym) {
      draggedSym.x = cx;
      draggedSym.y = cy;
      const sym = draggedSym;
      const iz  = ZONES_BG.inscription;
      const ip  = bgToCanvas(iz.x + iz.w / 2, iz.y + iz.h / 2);
      if (_dragMoved && Math.hypot(cx - ip.x, cy - ip.y) < 80 && (hero.praying || meditationPhase > 0)) {
        _deliverSym();
      } else if (_dragMoved) {
        const bx = cx * BG_W / W, by = cy * BG_H / H;
        const sz = ZONES_BG.statue;
        if (bx >= sz.x && bx < sz.x + sz.w && by >= sz.y && by < sz.y + sz.h) _onSymDropStatue();
      } else if (S.wantMoreSounds && sym) {
        AudioSystem.playSymbolTone?.(PURPLE_PALETTE.indexOf(sym.col));
      }
      if (draggedSym) { draggedSym.dragging = false; draggedSym = null; }
      _dragMoved = false;
    } else {
      onTap(cx, cy);
    }
  }, { passive: false });

  document.addEventListener('keydown', e => { keysHeld[e.key] = true; _onKey(e); });
  document.addEventListener('keyup',   e => { keysHeld[e.key] = false; });

  // Перезапуск анимации после скрытия вкладки
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && state.activeScreen === SCREENS.MAIN && !animId) animate();
  });

  // Ждём загрузки всех спрайтов — чтобы сцена появилась без рывков
  const _sprites = [bgImg, heroImgR, heroImgL, heroImgS, catSheet, monkSheet];
  if (!_sprites.every(img => img.complete && img.naturalWidth)) {
    showLoading('...');
    await Promise.all(_sprites.map(img =>
      img.complete && img.naturalWidth
        ? Promise.resolve()
        : new Promise(r => { img.onload = r; img.onerror = r; })
    ));
    hideLoading();
  }
  animate();
}
