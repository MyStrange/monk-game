// src/inventory.js — ITEM_DEFS (общий реестр), makeItem, addItem, getSelectedItem.
//
// Сборка из per-life namespace'ов (монах + панк + будущие жизни).
// Новый предмет монаха → src/lives/monk/items.js. Панка → src/lives/punk/items.js.
// Корневой ITEM_DEFS — спред всех жизней. Иконки → src/icons/items.js, тексты —
// в зонах → src/zone-msgs.js.

import { state }             from './state.js';
import { SaveManager }       from './save.js';
import { trackItemPickup }   from './achievements.js';
import { ITEM_DEFS_MONK }    from './lives/monk/items.js';
import { ITEM_DEFS_PUNK }    from './lives/punk/items.js';

function _saveInv() {
  SaveManager.global.inventory = state.inventory.map(i => i ? { ...i } : null);
  SaveManager.save();
}

// ── Item definitions (объединение всех жизней) ────────────────────────────
// Нет полей `look` и `icon` — оба удалены.
export const ITEM_DEFS = {
  ...ITEM_DEFS_MONK,
  ...ITEM_DEFS_PUNK,
};

// ── makeItem ───────────────────────────────────────────────────────────────
// Создать экземпляр предмета из реестра с расширяемыми runtime-полями.
export function makeItem(id, overrides = {}) {
  const def = ITEM_DEFS[id];
  if (!def) throw new Error(`makeItem: unknown id "${id}"`);

  const base = { ...def };

  // Runtime extensions по типу предмета
  if (id === 'jar' || id === 'jar_open') {
    base.caught   = 0;
    base.glowing  = false;
    base.released = false;
    base.hasWater = false;
  }

  return Object.assign(base, overrides);
}

// ── Inventory helpers ──────────────────────────────────────────────────────
export function addItem(item) {
  const idx = state.inventory.findIndex(s => s === null);
  if (idx === -1) return false;  // инвентарь полон
  state.inventory[idx] = item;
  _saveInv();
  trackItemPickup(item?.id);
  return true;
}

export function removeItem(idx) {
  state.inventory[idx] = null;
  if (state.selectedSlot === idx) state.selectedSlot = -1;
  _saveInv();
}

export function getSelectedItem() {
  if (state.selectedSlot < 0) return null;
  return state.inventory[state.selectedSlot] ?? null;
}

export function getItemSlot(id) {
  return state.inventory.findIndex(item => item?.id === id);
}

// ── Scene navigation block conditions ─────────────────────────────────────
// canLeave(id) проверяет условия выхода по состоянию инвентаря
// Остальные canLeave-условия (например wishPlaying) — в файлах сцен.
export function inventoryCanLeave() {
  // Пример: выйти из buddha нельзя если в банке есть светлячки
  const jar = state.inventory.find(i => i?.id === 'jar' || i?.id === 'jar_open');
  if (jar && jar.caught > 0) return false;
  return true;
}
