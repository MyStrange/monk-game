// src/nav.js — NAV_MAP: граф сцен, openScene(id), canLeave()
// Добавить новую сцену: одна строка в NAV_MAP, больше ничего не менять.

import { state }           from './state.js';
import { SaveManager }     from './save.js';
import { trackSceneVisit } from './achievements.js';

function toPascal(id) {
  return id.split(/[_-]/).map(s => s[0].toUpperCase() + s.slice(1)).join('');
}

export const NAV_MAP = {
  //  id        opener                         canLeave(S)              leaveBlockMsg
  main:    { open: null,                       canLeave: ()  => true,   block: null },
  scene2:  { open: 'scenes/scene2.js',         canLeave: ()  => true,   block: null },
  buddha:  { open: 'scenes/buddha.js',         canLeave: (S) => !S.wishPlaying, block: 'Подожди...' },
  scene3:  { open: 'scenes/scene3.js',         canLeave: ()  => true,   block: null },
  scene4:  { open: 'scenes/scene4.js',         canLeave: ()  => true,   block: null },
  menu:    { open: 'scenes/menu.js',           canLeave: ()  => true,   block: null },
  prologue:{ open: 'scenes/prologue.js',       canLeave: ()  => true,   block: null },
  inside:  { open: 'scenes/inside.js',         canLeave: ()  => true,   block: null },
  achievements: { open: 'scenes/achievements.js', canLeave: () => true,  block: null },
  // new_scene: { open: 'scenes/new_scene.js', canLeave: () => true,    block: null },
};

// `opts` — необязательный объект, прокидывается в опенер сцены. Ключевое
// использование: `{ enterAt: 'left' | 'right' }` — где спаунить героя в
// целевой сцене при переходе через границу экрана (см. src/utils.js).
// Для выхода обратно на main прокидывается в `window.closeSceneX(opts)`,
// который вызовет `resumeMain(opts)` с тем же enterAt.
export async function openScene(id, opts = {}) {
  const def = NAV_MAP[id];
  if (!def) return;

  // Особый случай: main — НЕ открывается (open: null), это «базовая» сцена,
  // из которой игрок заходит в другие. Чтобы вернуться на main — надо
  // закрыть текущую активную сцену через её exposed `window.closeSceneX`.
  // Это позволяет универсальному edge-nav / openScene('main') работать
  // одинаково изо всех сцен.
  if (id === 'main') {
    const cur = state.activeScreen;
    if (!cur || cur === 'main') return;     // уже на main
    const closerName = `closeScene${toPascal(cur)}`;
    const closer = window[closerName];
    if (typeof closer === 'function') {
      SaveManager.global.lastScene = 'main';
      SaveManager.save();
      closer(opts);
    }
    return;
  }

  if (!def.open) return;
  const mod = await import(`../${def.open}`);
  const fnName = `openScene${toPascal(id)}`;
  const fn = mod[fnName] ?? mod[`open${toPascal(id)}`];
  if (!fn) return;
  // Сохраняем текущую сцену ДО открытия — чтобы F5 внутри неё вернул сюда.
  SaveManager.global.lastScene = id;
  SaveManager.save();
  trackSceneVisit(id);
  fn(opts);
}

export function canLeave(id, sceneState = {}) {
  return NAV_MAP[id]?.canLeave(sceneState) ?? true;
}

export function leaveBlockMsg(id) {
  return NAV_MAP[id]?.block ?? null;
}
