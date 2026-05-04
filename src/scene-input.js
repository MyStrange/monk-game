// src/scene-input.js — ввод сцены: keys, blur, visibility.
// Mouse/touch — в scene-base.js → bindSceneInput().
//
// Этот модуль покрывает то, что scene-base.js не делает:
// - keysHeld map с автоматическим keyup-сбросом
// - visibilitychange → перезапуск анимации после ухода/возврата вкладки
// - blur → сброс «залипших» drag-состояний
//
// Использование:
//   import { createKeysHeld, onSceneVisible } from '../src/scene-input.js';
//   const keysHeld = createKeysHeld(e => { /* обработка нажатия */ });
//   if (keysHeld['ArrowRight']) hero.x += HERO_SPEED;
//   onSceneVisible(() => state.activeScreen === SCREENS.MAIN, () => animate());

import { state } from './state.js';

// Карта «зажатые клавиши». Отслеживает keydown/keyup глобально на document.
// `onPress` вызывается на каждое уникальное нажатие (не на repeat'ы).
//
// Возвращает объект, по которому можно делать `keysHeld['ArrowRight']`.
//
// На window blur автоматически сбрасывает все ключи, чтобы герой не «застревал»
// в движении когда игрок переключился во вкладку с зажатой стрелкой.
export function createKeysHeld(onPress) {
  const keysHeld = Object.create(null);

  document.addEventListener('keydown', e => {
    const wasHeld = keysHeld[e.key];
    keysHeld[e.key] = true;
    if (!wasHeld) onPress?.(e);
  });
  document.addEventListener('keyup', e => {
    keysHeld[e.key] = false;
  });
  // Сброс на blur: если игрок ушёл во вкладку держа стрелку, по возврату
  // keyup может не прилететь. Освобождаем всё.
  window.addEventListener('blur', () => {
    for (const k in keysHeld) keysHeld[k] = false;
  });

  return keysHeld;
}

// Перезапуск анимации сцены после возврата на вкладку.
// `isActive` — функция, возвращающая true если эта сцена сейчас на экране.
// `onResume` — что вызвать (обычно animate()).
export function onSceneVisible(isActive, onResume) {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && isActive()) onResume();
  });
}

// Шорткат: сцена активна если state.activeScreen === id.
export function makeIsActiveCheck(sceneId) {
  return () => state.activeScreen === sceneId;
}

// ── Cached element rect ──────────────────────────────────────────────────
// `getBoundingClientRect()` форсит layout reflow. Если вызывать его в каждом
// mousemove (60Hz) — браузер пересчитывает геометрию страницы 60 раз/сек,
// тормозит на сложных сценах. Решение: кэшировать rect, обновлять только
// при resize/scroll или вручную после программного изменения размера canvas.
//
//   const [getRect, refreshRect] = cacheElementRect(canvas);
//   canvas.addEventListener('mousemove', e => {
//     const r = getRect();
//     const cx = e.clientX - r.left, cy = e.clientY - r.top;
//   });
//   // После canvas.width = ..., canvas.height = ... — refreshRect() руками.
//
// Возвращает [getRect, refreshRect] — getter и forced-refresh.
export function cacheElementRect(el) {
  let rect = el ? el.getBoundingClientRect() : { left: 0, top: 0, width: 0, height: 0 };
  const refresh = () => { if (el) rect = el.getBoundingClientRect(); };
  window.addEventListener('resize', refresh);
  window.addEventListener('scroll', refresh, { passive: true });
  // Возвращаем getter с прикреплённым refresh — оба варианта вызова работают:
  //   const getRect = cacheElementRect(el);  getRect();          (legacy)
  //   const [get, ref] = cacheElementRect(el); get(); ref();     (новый)
  const getRect = () => rect;
  getRect.refresh = refresh;
  // Tuple-доступ (если деструктурируешь массивом):
  getRect[Symbol.iterator] = function* () { yield getRect; yield refresh; };
  return getRect;
}
