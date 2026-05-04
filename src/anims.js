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
