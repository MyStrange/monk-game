// src/constants.js — магические числа в одном месте.
// Новая константа времени/размера/порога → СЮДА, а не в сцену.

// ─── Screen IDs (enum-like) ────────────────────────────────────────────────
// Было: строковые литералы 'main'/'scene2'/… в 47 местах — опечатка
// ('scene_4' вместо 'scene4') ломала всё незаметно. Теперь через объект.
export const SCREENS = Object.freeze({
  MAIN:     'main',
  SCENE2:   'scene2',
  SCENE3:   'scene3',
  SCENE4:   'scene4',
  BUDDHA:   'buddha',
  INSIDE:   'inside',
  MENU:     'menu',
  PROLOGUE: 'prologue',
});

// ─── UI timing (ms) ────────────────────────────────────────────────────────
// Было разбросано магическими числами по utils.js/buddha.js/scene4.js/inside.js.
export const UI_TIMING = Object.freeze({
  // scene-msg / scene-choice fade — transition .25s в CSS, плюс запас.
  MSG_FADE_MS:     260,
  // bounce-анимация существующего story при повторном клике.
  MSG_BOUNCE_MS:   350,
  // loading-оверлей fade-out.
  LOADING_FADE_MS: 400,
  // scene4 layer cross-fade при раскрытии двери.
  LAYER_FADE_MS:   600,
  // задержка перед подхватом глобального click для dismiss story (чтобы не
  // поймать тот же event, которым сообщение создалось).
  STORY_CAP_DELAY: 50,
});

// ─── Input thresholds ──────────────────────────────────────────────────────
export const INPUT = Object.freeze({
  // Сколько пикселей нужно сдвинуть чтобы считать это drag, а не click.
  DRAG_THRESHOLD_PX: 10,
  // Радиус (в px) совпадения drop-target для символа медитации.
  INSCRIPTION_HIT_R: 80,
});
