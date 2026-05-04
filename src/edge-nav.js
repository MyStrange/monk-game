// src/edge-nav.js — переход между сценами через край экрана
// Единая точка для всех сцен: левый/правый/верхний край ведёт к другой сцене.
// Ширина зоны считается в display-пикселях контейнера.
//
// Использование в сцене:
//   const nav = { left: { scene: 'achievements' }, right: { scene: 'foo' } };
//   // в mousemove:
//   const m = edgeNavMode(el, e, nav);   // 'left' | 'right' | 'up' | null
//   if (m) { setCursor(m); return; }
//   // в click:
//   if (tryEdgeNavClick(el, e, nav)) return;
//
// up — это НЕ полоса сверху, а зона (не все сцены имеют такой переход);
// если нужен up, передать { up: { scene, zone: { x0,y0,x1,y1 } } } с normalized
// координатами относительно контейнера.

export const EDGE_NAV_PX = 60;

// Пара противоположных краёв — используется везде, где нужно перевернуть
// «край выхода» в «край входа». Единая таблица, чтобы не расходились.
export const OPPOSITE_EDGE = { left: 'right', right: 'left', up: 'down', down: 'up' };

function _getXY(el, e) {
  const r  = el.getBoundingClientRect();
  const pt = e.changedTouches?.[0] || e.touches?.[0] || e;
  return { cx: pt.clientX - r.left, cy: pt.clientY - r.top, w: r.width, h: r.height };
}

// ── Global edge-nav target (for Enter-key navigation) ──────────────────────
// Любая сцена, которая показывает стрелку перехода, заодно обновляет это
// значение — тогда Enter просто переключит сцену без клика. Работает и для
// сцен на своём `_isLeftEdge` (main), и для использующих edgeNavMode.
//
// `enterAt` — куда ставить героя в целевой сцене (противоположный край):
//   hover на левом крае → герой войдёт в цель с ПРАВОГО края → enterAt: 'right'
//   Это правило: при переходе через границу экрана монах спаунится на том
//   крае новой сцены, откуда он логически «вошёл». Визуально получается
//   непрерывный перехода: ушёл влево на экране A → появился справа на B.
let _edgeNavTarget = null;
let _edgeNavEnterAt = null;
export function setEdgeNavTarget(scene, enterAt = null) {
  _edgeNavTarget  = scene || null;
  _edgeNavEnterAt = scene ? enterAt : null;
}
export function clearEdgeNavTarget() { _edgeNavTarget = null; _edgeNavEnterAt = null; }

// Default Enter-target per active scene. Даже если мышь не у края — Enter
// переключит на дефолтный «соседний» экран. Заполняется из scene-модулей:
//   setDefaultEnterFor('main',         'achievements', 'right');
//   setDefaultEnterFor('achievements', 'main',         'left');
// Третий аргумент — куда ставить героя в целевой сцене, то есть
// противоположный край той стороны, куда смотрит сосед.
const _defaultEnterMap = Object.create(null);
export function setDefaultEnterFor(scene, target, enterAt = null) {
  if (!scene) return;
  if (target) _defaultEnterMap[scene] = { target, enterAt };
  else delete _defaultEnterMap[scene];
}

let _enterKeyInstalled = false;
function _installEnterKeyOnce() {
  if (_enterKeyInstalled) return;
  _enterKeyInstalled = true;
  document.addEventListener('keydown', async e => {
    if (e.key !== 'Enter') return;
    // Не перехватываем если пользователь печатает в поле ввода
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;

    // 1) приоритет — активная edge-цель (мышь у края)
    let target  = _edgeNavTarget;
    let enterAt = _edgeNavEnterAt;
    // 2) иначе — дефолтный переход для текущей сцены
    if (!target) {
      const { state } = await import('./state.js');
      const entry = _defaultEnterMap[state.activeScreen];
      if (entry) { target = entry.target; enterAt = entry.enterAt; }
    }
    if (!target) return;
    e.preventDefault();
    const { openScene } = await import('./nav.js');
    openScene(target, { enterAt });
  });
}
_installEnterKeyOnce();

export function edgeNavMode(el, e, config) {
  if (!el || !config) { setEdgeNavTarget(null); return null; }
  const { cx, cy, w, h } = _getXY(el, e);
  let mode = null;
  if (config.left  && cx < EDGE_NAV_PX)          mode = 'left';
  else if (config.right && cx > w - EDGE_NAV_PX) mode = 'right';
  else if (config.up) {
    const z = config.up.zone;
    if (z) {
      if (cx >= z.x0 * w && cx <= z.x1 * w &&
          cy >= z.y0 * h && cy <= z.y1 * h) mode = 'up';
    } else if (cy < EDGE_NAV_PX) mode = 'up';
  }
  const enterAt = mode ? OPPOSITE_EDGE[mode] : null;
  setEdgeNavTarget(mode ? config[mode]?.scene : null, enterAt);
  return mode;
}

// Пытается навигировать по краю. Возвращает true если перешли (click поглощён).
// Импортирует openScene лениво чтобы избежать циклической зависимости.
export async function tryEdgeNavClick(el, e, config) {
  const m = edgeNavMode(el, e, config);
  if (!m) return false;
  const target = config[m]?.scene;
  if (!target) return false;
  e.stopPropagation?.();
  e.preventDefault?.();
  const enterAt = OPPOSITE_EDGE[m];
  const { openScene } = await import('./nav.js');
  openScene(target, { enterAt });
  return true;
}
