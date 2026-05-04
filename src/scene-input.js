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
