// src/meditation-fx.js — единый набор примитивов для медитации монаха.
//
// Источник правды для ВСЕХ сцен с сидячей медитацией: палитра символов,
// пути полёта, dissolve-частицы, тёмный оверлей, шрифт.
// Меняется визуал — меняется только тут.
//
// Раньше main.js имел свой `_spawnSym` + `_symTick` + `_spawnDissolveFrom`
// (≈250 строк), а achievements.js использовал минимальный `createMeditationFx`.
// Теперь обе сцены тянут одни и те же helper'ы; main.js дополнительно
// включает drag-tracking и доставку к надписи (специфика главной).
//
// API:
//   // 1. Простой режим (achievements, любая декоративная медитация):
//   const fx = createMeditationFx({ paths: 1 });
//   if (hero.praying && tick % 24 === 0) fx.spawn(x, y);
//   fx.tick();
//   drawMeditationOverlay(ctx, W, H, meditationPhase);
//   fx.draw(ctx, { sx, sy, phase: meditationPhase });
//
//   // 2. Расширенный режим (main с path/drag/jitter):
//   const fx = createMeditationFx({
//     paths: 4,                   // 1..4 формы движения
//     sizeBase: 26, sizeVar: 36,
//     riseSpeedBase: 0.38, riseSpeedVar: 0.32,
//     drag: true,                 // символ можно «схватить» (см. fx.startDrag)
//   });
//   // в onDragStart: const sym = fx.findSymAt(cx, cy); if (sym) fx.startDrag(sym, cx, cy);
//   // в onDragMove: fx.dragMove(cx, cy);
//   // в onDragEnd:  fx.endDrag();
//
//   // dissolve-частицы (homing к target):
//   const dust = createDustField();
//   dust.spawnHomingBurst({fromX, fromY, toX, toY, color, count, scale});
//   dust.spawnRadialBurst({x, y, count, scale});
//   dust.tick();
//   dust.draw(ctx, { phase });

import { phaseToward } from './anims.js';

// ── Константы стиля ────────────────────────────────────────────────────────
// Источник правды — все сцены спавнят один и тот же набор символов,
// одну и ту же палитру. Менять только здесь.
export const THAI_CHARS    = 'ธมอนภวตสกรคทยชพระศษสหฬาิีุูเแโใไ';
export const PURPLE_PALETTE = [
  '#ffffff','#f0e8ff','#e2d4ff','#c8aaff',
  '#b888ff','#9966ee','#ddaaff','#ffe8ff','#ccbbff','#aa88ee',
];

export function randomThaiChar() {
  return THAI_CHARS[Math.floor(Math.random() * THAI_CHARS.length)];
}
export function randomPurpleColor() {
  return PURPLE_PALETTE[Math.floor(Math.random() * PURPLE_PALETTE.length)];
}

// ── Тёмный fade-overlay медитации ────────────────────────────────────────
// Каждая сцена с медитацией затемняет экран при praying. Цвет
// rgba(20,10,40,...) — общий фиолетово-чёрный оттенок медитации.
// Прозрачность пропорциональна phase (0..1).
const OVERLAY_COLOR = '20,10,40';
const OVERLAY_ALPHA = 0.35;
export function drawMeditationOverlay(ctx, W, H, phase) {
  if (phase <= 0) return;
  ctx.fillStyle = `rgba(${OVERLAY_COLOR},${phase * OVERLAY_ALPHA})`;
  ctx.fillRect(0, 0, W, H);
}

// ── Path-функции движения символа ────────────────────────────────────────
// Возвращают `dx` (отклонение от стартового x по горизонтали) на момент `sec`.
// Все используют sin/cos с параметрами символа (freqX, ampX, phase).
const PATH_FNS = [
  // path 0: чистый sin
  (s, sec) => Math.sin(sec * s.freqX * Math.PI + s.phase) * s.ampX,
  // path 1: широкий sin (увеличенная амплитуда)
  (s, sec) => Math.sin(sec * s.freqX * 1.2 + s.phase) * (s.ampX * 1.9),
  // path 2: двойная гармоника
  (s, sec) =>
    Math.sin(sec * s.freqX * 1.8 + s.phase) * s.ampX
    + Math.cos(sec * s.freqX * 0.9) * (s.ampX * 0.45),
  // path 3: спираль (амплитуда колеблется во времени)
  (s, sec) => {
    const r = s.ampX * (0.35 + 0.65 * Math.abs(Math.sin(sec * 0.7)));
    return r * Math.cos(sec * s.freqX * 2.4 + s.phase);
  },
];

// ── Symbol field (символы тайские, плывут вверх) ─────────────────────────
//
// opts:
//   paths         — 1..4 (сколько разных движений случайно выбирается)
//   sizeBase      — базовый размер шрифта
//   sizeVar       — диапазон случайного добавления к размеру
//   riseSpeedBase, riseSpeedVar — диапазон вертикальной скорости
//   ampXBase, ampXVar           — диапазон бокового размаха
//   freqXBase, freqXVar         — диапазон частоты sin
//   lifeDecay     — скорость угасания (default 0.0008 — main; 0.0016 — простая)
//   drag          — bool, разрешить схватывание (нужно findSymAt/startDrag)
export function createMeditationFx({
  paths         = 1,
  sizeBase      = 22,
  sizeVar       = 30,
  riseSpeedBase = 0.38,
  riseSpeedVar  = 0.30,
  ampXBase      = 18,
  ampXVar       = 30,
  freqXBase     = 0.35,
  freqXVar      = 0.45,
  lifeDecay     = 0.0016,
  drag          = false,
} = {}) {
  let syms = [];
  let dragSym = null;

  function spawn(cx, cy) {
    const path = paths > 1 ? Math.floor(Math.random() * paths) : 0;
    syms.push({
      ch:        randomThaiChar(),
      x: cx, y: cy, x0: cx, y0: cy,
      t: 0, path,
      phase:     Math.random() * Math.PI * 2,
      ampX:      ampXBase + Math.random() * ampXVar,
      freqX:     freqXBase + Math.random() * freqXVar,
      riseSpeed: riseSpeedBase + Math.random() * riseSpeedVar,
      life:      1.0,
      size:      sizeBase + Math.random() * sizeVar,
      color:     randomPurpleColor(),
      dragging:  false,
    });
    return syms[syms.length - 1];
  }

  function tick() {
    for (let i = syms.length - 1; i >= 0; i--) {
      const s = syms[i];
      if (s.dragging) continue;
      s.t++;
      const sec = s.t / 60;
      s.x = s.x0 + PATH_FNS[s.path](s, sec);
      s.y = s.y0 - (s.riseSpeed * s.t + 0.0008 * s.t * s.t);
      s.life -= lifeDecay;
      if (s.life <= 0 || s.y < -80) syms.splice(i, 1);
    }
  }

  // draw symbols. sx/sy — масштаб scale-canvas-к-BG (нужен для размера шрифта
  // при разных aspect-ratio), phase — общая прозрачность медитации (0..1),
  // jitterPx — амплитуда дрожания (опционально, для inscription-twitch),
  // swayPx — амплитуда мягкого качания (sin от tick).
  function draw(ctx, { sx = 1, sy = 1, phase = 1, jitterPx = 0, swayPx = 0, tick: t = 0 } = {}) {
    if (!syms.length) return;
    ctx.save();
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    for (const s of syms) {
      const a = s.life * phase;
      if (a <= 0) continue;
      ctx.globalAlpha = a;
      ctx.shadowColor = s.color;
      ctx.shadowBlur  = 10;
      ctx.fillStyle   = s.color;
      ctx.font        = `${Math.round(s.size * sx)}px "VT323", monospace`;
      const jx = jitterPx
        ? (Math.random() - 0.5) * jitterPx + Math.sin(t * 0.35 + s.phase) * swayPx
        : 0;
      const jy = jitterPx
        ? (Math.random() - 0.5) * jitterPx + Math.cos(t * 0.28 + s.phase * 1.3) * swayPx * 0.6
        : 0;
      ctx.fillText(s.ch, s.x + jx, s.y + jy);
    }
    ctx.restore();
  }

  // ── Drag (только для main; achievements не использует) ─────────────────
  function findSymAt(cx, cy, hitR = 52) {
    if (!drag) return null;
    for (const s of syms) {
      if (Math.hypot(cx - s.x, cy - s.y) < hitR) return s;
    }
    return null;
  }
  function startDrag(sym) {
    if (!drag || !sym) return;
    sym.dragging = true;
    dragSym = sym;
  }
  function dragMove(cx, cy) {
    if (dragSym) { dragSym.x = cx; dragSym.y = cy; }
  }
  function endDrag() {
    if (dragSym) dragSym.dragging = false;
    dragSym = null;
  }
  function getDragSym() { return dragSym; }
  function removeSym(sym) {
    syms = syms.filter(s => s !== sym);
    if (dragSym === sym) dragSym = null;
  }

  function clear() {
    syms = [];
    dragSym = null;
  }
  function hitTest(cx, cy, hitR = 52) {
    return findSymAt(cx, cy, hitR) !== null;
  }

  return {
    spawn, tick, draw, clear,
    findSymAt, startDrag, dragMove, endDrag, getDragSym, removeSym, hitTest,
    get syms() { return syms; },
    get length() { return syms.length; },
  };
}

// ── Dust field (homing/burst частицы при доставке символа) ───────────────
//
// Используется в main.js для эффекта «символ впитался в надпись» (homing
// homing к target) + финальной радиальной вспышки при ready.
//
// Все частицы живут в одном массиве. tick() обновляет позиции/life.
// Поля: x, y, vx, vy, life, lv, sz, color, [tx, ty, homing]
// Если есть tx/ty — это homing-частица (тянется к target).
// Если нет — обычный burst (с гравитацией + drag).
export function createDustField() {
  const dust = [];

  // Spawn homing burst — из (fromX,fromY) в (toX,toY).
  // count частиц, scale = min(sx, sy) для адаптации размера к экрану.
  // baseColor — базовый цвет, частицы получают вариации (ffe080 / ffffff / baseColor).
  function spawnHomingBurst({ fromX, fromY, toX, toY, color, count = 80, scale = 1 }) {
    for (let i = 0; i < count; i++) {
      const sx = fromX + (Math.random() - 0.5) * 30;
      const sy = fromY + (Math.random() - 0.5) * 30;
      const dx = toX - sx, dy = toY - sy;
      const flight = 24 + Math.random() * 18;
      const col = i % 3 === 0 ? '#ffe080' : (i % 3 === 1 ? color : '#ffffff');
      dust.push({
        x: sx, y: sy,
        vx: (dx / flight) * (0.6 + Math.random() * 0.6) + (Math.random() - 0.5) * 1.4,
        vy: (dy / flight) * (0.6 + Math.random() * 0.6) + (Math.random() - 0.5) * 1.4,
        life: 1.0,
        lv:   1 / flight,
        sz:   Math.max(1, Math.round((1 + Math.random() * 2) * scale)),
        color: col,
        tx: toX, ty: toY,
        homing: 0.06 + Math.random() * 0.04,
      });
    }
  }

  // Spawn radial burst — из (x,y) во все стороны (gravity + drag).
  function spawnRadialBurst({ x, y, count = 40, scale = 1 }) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const v     = (2.4 + Math.random() * 5) * scale;
      dust.push({
        x, y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v - 3 * scale,
        life: 1.0,
        lv:   0.012 + Math.random() * 0.012,
        sz:   Math.max(1, Math.round((2 + Math.random() * 3) * scale)),
        color: i % 2 === 0 ? '#ffe080' : '#ffffff',
      });
    }
  }

  function tick() {
    for (let i = dust.length - 1; i >= 0; i--) {
      const p = dust[i];
      p.x += p.vx; p.y += p.vy;
      if (p.tx !== undefined) {
        // Homing: дотягивающее ускорение + торможение.
        const dx = p.tx - p.x, dy = p.ty - p.y;
        p.vx += dx * p.homing;
        p.vy += dy * p.homing;
        p.vx *= 0.86;
        p.vy *= 0.86;
      } else {
        p.vy += 0.14;
        p.vx *= 0.97;
      }
      p.life -= p.lv;
      if (p.life <= 0) dust.splice(i, 1);
    }
  }

  function draw(ctx, { phase = 1 } = {}) {
    if (!dust.length) return;
    ctx.save();
    for (const p of dust) {
      ctx.globalAlpha = p.life * phase;
      ctx.shadowColor = p.color;
      ctx.shadowBlur  = 6;
      ctx.fillStyle   = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.sz, p.sz);
    }
    ctx.restore();
  }

  function clear() { dust.length = 0; }

  return {
    spawnHomingBurst, spawnRadialBurst, tick, draw, clear,
    get length() { return dust.length; },
  };
}

// ── Helper: phase управление ─────────────────────────────────────────────
// Шорткат: meditationPhase = updateMeditationPhase(meditationPhase, hero.praying);
// Использует phaseToward из anims.js.
export function updateMeditationPhase(currentPhase, isPraying, rate = 0.015) {
  return phaseToward(currentPhase, isPraying, rate);
}
