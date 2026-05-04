// src/scene-defs.js — реестр размеров фоновых картинок (BG) и якорных
// координат сцен. Единое место правды, чтобы не хардкодить BG_W/BG_H в
// каждом файле сцены и не расходиться при смене ассета.
//
// Использование в сцене:
//   import { SCENE_DEFS } from '../src/scene-defs.js';
//   const { bgW, bgH, groundY } = SCENE_DEFS.main;
//
// Добавление новой сцены: одна запись здесь + остальное в обычном файле сцены.

export const SCENE_DEFS = {
  // главная сцена (лес, статуя, монах)
  main:         { bgW: 2000, bgH: 1116, groundY: 920 },
  // Будда / лицо со светлячками
  buddha:       { bgW: 1376, bgH: 768 },
  // корни / дерево
  scene2:       { bgW: 1376, bgH: 768 },
  // огненное поле
  scene3:       { bgW: 1376, bgH: 768 },
  // вид сверху на дерево + дверь
  scene4:       { bgW: 2051, bgH: 1154 },
  // внутренность дерева — лестница, сердце
  inside:       { bgW: 1920, bgH: 1080 },
  // полки ачивок
  achievements: { bgW: 1376, bgH: 775 },
  // туториал — панк, магазин дзена
  tutorial:     { bgW: 1376, bgH: 768, heroXMax: 850 },
  // меню
  menu:         { bgW: 1376, bgH: 768 },
  // пролог (слайды на чёрном фоне) — без BG-image, размеры виртуальные
  prologue:     { bgW: 1920, bgH: 1080 },
};

// Шорткат: import { sceneSize } from '../src/scene-defs.js';
//          const { bgW, bgH } = sceneSize('main');
export function sceneSize(id) {
  const d = SCENE_DEFS[id];
  if (!d) {
    console.warn(`[scene-defs] unknown scene id "${id}"`);
    return { bgW: 1376, bgH: 768 };
  }
  return d;
}
