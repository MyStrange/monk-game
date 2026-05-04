// src/lives/punk/items.js — предметы инвентаря туториала (панк-герой).
// Магазин дзена, бутылка, плакат, коктейль. Монах → src/lives/monk/items.js.
//
// Корневой `src/inventory.js` собирает все жизни через спред — см. monk/items.js.

export const ITEM_DEFS_PUNK = {
  bottle: {
    id:          'bottle',
    label:       'бутылка',
    description: 'Пустая бутылка. Стекло мутное. На дне — пыль и обещания.',
  },
  bottle_fuel: {
    id:          'bottle_fuel',
    label:       'горючее',
    description: 'Бутылка с горючей жидкостью. Пахнет резко, идея ещё резче.',
  },
  molotov: {
    id:          'molotov',
    label:       'коктейль',
    description: 'Бутылка с горючим и тряпкой вместо крышки. Не хватает только огня.',
  },
  molotov_lit: {
    id:          'molotov_lit',
    label:       'горит',
    description: 'Огонь по фитилю ползёт. Времени думать не осталось.',
  },
  poster: {
    id:          'poster',
    label:       'плакат',
    description: '«ZEN ЗА $1.99». Бумага мятая, почти как ты.',
  },
};
