// scenes/achievements.js — сцена-полка для ачивок.
// Переход: левый край главной сцены → эта сцена (стрелка влево → стрелка вправо обратно).
// Внутри: герой ходит как по главной (WASD/клик), клик по полке → пикер ачивок
// (есть опция «поставить всё»). Расставленные ачивки можно перетаскивать между
// полками и слотами. Сохраняется в SaveManager. Медитация через кнопку мы (как
// и на главной) — hero_sit подменяется, wasd прекращает.

import { state }                                            from '../src/state.js';
import { SCREENS }                                          from '../src/constants.js';
import { showMsgIn }                                         from '../src/ui/messages.js';
import { showLoading, hideLoading, showError,
         setMeditateBtn }                                    from '../src/ui/overlays.js';
import { setCursor }                                         from '../src/ui/cursor.js';
import { edgeNavMode, tryEdgeNavClick,
         setDefaultEnterFor, OPPOSITE_EDGE }                 from '../src/edge-nav.js';
import { leaveMain, resumeMain }                            from './main.js';
import { SaveManager, useSceneState }                       from '../src/save.js';
import { ACHIEVEMENT_DEFS, getUnlockedIds,
         getAchievementById, trackShelfVisit }              from '../src/achievements.js';
import { renderAchIconByKey }                               from '../src/icons/achievements.js';
import { ASSET }                                            from '../src/assets.js';
import { waitImg, coverRect, hitZone as rectHitZone,
         buildSceneDOM }                                    from '../src/scene-base.js';
import { AudioSystem }                                      from '../src/audio.js';
import { openScene }                                        from '../src/nav.js';
import { makeHero, tickHeroMove, drawHero,
         meditationKeyAction, isWalkKey,
         heroOptsForBG, groundYForBG,
         spawnHeroAtEdge, setHeroTarget }                   from '../src/hero.js';
import { createMeditationFx, drawMeditationOverlay,
         updateMeditationPhase }                            from '../src/meditation-fx.js';
import { sitDown as _sitDownCommon,
         standUp as _standUpCommon }                         from '../src/meditation.js';

// ── Scene persistent state ─────────────────────────────────────────────────
// S.placed: { [achId]: { shelf: 0|1|2, slot: 0..SLOTS_PER_SHELF-1 } }
const [S, saveAch] = useSceneState('achievements', { placed: {} });

// ── BG geometry ────────────────────────────────────────────────────────────
// shelf.png: 1376×775 — реестр в src/scene-defs.js
import { SCENE_DEFS } from '../src/scene-defs.js';
const { bgW: BG_W, bgH: BG_H } = SCENE_DEFS.achievements;

// ── Shelves (нормализованные 0..1 относительно BG) ─────────────────────────
// Внутреннее пространство шкафа на shelf.png (1376×775) — между дверцами,
// ровно там где деревянные горизонтальные планки. Координаты измерены
// pixel-picker'ом по самому файлу shelf.png (детект тёплых коричневых
// пикселей поперёк BG), чтобы иконки стояли НА планке-полке.
//
// Реальные верхушки планок в shelf.png:
//   верхняя  планка: y ≈ 297 px / 775 → frac 0.383
//   средняя  планка: y ≈ 422 px / 775 → frac 0.545
//   нижняя   планка: y ≈ 536 px / 775 → frac 0.692
//
// fx/fw — горизонтальный диапазон полки (между внутренними боковинами);
// fy/fh — вертикальный ящик для хит-теста клика. Нижний край ящика
// (fy + fh) = SHELF_FLOOR_Y[i] — это линия планки, куда «ставится» дно
// иконки. Сами ящики покрывают пространство ОТ предыдущей планки (или
// верха интерьера для первой) ДО своей планки.
const SHELVES = [
  { fx: 0.395, fy: 0.230, fw: 0.210, fh: 0.153 }, // верхняя  → floor 0.383
  { fx: 0.395, fy: 0.383, fw: 0.210, fh: 0.162 }, // средняя  → floor 0.545
  { fx: 0.395, fy: 0.545, fw: 0.210, fh: 0.147 }, // нижняя   → floor 0.692
];

// Y-координата «пола» каждой полки (в BG-норм). Иконка центрируется на
// floorY - size/2, то есть её нижний край — ровно на SHELF_FLOOR_Y[i].
// Значения — точно верхушки планок shelf.png (см. коммент выше).
const SHELF_FLOOR_Y = [0.383, 0.545, 0.692];

// 10 слотов на полку → 30 мест. Иконок сейчас 31 — одна может остаться
// «в руках», игрок перетаскивает. Большие слоты → иконки читаемее.
const SLOTS_PER_SHELF = 10;

// ── Hero ───────────────────────────────────────────────────────────────────
// Спрайты/движение/клавиши — из src/hero.js. Размер монаха пропорционален
// BG shelf.png (775 px высотой) — визуально такой же как на главной
// (BG 1116 px). Без этого монах в кадре казался бы в 1.44× больше.
//
// Ground plane: монах рисуется на доле 0.824 высоты viewport — точно
// той же, что и на главной сцене (общая константа HERO_GROUND_RATIO
// в src/hero.js). Это НЕ совпадает с травой под шкафом на shelf.png
// (там 0.929), но это осознанное решение: при переходе main↔ach монах
// остаётся на той же линии экрана, ни фон, ни canvas не сдвигаются —
// поднимается только сам спрайт. Композиция шкафа не ломается.
const GROUND_Y_BG = groundYForBG(BG_H);    // ≈ 639 из 775 = 0.824 BG
const HERO_OPTS   = heroOptsForBG(BG_H);   // { standH, standW, sitH, sitW, leftYOff, frames }
const hero = makeHero({ x: BG_W - 240, y: GROUND_Y_BG });
hero.facing = 'left';

const keysHeld = {};

// ── Meditation particles ───────────────────────────────────────────────────
// Общий эффект — тайские символы плывут вверх. См. src/meditation-fx.js.
const fx = createMeditationFx();
let meditationPhase = 0;

// Базовые sit/stand — общие для main / achievements / tutorial. См. src/meditation.js.
// Сцена-специфичный cleanup тут — clear FX-частиц + сброс meditationPhase.
function sitDown() { _sitDownCommon(hero); }
function standUp() {
  _standUpCommon(hero, { cleanup: () => { fx.clear(); meditationPhase = 0; } });
}

// ── Edge navigation: правый край → назад на main ──────────────────────────
const NAV = { right: { scene: 'main' } };

// ── DOM ────────────────────────────────────────────────────────────────────
let el, canvas, ctx, msgEl;
let W = 0, H = 0;
const showMsg = (t, d) => showMsgIn(msgEl, t, d);

// ── Icon image cache — SVG → <img> через Blob, чтобы drawImage работал ────
const _iconImgCache = Object.create(null);
function getIconImg(iconKey) {
  if (_iconImgCache[iconKey]) return _iconImgCache[iconKey];
  const svg  = renderAchIconByKey(iconKey);
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const img  = new Image();
  img.src = url;
  _iconImgCache[iconKey] = img;
  return img;
}

// ── Zones / slots ──────────────────────────────────────────────────────────
function findShelf(cx, cy) {
  const R = coverRect(W, H, BG_W, BG_H);
  for (let i = 0; i < SHELVES.length; i++) {
    if (rectHitZone(cx, cy, SHELVES[i], R)) return i;
  }
  return null;
}

// Позиция слота в canvas-координатах. Иконки «стоят» на полу полки.
function slotPos(shelfIdx, slotIdx) {
  const R    = coverRect(W, H, BG_W, BG_H);
  const z    = SHELVES[shelfIdx];
  const x0   = R.x + z.fx * R.w;
  const w    = z.fw * R.w;
  const colW = w / SLOTS_PER_SHELF;
  const floorY = R.y + SHELF_FLOOR_Y[shelfIdx] * R.h;
  const size   = Math.min(colW * 0.95, R.h * 0.095);
  return {
    x:    x0 + colW * (slotIdx + 0.5),
    y:    floorY - size / 2,
    size,
  };
}

// Слот под точкой (cx,cy) на указанной полке
function slotAt(shelfIdx, cx, cy) {
  const R    = coverRect(W, H, BG_W, BG_H);
  const z    = SHELVES[shelfIdx];
  const x0   = R.x + z.fx * R.w;
  const w    = z.fw * R.w;
  const colW = w / SLOTS_PER_SHELF;
  const rel  = (cx - x0) / colW;
  if (rel < 0 || rel >= SLOTS_PER_SHELF) return null;
  return Math.floor(rel);
}

function occupantAt(shelfIdx, slotIdx) {
  for (const [id, p] of Object.entries(S.placed)) {
    if (p.shelf === shelfIdx && p.slot === slotIdx) return id;
  }
  return null;
}

function firstFreeSlot(preferredShelf) {
  const tryShelf = (s) => {
    for (let i = 0; i < SLOTS_PER_SHELF; i++) {
      if (!occupantAt(s, i)) return { shelf: s, slot: i };
    }
    return null;
  };
  if (preferredShelf != null) {
    const r = tryShelf(preferredShelf);
    if (r) return r;
  }
  for (let s = 0; s < SHELVES.length; s++) {
    if (s === preferredShelf) continue;
    const r = tryShelf(s);
    if (r) return r;
  }
  return null;
}

// ── Placement ──────────────────────────────────────────────────────────────
function placeOne(id, preferredShelf) {
  if (S.placed[id]) return false;
  const pos = firstFreeSlot(preferredShelf);
  if (!pos) {
    showMsg('Все полки заняты. Вот это коллекция.');
    return false;
  }
  S.placed[id] = pos;
  saveAch();
  AudioSystem.playPickup?.();
  return true;
}

function placeAll() {
  const unlocked = getUnlockedIds();
  const placedSet = new Set(Object.keys(S.placed));
  const available = unlocked.filter(id => !placedSet.has(id));
  let count = 0;
  for (const id of available) {
    if (placeOne(id, null)) count++;
  }
  if (count === 0) {
    showMsg('Все уже на местах.');
  } else {
    showMsg(`Поставил ${count}. Полки немного тяжелее.`);
  }
}

function removeOne(id) {
  if (!S.placed[id]) return;
  delete S.placed[id];
  saveAch();
  AudioSystem.playPickup?.();
}

// ── Picker — модальный диалог со всеми разблокированными ачивками ─────────
let _pickerEl = null;
function closePicker() {
  if (_pickerEl) {
    _pickerEl.classList.remove('visible');
    setTimeout(() => { _pickerEl?.remove(); _pickerEl = null; }, 240);
  }
}

function openPicker(shelfIdx) {
  const unlocked  = getUnlockedIds();
  const placedSet = new Set(Object.keys(S.placed));
  const available = unlocked.filter(id => !placedSet.has(id));

  if (unlocked.length === 0) {
    showMsg('Пока нечего ставить. Мир ещё не случился.');
    return;
  }
  if (available.length === 0) {
    showMsg('Всё уже на полках. Любуйся.');
    return;
  }

  if (_pickerEl) closePicker();

  _pickerEl = document.createElement('div');
  _pickerEl.className = 'ach-picker';
  _pickerEl.innerHTML = `
    <div class="ach-picker-backdrop"></div>
    <div class="ach-picker-inner">
      <div class="ach-picker-header">
        <span class="ach-picker-title">что поставить?</span>
        <button class="ach-picker-close" aria-label="Закрыть">✕</button>
      </div>
      <div class="ach-picker-grid"></div>
      <div class="ach-picker-footer">
        <button class="ach-picker-btn ach-picker-all">Поставить всё</button>
      </div>
    </div>`;

  const grid = _pickerEl.querySelector('.ach-picker-grid');
  available.forEach(id => {
    const def = getAchievementById(id);
    if (!def) return;
    const tile = document.createElement('button');
    tile.className = 'ach-picker-tile';
    tile.innerHTML = `
      <span class="ach-picker-icon">${renderAchIconByKey(def.iconKey)}</span>
      <span class="ach-picker-tile-title">${def.title}</span>`;
    tile.onclick = () => {
      placeOne(id, shelfIdx);
      const def2 = getAchievementById(id);
      showMsg(`${def2?.title ?? id} — на полке.`);
      closePicker();
    };
    grid.appendChild(tile);
  });

  _pickerEl.querySelector('.ach-picker-close').onclick  = closePicker;
  _pickerEl.querySelector('.ach-picker-backdrop').onclick = closePicker;
  _pickerEl.querySelector('.ach-picker-all').onclick = () => {
    placeAll();
    closePicker();
  };

  document.getElementById('wrap').appendChild(_pickerEl);
  requestAnimationFrame(() => _pickerEl.classList.add('visible'));
}

// ── Context: клик по уже поставленной иконке → детали и снятие ────────────
function iconAt(cx, cy) {
  for (const [id, p] of Object.entries(S.placed)) {
    const sp = slotPos(p.shelf, p.slot);
    const half = sp.size / 2;
    if (cx >= sp.x - half && cx <= sp.x + half &&
        cy >= sp.y - half && cy <= sp.y + half) return id;
  }
  return null;
}

function openIconDetail(id) {
  const def = getAchievementById(id);
  if (!def) return;
  if (_pickerEl) closePicker();

  _pickerEl = document.createElement('div');
  _pickerEl.className = 'ach-picker ach-picker--detail';
  _pickerEl.innerHTML = `
    <div class="ach-picker-backdrop"></div>
    <div class="ach-picker-inner">
      <div class="ach-picker-detail">
        <span class="ach-picker-detail-icon">${renderAchIconByKey(def.iconKey)}</span>
        <strong>${def.title}</strong>
        <span class="ach-picker-detail-desc">${def.desc}</span>
      </div>
      <div class="ach-picker-footer">
        <button class="ach-picker-btn ach-picker-remove">Снять с полки</button>
        <button class="ach-picker-btn ach-picker-close-btn">Оставить</button>
      </div>
    </div>`;

  _pickerEl.querySelector('.ach-picker-backdrop').onclick = closePicker;
  _pickerEl.querySelector('.ach-picker-close-btn').onclick = closePicker;
  _pickerEl.querySelector('.ach-picker-remove').onclick = () => {
    removeOne(id);
    showMsg('Снял. Можно поставить обратно.');
    closePicker();
  };

  document.getElementById('wrap').appendChild(_pickerEl);
  requestAnimationFrame(() => _pickerEl.classList.add('visible'));
}

// ── Drag-and-drop for placed icons ─────────────────────────────────────────
// _drag: { id, startX, startY, startShelf, startSlot, cx, cy, moved }
let _drag = null;
const DRAG_THRESHOLD = 6;

function beginDrag(id, cx, cy) {
  const p = S.placed[id];
  if (!p) return;
  _drag = {
    id,
    startX: cx, startY: cy,
    startShelf: p.shelf, startSlot: p.slot,
    cx, cy,
    moved: false,
  };
}

function moveDrag(cx, cy) {
  if (!_drag) return;
  _drag.cx = cx; _drag.cy = cy;
  if (!_drag.moved &&
      Math.hypot(cx - _drag.startX, cy - _drag.startY) > DRAG_THRESHOLD) {
    _drag.moved = true;
  }
}

function endDrag(cx, cy) {
  if (!_drag) return null;
  const d = _drag;
  _drag = null;
  if (!d.moved) return { id: d.id, click: true };

  // Drop: determine target shelf + slot
  const shelf = findShelf(cx, cy);
  if (shelf === null) {
    AudioSystem.playPickup?.();
    return null; // bounced — оставляем на исходном месте
  }
  const slot = slotAt(shelf, cx, cy);
  if (slot === null) {
    AudioSystem.playPickup?.();
    return null;
  }

  const occupant = occupantAt(shelf, slot);
  if (occupant === d.id) {
    AudioSystem.playPickup?.();
    return null;
  }
  if (occupant) {
    // swap
    S.placed[d.id] = { shelf, slot };
    S.placed[occupant] = { shelf: d.startShelf, slot: d.startSlot };
  } else {
    S.placed[d.id] = { shelf, slot };
  }
  saveAch();
  AudioSystem.playPickup?.();
  return null;
}

// ── Tap handler (вызывается если drag не был начат) ───────────────────────
async function onTap(e, cx, cy) {
  if (state.activeScreen !== SCREENS.ACHIEVEMENTS) return;

  // Edge nav — правый край возвращает на main
  if (await tryEdgeNavClick(el, e, NAV)) return;

  // Pray → stop
  if (hero.praying) { standUp(); return; }

  // Существующая иконка? → детали / снятие
  const iconId = iconAt(cx, cy);
  if (iconId) { openIconDetail(iconId); return; }

  // Полка? → пикер
  const shelf = findShelf(cx, cy);
  if (shelf !== null) { openPicker(shelf); return; }

  // Пустое место → шагаем. Конверсия через coverRect — иначе на не-16:9
  // вьюпортах клик мапится не в ту BG-точку. Helper setHeroTarget из hero.js.
  const R = coverRect(W, H, BG_W, BG_H);
  const bgX = (cx - R.x) * BG_W / R.w;
  setHeroTarget(hero, bgX, { minX: 120, maxX: BG_W - 120 });
}

// ── Animation ──────────────────────────────────────────────────────────────
let animId = null;
let tick   = 0;

function animate() {
  if (state.activeScreen !== SCREENS.ACHIEVEMENTS) { animId = null; return; }
  ctx.clearRect(0, 0, W, H);
  tick++;

  // Cover-rect BG (shelf.png — object-fit:cover на <img>). Все канвас-
  // рисования считаются в этих координатах — иначе герой «плавает»
  // относительно полок на не-16:9 вьюпортах.
  const R  = coverRect(W, H, BG_W, BG_H);
  const sx = R.w / BG_W, sy = R.h / BG_H;

  // ── Hero movement (общая логика из src/hero.js) ─────────────────────────
  // mv.edge срабатывает только в момент, когда монах УПЁРСЯ в границу,
  // удерживая клавишу в ту сторону. Если в эту сторону есть NAV-цель —
  // автоматически переходим, без клика.
  //
  // enterAt = OPPOSITE_EDGE[mv.edge] — герой зайдёт в целевую сцену с
  // противоположного края, чтобы переход ощущался «через границу экрана».
  const mv = tickHeroMove(hero, keysHeld, { minX: 120, maxX: BG_W - 120 });
  if (mv.edge && NAV[mv.edge]?.scene && !hero.praying) {
    openScene(NAV[mv.edge].scene, { enterAt: OPPOSITE_EDGE[mv.edge] });
  }

  // ── Placed achievement icons (кроме перетаскиваемой) ─────────────────────
  // slotPos() внутри уже считается через coverRect.
  for (const [id, p] of Object.entries(S.placed)) {
    if (_drag && _drag.id === id && _drag.moved) continue;
    const def = getAchievementById(id);
    if (!def) continue;
    const img = getIconImg(def.iconKey);
    if (!img.complete || !img.naturalWidth) continue;
    const sp = slotPos(p.shelf, p.slot);
    ctx.drawImage(img, sp.x - sp.size / 2, sp.y - sp.size / 2, sp.size, sp.size);
  }

  // ── Hero (общий drawHero с масштабированными размерами для shelf BG) ────
  // drawHero рисует от (0,0) canvas — сдвигаем origin в cover-rect, чтобы
  // герой вставал на ту же визуальную линию, что и фон.
  ctx.save();
  ctx.translate(R.x, R.y);
  drawHero(ctx, hero, sx, sy, tick, HERO_OPTS);
  ctx.restore();

  // ── Meditation: тёмный overlay + символы (общие из src/meditation-fx.js) ──
  // Та же палитра, тот же фон, та же анимация что и на главной — изменение
  // визуала медитации в одном месте автоматически распространяется на все сцены.
  meditationPhase = updateMeditationPhase(meditationPhase, hero.praying);
  drawMeditationOverlay(ctx, W, H, meditationPhase);
  if (hero.praying && tick % 24 === 0) {
    const px = R.x + hero.x * sx;
    const py = R.y + (hero.y - HERO_OPTS.sitH * 0.8) * sy;
    fx.spawn(px, py);
  }
  fx.tick();
  fx.draw(ctx, { phase: meditationPhase });

  // ── Dragged icon follows cursor ─────────────────────────────────────────
  if (_drag && _drag.moved) {
    const def = getAchievementById(_drag.id);
    if (def) {
      const img = getIconImg(def.iconKey);
      if (img.complete && img.naturalWidth) {
        const sp = slotPos(_drag.startShelf, _drag.startSlot);
        ctx.save();
        ctx.globalAlpha = 0.92;
        ctx.drawImage(img, _drag.cx - sp.size / 2, _drag.cy - sp.size / 2, sp.size, sp.size);
        ctx.restore();
      }
    }
  }

  animId = requestAnimationFrame(animate);
}

// ── DOM creation ───────────────────────────────────────────────────────────
function createEl() {
  if (document.getElementById('achievements')) return;

  // Без back-button сверху — возврат идёт через правый край (edge-nav).
  const built = buildSceneDOM({
    id:       'achievements',
    bgSrc:    ASSET('bg/shelf'),
    zIndex:   '55',
    onClose:  closeSceneAchievements,
    withBack: false,
  });
  el = built.el; canvas = built.canvas; ctx = built.ctx; msgEl = built.msgEl;

  // Кэш rect вручную
  let rect = { left: 0, top: 0, width: 0, height: 0 };
  const refresh = () => { if (canvas) rect = canvas.getBoundingClientRect(); };
  refresh();
  window.addEventListener('resize', refresh);
  window.addEventListener('scroll', refresh, { passive: true });

  // ── Pointer-based interaction (click + drag через единый pipeline) ────
  const getXY = e => {
    const p = e.touches?.[0] ?? e.changedTouches?.[0] ?? e;
    return { cx: p.clientX - rect.left, cy: p.clientY - rect.top };
  };

  const onDown = e => {
    if (state.activeScreen !== SCREENS.ACHIEVEMENTS) return;
    const { cx, cy } = getXY(e);
    // если попали в иконку и не в медитации — начинаем drag-pipeline.
    if (!hero.praying) {
      const id = iconAt(cx, cy);
      if (id) { beginDrag(id, cx, cy); return; }
    }
  };

  const onMove = e => {
    if (state.activeScreen !== SCREENS.ACHIEVEMENTS) return;
    const { cx, cy } = getXY(e);
    if (_drag) { moveDrag(cx, cy); setCursor(true); return; }
    // hover-cursor
    const m = edgeNavMode(el, e, NAV);
    if (m) { setCursor(m); return; }
    if (iconAt(cx, cy)) { setCursor(true); return; }
    if (findShelf(cx, cy) !== null) { setCursor(true); return; }
    setCursor(false);
  };

  const onUp = e => {
    if (state.activeScreen !== SCREENS.ACHIEVEMENTS) return;
    const { cx, cy } = getXY(e);
    if (_drag) {
      const r = endDrag(cx, cy);
      if (r?.click) { openIconDetail(r.id); }
      return;
    }
    // Нет drag — считаем tap
    onTap(e, cx, cy);
  };

  canvas.addEventListener('mousedown',  onDown);
  canvas.addEventListener('mousemove',  onMove);
  canvas.addEventListener('mouseup',    onUp);
  canvas.addEventListener('mouseleave', () => {
    if (_drag) { _drag = null; }
    setCursor(false);
  });

  canvas.addEventListener('touchstart', e => { e.preventDefault(); onDown(e); }, { passive: false });
  canvas.addEventListener('touchmove',  e => { e.preventDefault(); onMove(e); }, { passive: false });
  canvas.addEventListener('touchend',   e => { e.preventDefault(); onUp(e);   }, { passive: false });

  // Keyboard — общие helpers из src/hero.js
  document.addEventListener('keydown', e => {
    if (state.activeScreen !== SCREENS.ACHIEVEMENTS) return;
    const act = meditationKeyAction(e.key);
    if (act === 'sit')   { sitDown();  return; }
    if (act === 'stand') { standUp();  return; }
    // Ходьба в медитации — поднимает.
    if (hero.praying && isWalkKey(e.key)) standUp();
    keysHeld[e.key] = true;
  });
  document.addEventListener('keyup', e => {
    keysHeld[e.key] = false;
  });

  // Pray button event — глобальный dispatcher
  window.addEventListener('app:meditate', () => {
    if (state.activeScreen === SCREENS.ACHIEVEMENTS) sitDown();
  });
}

// ── Lifecycle ──────────────────────────────────────────────────────────────
// opts.enterAt:
//   'left'  — герой спаунится у левого края (входит с левой стороны),
//   'right' — у правого края (входит через правую сторону, дверь),
//   иначе — дефолтный спаун у правой двери.
// Это работает как универсальное правило: при переходе через границу
// экрана монах всегда появляется ровно на том крае, откуда логически
// вошёл, чтобы переход выглядел непрерывно.
export async function openSceneAchievements(opts = {}) {
  leaveMain();
  createEl();

  const bgImg = el.querySelector('img.scene-bg');
  if (!bgImg.complete || !bgImg.naturalWidth) {
    showLoading('...');
    await waitImg(bgImg);
    if (!bgImg.naturalWidth) {
      hideLoading();
      resumeMain();
      showError('не удалось загрузить полки');
      return;
    }
    hideLoading();
  }

  state.activeScreen = SCREENS.ACHIEVEMENTS;
  el.style.display   = 'block';
  // Pray-кнопка — top-level фиксированная UI, видна в сценах с ходячим героем.
  setMeditateBtn(true);

  // Edge-spawn: герой спаунится у того края, через который логически
  // вошёл. Это создаёт визуальное ощущение перехода через границу
  // экрана — ушёл слева main → появился у правой двери achievements.
  //
  // Важно: спаун ОТСТУПАЕТ от точной границы на EDGE_SPAWN_OFFSET пикс.
  // Иначе tickHeroMove не сможет сгенерировать edge-событие для обратного
  // перехода (условие edge = «prev < maxX && x === maxX» — если prev
  // сразу равен maxX, событие не стреляет и герой «застревает» у края).
  const ok = spawnHeroAtEdge(hero, opts.enterAt, BG_W, { margin: 120 });
  if (!ok) {
    // Дефолт (back-button, прямой openScene без enterAt) — правая дверь.
    hero.x       = BG_W - 240;
    hero.facing  = 'left';
    hero.targetX = null;
    hero.walking = false;
  }
  hero.praying = false;
  fx.clear();
  meditationPhase = 0;

  // Enter на achievements → возврат на main (через правый край ach →
  // enterAt 'left' в main).
  setDefaultEnterFor('achievements', 'main', 'left');

  // ── Achievement: заглянул в комнату с полками ────────────────────────
  trackShelfVisit();

  requestAnimationFrame(() => {
    const r = el.getBoundingClientRect();
    W = canvas.width  = Math.round(r.width);
    H = canvas.height = Math.round(r.height);
    if (!animId) animate();
  });
}

// opts.enterAt — прокидывается дальше в resumeMain, чтобы при переходе
// через границу экрана (walk-to-edge / click) монах спаунился у
// соответствующего края main. Back-button и прямые закрытия передают
// пустой opts и герой остаётся там, где был.
export function closeSceneAchievements(opts = {}) {
  if (_pickerEl) closePicker();
  _drag = null;
  hero.praying = false;
  fx.clear();
  meditationPhase = 0;
  state.activeScreen = SCREENS.MAIN;
  if (el) el.style.display = 'none';
  if (animId) { cancelAnimationFrame(animId); animId = null; }
  // Сброс зажатых клавиш — если игрок перешёл через край удерживая →,
  // keyup по возвращении уже может не прилететь, и в сцене останется
  // стабильный true в keysHeld. Чистим.
  for (const k in keysHeld) keysHeld[k] = false;
  SaveManager.setScene('achievements', S);
  resumeMain(opts);
}
window.closeSceneAchievements = closeSceneAchievements;
