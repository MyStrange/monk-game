// src/inventory.js — ITEM_DEFS, makeItem, addItem, getSelectedItem
// Новый предмет: добавить сюда + icons.js + zone-msgs.js

import { state }             from './state.js';
import { SaveManager }       from './save.js';
import { trackItemPickup }   from './achievements.js';

function _saveInv() {
  SaveManager.global.inventory = state.inventory.map(i => i ? { ...i } : null);
  SaveManager.save();
}

// ── Item definitions ───────────────────────────────────────────────────────
// Нет полей `look` и `icon` — оба удалены.
export const ITEM_DEFS = {
  stick: {
    id:          'stick',
    label:       'палка',
    description: 'Кривая, но надёжная. Из таких делают посохи и неприятности.',
  },
  glowstick: {
    id:          'glowstick',
    label:       'светопалка',
    description: 'Палка впитала свет из банки. Светится тихо и ровно.',
  },
  jar: {
    id:          'jar',
    label:       'банка',
    description: 'Пустая стеклянная банка с крышкой. Кулак не влезает.',
  },
  jar_open: {
    id:          'jar_open',
    label:       'банка',
    description: 'Банка без крышки. Крышка ушла вместе со светом.',
  },
  dirt: {
    id:          'dirt',
    label:       'земля',
    description: 'Свежая земля. Тёплая. Кот закопал сюда что-то с усилием.',
  },
  durian: {
    id:          'durian',
    label:       'дуриан',
    description: 'Рис с кусочками фрукта. Пахнет, как носки деда в плацкарте. Или сам дед.',
  },
  fireflower: {
    id:          'fireflower',
    label:       'огнецвет',
    description: 'Цветок, светящийся изнутри. Тёплый на ощупь. Не горит.',
  },
  flower: {
    id:          'flower',
    label:       'гибискус',
    description: 'Красный. Тихий. Не просит ничего. Раскрылся — и всё.',
  },
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
