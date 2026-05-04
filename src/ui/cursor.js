// src/ui/cursor.js — пиксельные курсоры + setCursor + isMobile + hover glow
// Все сцены вызывают setCursor(...) вместо element.style.cursor.
//
// Режимы:
//   setCursor(false / 'def' / null)     → обычный (бутон)
//   setCursor(true  / 'ptr')            → hover (лотос)
//   setCursor('left' | 'right' | 'up')  → стрелка перехода между сценами

// ── Custom pixel-art cursors ────────────────────────────────────────────────
// Default: chunky bud 20×28 — 5 blocks, no fine details, hotspot (10, 2)
const _SVG_DEF = "data:image/svg+xml,%3Csvg width='20' height='28' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='8' y='0' width='4' height='4' fill='%23fffce8'/%3E%3Crect x='6' y='4' width='8' height='6' fill='%23f0c040'/%3E%3Crect x='4' y='10' width='12' height='6' fill='%23d4a028'/%3E%3Crect x='6' y='16' width='8' height='4' fill='%23c09020'/%3E%3Crect x='8' y='20' width='4' height='8' fill='%234a6018'/%3E%3C%2Fsvg%3E";
// Hover: chunky open lotus 20×20 — 9 blocks, centered, hotspot (10, 10)
const _SVG_PTR = "data:image/svg+xml,%3Csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='8' y='2' width='4' height='6' fill='%23f0c040'/%3E%3Crect x='8' y='12' width='4' height='6' fill='%23f0c040'/%3E%3Crect x='2' y='8' width='6' height='4' fill='%23f0c040'/%3E%3Crect x='12' y='8' width='6' height='4' fill='%23f0c040'/%3E%3Crect x='4' y='4' width='4' height='4' fill='%23d4a028'/%3E%3Crect x='12' y='4' width='4' height='4' fill='%23d4a028'/%3E%3Crect x='4' y='12' width='4' height='4' fill='%23d4a028'/%3E%3Crect x='12' y='12' width='4' height='4' fill='%23d4a028'/%3E%3Crect x='8' y='8' width='4' height='4' fill='%23fffce8'/%3E%3C%2Fsvg%3E";
// Arrow LEFT 20×20, hotspot (0,10)
const _SVG_ARL = "data:image/svg+xml,%3Csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='10' y='0' width='2' height='2' fill='%23f0c040'/%3E%3Crect x='8' y='2' width='4' height='2' fill='%23f0c040'/%3E%3Crect x='6' y='4' width='6' height='2' fill='%23f0c040'/%3E%3Crect x='4' y='6' width='8' height='2' fill='%23f0c040'/%3E%3Crect x='2' y='8' width='10' height='2' fill='%23f0c040'/%3E%3Crect x='0' y='10' width='12' height='2' fill='%23f0c040'/%3E%3Crect x='2' y='12' width='10' height='2' fill='%23f0c040'/%3E%3Crect x='4' y='14' width='8' height='2' fill='%23f0c040'/%3E%3Crect x='6' y='16' width='6' height='2' fill='%23f0c040'/%3E%3Crect x='8' y='18' width='4' height='2' fill='%23f0c040'/%3E%3Crect x='12' y='6' width='8' height='8' fill='%23f0c040'/%3E%3Crect x='0' y='10' width='2' height='2' fill='%23fffce8'/%3E%3C%2Fsvg%3E";
// Arrow RIGHT 20×20, hotspot (19,10)
const _SVG_ARR = "data:image/svg+xml,%3Csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='8' y='0' width='2' height='2' fill='%23f0c040'/%3E%3Crect x='8' y='2' width='4' height='2' fill='%23f0c040'/%3E%3Crect x='8' y='4' width='6' height='2' fill='%23f0c040'/%3E%3Crect x='8' y='6' width='8' height='2' fill='%23f0c040'/%3E%3Crect x='8' y='8' width='10' height='2' fill='%23f0c040'/%3E%3Crect x='8' y='10' width='12' height='2' fill='%23f0c040'/%3E%3Crect x='8' y='12' width='10' height='2' fill='%23f0c040'/%3E%3Crect x='8' y='14' width='8' height='2' fill='%23f0c040'/%3E%3Crect x='8' y='16' width='6' height='2' fill='%23f0c040'/%3E%3Crect x='8' y='18' width='4' height='2' fill='%23f0c040'/%3E%3Crect x='0' y='6' width='8' height='8' fill='%23f0c040'/%3E%3Crect x='18' y='10' width='2' height='2' fill='%23fffce8'/%3E%3C%2Fsvg%3E";
// Arrow UP 20×20, hotspot (10,0)
const _SVG_ARU = "data:image/svg+xml,%3Csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='9' y='0' width='2' height='2' fill='%23f0c040'/%3E%3Crect x='7' y='2' width='6' height='2' fill='%23f0c040'/%3E%3Crect x='5' y='4' width='10' height='2' fill='%23f0c040'/%3E%3Crect x='3' y='6' width='14' height='2' fill='%23f0c040'/%3E%3Crect x='1' y='8' width='18' height='2' fill='%23f0c040'/%3E%3Crect x='0' y='10' width='20' height='2' fill='%23f0c040'/%3E%3Crect x='8' y='12' width='4' height='8' fill='%23f0c040'/%3E%3Crect x='9' y='0' width='2' height='2' fill='%23fffce8'/%3E%3C%2Fsvg%3E";

export const CURSOR_DEF         = `url("${_SVG_DEF}") 10 2, default`;
export const CURSOR_PTR         = `url("${_SVG_PTR}") 10 10, pointer`;
export const CURSOR_ARROW_LEFT  = `url("${_SVG_ARL}") 0 10, pointer`;
export const CURSOR_ARROW_RIGHT = `url("${_SVG_ARR}") 19 10, pointer`;
export const CURSOR_ARROW_UP    = `url("${_SVG_ARU}") 10 0, pointer`;

let _cursorMode = 'def';
let _wrapEl = null;
function _getWrap() {
  if (!_wrapEl) _wrapEl = document.getElementById('wrap');
  return _wrapEl;
}
export function setCursor(mode) {
  let css, name;
  if (mode === true || mode === 'ptr')   { css = CURSOR_PTR;         name = 'ptr'; }
  else if (mode === 'left')              { css = CURSOR_ARROW_LEFT;  name = 'left'; }
  else if (mode === 'right')             { css = CURSOR_ARROW_RIGHT; name = 'right'; }
  else if (mode === 'up')                { css = CURSOR_ARROW_UP;    name = 'up'; }
  else                                   { css = CURSOR_DEF;         name = 'def'; }
  _cursorMode = name;
  document.body.style.cursor = css;
  const w = _getWrap();
  if (w) w.style.cursor = css;
}
export function getCursorMode() { return _cursorMode; }

// ── Hover glow animation (desktop only) ─────────────────────────────────────
// Pulsing golden ring around interactive elements on hover.
// Detects both DOM buttons and canvas game objects (via cursor check).
// Call once after DOM is ready (from game.js).
export function initHoverAnim() {
  if (window.matchMedia('(pointer:coarse)').matches) return;
  const ring = document.createElement('div');
  ring.id = 'hover-glow';
  document.body.appendChild(ring);

  const SEL = 'button, .slot, .back-btn, #menu-btn, .ui-btn';

  document.addEventListener('mousemove', e => {
    ring.style.left = e.clientX + 'px';
    ring.style.top  = e.clientY + 'px';
    const el = document.elementFromPoint(e.clientX, e.clientY);
    // Браузер нормализует CSS-строку при чтении body.style.cursor — строгое
    // сравнение не работает. Отслеживаем режим через счётчик в setCursor.
    const isHot = el && (el.closest(SEL) || _cursorMode === 'ptr');
    if (isHot) { ring.style.display = 'block'; ring.classList.add('active'); }
    else        { ring.style.display = 'none';  ring.classList.remove('active'); }
  });
}

// ── Mobile detection ───────────────────────────────────────────────────────
export const isMobile = () =>
  window.matchMedia('(pointer:coarse)').matches || window.innerWidth < 768;
