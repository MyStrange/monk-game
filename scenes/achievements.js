// scenes/achievements.js — сцена-полка для ачивок.
// Переход: левый край главной сцены → эта сцена (стрелка влево → стрелка вправо обратно).
// Внутри: герой ходит как по главной (WASD/клик), клик по полке → пикер ачивок
// (есть опция «поставить всё»). Расставленные ачивки сохраняются в SaveManager.

import { state }                                            from '../src/state.js';
import { SCREENS }                                          from '../src/constants.js';
import { showMsgIn, showLoading, hideLoading, showError,
         setCursor, edgeNavMode, tryEdgeNavClick }          from '../src/utils.js';
import { leaveMain, resumeMain }                            from './main.js';
import { SaveManager }                                      from '../src/save.js';
import { ACHIEVEMENT_DEFS, getUnlockedIds,
         getAchievementById }                               from '../src/achievements.js';
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
// Внутреннее пространство шкафа — 3 полки. Числа подобраны под картинку:
// шкаф занимает x 0.335..0.665, три полки делят высоту 0.25..0.80.
const SHELVES = [
  { fx: 0.340, fy: 0.260, fw: 0.320, fh: 0.165 }, // верхняя
  { fx: 0.340, fy: 0.425, fw: 0.320, fh: 0.170 }, // средняя
  { fx: 0.340, fy: 0.595, fw: 0.320, fh: 0.195 }, // нижняя
];

// Y-координата пола каждой полки (где стоят предметы) — чуть выше низа хитбокса.
// Нормализованные коорд. фона.
const SHELF_FLOOR_Y = [0.405, 0.580, 0.770];

// Сколько слотов на полку — 11×3 = 33 места. ACHIEVEMENT_DEFS сейчас 31.
const SLOTS_PER_SHELF = 11;

// ── Hero ───────────────────────────────────────────────────────────────────
// Меньше чем на главной — сцена компактнее, чтобы не заслонять полки.
const HERO_STAND_H    = 260;
const HERO_STAND_W    = Math.round(HERO_STAND_H * 275 / 348);   // 205
const HERO_FRAMES     = 5;
const HERO_LEFT_YOFF  = Math.round(27 * HERO_STAND_H / 348);    // ≈ 20 BG px
const HERO_SPEED      = 5;
const GROUND_Y_BG     = 720;     // ноги героя — на траве у низа сцены

const heroImgR = new Image(); heroImgR.src = 'assets/sprites/hero_right.png';
const heroImgL = new Image(); heroImgL.src = 'assets/sprites/hero_left.png';

const hero = {
  x: BG_W - 240,      // по умолчанию — справа (как будто зашёл с правой стороны)
  y: GROUND_Y_BG,
  targetX: null,
  facing:  'left',
  walking: false,
};

const keysHeld = {};

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

// Позиция слота в canvas-координатах. Иконки «стоят» на полу полки (sf.y).
function slotPos(shelfIdx, slotIdx) {
  const R   = coverRect(W, H, BG_W, BG_H);
  const z   = SHELVES[shelfIdx];
  const x0  = R.x + z.fx * R.w;
  const w   = z.fw * R.w;
  const colW = w / SLOTS_PER_SHELF;
  // Y — пол полки, чуть приподнят. Размер иконки — меньше ширины колонки.
  const floorY = R.y + SHELF_FLOOR_Y[shelfIdx] * R.h;
  const size   = Math.min(colW * 0.85, R.h * 0.085);
  return {
    x:    x0 + colW * (slotIdx + 0.5),
    y:    floorY - size / 2,
    size,
  };
}

// Занято ли место — возвращает id предмета на слоте или null
function occupantAt(shelfIdx, slotIdx) {
  for (const [id, p] of Object.entries(S.placed)) {
    if (p.shelf === shelfIdx && p.slot === slotIdx) return id;
  }
  return null;
}

// Найти первый свободный слот (ищет в приоритете — сначала на указанной полке)
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
  if (S.placed[id]) return false;     // уже стоит
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

// ── Tap handler ────────────────────────────────────────────────────────────
async function onTap(e, cx, cy) {
  if (state.activeScreen !== SCREENS.ACHIEVEMENTS) return;

  // Edge nav — правый край возвращает на main
  if (await tryEdgeNavClick(el, e, NAV)) return;

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

  // ── Placed achievement icons ─────────────────────────────────────────────
  for (const [id, p] of Object.entries(S.placed)) {
    const def = getAchievementById(id);
    if (!def) continue;
    const img = getIconImg(def.iconKey);
    if (!img.complete || !img.naturalWidth) continue;
    const sp = slotPos(p.shelf, p.slot);
    ctx.drawImage(img, sp.x - sp.size / 2, sp.y - sp.size / 2, sp.size, sp.size);
  }

  // ── Hero ─────────────────────────────────────────────────────────────────
  const heroImg  = hero.facing === 'left' ? heroImgL : heroImgR;
  const yOff     = hero.facing === 'left' ? HERO_LEFT_YOFF : 0;
  const hpX      = hero.x * sx;
  const hpY      = (hero.y + yOff) * sy;
  const hW       = HERO_STAND_W * sx;
  const hH       = HERO_STAND_H * sy;
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

  // Кэш rect вручную — нам нужен e для edge-nav
  let rect = { left: 0, top: 0, width: 0, height: 0 };
  const refresh = () => { if (canvas) rect = canvas.getBoundingClientRect(); };
  refresh();
  window.addEventListener('resize', refresh);
  window.addEventListener('scroll', refresh, { passive: true });

  canvas.addEventListener('click', e => {
    onTap(e, e.clientX - rect.left, e.clientY - rect.top);
  });
  canvas.addEventListener('touchend', e => {
    e.preventDefault();
    const t = e.changedTouches[0];
    onTap(e, t.clientX - rect.left, t.clientY - rect.top);
  }, { passive: false });

  canvas.addEventListener('mousemove', e => {
    if (state.activeScreen !== SCREENS.ACHIEVEMENTS) return;
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
    // Edge nav cursor — приоритет
    const m = edgeNavMode(el, e, NAV);
    if (m) { setCursor(m); return; }
    // Существующая иконка — pointer
    if (iconAt(cx, cy)) { setCursor(true); return; }
    // Полка — pointer
    if (findShelf(cx, cy) !== null) { setCursor(true); return; }
    setCursor(false);
  });
  canvas.addEventListener('mouseleave', () => setCursor(false));

  // Keyboard — WASD / стрелки
  document.addEventListener('keydown', e => {
    if (state.activeScreen !== SCREENS.ACHIEVEMENTS) return;
    keysHeld[e.key] = true;
  });
  document.addEventListener('keyup', e => {
    keysHeld[e.key] = false;
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

  // Спавн героя у правой двери (будто вошёл слева от main)
  hero.x       = BG_W - 240;
  hero.facing  = 'left';
  hero.targetX = null;
  hero.walking = false;

  requestAnimationFrame(() => {
    const r = el.getBoundingClientRect();
    W = canvas.width  = Math.round(r.width);
    H = canvas.height = Math.round(r.height);
    if (!animId) animate();
  });
}

export function closeSceneAchievements() {
  if (_pickerEl) closePicker();
  state.activeScreen = SCREENS.MAIN;
  if (el) el.style.display = 'none';
  if (animId) { cancelAnimationFrame(animId); animId = null; }
  SaveManager.setScene('achievements', S);
  resumeMain();
}
window.closeSceneAchievements = closeSceneAchievements;
