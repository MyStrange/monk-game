// src/achievements.js — ACHIEVEMENT_DEFS, track, unlock, toast, screen
// Storage keys:
//   'monk_ach'       → JSON array of unlocked ids
//   'monk_ach_stats' → JSON snapshot of persistent stats

import { renderAchIconByKey, renderQuestionIcon } from './icons.js';

// ── Definitions ────────────────────────────────────────────────────────────
// Каждая ачивка — iconKey (строка из ACH_ICON_MAP) + condition(stats).
// Иконки рендерятся через renderAchIconByKey(iconKey).
export const ACHIEVEMENT_DEFS = [
  // ── Повторение (stub) ────────────────────────────────────────────────
  {
    id:        'stub_1', iconKey: 'eye',
    title:     'Путь паломника',
    desc:      'Пять раз в одну точку. Место запомнило тебя.',
    condition: s => s.maxSpotClicks >= 5,
  },
  {
    id:        'stub_2', iconKey: 'eye',
    title:     'Колесо сансары',
    desc:      'Десять раз в одно и то же место. Ты и есть колесо.',
    condition: s => s.maxSpotClicks >= 10,
  },
  {
    id:        'stub_3', iconKey: 'cycle',
    title:     'Просветление повторением',
    desc:      'Пятнадцать. Точка стала частью тебя. Или ты — её.',
    condition: s => s.maxSpotClicks >= 15,
  },

  // ── Исследование (exp) ───────────────────────────────────────────────
  {
    id:        'exp_1', iconKey: 'compass',
    title:     'Первые шаги',
    desc:      'Три разных места. Лес запомнил.',
    condition: s => s.zonesVisited.size >= 3,
  },
  {
    id:        'exp_2', iconKey: 'compass',
    title:     'Любопытный ум',
    desc:      'Пять мест. Всё разное, но одно и то же.',
    condition: s => s.zonesVisited.size >= 5,
  },
  {
    id:        'exp_3', iconKey: 'compass',
    title:     'Знаток пустоты',
    desc:      'Десять мест. Ты обошёл всё. Теперь можно начинать сначала.',
    condition: s => s.zonesVisited.size >= 10,
  },

  // ── Пустота (void) ───────────────────────────────────────────────────
  {
    id:        'void_1', iconKey: 'void',
    title:     'Зов пустоты',
    desc:      'Ты нажал туда, где ничего нет. Три раза.',
    condition: s => s.emptyClickCount >= 3,
  },
  {
    id:        'void_2', iconKey: 'void',
    title:     'Мастер ничто',
    desc:      'Десять кликов в пустоту. Пустота благодарна.',
    condition: s => s.emptyClickCount >= 10,
  },
  {
    id:        'void_3', iconKey: 'void',
    title:     'Дзен пустого клика',
    desc:      'Двадцать пять раз. Это и есть путь без пути.',
    condition: s => s.emptyClickCount >= 25,
  },

  // ── Медитация (lotus / moon) ─────────────────────────────────────────
  {
    id:        'sit_1', iconKey: 'lotus',
    title:     'Первый вдох',
    desc:      'Ты сел. Мир не заметил. И это хорошо.',
    condition: s => s.sitCount >= 1,
  },
  {
    id:        'sit_many', iconKey: 'lotusBr',
    title:     'Привычка сидеть',
    desc:      'Десять раз садился. Колени понимают.',
    condition: s => s.sitCount >= 10,
  },
  {
    id:        'sit_long', iconKey: 'moon',
    title:     'Длинный вечер',
    desc:      'Пять минут без движения. Время стало гостем.',
    condition: s => s.maxSitSeconds >= 300,
  },

  // ── Символы / руны ───────────────────────────────────────────────────
  {
    id:        'sym_1', iconKey: 'rune',
    title:     'Первый знак',
    desc:      'Одна руна дошла до камня. Камень промолчал.',
    condition: s => s.symbolsDelivered >= 1,
  },
  {
    id:        'sym_5', iconKey: 'runeBr',
    title:     'Пять имён',
    desc:      'Пять рун. Надпись стала ярче.',
    condition: s => s.symbolsDelivered >= 5,
  },
  {
    id:        'sym_20', iconKey: 'runeBr',
    title:     'Голос тишины',
    desc:      'Двадцать знаков. Ты говоришь с тем, чего нет.',
    condition: s => s.symbolsDelivered >= 20,
  },

  // ── Инвентарь ────────────────────────────────────────────────────────
  {
    id:        'pick_1', iconKey: 'hand',
    title:     'Что-то в руках',
    desc:      'Ты подобрал первую вещь. Теперь она твоя. Или ты — её.',
    condition: s => s.itemsPickedUp.size >= 1,
  },
  {
    id:        'pick_all', iconKey: 'pouch',
    title:     'Всё на месте',
    desc:      'Ты подержал каждый предмет хотя бы раз. Коллекционер покоя.',
    condition: s => s.itemsPickedUp.size >= 7,
  },

  // ── Камни-руны ───────────────────────────────────────────────────────
  {
    id:        'rock_1', iconKey: 'stoneLit',
    title:     'Камень ожил',
    desc:      'Один рунный камень вспыхнул. Другие ждут.',
    condition: s => s.rocksActivated >= 1,
  },
  {
    id:        'rock_all', iconKey: 'stoneLit',
    title:     'Три огня',
    desc:      'Все три камня горят. Корни слушают.',
    condition: s => s.rocksActivated >= 3,
  },

  // ── Диалог с монахом ─────────────────────────────────────────────────
  {
    id:        'monk_talk', iconKey: 'speech',
    title:     'Разговор с красным',
    desc:      'Ты всё-таки заговорил с монахом. И он — с тобой.',
    condition: s => s.monkDialogDone,
  },
  {
    id:        'flower_given', iconKey: 'flower',
    title:     'Цветок в ладонях',
    desc:      'Ты взял цветок. Не сорвал — получил.',
    condition: s => s.itemsPickedUp.has('flower'),
  },

  // ── Светлячки ────────────────────────────────────────────────────────
  {
    id:        'fly_catch', iconKey: 'firefly',
    title:     'Горстка света',
    desc:      'Первый светлячок в банке. Банка теплеет.',
    condition: s => s.fliesCaught >= 1,
  },
  {
    id:        'fly_full', iconKey: 'jarGlow',
    title:     'Полная банка',
    desc:      'Девять огоньков. Дальше — только отпустить.',
    condition: s => s.fliesCaught >= 9,
  },
  {
    id:        'fly_free', iconKey: 'release',
    title:     'Отпустить',
    desc:      'Ты открыл банку. Свет ушёл, загадка осталась.',
    condition: s => s.fliesReleased,
  },

  // ── Крафт ────────────────────────────────────────────────────────────
  {
    id:        'glowstick_make', iconKey: 'flame',
    title:     'Палка и свет',
    desc:      'Палка в светящейся жиже. Почти факел, почти нет.',
    condition: s => s.glowstickMade,
  },
  {
    id:        'water_jar', iconKey: 'drop',
    title:     'Банка воды',
    desc:      'Ты набрал воды. Простой поступок. Тяжёлая банка.',
    condition: s => s.waterJarMade,
  },

  // ── Кот ──────────────────────────────────────────────────────────────
  {
    id:        'cat_hiss', iconKey: 'catSad',
    title:     'Кота может обидеть каждый',
    desc:      'Ты плеснул в кота водой. Он долго будет помнить.',
    condition: s => s.catHissed,
  },
  {
    id:        'cat_bury', iconKey: 'paw',
    title:     'Земля и кот',
    desc:      'Ты похоронил кота. Ритуал тихий, но важный.',
    condition: s => s.catBuryDone,
  },

  // ── Сцены ────────────────────────────────────────────────────────────
  {
    id:        'see_tree', iconKey: 'treeTop',
    title:     'С высоты',
    desc:      'Ты увидел сцену сверху. Лес оказался меньше, чем думал.',
    condition: s => s.scenesVisited.has('scene4'),
  },
  {
    id:        'enter_inside', iconKey: 'door',
    title:     'Внутрь',
    desc:      'Ты вошёл в дупло. Снаружи остался кто-то другой.',
    condition: s => s.scenesVisited.has('inside'),
  },
  {
    id:        'heart_seen', iconKey: 'heart',
    title:     'Сердце огня',
    desc:      'Ты стоял перед ним. Оно стояло перед тобой.',
    condition: s => s.scenesVisited.has('inside_heart'),
  },
  {
    id:        'fireflower_got', iconKey: 'flame',
    title:     'Огненный цветок',
    desc:      'Ты держишь огонь в ладонях. Он не жжётся — пока.',
    condition: s => s.itemsPickedUp.has('fireflower'),
  },

  // ── Финальное / общее ────────────────────────────────────────────────
  {
    id:        'nature', iconKey: 'leaf',
    title:     'Лес слушает',
    desc:      'Ты собрал всё природное: землю, листья, цветы.',
    condition: s => s.itemsPickedUp.has('dirt') && s.itemsPickedUp.has('flower') && s.itemsPickedUp.has('durian'),
  },
  {
    id:        'wheel', iconKey: 'cycle',
    title:     'Колесо повернулось',
    desc:      'Ты закончил круг. Следующая жизнь — твоя.',
    condition: s => s.inscriptionReady,
  },
];

// ── Runtime state ──────────────────────────────────────────────────────────
const ACH_KEY   = 'monk_ach';
const STATS_KEY = 'monk_ach_stats';
const TOAST_DUR = 3800;

let _unlocked = new Set();

// Начальное состояние stats; Set'ы/структуры не-JSON восстанавливаем при load
function _freshStats() {
  return {
    // повторение / зоны / пустота
    maxZoneClicks:     0,
    zoneClickCounts:   {},
    zonesVisited:      new Set(),
    emptyClickCount:   0,
    maxSpotClicks:     0,
    spotCounts:        {},

    // медитация
    sitCount:          0,
    maxSitSeconds:     0,
    _sitStartMs:       0,

    // символы
    symbolsDelivered:  0,

    // инвентарь
    itemsPickedUp:     new Set(),

    // камни
    rocksActivated:    0,

    // диалог с монахом
    monkDialogDone:    false,

    // светлячки
    fliesCaught:       0,
    fliesReleased:     false,

    // крафт
    glowstickMade:     false,
    waterJarMade:      false,

    // кот
    catHissed:         false,
    catBuryDone:       false,

    // сцены
    scenesVisited:     new Set(),

    // активация надписи
    inscriptionReady:  false,
  };
}

let _stats = _freshStats();

// ── Storage ────────────────────────────────────────────────────────────────
export function loadAchievements() {
  try {
    const saved = JSON.parse(localStorage.getItem(ACH_KEY) || '[]');
    _unlocked = new Set(saved);
  } catch {
    _unlocked = new Set();
  }
  try {
    const raw = JSON.parse(localStorage.getItem(STATS_KEY) || 'null');
    if (raw && typeof raw === 'object') {
      const fresh = _freshStats();
      // числа / булевы поля
      for (const k of [
        'maxZoneClicks','emptyClickCount','maxSpotClicks',
        'sitCount','maxSitSeconds','symbolsDelivered','rocksActivated',
        'fliesCaught',
      ]) if (typeof raw[k] === 'number') fresh[k] = raw[k];
      for (const k of [
        'monkDialogDone','fliesReleased','glowstickMade','waterJarMade',
        'catHissed','catBuryDone','inscriptionReady',
      ]) if (typeof raw[k] === 'boolean') fresh[k] = raw[k];
      // объекты счётчиков
      if (raw.zoneClickCounts && typeof raw.zoneClickCounts === 'object') fresh.zoneClickCounts = raw.zoneClickCounts;
      if (raw.spotCounts && typeof raw.spotCounts === 'object')           fresh.spotCounts      = raw.spotCounts;
      // массивы → Set
      if (Array.isArray(raw.zonesVisited))  fresh.zonesVisited  = new Set(raw.zonesVisited);
      if (Array.isArray(raw.itemsPickedUp)) fresh.itemsPickedUp = new Set(raw.itemsPickedUp);
      if (Array.isArray(raw.scenesVisited)) fresh.scenesVisited = new Set(raw.scenesVisited);
      _stats = fresh;
    }
  } catch {
    _stats = _freshStats();
  }
}

function _save() {
  try { localStorage.setItem(ACH_KEY, JSON.stringify([..._unlocked])); } catch {}
}

function _saveStats() {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify({
      maxZoneClicks:    _stats.maxZoneClicks,
      zoneClickCounts:  _stats.zoneClickCounts,
      zonesVisited:     [..._stats.zonesVisited],
      emptyClickCount:  _stats.emptyClickCount,
      maxSpotClicks:    _stats.maxSpotClicks,
      spotCounts:       _stats.spotCounts,
      sitCount:         _stats.sitCount,
      maxSitSeconds:    _stats.maxSitSeconds,
      symbolsDelivered: _stats.symbolsDelivered,
      itemsPickedUp:    [..._stats.itemsPickedUp],
      rocksActivated:   _stats.rocksActivated,
      monkDialogDone:   _stats.monkDialogDone,
      fliesCaught:      _stats.fliesCaught,
      fliesReleased:    _stats.fliesReleased,
      glowstickMade:    _stats.glowstickMade,
      waterJarMade:     _stats.waterJarMade,
      catHissed:        _stats.catHissed,
      catBuryDone:      _stats.catBuryDone,
      scenesVisited:    [..._stats.scenesVisited],
      inscriptionReady: _stats.inscriptionReady,
    }));
  } catch {}
}

// ── Reset (для "Начать сначала") ──────────────────────────────────────────
export function resetAchievementStats() {
  _stats = _freshStats();
  _saveStats();
}

// ── Tracking ───────────────────────────────────────────────────────────────
export function trackZoneClick(zone) {
  _stats.zonesVisited.add(zone);
  _stats.zoneClickCounts[zone] = (_stats.zoneClickCounts[zone] ?? 0) + 1;
  _stats.maxZoneClicks = Math.max(_stats.maxZoneClicks, _stats.zoneClickCounts[zone]);
  _after();
}

export function trackEmptyClick() {
  _stats.emptyClickCount++;
  _after();
}

// cx, cy — canvas coords; sceneId — 'main'|'scene2'|'buddha'
export function trackSpotClick(cx, cy, sceneId) {
  const BUCKET = 25;
  const key = `${sceneId}:${Math.floor(cx / BUCKET)},${Math.floor(cy / BUCKET)}`;
  _stats.spotCounts[key] = (_stats.spotCounts[key] ?? 0) + 1;
  _stats.maxSpotClicks = Math.max(_stats.maxSpotClicks, _stats.spotCounts[key]);
  _after();
}

// Медитация — сел / встал
export function trackSitDown() {
  _stats.sitCount++;
  _stats._sitStartMs = Date.now();
  _after();
}

export function trackStandUp() {
  if (_stats._sitStartMs) {
    const secs = (Date.now() - _stats._sitStartMs) / 1000;
    _stats.maxSitSeconds = Math.max(_stats.maxSitSeconds, secs);
    _stats._sitStartMs = 0;
    _after();
  }
}

export function trackSymbolDelivered() {
  _stats.symbolsDelivered++;
  _after();
}

export function trackItemPickup(itemId) {
  if (!itemId) return;
  _stats.itemsPickedUp.add(itemId);
  _after();
}

export function trackRockActivated() {
  _stats.rocksActivated = Math.min(3, _stats.rocksActivated + 1);
  _after();
}

export function trackMonkDialogDone() {
  _stats.monkDialogDone = true;
  _after();
}

export function trackFlyCaught() {
  _stats.fliesCaught++;
  _after();
}

export function trackFliesReleased() {
  _stats.fliesReleased = true;
  _after();
}

export function trackGlowstickMade() {
  _stats.glowstickMade = true;
  _after();
}

export function trackWaterJar() {
  _stats.waterJarMade = true;
  _after();
}

export function trackCatHiss() {
  _stats.catHissed = true;
  _after();
}

export function trackCatBury() {
  _stats.catBuryDone = true;
  _after();
}

export function trackSceneVisit(sceneId) {
  if (!sceneId) return;
  _stats.scenesVisited.add(sceneId);
  _after();
}

export function trackInscriptionReady() {
  _stats.inscriptionReady = true;
  _after();
}

function _after() {
  _saveStats();
  _checkAll();
}

function _checkAll() {
  for (const def of ACHIEVEMENT_DEFS) {
    if (!_unlocked.has(def.id) && def.condition(_stats)) {
      _unlock(def);
    }
  }
}

// ── Unlock + toast ─────────────────────────────────────────────────────────
function _unlock(def) {
  if (_unlocked.has(def.id)) return;
  _unlocked.add(def.id);
  _save();
  _showToast(def);
}

let _toastTimer = null;
function _showToast(def) {
  let toast = document.getElementById('ach-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'ach-toast';
    toast.className = 'ach-toast';
    document.getElementById('wrap')?.appendChild(toast);
  }
  toast.innerHTML = `
    <span class="ach-toast-icon">${renderAchIconByKey(def.iconKey)}</span>
    <span class="ach-toast-text">
      <strong>${def.title}</strong>
      <span>${def.desc}</span>
    </span>`;
  toast.classList.add('visible');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => toast.classList.remove('visible'), TOAST_DUR);
}

// ── Achievement screen ─────────────────────────────────────────────────────
let _achScreenEl = null;

export function openAchievements() {
  if (!_achScreenEl) _achScreenEl = _buildScreen();
  _refreshScreen();
  _achScreenEl.style.display = 'flex';
}

export function closeAchievements() {
  if (_achScreenEl) _achScreenEl.style.display = 'none';
}

function _buildScreen() {
  const el = document.createElement('div');
  el.id = 'ach-screen';
  el.className = 'ach-screen';
  el.innerHTML = `
    <div class="ach-screen-inner">
      <div class="ach-header">
        <span class="ach-title">достижения</span>
        <span class="ach-count" id="ach-count"></span>
        <button class="ach-close" onclick="closeAchievements()">✕</button>
      </div>
      <div class="ach-list" id="ach-list"></div>
    </div>`;
  document.getElementById('wrap')?.appendChild(el);
  return el;
}

function _refreshScreen() {
  const countEl = document.getElementById('ach-count');
  const listEl  = document.getElementById('ach-list');
  if (!countEl || !listEl) return;

  countEl.textContent = `${_unlocked.size} / ${ACHIEVEMENT_DEFS.length}`;
  listEl.innerHTML = ACHIEVEMENT_DEFS.map(def => {
    const done = _unlocked.has(def.id);
    const icon = done ? renderAchIconByKey(def.iconKey) : renderQuestionIcon();
    return `<div class="ach-item ${done ? 'unlocked' : 'locked'}">
      <span class="ach-item-icon">${icon}</span>
      <span class="ach-item-body">
        <strong>${done ? def.title : '???'}</strong>
        <span>${done ? def.desc : ''}</span>
      </span>
    </div>`;
  }).join('');
}
