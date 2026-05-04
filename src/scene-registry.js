// src/scene-registry.js — реестр сцен с динамической регистрацией.
//
// Идея: каждый файл сцены сам себя регистрирует через registerScene({...}).
// Это убирает дублирование между NAV_MAP, SCREENS, ASSETS preload, и
// `window.closeSceneX` — все разрозненные прежде места собираются в одном.
//
// Использование (новая сцена):
//
//   // scenes/foobar.js
//   import { registerScene } from '../src/scene-registry.js';
//   registerScene({
//     id: 'foobar',
//     module: 'scenes/foobar.js',
//     canLeave: (S) => !S.busy,
//     block: 'погоди',
//     edges: { left: { scene: 'main', enterAt: 'right' } },
//     assets: ['bg/foobar', 'sprite/foobar_door'],
//   });
//   export async function openSceneFoobar(opts) { ... }
//   export function closeSceneFoobar(opts)      { ... }
//   window.closeSceneFoobar = closeSceneFoobar;   // (registry навешивает само)
//
// Совместимость: пока src/nav.js использует свой NAV_MAP, сцены, попавшие
// сюда, ДУБЛИРУЮТ запись в обоих местах. По мере миграции nav.js перейдёт
// на чтение из registry. Это безопасный путь без big-bang переезда.

const _registry = Object.create(null);

/**
 * @param {object} def
 * @param {string} def.id            — уникальный id сцены
 * @param {string} def.module        — путь модуля (для динамического import)
 * @param {function} [def.canLeave]  — (sceneState) => boolean
 * @param {string} [def.block]       — сообщение если canLeave === false
 * @param {object} [def.edges]       — { left|right|up: { scene, enterAt? } }
 * @param {string[]} [def.assets]    — id из ASSETS, нужные сцене (для preload)
 */
export function registerScene(def) {
  if (!def?.id) throw new Error('registerScene: id required');
  _registry[def.id] = {
    canLeave: () => true,
    block:    null,
    edges:    {},
    assets:   [],
    ...def,
  };
}

export function getSceneDef(id) {
  return _registry[id] ?? null;
}

export function getAllSceneIds() {
  return Object.keys(_registry);
}

// Все ассеты, объявленные сценами (объединение). Может использоваться boot'ом
// для генерации preload-листа без ручной правки index.html — пока ручная.
export function collectSceneAssets() {
  const set = new Set();
  for (const id of Object.keys(_registry)) {
    for (const a of _registry[id].assets) set.add(a);
  }
  return [...set];
}

// canLeave-проверка через реестр. Использовать вместо src/nav.js → canLeave.
export function canLeaveScene(id, sceneState = {}) {
  const def = _registry[id];
  if (!def) return true;
  return def.canLeave(sceneState);
}

export function leaveBlockMessage(id) {
  return _registry[id]?.block ?? null;
}

// Для интеграции с src/nav.js во время миграции: snapshot всех знакомых
// нам сцен, чтобы nav.js мог пользоваться registry поверх своего NAV_MAP.
export function snapshotRegistry() {
  const out = {};
  for (const [id, def] of Object.entries(_registry)) {
    out[id] = {
      open:     def.module,
      canLeave: def.canLeave,
      block:    def.block,
    };
  }
  return out;
}
