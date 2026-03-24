// src/state.js — ВСЁ содержимое, никогда не расширять
// Флаги сцены → в файлах сцен, не здесь.

export const state = {
  inventory:    Array(5).fill(null),
  selectedSlot: -1,
  activeScreen: 'main',  // 'main' | 'scene2' | 'buddha' | 'scene3' | 'scene4' | id из NAV_MAP
};
