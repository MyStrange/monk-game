// src/nav.js — NAV_MAP: граф сцен, openScene(id), canLeave()
// Добавить новую сцену: одна строка в NAV_MAP, больше ничего не менять.

import { state }       from './state.js';
import { SaveManager } from './save.js';

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
  // new_scene: { open: 'scenes/new_scene.js', canLeave: () => true,    block: null },
};

export async function openScene(id) {
  const def = NAV_MAP[id];
  if (!def || !def.open) return;
  const mod = await import(`../${def.open}`);
  const fnName = `openScene${toPascal(id)}`;
  const fn = mod[fnName] ?? mod[`open${toPascal(id)}`];
  if (!fn) return;
  // Сохраняем текущую сцену ДО открытия — чтобы F5 внутри неё вернул сюда.
  SaveManager.global.lastScene = id;
  SaveManager.save();
  fn();
}

export function canLeave(id, sceneState = {}) {
  return NAV_MAP[id]?.canLeave(sceneState) ?? true;
}

export function leaveBlockMsg(id) {
  return NAV_MAP[id]?.block ?? null;
}
