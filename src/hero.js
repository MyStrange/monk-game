// src/hero.js — общий модуль монаха: спрайты, размеры, движение, отрисовка.
// Правило: размер и анимация монаха идентичны во всех сценах.
//
// Любая сцена с ходячим монахом импортирует это:
//   import { makeHero, tickHeroMove, drawHero,
//            meditationKeyAction, isWalkKey,
//            HERO_STAND_H, HERO_STAND_W, HERO_SIT_H, HERO_SIT_W,
//            HERO_LEFT_YOFF, HERO_FRAMES, HERO_SPEED,
//            heroImgR, heroImgL, heroImgS } from '../src/hero.js';

// ── Размеры (frame 275×348 для stand, 275×204 для sit) ────────────────────
// Базовые — рассчитаны для главной сцены (BG 2000×1116). В других сценах
// с другим BG — пропорционально масштабируются через heroOptsForBG(bgH),
// чтобы зрительный размер монаха относительно фона был одинаковый.
export const HERO_STAND_H   = 420;
export const HERO_STAND_W   = Math.round(HERO_STAND_H * 275 / 348); // 332
export const HERO_LEFT_YOFF = Math.round(27 * HERO_STAND_H / 348);  // 33
export const HERO_SIT_W     = HERO_STAND_W;                          // 332
export const HERO_SIT_H     = Math.round(HERO_SIT_W * 204 / 275);    // 246
export const HERO_FRAMES    = 5;
export const HERO_SPEED     = 5;

// BG, для которого заданы базовые размеры (главная сцена).
const HERO_BASE_BG_H = 1116;

// ── Pro-rata размеры для другого BG ───────────────────────────────────────
// Если сцена использует BG с другой высотой, визуальный размер монаха
// должен остаться таким же относительно фона. Пример:
//   const opts = heroOptsForBG(775); // shelf.png — BG высотой 775
//   drawHero(ctx, hero, sx, sy, tick, opts);
// Возвращает объект с scaled standH/standW/sitH/sitW/leftYOff, пригодный
// как третий аргумент drawHero(..., opts).
export function heroOptsForBG(bgH) {
  const k = bgH / HERO_BASE_BG_H;
  return {
    standH:   Math.round(HERO_STAND_H   * k),
    standW:   Math.round(HERO_STAND_W   * k),
    sitH:     Math.round(HERO_SIT_H     * k),
    sitW:     Math.round(HERO_SIT_W     * k),
    leftYOff: Math.round(HERO_LEFT_YOFF * k),
    frames:   HERO_FRAMES,
  };
}

// ── Спрайты-одиночки (кэш на всё приложение) ──────────────────────────────
export const heroImgR = new Image(); heroImgR.src = 'assets/sprites/hero_right.png';
export const heroImgL = new Image(); heroImgL.src = 'assets/sprites/hero_left.png';
export const heroImgS = new Image(); heroImgS.src = 'assets/sprites/hero_sit.png';

// ── Factory ────────────────────────────────────────────────────────────────
export function makeHero({ x = 300, y = 920 } = {}) {
  return {
    x, y,
    targetX: null,
    facing:  'right',
    walking: false,
    praying: false,
    frame:   0,
    frameTick: 0,
  };
}

// ── Movement tick ──────────────────────────────────────────────────────────
// В медитации не двигается. Обрабатывает стрелки/WASD + targetX лерп.
// minX/maxX — границы в BG-пикселях; speed — пикселей за кадр.
// Возвращает { moved, edge }:
//   moved — двигался ли монах в этом кадре (для анимации).
//   edge  — 'left'|'right'|null. Срабатывает ТОЛЬКО в момент, когда монах
//           упирается в границу движения (переход prev>min → hero.x===min).
//           Сцена использует это, чтобы автопереключиться в соседнюю сцену:
//           дошёл до края + продолжает удерживать клавишу = переход без клика.
//           Важно: возвращается null если монах уже стоял на границе раньше
//           (например, спавн в край) — иначе был бы бесконечный цикл.
export function tickHeroMove(hero, keysHeld,
  { minX = 120, maxX = Infinity, speed = HERO_SPEED } = {}) {
  if (hero.praying) return { moved: false, edge: null };

  const hasLeft  = keysHeld['ArrowLeft']  || keysHeld['a'] || keysHeld['ф'];
  const hasRight = keysHeld['ArrowRight'] || keysHeld['d'] || keysHeld['в'];

  if (hasLeft) {
    const prev = hero.x;
    hero.x = Math.max(minX, hero.x - speed);
    hero.facing = 'left';  hero.walking = true;  hero.targetX = null;
    const edge = (prev > minX && hero.x === minX) ? 'left' : null;
    return { moved: true, edge };
  }
  if (hasRight) {
    const prev = hero.x;
    hero.x = Math.min(maxX, hero.x + speed);
    hero.facing = 'right'; hero.walking = true;  hero.targetX = null;
    const edge = (prev < maxX && hero.x === maxX) ? 'right' : null;
    return { moved: true, edge };
  }
  if (hero.targetX !== null) {
    const dx = hero.targetX - hero.x;
    if (Math.abs(dx) > speed) {
      hero.x += Math.sign(dx) * speed;
      hero.facing = dx > 0 ? 'right' : 'left';
      hero.walking = true;
      return { moved: true, edge: null };
    }
    hero.x       = hero.targetX;
    hero.targetX = null;
    hero.walking = false;
    return { moved: false, edge: null };
  }
  hero.walking = false;
  return { moved: false, edge: null };
}

// ── Draw ───────────────────────────────────────────────────────────────────
// Рисует монаха с анимацией. sx/sy — scale canvas-пиксели к BG.
// opts может переопределить размеры (если сцена хочет уменьшенного монаха).
export function drawHero(ctx, hero, sx, sy, tick, opts = {}) {
  const {
    standH = HERO_STAND_H, standW = HERO_STAND_W,
    sitH   = HERO_SIT_H,   sitW   = HERO_SIT_W,
    leftYOff = HERO_LEFT_YOFF,
    frames   = HERO_FRAMES,
  } = opts;

  const img = hero.praying ? heroImgS
             : hero.facing === 'left' ? heroImgL : heroImgR;

  const w     = hero.praying ? sitW  : standW;
  const h     = hero.praying ? sitH  : standH;
  const yOff  = (!hero.praying && hero.facing === 'left') ? leftYOff : 0;
  const hpX   = hero.x * sx;
  const hpY   = (hero.y + yOff) * sy;
  const hW    = w * sx;
  const hH    = h * sy;

  if (!img.complete || !img.naturalWidth) {
    // Fallback пока спрайт грузится — бурый прямоугольник.
    ctx.fillStyle = '#c87040';
    ctx.fillRect(hpX - hW/2, hpY - hH, hW, hH);
    return;
  }

  const frameW    = img.naturalWidth / frames;
  const frameTick = hero.praying ? 20 : (hero.walking ? 6 : 14);
  const frame     = Math.floor(tick / frameTick) % frames;
  ctx.drawImage(img,
    frame * frameW, 0, frameW, img.naturalHeight,
    hpX - hW/2, hpY - hH, hW, hH);
}

// ── Keyboard helpers (с русской раскладкой) ───────────────────────────────
// Верхнее правило: везде, где монах ходит, — одинаковые клавиши:
//   ←/→ или WASD (с ф/в/ы/щ для русской раскладки).
//   ↓/S/ы — сесть / переключить медитацию
//   ↑/W/щ — встать
export function meditationKeyAction(key) {
  const k = (key || '').toLowerCase();
  if (k === 'arrowdown' || k === 's' || k === 'ы') return 'sit';
  if (k === 'arrowup'   || k === 'w' || k === 'щ') return 'stand';
  return null;
}

export function isWalkKey(key) {
  const k = (key || '').toLowerCase();
  return k === 'arrowleft'  || k === 'a' || k === 'ф' ||
         k === 'arrowright' || k === 'd' || k === 'в';
}
