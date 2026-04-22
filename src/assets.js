// src/assets.js — единый реестр графических ассетов.
//
// Один источник правды для:
//   • <link rel="preload"> в index.html (через syncPreloadLinks в dev-mode)
//   • new Image().src по всему коду (через ASSET('bg/main'))
//   • валидации «используется, но не в реестре» / «в реестре, но не используется»
//
// ── Добавление нового ассета ──────────────────────────────────────────────
// 1. Положи файл в assets/<path>.
// 2. Добавь запись в ASSETS с ключом (коротким именем) и полным путём.
// 3. preload:'critical' → попадает в preload-links при старте.
//    preload:'eager'    → грузится сразу через new Image() в модуле.
//    preload:'lazy'     → грузится только при первом upgrade сцены.
//
// ── Использование ─────────────────────────────────────────────────────────
//   import { ASSET } from '../src/assets.js';
//   bg.src = ASSET('bg/main');
//
// ── Production ───────────────────────────────────────────────────────────
// Чтобы не городить build-step: список critical-preload в index.html
// по-прежнему пишется руками. Но теперь есть validateAssets() — вызывай
// из консоли `window.__validateAssets()` чтобы проверить consistency.

export const ASSETS = {
  // ── Backgrounds ─────────────────────────────────────────────────────────
  'bg/main':               { path: 'assets/bg/main.png',               preload: 'critical' },
  'bg/tree':               { path: 'assets/bg/tree.png',               preload: 'critical' },
  'bg/buddha':             { path: 'assets/bg/buddha.jpeg',            preload: 'critical' },
  'bg/flyroom':            { path: 'assets/bg/flyroom.jpeg',           preload: 'critical' },
  'bg/above_main':         { path: 'assets/bg/above_main.jpeg',        preload: 'critical' },
  'bg/above2':             { path: 'assets/bg/above2.png',             preload: 'critical' },
  'bg/above3':             { path: 'assets/bg/above3.png',             preload: 'critical' },
  'bg/inside':             { path: 'assets/bg/inside.png',             preload: 'critical' },
  'bg/inside_heart':       { path: 'assets/bg/inside_heart.png',       preload: 'critical' },
  'bg/shelf':              { path: 'assets/bg/shelf.png',              preload: 'critical' },
  'bg/inscription_dim':    { path: 'assets/bg/inscription_dim.png',    preload: 'critical' },
  'bg/inscription_bright': { path: 'assets/bg/inscription_bright.png', preload: 'critical' },

  // ── Sprites (герой, кот, монах) ─────────────────────────────────────────
  'sprite/hero_right':     { path: 'assets/sprites/hero_right.png',    preload: 'critical' },
  'sprite/hero_left':      { path: 'assets/sprites/hero_left.png',     preload: 'critical' },
  'sprite/hero_sit':       { path: 'assets/sprites/hero_sit.png',      preload: 'critical' },
  'sprite/cat':            { path: 'assets/sprites/cat.png',           preload: 'critical' },
  'sprite/monk_red':       { path: 'assets/sprites/monk_red.png',      preload: 'critical' },

  // ── Item sprites ────────────────────────────────────────────────────────
  'item/bottle':           { path: 'assets/items/bottle.png',          preload: 'critical' },
  'item/rock1':            { path: 'assets/items/rock1.png',           preload: 'critical' },
  'item/rock2':            { path: 'assets/items/rock2.png',           preload: 'critical' },
  'item/rock3':            { path: 'assets/items/rock3.png',           preload: 'critical' },
};

// Вернуть полный путь по короткому имени. Бросает, если имя неизвестно —
// чтобы опечатки ловились при первом использовании, а не молчаливо
// показывались 404 в сети.
export function ASSET(name) {
  const entry = ASSETS[name];
  if (!entry) throw new Error(`ASSET: unknown key "${name}". Добавь его в src/assets.js.`);
  return entry.path;
}

// Все ассеты, помеченные critical. Использует index.html через валидацию.
export function getCriticalAssets() {
  return Object.values(ASSETS)
    .filter(a => a.preload === 'critical')
    .map(a => a.path);
}

// Валидация соответствия index.html ↔ ASSETS.
// Вызов: window.__validateAssets() в dev-console.
export function validateAssets() {
  const links = Array.from(document.querySelectorAll('link[rel="preload"][as="image"]'))
    .map(l => l.getAttribute('href'));
  const manifestPaths = new Set(getCriticalAssets());
  const linkPaths     = new Set(links);

  const missing = [...manifestPaths].filter(p => !linkPaths.has(p));
  const extra   = [...linkPaths].filter(p => !manifestPaths.has(p));

  if (!missing.length && !extra.length) {
    console.log('%c✓ assets: manifest и index.html синхронны', 'color:#8c0');
  } else {
    if (missing.length) console.warn('В manifest (critical) есть, в index.html нет:\n  ' + missing.join('\n  '));
    if (extra.length)   console.warn('В index.html есть, в manifest нет:\n  ' + extra.join('\n  '));
  }
  return { missing, extra };
}

// Expose в window для быстрой проверки из DevTools.
if (typeof window !== 'undefined') {
  window.__validateAssets = validateAssets;
}
