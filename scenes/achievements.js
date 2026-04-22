// scenes/achievements.js — сцена-полка для ачивок.
// Переход: левый край главной сцены → эта сцена (стрелка влево → стрелка вправо обратно).
// Внутри: герой ходит как по главной (WASD/клик), клик по полке → пикер ачивок
// (есть опция «поставить всё»). Расставленные ачивки можно перетаскивать между
// полками и слотами. Сохраняется в SaveManager. Медитация через кнопку мы (как
// и на главной) — hero_sit подменяется, wasd прекращает.

import { state }                                            from '../src/state.js';
import { SCREENS }                                          from '../src/constants.js';
import { showMsgIn, showLoading, hideLoading, showError,
         setCursor, edgeNavMode, tryEdgeNavClick }          from '../src/utils.js';
import { leaveMain, resumeMain }                            from './main.js';
import { SaveManager }                                      from '../src/save.js';
import { ACHIEVEMENT_DEFS, getUnlockedIds,
         getAchievementById, trackShelfVisit }              from '../src/achievements.js';
import { renderAchIconByKey }                               from '../src/icons.js';
import { ASSET }                                            from '../src/assets.js';
import { waitImg, coverRect, hitZone as rectHitZone,
         buildSceneDOM }                                    from '../src/scene-base.js';
import { AudioSystem }                                      from '../src/audio.js';
import { openScene }                                        from '../src/nav.js';

// ── Scene persistent state ─────────────────────────────────────────────────
// S.placed: { [achId]: { shelf: 0|1|2, slot: 0..SLOTS_PER_SHELF-1 } }
const S = SaveManager.getScene('achievements');
S.placed = S.placed ?? {};

function saveAch() { SaveManager.setScene('achievements', S); }

// ── BG geometry ────────────────────────────────────────────────────────────
// shelf.png: 1376×775
const BG_W = 1376, BG_H = 775;

// ── Shelves (нормализованные 0..1 относительно BG) ─────────────────────────
// Внутреннее пространство шкафа — 3 полки. Тонкая подгонка: только видимая
// область внутренних полок (без рам и боковин).
const SHELVES = [
  { fx: 0.370, fy: 0.278, fw: 0.260, fh: 0.125 }, // верхняя
  { fx: 0.370, fy: 0.445, fw: 0.260, fh: 0.125 }, // средняя
  { fx: 0.370, fy: 0.615, fw: 0.260, fh: 0.140 }, // нижняя
];

// Y-координата пола каждой полки — где «стоят» иконки (центры)
const SHELF_FLOOR_Y = [0.390, 0.555, 0.735];

// 10 слотов на полку → 30 мест. Иконок сейчас 31 — одна может остаться
// «в руках», игрок перетаскивает. Большие слоты → иконки читаемее.
const SLOTS_PER_SHELF = 10;

// ── Hero ───────────────────────────────────────────────────────────────────
// Тот же размер, что и на главной — глобальное правило.
const HERO_STAND_H    = 420;
const HERO_STAND_W    = Math.round(HERO_STAND_H * 275 / 348);   // 332
const HERO_FRAMES     = 5;
const HERO_LEFT_YOFF  = Math.round(27 * HERO_STAND_H / 348);    // ≈ 33 BG px
const HERO_SPEED      = 5;
const GROUND_Y_BG     = 720;
// Sit sprite — как на главной.
const HERO_SIT_W      = HERO_STAND_W;                            // 332
const HERO_SIT_H      = Math.round(HERO_SIT_W * 204 / 275);      // 246

const heroImgR = new Image(); heroImgR.src = 'assets/sprites/hero_right.png';
const heroImgL = new Image(); heroImgL.src = 'assets/sprites/hero_left.png';
const heroImgS = new Image(); heroImgS.src = 'assets/sprites/hero_sit.png';

const hero = {
  x: BG_W - 240,
  y: GROUND_Y_BG,
  targetX: null,
  facing:  'left',
  walking: false,
  praying: false,
};

const keysHeld = {};

// ── Meditation particles (лёгкий аналог main) ────────────────────────────
const THAI_CHARS = ['มี','ก็','กิน','ได้','ซึ่ง','อยู่'];
const PURPLE_PALETTE = ['#b48cd6','#d5a0f0','#9a6bbf','#e2baff'];
let pSyms = [];
let meditationPhase = 0;

function sitDown() {
  if (hero.praying) { standUp(); return; }
  hero.praying = true;
  hero.walking = false;
  hero.targetX = null;
  AudioSystem.playPrayerSound?.();
  AudioSystem.setMode?.('sitting');
}

function standUp() {
  if (!hero.praying) return;
  hero.praying = false;
  pSyms = [];
  meditationPhase = 0;
  AudioSystem.setMode?.('ambient');
}

function _spawnSym() {
  if (!hero.praying) return;
  const ch   = THAI_CHARS[Math.floor(Math.random() * THAI_CHARS.length)];
  const sx   = W / BG_W, sy = H / BG_H;
  const px   = hero.x * sx;
  const py   = (hero.y - HERO_SIT_H * 0.8) * sy;
  pSyms.push({
    ch,
    x: px, y: py,
    t: 0,
    phase:     Math.random() * Math.PI * 2,
    ampX:      18 + Math.random() * 28,
    freqX:     0.35 + Math.random() * 0.45,
    riseSpeed: 0.35 + Math.random() * 0.30,
    life:      1.0,
    size:      22 + Math.random() * 28,
    color:     PURPLE_PALETTE[Math.floor(Math.random() * PURPLE_PALETTE.length)],
  });
}

function _symTick() {
  for (let i = pSyms.length - 1; i >= 0; i--) {
    const s = pSyms[i];
    s.t += 0.02;
    s.y -= s.riseSpeed;
    s.x += Math.sin(s.phase + s.t * s.freqX * Math.PI) * 0.8;
    s.life -= 0.004;
    if (s.life <= 0 || s.y < -60) pSyms.splice(i, 1);
  }
}

function _drawSyms() {
  if (!pSyms.length) return;
  ctx.save();
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  for (const s of pSyms) {
    ctx.globalAlpha = Math.max(0, Math.min(1, s.life));
    ctx.fillStyle   = s.color;
    ctx.font        = `${s.size}px "VT323", monospace`;
    ctx.fillText(s.ch, s.x, s.y);
  }
  ctx.restore();
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

  // Пустое место → шагаем
  const bgX = cx * BG_W / W;
  hero.targetX = Math.max(120, Math.min(BG_W - 120, bgX));
}

// ── Animation ──────────────────────────────────────────────────────────────
let animId = null;
let tick   = 0;

function animate() {
  if (state.activeScreen !== SCREENS.ACHIEVEMENTS) { animId = null; return; }
  ctx.clearRect(0, 0, W, H);
  tick++;

  const sx = W / BG_W, sy = H / BG_H;

  // ── Hero movement ────────────────────────────────────────────────────────
  if (!hero.praying) {
    if (keysHeld['ArrowLeft']  || keysHeld['a'] || keysHeld['ф']) {
      hero.x       = Math.max(120, hero.x - HERO_SPEED);
      hero.facing  = 'left';
      hero.walking = true;
      hero.targetX = null;
    } else if (keysHeld['ArrowRight'] || keysHeld['d'] || keysHeld['в']) {
      hero.x       = Math.min(BG_W - 120, hero.x + HERO_SPEED);
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

  // ── Placed achievement icons (кроме перетаскиваемой) ─────────────────────
  for (const [id, p] of Object.entries(S.placed)) {
    if (_drag && _drag.id === id && _drag.moved) continue;
    const def = getAchievementById(id);
    if (!def) continue;
    const img = getIconImg(def.iconKey);
    if (!img.complete || !img.naturalWidth) continue;
    const sp = slotPos(p.shelf, p.slot);
    ctx.drawImage(img, sp.x - sp.size / 2, sp.y - sp.size / 2, sp.size, sp.size);
  }

  // ── Hero ─────────────────────────────────────────────────────────────────
  if (hero.praying) {
    const heroImg = heroImgS;
    const hW  = HERO_SIT_W * sx;
    const hH  = HERO_SIT_H * sy;
    const hpX = hero.x * sx;
    const hpY = hero.y * sy;
    if (heroImg.complete && heroImg.naturalWidth) {
      const frameW    = heroImg.naturalWidth / HERO_FRAMES;
      const frameTick = 20;
      const frame     = Math.floor(tick / frameTick) % HERO_FRAMES;
      ctx.drawImage(heroImg,
        frame * frameW, 0, frameW, heroImg.naturalHeight,
        hpX - hW / 2, hpY - hH, hW, hH);
    }
  } else {
    const heroImg = hero.facing === 'left' ? heroImgL : heroImgR;
    const yOff    = hero.facing === 'left' ? HERO_LEFT_YOFF : 0;
    const hpX     = hero.x * sx;
    const hpY     = (hero.y + yOff) * sy;
    const hW      = HERO_STAND_W * sx;
    const hH      = HERO_STAND_H * sy;
    if (heroImg.complete && heroImg.naturalWidth) {
      const frameW    = heroImg.naturalWidth / HERO_FRAMES;
      const frameTick = hero.walking ? 6 : 14;
      const frame     = Math.floor(tick / frameTick) % HERO_FRAMES;
      ctx.drawImage(heroImg,
        frame * frameW, 0, frameW, heroImg.naturalHeight,
        hpX - hW / 2, hpY - hH, hW, hH);
    } else {
      ctx.fillStyle = '#c87040';
      ctx.fillRect(hpX - 16 * sx, hpY - hH, 32 * sx, hH);
    }
  }

  // ── Meditation: phase + particles ───────────────────────────────────────
  if (hero.praying && meditationPhase < 1) meditationPhase = Math.min(meditationPhase + 0.015, 1);
  if (!hero.praying && meditationPhase > 0) meditationPhase = Math.max(meditationPhase - 0.015, 0);
  if (hero.praying && tick % 24 === 0) _spawnSym();
  _symTick();
  _drawSyms();

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

  const built = buildSceneDOM({
    id:      'achievements',
    bgSrc:   ASSET('bg/shelf'),
    zIndex:  '55',
    onClose: closeSceneAchievements,
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

  // Keyboard — WASD / стрелки + сит/стенд
  document.addEventListener('keydown', e => {
    if (state.activeScreen !== SCREENS.ACHIEVEMENTS) return;
    const k = e.key.toLowerCase();
    // sit/stand
    if (k === 'arrowdown' || k === 's' || k === 'ы') { sitDown(); return; }
    if (k === 'arrowup'   || k === 'w' || k === 'щ') { standUp(); return; }
    // любая ходьба поднимает
    if (hero.praying && (k === 'arrowleft' || k === 'a' || k === 'ф' ||
                         k === 'arrowright' || k === 'd' || k === 'в')) {
      standUp();
    }
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
export async function openSceneAchievements() {
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

  // Спавн героя у правой двери
  hero.x       = BG_W - 240;
  hero.facing  = 'left';
  hero.targetX = null;
  hero.walking = false;
  hero.praying = false;
  pSyms        = [];
  meditationPhase = 0;

  // ── Achievement: заглянул в комнату с полками ────────────────────────
  trackShelfVisit();

  requestAnimationFrame(() => {
    const r = el.getBoundingClientRect();
    W = canvas.width  = Math.round(r.width);
    H = canvas.height = Math.round(r.height);
    if (!animId) animate();
  });
}

export function closeSceneAchievements() {
  if (_pickerEl) closePicker();
  _drag = null;
  hero.praying = false;
  pSyms = [];
  meditationPhase = 0;
  state.activeScreen = SCREENS.MAIN;
  if (el) el.style.display = 'none';
  if (animId) { cancelAnimationFrame(animId); animId = null; }
  SaveManager.setScene('achievements', S);
  resumeMain();
}
window.closeSceneAchievements = closeSceneAchievements;
