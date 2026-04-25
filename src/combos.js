// src/combos.js — ITEM_COMBO, itemOnItem (предмет × предмет)
// Только предмет×предмет комбо. Предмет×зона — в файлах сцен.
//
// itemOnItem(a, b) →
//   string  = показать сообщение, оставить выбор
//   false   = успех (apply сработал), снять выбор
//   null    = комбо нет (переключить выбор на b)

import { state }             from './state.js';
import { makeItem }          from './inventory.js';
import { renderHotbar }      from './hotbar.js';
import { trackComboSuccess, trackComboFail } from './achievements.js';

// ── Helpers ────────────────────────────────────────────────────────────────
function _key(a, b) {
  return [a.id, b.id].sort().join('+');
}

// ── ITEM_COMBO ─────────────────────────────────────────────────────────────
// condition(a, b): bool — комбо применимо (иначе показать failMsg)
// failMsg: string
// apply(aIdx, bIdx): void — изменить инвентарь
const ITEM_COMBO = {

  // poster + bottle_fuel → molotov (фитиль из плаката)
  'bottle_fuel+poster': {
    condition() { return true; },
    failMsg: '',
    apply(aIdx, bIdx) {
      const a = state.inventory[aIdx];
      const fuelIdx   = a.id === 'bottle_fuel' ? aIdx : bIdx;
      const posterIdx = fuelIdx === aIdx ? bIdx : aIdx;
      state.inventory[fuelIdx]   = makeItem('molotov');
      state.inventory[posterIdx] = null;
      return 'Плакат скрутился в фитиль. Бутылка ждёт огня.';
    },
  },

  // jar + stick → glowstick + jar_open
  // Условие: банка непустая (glowing или caught > 0)
  'jar+stick': {
    condition(a, b) {
      const jar = (a.id === 'jar' || a.id === 'jar_open') ? a : b;
      return jar.glowing || jar.caught > 0;
    },
    failMsg: 'В банке ничего нет. Нечем светить.',
    apply(aIdx, bIdx) {
      const jarIdx   = state.inventory[aIdx]?.id === 'jar' || state.inventory[aIdx]?.id === 'jar_open' ? aIdx : bIdx;
      const stickIdx = jarIdx === aIdx ? bIdx : aIdx;

      // Палка → светопалка
      state.inventory[stickIdx] = makeItem('glowstick');

      // Банка → jar_open, пустая
      const oldJar = state.inventory[jarIdx];
      const newJar = makeItem('jar_open');
      newJar.caught   = 0;
      newJar.glowing  = false;
      newJar.released = false;
      newJar.hasWater = false;
      state.inventory[jarIdx] = newJar;

      return 'Палка впитала свет. Крышка куда-то делась — банка теперь открытая.';
    },
  },
};

// ── Fallback для неизвестных комбо ─────────────────────────────────────────
const _COMBO_FALLBACK = [
  'Два предмета. Ничего не случилось.',
  'Они не разговаривают. Предметы молчат.',
  'Третья попытка. Молчание стало весомее.',
];
const _comboFallbackCounts = {};

// ── itemOnItem ─────────────────────────────────────────────────────────────
export function itemOnItem(aIdx, bIdx) {
  const a = state.inventory[aIdx];
  const b = state.inventory[bIdx];
  if (!a || !b) return null;

  const key = _key(a, b);
  const combo = ITEM_COMBO[key];

  if (!combo) {
    // Нет комбо → ироничный текст (не переключать выбор)
    _comboFallbackCounts[key] = (_comboFallbackCounts[key] ?? 0);
    const msg = _COMBO_FALLBACK[Math.min(_comboFallbackCounts[key], _COMBO_FALLBACK.length - 1)];
    _comboFallbackCounts[key]++;
    trackComboFail();
    return msg;  // string → показать сообщение, оставить выбор
  }

  if (!combo.condition(a, b)) {
    trackComboFail();
    return combo.failMsg;   // string → показать сообщение
  }

  const successMsg = combo.apply(aIdx, bIdx);
  state.selectedSlot = -1;  // верхнеуровневое правило: после крафта убрать из руки
  renderHotbar();
  trackComboSuccess();
  // Если combo.apply вернул строку — показать её и снять выбор; иначе просто снять.
  return typeof successMsg === 'string' && successMsg ? successMsg : false;
}
