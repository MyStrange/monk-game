// scenes/main.js — главная сцена: герой, зоны, медитация, символы

import { state }           from '../src/state.js';
import { SCREENS, INPUT }  from '../src/constants.js';
import { showMsgIn, showChoiceIn, isStoryActive }            from '../src/ui/messages.js';
import { showLoading, hideLoading, setMeditateBtn }          from '../src/ui/overlays.js';
import { CURSOR_DEF, CURSOR_PTR, setCursor }                 from '../src/ui/cursor.js';
import { setEdgeNavTarget, setDefaultEnterFor,
         OPPOSITE_EDGE }                                     from '../src/edge-nav.js';
import { coverRect }       from '../src/scene-base.js';
import { SCENE_DEFS }      from '../src/scene-defs.js';
import { canvasToBG as _canvasToBGShared,
         bgToCanvas as _bgToCanvasShared,
         hitZoneAtBG }                     from '../src/zones.js';
import { getSelectedItem, addItem, removeItem, makeItem } from '../src/inventory.js';
import { getZoneMsg }      from '../src/zone-msgs.js';
import { renderHotbar, setHotbarMsgEl } from '../src/hotbar.js';
import { AudioSystem }     from '../src/audio.js';
import { openScene }       from '../src/nav.js';
import { trackZoneClick, trackEmptyClick, trackSpotClick,
         trackSitDown, trackStandUp, trackSymbolDelivered,
         trackWaterJar, trackCatHiss, trackCatBury,
         trackMonkDialogDone, trackInscriptionReady,
         trackSceneVisit, trackSitOnCat } from '../src/achievements.js';
import { SaveManager, useSceneState } from '../src/save.js';
import {
  catMsgs, monkMsgs, MEDITATE_MSGS,
  catBuryMsg1, catBuryMsg2, catBuryDoneMsg,
  MONK_Q1_RESP, MONK_Q2_RESP, MONK_Q3_RESP, MONK_FINAL_MSG, FLOWER_GIVEN_MSG,
  MONK_NEED_ROCKS_MSG,
  INSCRIPTION_MSGS, INSCRIPTION_ITEM_MSGS,
  WATER_MSGS,
} from '../src/dialogue.js';
// Общий монах — спрайты, размеры, движение, отрисовка, клавиши.
import { makeHero, tickHeroMove, drawHero,
         meditationKeyAction, isWalkKey,
         spawnHeroAtEdge, setHeroTarget,
         HERO_STAND_H, HERO_STAND_W, HERO_SIT_W, HERO_SIT_H,
         HERO_LEFT_YOFF, HERO_FRAMES, HERO_SPEED,
         heroImgR, heroImgL, heroImgS }                      from '../src/hero.js';
import { onSceneVisible, makeIsActiveCheck }                 from '../src/scene-input.js';
// Палитра/символы/dust/overlay медитации — общие со всеми сценами.
import { PURPLE_PALETTE,
         createMeditationFx, createDustField,
         drawMeditationOverlay,
         updateMeditationPhase }                             from '../src/meditation-fx.js';
import { phaseToward, decay, pumpDecay }                    from '../src/anims.js';
import { sitDown as _sitDownCommon,
         standUp as _standUpCommon,
         setMeditating as _setMeditatingCommon }            from '../src/meditation.js';

// ── DOM ────────────────────────────────────────────────────────────────────
let canvas, ctx, msgEl;
let bgImg;   // <img id="main-bg"> — фон через object-fit:cover (в HTML)
let W = 0, H = 0;

// Кэш cover-rect: BG на экране может быть шире/выше canvas (cover обрезает
// лишнее). Все рисования героя/монаха/котов/символов идут через это.
// Пересчитывается только при resize — не надо дёргать getBoundingClientRect
// по 60fps.
let _bgR = { x: 0, y: 0, w: 0, h: 0 };

// Надпись на постаменте Будды — видна только в медитации.
// Две версии: dim (до активации), bright (после 5 доставок символов).
// Спрайты вырезаны из referencing-картинок, позиция в BG-координатах
// ниже через INSCRIPTION_OVERLAY.
const inscriptionDimImg    = new Image();
inscriptionDimImg.src      = 'assets/bg/inscription_dim.png';
const inscriptionBrightImg = new Image();
inscriptionBrightImg.src   = 'assets/bg/inscription_bright.png';

// Оверлей в BG-координатах (BG_W=2000, BG_H=1116). Покрывает постамент
// + его отражение в воде — именно там меняется картинка между state'ами.
const INSCRIPTION_OVERLAY = { x: 537, y: 494, w: 479, h: 620 };

// Узкая зона-«полоска рун» внутри спрайта — это и есть цель доставки.
// Раньше доставка работала по радиусу (hypot < 80px от центра zone).
// Теперь игрок должен попасть на сам кусочек надписи.
// Вычислено через нормализованные координаты рун внутри 330×427 спрайта:
// x 0.06..0.94, y 0.16..0.40 → в BG-координатах (537,494 + …):
const INSCRIPTION_TARGET  = { x: 566, y: 593, w: 421, h: 149 };

// ── Sprites ────────────────────────────────────────────────────────────────
// hero_left/right.png, hero_sit.png — импортированы из src/hero.js
//   (общие спрайты с одинаковыми размерами во всех сценах).
// cat.png:             2048×338, 5 frames (~410×338)
// monk_red.png:        2000×464, 5 frames (400×464)
const catSheet  = new Image(); catSheet.src  = 'assets/sprites/cat.png';
const monkSheet = new Image(); monkSheet.src = 'assets/sprites/monk_red.png';

// ── Scene constants (in BG px) ────────────────────────────────────────────
// HERO_* размеры, HERO_SPEED, HERO_FRAMES, HERO_LEFT_YOFF — из src/hero.js.
// BG_W / BG_H / groundY — единый реестр в src/scene-defs.js.
const { bgW: BG_W, bgH: BG_H, groundY: GROUND_Y } = SCENE_DEFS.main;
const HERO_GROUND_Y = GROUND_Y;

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
// Единый паттерн через useSceneState — см. src/save.js. Возвращает массив
// [S, saveS]: S — объект состояния с дефолтами, saveS — функция-saver.
const [S, saveMain] = useSceneState('main', {
  stickPickedUp:     false,
  inscriptionCharge: 0,
  inscriptionReady:  false,
  monkDialogDone:    false,
  monkHintShown:     false,   // story-подсказка про «ещё нет запроса» (один раз)
});

// ── Transient state (resets on reload) ────────────────────────────────────
let catBurying   = false;
let catBuryTimer = 0;
let inscriptionGlow = 0;
// Кот временно скрыт после оскорбления (вода из банки). Сбрасывается при
// выходе из main и возврате — игрок заходит в другую сцену и видит кота
// снова. НЕ сохраняется в SaveManager: это тихая, безболезненная реакция
// мира, а не постоянное наказание.
let catHidden = false;

// ── Hero ───────────────────────────────────────────────────────────────────
// Общий makeHero() из src/hero.js — единое состояние на все сцены.
const hero = makeHero({ x: 300, y: HERO_GROUND_Y });

// Held keys for smooth movement
const keysHeld = {};

// ── Meditation ─────────────────────────────────────────────────────────────
// Все символы / dust-частицы / overlay — общие из src/meditation-fx.js.
// Главная сцена включает paths:4 (4 формы движения) и drag (символ можно
// схватить и доставить на надпись). См. achievements.js — там paths:1, без drag.
let meditationPhase = 0;
const fx   = createMeditationFx({
  paths: 4, drag: true,
  sizeBase: 26, sizeVar: 36,
  riseSpeedBase: 0.38, riseSpeedVar: 0.32,
  ampXBase: 20, ampXVar: 26,
  freqXBase: 0.35, freqXVar: 0.55,
  lifeDecay: 0.0008,
});
const dust = createDustField();   // dissolve-частицы при доставке/burst
let _justDelivered = false;       // блокирует click после mouseup с _deliverSym

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
// BG рендерится через <img class="scene-bg"> c object-fit:cover — AR фона
// сохраняется. Все канвас-координаты должны считаться через _bgR, иначе
// герой «висит в воздухе» относительно фона на не-16:9 вьюпортах.
// Формула — в src/zones.js, эти обёртки фиксируют _bgR/BG_W/BG_H закрытием.
const bgToCanvas = (bgX, bgY) => _bgToCanvasShared(bgX, bgY, _bgR, BG_W, BG_H);
const canvasToBG = (cx, cy)   => _canvasToBGShared(cx, cy, _bgR, BG_W, BG_H);
function hitZoneBG(cx, cy) {
  const { x: bx, y: by } = canvasToBG(cx, cy);

  // Клик по надписи — только в медитации. ВСЕГДА узкая полоска рун
  // (INSCRIPTION_TARGET), и до и после активации. Раньше после активации
  // хит-зона расширялась на весь спрайт (~24% × 33% экрана) — и любой
  // случайный тап по статуе/воде/мимо символа открывал scene4. Теперь
  // зона ровно там, где сама надпись: бьёшь по рунам — открывается.
  if (hero.praying || meditationPhase > 0) {
    const t = INSCRIPTION_TARGET;
    if (bx >= t.x && bx < t.x + t.w && by >= t.y && by < t.y + t.h)
      return 'inscription';
  }
  // Поиск зоны через общий hitZoneAtBG — фильтр условий передаётся колбэком.
  // inscription/dirt — служебные (inscription уже проверена выше; dirt живёт
  // как «зона земли» только пока кот её зарывает, отдельным флоу).
  return hitZoneAtBG(bx, by, ZONES_BG, name =>
    name === 'inscription' || name === 'dirt' ||
    (name === 'bush' && S.stickPickedUp) ||
    (name === 'cat'  && catHidden)
  );
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
// Базовые sit/stand живут в src/meditation.js. Сцена дополняет их своим
// контекстом (символы, частицы, кот-сидячка и т.д.) через cleanup/onSit hooks.
export function standUp() {
  _standUpCommon(hero, {
    onTrack: () => { if (hero.praying) trackStandUp(); },
    cleanup: () => {
      meditationPhase = 0;
      fx.clear();        // pSyms + drag
      dust.clear();      // dissolve-частицы
    },
  });
}

function sitDown() {
  _sitDownCommon(hero, {
    onTrack: () => trackSitDown(),
    onSit: () => {
      // Off-script: сел прямо на кота (кот виден и x-боксы пересекаются)
      if (!catHidden) {
        const heroLeft  = hero.x - HERO_STAND_W / 2;
        const heroRight = hero.x + HERO_STAND_W / 2;
        const catLeft   = CAT_X;
        const catRight  = CAT_X + CAT_W;
        if (heroRight > catLeft && heroLeft < catRight) trackSitOnCat();
      }
    },
  });
}

// Принудительно включить/выключить медитацию извне (вызывается из inside.js,
// когда игрок возвращается из дупла — по сюжету он остаётся в медитативном
// состоянии). НЕ toggle.
export function setMeditating(on = true) {
  _setMeditatingCommon(hero, on, {
    onTrack: () => { if (hero.praying) trackStandUp(); },
    cleanup: () => {
      meditationPhase = 0;
      fx.clear();
      dust.clear();
    },
  });
}

// Spawn символа над головой героя. Координаты — canvas (через bgToCanvas).
function _spawnSym() {
  if (!hero.praying) return;
  const p = bgToCanvas(hero.x, hero.y - HERO_STAND_H * 0.8);
  fx.spawn(p.x, p.y);
}
// Tick символов делает fx.tick() — один и тот же путь/скорость для всех сцен.

// ── Monk meditation dialogue ──────────────────────────────────────────────
// Запускается один раз: герой сидит + клик по монаху = философский разговор.
// После — в инвентаре появляется гибискус.
function _startMonkDialog() {
  if (isStoryActive(msgEl)) return;

  showChoiceIn(msgEl,
    'Монах открывает глаза. Медленно — будто продолжая прерванный разговор.\n— Что не отпускает?',
    [{ text: 'Прошлое' }, { text: 'Страх' }, { text: 'Важное' }],
    val => {
      const r1 = MONK_Q1_RESP[val] ?? 'Ты держишь. Это уже ответ.';
      showMsgIn(msgEl, r1, {
        story: true, dur: 4200,
        onDismiss: () => {
          if (state.activeScreen !== SCREENS.MAIN) return;
          showChoiceIn(msgEl,
            'Он кивает, не открывая глаз.\n— А что ты делаешь, когда оно приходит?',
            [{ text: 'Думаю' }, { text: 'Отгоняю' }, { text: 'Жду' }],
            val2 => {
              const r2 = MONK_Q2_RESP[val2] ?? 'Что бы ты ни делал — ты делаешь.';
              showMsgIn(msgEl, r2, {
                story: true, dur: 4200,
                onDismiss: () => {
                  if (state.activeScreen !== SCREENS.MAIN) return;
                  showChoiceIn(msgEl,
                    'Голос монаха становится тише.\n— И последнее. Ты бы отпустил — если бы мог?',
                    [{ text: 'Да' }, { text: 'Не знаю' }, { text: 'Хочу, но не могу' }],
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
                              trackMonkDialogDone();
                              saveMain();
                              if (!addItem(makeItem('flower'))) {
                                showMsg('Инвентарь полон. Освободи место — гибискус ждёт.');
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
    // и только ПОСЛЕ активации ≥2 камней (иначе у героя нет запроса).
    if (zone === 'monk' && !S.monkDialogDone) {
      const rocks = SaveManager.getScene('scene2')?.rockStates ?? {};
      const activated = Object.values(rocks).filter(Boolean).length;
      if (activated >= 2) {
        _startMonkDialog();
        return;
      }
      // <2 камней: разовая story-подсказка, дальше — MEDITATE_MSGS.monk ниже.
      if (!S.monkHintShown) {
        S.monkHintShown = true;
        saveMain();
        showMsg(MONK_NEED_ROCKS_MSG, { story: true, dur: 4200 });
        return;
      }
      // fallthrough: ниже сработает стандартная MEDITATE_MSGS.monk
    }

    const k = `meditate:${zone}`;
    interactCounts[k] = (interactCounts[k] ?? 0) + 1;
    // Клик по коту — тот же мягкий чик-чик и в медитации тоже.
    if (zone === 'cat') AudioSystem.playCatChirp?.();

    // Надпись — специальная обработка ДО общего MEDITATE_MSGS.
    if (zone === 'inscription') {
      if (S.inscriptionReady) { openScene('scene4'); return; }
      // До активации — циклический флейвор.
      showMsg(INSCRIPTION_MSGS[interactCounts[k] % INSCRIPTION_MSGS.length]);
      return;
    }

    const arr = MEDITATE_MSGS[zone];
    if (arr) { showMsg(arr[interactCounts[k] % arr.length]); return; }
    return;
  }

  if (zone === 'bush')   { pickUpStick(); return; }
  if (zone === 'statue') { openScene('buddha'); return; }
  if (zone === 'tree')   { openScene('scene2'); return; }

  if (zone === 'cat') {
    // Обычный клик по коту — мягкий чик-чик. Громкий мяв (playCatMeow)
    // теперь только для активации дурианом (см. interactItem ниже).
    AudioSystem.playCatChirp?.();
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
    // В медитации — кот не принимает. Это не момент для даров.
    if (hero.praying || meditationPhase > 0) {
      showMsg('Не сейчас. Кот чувствует тишину — и не принимает шумных даров.');
      return;
    }
    const slot = state.inventory.findIndex(i => i?.id === 'durian');
    removeItem(slot);
    renderHotbar();
    AudioSystem.playCatMeow();
    startBury();
    return;
  }

  // Банка с водой на кота — кот шипит и исчезает. Появится при возвращении.
  // Сама вода в банке при этом остаётся: ты не выплеснул всё, ты только
  // плеснул — кот проворнее.
  if ((itemId === 'jar' || itemId === 'jar_open') && item?.hasWater && zone === 'cat') {
    AudioSystem.playCatHiss?.();
    catHidden = true;
    trackCatHiss();
    showMsg('Кота может обидеть каждый.');
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
    trackWaterJar();
    showMsg('Ты зачерпнул воды. Банка стала тяжелее.');
    return;
  }

  // Item × надпись — отдельная таблица флейвора. Предмет не тратится.
  if (zone === 'inscription') {
    const msg = INSCRIPTION_ITEM_MSGS[itemId];
    if (msg) { showMsg(msg); return; }
  }

  const msg = getZoneMsg(itemId, zone, item);
  if (msg) showMsg(msg);
}

// ── onTap ──────────────────────────────────────────────────────────────────
function onTap(cx, cy) {
  if (_justDelivered) { _justDelivered = false; return; }
  if (state.activeScreen !== SCREENS.MAIN) return;
  trackSpotClick(cx, cy, 'main');

  if (fx.getDragSym()) {
    if (_dragMoved && _pointInInscriptionTarget(cx, cy) && (hero.praying || meditationPhase > 0)) {
      _deliverSym();
    }
    fx.endDrag();
    _dragMoved = false;
    return;
  }

  const item = getSelectedItem();
  const zone = hitZoneBG(cx, cy);

  if (item && zone) { interactItem(item.id, zone); return; }
  if (zone)         { zoneClick(zone); return; }

  // Empty click: walk to clicked position. Helper из src/hero.js — он
  // выставляет targetX/walking/facing с учётом границ.
  if (!hero.praying) {
    const { x: bgX } = canvasToBG(cx, cy);
    setHeroTarget(hero, bgX, { minX: 80, maxX: BG_W - 80 });
  }
  trackEmptyClick();
}

// Отслеживаем, было ли реальное перетаскивание (мышь/палец двигались).
// Без движения — это тап/клик и доставка НЕ происходит.
let _dragStartX = 0, _dragStartY = 0, _dragMoved = false;
const _DRAG_THRESHOLD = INPUT.DRAG_THRESHOLD_PX;

function onDragStart(cx, cy) {
  if (state.activeScreen !== SCREENS.MAIN) return;
  if (!hero.praying && meditationPhase <= 0) return;
  const sym = fx.findSymAt(cx, cy);
  if (sym) {
    fx.startDrag(sym);
    _dragStartX = cx; _dragStartY = cy;
    _dragMoved = false;
    return;
  }
  // Не зацепили символ — проверяем попадание по надписи. Если попали,
  // запускаем «дёрганье» букв пока зажата кнопка. Мгновенный толчок
  // 0.9 чтобы даже короткий клик заметно тряхнул символы.
  // ВАЖНО: после активации надпись — это кнопка в scene4, а не игрушка
  // для тряски. Поэтому shake работает ТОЛЬКО пока !inscriptionReady.
  if (_pointInInscription(cx, cy) && !S.inscriptionReady) {
    _inscriptionHeld = true;
    _inscriptionTwitch = Math.min(1, _inscriptionTwitch + 0.9);
  }
}

// ── Inscription hold → twitch летящих символов ────────────────────────────
// Клик/касание по надписи заставляет символы, летящие от монаха,
// чуть-чуть подёргиваться. Зажал — подёргивание усиливается.
let _inscriptionHeld   = false;
let _inscriptionTwitch = 0;   // 0..1 — текущая энергия дрожания

function _pointInInscription(cx, cy) {
  // Надпись видима только в медитации — иначе дёргать нечего
  if (meditationPhase <= 0) return false;
  // Конвертим клик в BG-координаты (cover-aware) и проверяем в них.
  // Ограничиваем по верхней половине сприта (где сами руны), чтобы
  // водное отражение внизу не ловило клики.
  const { x: bx, y: by } = canvasToBG(cx, cy);
  const o = INSCRIPTION_OVERLAY;
  return bx >= o.x && bx < o.x + o.w && by >= o.y && by < o.y + o.h * 0.6;
}

// Зона доставки символа — узкая полоска рун внутри спрайта.
// Заменяет старую радиальную проверку (INSCRIPTION_HIT_R).
function _pointInInscriptionTarget(cx, cy) {
  if (meditationPhase <= 0) return false;
  const { x: bx, y: by } = canvasToBG(cx, cy);
  const t = INSCRIPTION_TARGET;
  return bx >= t.x && bx < t.x + t.w && by >= t.y && by < t.y + t.h;
}

// Проверить, попадает ли точка по живому символу (для курсора)
function _hitSym(cx, cy) {
  if (!hero.praying && meditationPhase <= 0) return false;
  return fx.hitTest(cx, cy);
}

function onDragMove(cx, cy) {
  if (fx.getDragSym()) {
    fx.dragMove(cx, cy);
    if (!_dragMoved &&
        Math.hypot(cx - _dragStartX, cy - _dragStartY) > _DRAG_THRESHOLD) {
      _dragMoved = true;
    }
  }
}

// Dissolve burst: стартуют у точки (px,py), летят с homing'ом к центру рун,
// по пути затухают. Универсальная функция dust.spawnHomingBurst — используется
// и для обычной доставки, и для post-ready тапа/дропа.
function _spawnDissolveFrom(px, py, color, count = 80) {
  const tx  = INSCRIPTION_TARGET.x + INSCRIPTION_TARGET.w / 2;
  const ty  = INSCRIPTION_TARGET.y + INSCRIPTION_TARGET.h / 2;
  const tp  = bgToCanvas(tx, ty);
  const scale = Math.min(_bgR.w / BG_W, _bgR.h / BG_H);
  dust.spawnHomingBurst({
    fromX: px, fromY: py,
    toX: tp.x, toY: tp.y,
    color, count, scale,
  });
}

// Единственная точка доставки/поглощения символа на надписи.
// Раньше было три функции с разным поведением (_deliverSym до активации,
// _absorbSymPostReady после, _onSymDropStatue для зоны-статуи, плюс
// wantMoreSounds/statueSymDrops счётчики и хинт-подсказка). Всё это
// заменено одной простой логикой:
//   • ВСЕГДА играет тон по цвету символа (разные голоса пентатоники)
//   • ВСЕГДА спавнит dissolve-частицы
//   • ВСЕГДА убирает символ из pSyms
//   • Пока не активирована — инкрементит charge; на 5 → активация +
//     мерцание сильнее + финальный burst.
//   • После активации — только звук и анимация, без счётчиков и хинтов.
function _deliverSym() {
  const sym = fx.getDragSym();
  if (!sym) return;
  const symX  = sym.x, symY = sym.y;
  const symCol = sym.color ?? '#c8aaff';

  fx.removeSym(sym);

  AudioSystem.playSymbolTone?.(PURPLE_PALETTE.indexOf(symCol));
  _spawnDissolveFrom(symX, symY, symCol, 80);
  trackSymbolDelivered();

  if (!S.inscriptionReady) {
    S.inscriptionCharge = Math.min(S.inscriptionCharge + 1, 5);
    inscriptionGlow     = 1.0;   // короткая вспышка поверх dim
    if (S.inscriptionCharge >= 5) {
      S.inscriptionReady = true;
      trackInscriptionReady();
      inscriptionGlow    = 2.0;
      // Финальный сфокусированный burst — из центра надписи наружу.
      const tp2 = bgToCanvas(
        INSCRIPTION_TARGET.x + INSCRIPTION_TARGET.w / 2,
        INSCRIPTION_TARGET.y + INSCRIPTION_TARGET.h / 2);
      const scale = Math.min(_bgR.w / BG_W, _bgR.h / BG_H);
      dust.spawnRadialBurst({ x: tp2.x, y: tp2.y, count: 40, scale });
    }
    saveMain();
  }
}

// ── Animation loop ─────────────────────────────────────────────────────────
let animId = null;
let tick   = 0;

function animate() {
  if (state.activeScreen !== SCREENS.MAIN) { animId = null; return; }
  ctx.clearRect(0, 0, W, H);
  tick++;

  // Background рисуется CSS-ом через <img id="main-bg" object-fit:cover>.
  // Canvas поверх, прозрачный. Все канвас-сущности считаются в cover-
  // координатах _bgR (шкала _bgR.w/BG_W, сдвиг _bgR.x/_bgR.y).

  const sx = _bgR.w / BG_W, sy = _bgR.h / BG_H;

  // ── Inscription overlay (видна только в медитации) ──────────────────────
  // Базовый слой — ВСЕГДА dim. Сверху — bright с модулированной alpha:
  //   • до активации: inscriptionGlow вспыхивает на каждой доставке
  //     и затухает к 0 → эффект короткого мерцания.
  //   • после активации (inscriptionReady): синусоидальный непрерывный
  //     пульс 0.55..1.0 → надпись «дышит», никогда не гаснет полностью.
  if (meditationPhase > 0 && inscriptionDimImg.complete && inscriptionDimImg.naturalWidth) {
    const ox = _bgR.x + INSCRIPTION_OVERLAY.x * sx;
    const oy = _bgR.y + INSCRIPTION_OVERLAY.y * sy;
    const ow = INSCRIPTION_OVERLAY.w * sx;
    const oh = INSCRIPTION_OVERLAY.h * sy;
    ctx.globalAlpha = meditationPhase;
    ctx.drawImage(inscriptionDimImg, ox, oy, ow, oh);

    if (inscriptionBrightImg.complete && inscriptionBrightImg.naturalWidth) {
      let brightAlpha;
      if (S.inscriptionReady) {
        // Постоянное мерцание: пульс 0.55..1.0 — зажигается и затухает,
        // но не полностью (min 0.55 → дно пульса всё ещё ярко).
        brightAlpha = 0.775 + 0.225 * Math.sin(tick * 0.045);
      } else {
        // До активации — вспышка только на доставке.
        brightAlpha = inscriptionGlow;
      }
      if (brightAlpha > 0.01) {
        ctx.globalAlpha = meditationPhase * brightAlpha;
        ctx.drawImage(inscriptionBrightImg, ox, oy, ow, oh);
      }
    }
    ctx.globalAlpha = 1;
  }

  // ── Hero movement (общая логика из src/hero.js) ─────────────────────────
  // mv.edge === 'left'|'right' срабатывает только в момент, когда монах
  // УПЁРСЯ в границу, удерживая клавишу в ту сторону. Для main это значит:
  // дошёл пешком до левого края + жмёт влево → переход на сцену достижений.
  // Условие _canEdgeNav() то же, что и для клик-navigation: без медитации,
  // без драга символа, без story-сообщения.
  //
  // enterAt прокидывается в целевую сцену: OPPOSITE_EDGE[mv.edge] —
  // монах зайдёт в новую сцену с противоположного края, создавая
  // визуальное ощущение непрерывного перехода «через край экрана».
  const mv = tickHeroMove(hero, keysHeld, { minX: 80, maxX: BG_W - 80 });
  if (mv.edge && _MAIN_NAV[mv.edge]?.scene && _canEdgeNav()) {
    openScene(_MAIN_NAV[mv.edge].scene, { enterAt: OPPOSITE_EDGE[mv.edge] });
  }

  // ── Fireflies: yellow pixel rects with glow ──────────────────────────────
  for (const f of flies) {
    f.x += f.vx; f.y += f.vy;
    f.brightness += f.bv;
    if (f.brightness < 0 || f.brightness > 1) f.bv *= -1;
    if (f.x < 0) f.x = BG_W; if (f.x > BG_W) f.x = 0;
    if (f.y < 0) f.y = BG_H * 0.5; if (f.y > BG_H * 0.5) f.y = 0;
    const alpha = 0.4 + f.brightness * 0.6;
    const px    = Math.round(_bgR.x + f.x * sx);
    const py    = Math.round(_bgR.y + f.y * sy);
    const fsz   = Math.max(1, Math.round(f.sz * sx));
    ctx.save();
    ctx.shadowColor = `rgba(255,210,40,${alpha})`;
    ctx.shadowBlur  = (18 + f.brightness * 28) * (f.glow ?? 1.0) * sx;
    ctx.fillStyle   = `rgba(255,220,80,${alpha})`;
    ctx.fillRect(px, py, fsz, fsz);
    ctx.restore();
  }

  // ── Cat ───────────────────────────────────────────────────────────────────
  // catHidden=true — кот ушёл после обиды. Вернётся при повторном входе в main.
  if (!catHidden) {
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
  // Общий drawHero() из src/hero.js. Сдвигаем canvas в cover-origin
  // (_bgR.x,_bgR.y) — drawHero внутри считает через sx/sy от 0,0.
  ctx.save();
  ctx.translate(_bgR.x, _bgR.y);
  drawHero(ctx, hero, sx, sy, tick);
  ctx.restore();

  // ── Cat burying timer ─────────────────────────────────────────────────────
  if (catBurying) {
    catBuryTimer++;
    if (catBuryTimer > 180) {
      catBurying = false;
      addItem(makeItem('dirt'));
      AudioSystem.playPickup();
      renderHotbar();
      trackCatBury();
      showMsg(catBuryDoneMsg);
      saveMain();
    }
  }

  // ── Meditation overlay ────────────────────────────────────────────────────
  // Все апдейты состояния — через src/anims.js (phaseToward / pumpDecay).
  meditationPhase    = phaseToward(meditationPhase, hero.praying, 0.015);
  // Дрожание надписи: зажата кнопка — быстро растёт, отпущена — экспа-затухает.
  _inscriptionTwitch = pumpDecay(_inscriptionTwitch,
                                 _inscriptionHeld && meditationPhase > 0,
                                 0.15, 0.93);

  if (meditationPhase > 0) {
    drawMeditationOverlay(ctx, W, H, meditationPhase);

    if (hero.praying) {
      if (tick % 22 === 0) _spawnSym();
      if (tick % 22 === 11 && Math.random() < 0.45) _spawnSym();
    }
    fx.tick();

    // Jitter (дрожание) + sway (мягкое качание) — амплитуды от _inscriptionTwitch.
    const jitterPx = _inscriptionTwitch * 24 * sx;
    const swayPx   = _inscriptionTwitch * 8  * sx;

    fx.draw(ctx, { sx, sy, phase: meditationPhase, jitterPx, swayPx, tick });

    // Sparkle particles — homing dissolve при доставке + radial burst при ready.
    dust.tick();
    dust.draw(ctx, { phase: meditationPhase });

    inscriptionGlow = decay(inscriptionGlow, 0.02);
  }

  animId = requestAnimationFrame(animate);
}

// ── Keyboard ───────────────────────────────────────────────────────────────
// Общие helpers из src/hero.js — одни и те же клавиши во всех сценах.
function _onKey(e) {
  if (state.activeScreen !== SCREENS.MAIN) return;
  const act = meditationKeyAction(e.key);
  if (act === 'sit')   sitDown();
  if (act === 'stand') standUp();
}

// ── Edge navigation (левый край → сцена достижений) ───────────────────────
// Только когда герой свободен: не в медитации, без драга символа, без story.
// Вертикальный диапазон — верхние 65 % высоты, чтобы не перекрывать куст
// в нижнем-левом углу (bush). Ширина — 60 px от края.
//
// _MAIN_NAV — таблица для walk-to-edge auto-nav (herой дошёл пешком до края).
// Для клика / стрелки у курсора используется _isLeftEdge (с ограничением
// по верхним 65% высоты, чтобы не мешать кусту в нижнем углу).
const _EDGE_LEFT_PX = 60;
const _MAIN_NAV = { left: { scene: 'achievements' } };
// NOTE: раньше проверяли `meditationPhase <= 0` — но phase затухает ~800ms
// после standUp(), и edge-nav в этом окне не срабатывал. standUp/leaveMain
// чистят fx/dust, так что переход во время fade-out безопасен.
function _canEdgeNav() {
  return !hero.praying && !fx.getDragSym() && !isStoryActive(msgEl);
}
function _isLeftEdge(cx, cy) {
  if (!_canEdgeNav()) return false;
  if (cx > _EDGE_LEFT_PX) return false;
  if (cy > H * 0.65)      return false;
  return true;
}

// ── resumeMain — вызывается из closeScene* чтобы перезапустить loop ───────
// opts.enterAt — если задано 'left' / 'right', герой ставится у
// соответствующего края main (с соответствующим facing). Это работает
// только для edge-nav переходов; обычное закрытие сцены через back-button
// передаёт пустой opts и герой остаётся там, где был.
export function resumeMain(opts = {}) {
  // Фиксируем возврат на main: F5 теперь не будет бросать назад в закрытую сцену.
  SaveManager.global.lastScene = 'main';
  SaveManager.save();
  // Кот возвращается при любом повторном входе — обида кота не постоянная.
  catHidden = false;
  // Enter без наведения на край — переход на achievements (через левый край
  // main → enterAt 'right' в achievements).
  setDefaultEnterFor('main', 'achievements', 'right');

  // Edge-spawn: при переходе через границу экрана монах спаунится на
  // соответствующем крае main, чтобы визуально «войти из-за кадра».
  // Helper из src/hero.js — раньше каждая сцена писала эти 10 строк сама.
  spawnHeroAtEdge(hero, opts.enterAt, BG_W, { margin: 80 });

  // Pray-кнопка — top-level фиксированная, видна только в сценах с ходячим
  // героем/монахом. Включаем на resume (возврат из соседней сцены).
  setMeditateBtn(true);

  if (state.activeScreen === SCREENS.MAIN && !animId) animate();
}

// ── leaveMain ─────────────────────────────────────────────────────────────
export function leaveMain() {
  standUp();
  fx.endDrag();
  setEdgeNavTarget(null);
  // Скрываем pray-кнопку — целевая сцена включит её сама, если поддерживает.
  setMeditateBtn(false);
  // Прерываем анимацию закопки землёй: иначе при возврате в main тик-счётчик
  // дотянется до 180 и выстрелит stale сообщение/подарок земли.
  if (catBurying) { catBurying = false; catBuryTimer = 0; }
  // Сброс зажатых клавиш: если игрок зашёл в соседнюю сцену через край,
  // удерживая →, keyup по возвращении уже не прилетит, и монах застрянет в
  // бесконечном движении. Чистим всё состояние.
  for (const k in keysHeld) keysHeld[k] = false;
}

// ── Init ───────────────────────────────────────────────────────────────────
export async function initMain() {
  canvas = document.getElementById('main-canvas');
  msgEl  = document.getElementById('main-msg');
  bgImg  = document.getElementById('main-bg');
  if (!canvas || !msgEl) {
    console.error('main.js: missing #main-canvas or #main-msg');
    return;
  }
  ctx = canvas.getContext('2d');
  setHotbarMsgEl(msgEl);

  // Enter на главной без наведения на край → переход в achievements.
  // enterAt 'right' — монах войдёт в achievements с правого края (т.е.
  // логически вышел через левый край main).
  setDefaultEnterFor('main', 'achievements', 'right');

  // Pray button — только на мобильном (скрыт на десктопе через CSS).
  // Работает как диспетчер: бросает событие 'app:meditate' и каждая сцена,
  // поддерживающая медитацию, слушает его сама.
  document.getElementById('pray-btn')?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('app:meditate'));
  });
  window.addEventListener('app:meditate', () => {
    if (state.activeScreen === SCREENS.MAIN) sitDown();
  });

  // Resize. Кэшируем canvas rect — его читают все event handlers и при 60fps
  // mousemove это форсит layout на каждый кадр. Обновляем только на resize
  // и scroll (ios toolbar skims viewport).
  let _cRect = { left: 0, top: 0 };
  function resize() {
    const wrap = document.getElementById('wrap');
    W = canvas.width  = wrap.offsetWidth;
    H = canvas.height = wrap.offsetHeight;
    _cRect = canvas.getBoundingClientRect();
    // Пересчитываем cover-rect фона. Всё что рисуется на canvas должно
    // через него считаться, иначе герой «плавает» относительно фона.
    _bgR = coverRect(W, H, BG_W, BG_H);
  }
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('scroll', () => { _cRect = canvas.getBoundingClientRect(); }, { passive: true });

  // Blur — сбросить залипший drag при переключении вкладки
  window.addEventListener('blur', () => { fx.endDrag(); });

  // Mouse events — используют кэшированный _cRect, не вызывая getBoundingClientRect
  canvas.addEventListener('click', e => {
    const cx = e.clientX - _cRect.left, cy = e.clientY - _cRect.top;
    // Левый край → сцена достижений (перехватываем ДО onTap).
    // enterAt 'right' — герой войдёт в ach с правого края.
    if (_isLeftEdge(cx, cy)) { openScene('achievements', { enterAt: 'right' }); return; }
    onTap(cx, cy);
  });
  canvas.addEventListener('mousedown', e => {
    onDragStart(e.clientX - _cRect.left, e.clientY - _cRect.top);
  });
  canvas.addEventListener('mousemove', e => {
    if (state.activeScreen !== SCREENS.MAIN) return;
    const cx = e.clientX - _cRect.left, cy = e.clientY - _cRect.top;
    onDragMove(cx, cy);
    // Приоритет: левый край > зоны/символы
    if (_isLeftEdge(cx, cy))                 {
      setEdgeNavTarget('achievements', 'right');
      setCursor('left');
      return;
    }
    setEdgeNavTarget(null);
    // Pointer cursor over clickable zones OR meditation symbols
    setCursor(hitZoneBG(cx, cy) || _hitSym(cx, cy));
  });
  canvas.addEventListener('mouseup', e => {
    _inscriptionHeld = false;   // отпустили «зажатие» надписи
    if (!fx.getDragSym()) return;
    const cx = e.clientX - _cRect.left, cy = e.clientY - _cRect.top;
    // Цель доставки — кусочек рун в спрайте (INSCRIPTION_TARGET).
    if (_dragMoved && _pointInInscriptionTarget(cx, cy) && (hero.praying || meditationPhase > 0)) {
      _deliverSym();
      _justDelivered = true;
    }
    // Drop мимо надписи — символ просто отпускается и продолжает летать.
    fx.endDrag();
    _dragMoved = false;
  });
  canvas.addEventListener('mouseleave', () => {
    setCursor(false);
    setEdgeNavTarget(null);
    _inscriptionHeld = false;
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
    if (fx.getDragSym()) {
      fx.dragMove(cx, cy);
      if (_dragMoved && _pointInInscriptionTarget(cx, cy) && (hero.praying || meditationPhase > 0)) {
        _deliverSym();
      }
      fx.endDrag();
      _dragMoved = false;
    } else if (_isLeftEdge(cx, cy)) {
      openScene('achievements', { enterAt: 'right' });
    } else {
      onTap(cx, cy);
    }
    _inscriptionHeld = false;   // touch release
  }, { passive: false });

  document.addEventListener('keydown', e => { keysHeld[e.key] = true; _onKey(e); });
  document.addEventListener('keyup',   e => { keysHeld[e.key] = false; });

  // Перезапуск анимации после скрытия вкладки — общий helper.
  onSceneVisible(makeIsActiveCheck(SCREENS.MAIN), () => { if (!animId) animate(); });

  // Ждём загрузки всех спрайтов — чтобы сцена появилась без рывков.
  // bgImg — DOM-картинка из index.html, браузер загружает её параллельно,
  // здесь только ждём complete (если ещё не готова).
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
  // Pray-кнопка — top-level фиксированная UI, видна только в сценах с
  // ходячим героем/монахом. main — стартовая сцена, показываем сразу.
  setMeditateBtn(true);
  animate();
}
