// src/lives/monk/items.js — предметы инвентаря, принадлежащие жизни монаха.
// Лес, статуя, кот, сцена 2/3/4, дупло. Tutorial (panк) → src/lives/punk/items.js.
//
// Корневой `src/inventory.js` собирает все жизни через спред:
//   export const ITEM_DEFS = { ...ITEM_DEFS_MONK, ...ITEM_DEFS_PUNK };
//
// Чтобы при работе с предметом одной жизни Claude читал только её namespace.

export const ITEM_DEFS_MONK = {
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
