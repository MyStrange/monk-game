// src/anims.js — базовые анимационные примитивы.
//
// До этого файла каждая сцена сама писала:
//   if (cond) phase = Math.min(phase + 0.015, 1);
//   else      phase = Math.max(phase - 0.015, 0);
// И:
//   value = Math.max(value - 0.02, 0);   // decay
//   value *= 0.93; if (value < 0.01) value = 0;   // exponential decay
//   const sway = Math.sin(t * freq) * amp;        // sin-движение
//
// Один и тот же набор формул в 3-5 местах. Здесь — единая точка.

// Линейный rise: значение растёт к 1, ограничено [0..1].
export function phaseUp(value, rate = 0.015) {
  return Math.min(value + rate, 1);
}

// Линейный fall: значение падает к 0, ограничено [0..1].
export function phaseDown(value, rate = 0.015) {
  return Math.max(value - rate, 0);
}

// Условный rise/fall: «фейд при условии». Используется для meditationPhase:
//   meditationPhase = phaseToward(meditationPhase, hero.praying);
// → если praying — растёт к 1, иначе падает к 0.
export function phaseToward(value, condition, rate = 0.015) {
  return condition ? phaseUp(value, rate) : phaseDown(value, rate);
}

// Линейное затухание к 0 (без множителя). Скорость постоянная.
//   inscriptionGlow = decay(inscriptionGlow, 0.02);
export function decay(value, rate = 0.02) {
  return Math.max(value - rate, 0);
}

// Экспоненциальное затухание (умножение на коэффициент <1) с обнулением
// мелочи. Используется для пружинистого спадания энергии (twitch и т.п.).
//   _inscriptionTwitch = decayExp(_inscriptionTwitch, 0.93);
export function decayExp(value, factor = 0.93, eps = 0.01) {
  const v = value * factor;
  return v < eps ? 0 : v;
}

// Pump-or-decay: импульсное накачивание + само-затухание.
// Удобно для shake/twitch/glow реакции на действие игрока:
//   _inscriptionTwitch = pumpDecay(_inscriptionTwitch, _inscriptionHeld, 0.15, 0.93);
export function pumpDecay(value, condition, pumpRate = 0.15, decayFactor = 0.93) {
  return condition
    ? Math.min(1, value + pumpRate)
    : decayExp(value, decayFactor);
}

// Линейная интерполяция.
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Ease-out cubic — для плавного приближения к цели (transitions).
export function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

// Sin-волна со сдвигом фазы. Готовая частая формула:
//   const sway = sinSway(tick, 0.05, 12);  // амплитуда 12, частота 0.05
//   const sway = sinSway(tick, 0.05, 12, phase);
export function sinSway(t, freq, amp, phase = 0) {
  return Math.sin(t * freq + phase) * amp;
}

// Pulse 0..1: мягкая sin-пульсация в диапазон [0..1].
//   const br = pulse01(tick, 0.05);
export function pulse01(t, freq = 0.05, phase = 0) {
  return 0.5 + 0.5 * Math.sin(t * freq + phase);
}

// ── Pixel-glow draw helpers ───────────────────────────────────────────────
// Проектный визуальный язык: «пиксельный свет» — несколько слоёв rect на
// убывающей прозрачности, БЕЗ shadowBlur (тяжёлый при 100+ частиц).
//
// Раньше эти 4-5 строк glow дублировались в buddha.js (5 раз!), scene2.js
// (2 раза), inside.js, src/rotate-overlay.js, src/icons/items.js. Палитра
// «alpha 0.07/0.16/0.42/1.0» устаканилась — это и есть наш «glow».
//
// drawPixelGlow(ctx, px, py, sz, color, alpha)         — 4 слоя (firefly)
// drawPixelGlow3(ctx, px, py, sz, color, alpha)        — 3 слоя (scene2 ambient)
// drawGlowTrail(ctx, trail, sz, color, baseAlpha)      — затухающий хвост

// Профили слоёв: [{ mul, alpha }, ...]
//   mul   — насколько rect больше/смещён относительно core
//           (rect рисуется в (px - sz*mul, py - sz*mul, sz*(2*mul+1), sz*(2*mul+1)))
//   alpha — множитель базовой alpha
const GLOW_4LAYER = [
  { mul: 5, alpha: 0.07 },   // outer (огромное мягкое сияние)
  { mul: 3, alpha: 0.16 },   // mid
  { mul: 1, alpha: 0.42 },   // near
  { mul: 0, alpha: 1.0  },   // bright pixel core
];
const GLOW_3LAYER = [
  { mul: 2, alpha: 0.10 },
  { mul: 1, alpha: 0.22 },
  { mul: 0, alpha: 1.0  },
];
const GLOW_3LAYER_DENSE = [   // scene2 activation: alphas 0.18/0.45/1
  { mul: 2, alpha: 0.18 },
  { mul: 1, alpha: 0.45 },
  { mul: 0, alpha: 1.0  },
];

function _drawGlowLayers(ctx, px, py, sz, color, alpha, layers) {
  if (alpha <= 0) return;
  ctx.fillStyle = color;
  for (const { mul, alpha: am } of layers) {
    ctx.globalAlpha = alpha * am;
    if (mul === 0) {
      ctx.fillRect(px, py, sz, sz);
    } else {
      ctx.fillRect(px - sz * mul, py - sz * mul, sz * (2 * mul + 1), sz * (2 * mul + 1));
    }
  }
}

// 4-слойный glow (огонь, светлячок, далеко-видимый огонёк)
export function drawPixelGlow(ctx, px, py, sz, color, alpha = 1) {
  _drawGlowLayers(ctx, px, py, sz, color, alpha, GLOW_4LAYER);
}

// 3-слойный glow (околоземная пыль, споры, мелкие искры).
// `dense=true` — сильнее видимый mid (для активации камней в scene2).
export function drawPixelGlow3(ctx, px, py, sz, color, alpha = 1, dense = false) {
  _drawGlowLayers(ctx, px, py, sz, color, alpha,
    dense ? GLOW_3LAYER_DENSE : GLOW_3LAYER);
}

// Затухающий хвост: рисует серию пиксельных glow-точек, прозрачность которых
// растёт от хвоста к голове. trail — массив {x, y}, baseAlpha — основная alpha.
//   drawGlowTrail(ctx, fly.trail, fly.sz, '#ffe080', fly.alpha);
export function drawGlowTrail(ctx, trail, sz, color, baseAlpha = 1) {
  if (!trail?.length) return;
  ctx.fillStyle = color;
  for (let ti = 0; ti < trail.length; ti++) {
    const p  = trail[ti];
    const ta = (ti / trail.length) * baseAlpha;
    if (ta < 0.01) continue;
    const px = Math.round(p.x), py = Math.round(p.y);
    ctx.globalAlpha = ta * 0.18; ctx.fillRect(px - sz, py - sz, sz * 3, sz * 3);
    ctx.globalAlpha = ta * 0.42; ctx.fillRect(px,       py,      sz,    sz);
  }
}
