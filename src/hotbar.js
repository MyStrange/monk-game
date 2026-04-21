// src/hotbar.js — renderHotbar, updateItemCursor, item context menu

import { state }          from './state.js';
import { isMobile }       from './utils.js';
import { renderItemIcon } from './icons.js';
import { itemOnItem }     from './combos.js';
import { showMsgIn }      from './utils.js';
import { trackSlotSelect } from './achievements.js';

const SLOTS = 5;

// ── DOM refs (lazy) ────────────────────────────────────────────────────────
let hotbarEl    = null;
let cursorEl    = null;
let contextMenu = null;
let msgEl       = null;  // главный message el — устанавливается из main.js

export function setHotbarMsgEl(el) { msgEl = el; }

function _getHotbar() {
  if (!hotbarEl) hotbarEl = document.getElementById('hotbar');
  return hotbarEl;
}

// ── renderHotbar ───────────────────────────────────────────────────────────
export function renderHotbar() {
  const hb = _getHotbar();
  if (!hb) return;

  // Скрыть хотбар если всё пустое
  const hasItems = state.inventory.some(i => i !== null);
  hb.style.display = hasItems ? 'flex' : 'none';
  hb.classList.toggle('mobile', isMobile());

  hb.innerHTML = '';
  for (let i = 0; i < SLOTS; i++) {
    const item = state.inventory[i];
    if (!item) continue;  // пустые слоты не рендерим

    const div = document.createElement('div');
    div.className = `slot${i === state.selectedSlot ? ' selected' : ''}`;
    div.dataset.idx = i;

    const svg = renderItemIcon(item);
    if (svg) {
      div.innerHTML = `<span class="slot-icon">${svg}</span>`;
    } else {
      div.textContent = item.label;
    }

    // Tooltip (desktop)
    div.title = item.label;

    // Клик
    div.addEventListener('click',       () => _onSlotClick(i));
    // Правый клик: если предмет в руке — снять выбор, иначе открыть контекст-меню
    div.addEventListener('contextmenu', e  => {
      e.preventDefault();
      if (state.selectedSlot >= 0) { deselectItem(); return; }
      _openContext(item, e.clientX, e.clientY);
    });

    // Long press (mobile)
    let lpTimer = null;
    div.addEventListener('touchstart', e => {
      lpTimer = setTimeout(() => {
        const t = e.touches[0];
        _openContext(item, t.clientX, t.clientY);
      }, 600);
    }, { passive: true });
    div.addEventListener('touchend', () => clearTimeout(lpTimer));

    hb.appendChild(div);
  }

  updateItemCursor();
}

// ── Deselect helper — единая точка отмены выбора предмета ────────────────
// Вызывать из любого источника: клик по выбранному слоту, Esc, ПКМ.
export function deselectItem() {
  if (state.selectedSlot < 0) return false;
  state.selectedSlot = -1;
  trackSlotSelect(-1);
  renderHotbar();
  return true;
}

// ── Global listeners: Esc и правый клик снимают выбор ───────────────────
// ВЕРХНЕУРОВНЕВОЕ ПРАВИЛО: предмет в руке можно вернуть в инвентарь любым
// из способов:
//   1) клик по нему же в хотбаре (переключение off)
//   2) правый клик мыши (в любом месте экрана)
//   3) клавиша Escape
//   4) + штатное поведение комбо / применения на зоне
(function _initGlobalDeselect() {
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') deselectItem();
  });
  document.addEventListener('contextmenu', e => {
    if (state.selectedSlot >= 0) { e.preventDefault(); deselectItem(); }
  });
})();

// ── Slot click logic ───────────────────────────────────────────────────────
function _onSlotClick(idx) {
  const prev = state.selectedSlot;

  if (prev === idx) {
    // Снять выбор
    state.selectedSlot = -1;
    trackSlotSelect(-1);
    renderHotbar();
    return;
  }

  if (prev >= 0 && state.inventory[prev] && state.inventory[idx]) {
    // Попытать комбо
    const result = itemOnItem(prev, idx);
    if (result === null) {
      // Нет комбо — переключить выбор
      state.selectedSlot = idx;
      trackSlotSelect(idx);
    } else if (typeof result === 'string') {
      // Ошибка — показать сообщение, оставить выбор
      if (msgEl) showMsgIn(msgEl, result);
    }
    // false = успех, выбор уже снят внутри itemOnItem → renderHotbar()
    if (result !== false) renderHotbar();
    return;
  }

  // Выбрать слот
  state.selectedSlot = idx;
  trackSlotSelect(idx);
  renderHotbar();
}

// ── Item cursor (desktop) ──────────────────────────────────────────────────
let _mouseX = 0, _mouseY = 0;

export function updateItemCursor() {
  if (isMobile()) {
    if (cursorEl) cursorEl.style.display = 'none';
    return;
  }
  if (!cursorEl) {
    cursorEl = document.createElement('div');
    cursorEl.id = 'item-cursor';
    cursorEl.style.cssText = 'position:fixed;pointer-events:none;z-index:9999;display:none;';
    document.body.appendChild(cursorEl);

    document.addEventListener('mousemove', e => {
      _mouseX = e.clientX;
      _mouseY = e.clientY;
      if (cursorEl.style.display !== 'none') {
        cursorEl.style.left = e.clientX + 'px';
        cursorEl.style.top  = e.clientY + 'px';
      }
    });
  }

  const item = state.selectedSlot >= 0 ? state.inventory[state.selectedSlot] : null;
  if (!item) {
    cursorEl.style.display = 'none';
    return;
  }
  const svg = renderItemIcon(item);
  if (svg) {
    cursorEl.innerHTML = svg;
    // Позиционируем сразу по текущей позиции мыши — без прыжка
    cursorEl.style.left = _mouseX + 'px';
    cursorEl.style.top  = _mouseY + 'px';
    cursorEl.style.display = 'block';
  } else {
    cursorEl.style.display = 'none';
  }
}

// ── Context menu ───────────────────────────────────────────────────────────
function _openContext(item, x, y) {
  if (!contextMenu) {
    contextMenu = document.createElement('div');
    contextMenu.id = 'item-context';
    contextMenu.className = 'item-context';
    document.body.appendChild(contextMenu);
    document.addEventListener('click', e => {
      if (!contextMenu.contains(e.target)) contextMenu.style.display = 'none';
    });
  }

  contextMenu.textContent = item.description || item.label;
  contextMenu.style.cssText = `display:block;position:fixed;left:${x}px;top:${y}px;z-index:9999;`;

  // Гарантируем что меню в viewport
  requestAnimationFrame(() => {
    const r = contextMenu.getBoundingClientRect();
    if (r.right  > window.innerWidth)  contextMenu.style.left = (x - r.width)  + 'px';
    if (r.bottom > window.innerHeight) contextMenu.style.top  = (y - r.height) + 'px';
  });

  clearTimeout(contextMenu._timer);
  contextMenu._timer = setTimeout(() => { contextMenu.style.display = 'none'; }, 3500);
}
