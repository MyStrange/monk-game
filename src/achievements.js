// src/achievements.js — ACHIEVEMENT_DEFS, track, unlock, toast, screen
// Storage keys:
//   'monk_ach'       → JSON array of unlocked ids
//   'monk_ach_stats' → JSON snapshot of persistent stats

import { renderAchIconByKey, renderQuestionIcon } from './icons.js';

// ── Definitions ────────────────────────────────────────────────────────────
// Все ачивки — про off-script поведение: клики, перебор, случайные открытия.
// Сюжетные вехи (медитация, руны на камень, светлячки, сцены) намеренно
// ачивками НЕ отмечаются — их и так делает каждый игрок.
export const ACHIEVEMENT_DEFS = [
  // ── Повторение (stub) ────────────────────────────────────────────────
  { id:'stub_1', iconKey:'eye',
    title:'Путь паломника', desc:'Пять раз в одну точку. Зачем-то.',
    condition: s => s.maxSpotClicks >= 5 },
  { id:'stub_2', iconKey:'eye',
    title:'Колесо сансары', desc:'Десять раз в одно место. Уже интересно.',
    condition: s => s.maxSpotClicks >= 10 },
  { id:'stub_3', iconKey:'cycle',
    title:'Просветление повторением', desc:'Пятнадцать раз в то же место. Ну всё, хватит.',
    condition: s => s.maxSpotClicks >= 15 },

  // ── Исследование (exp) ───────────────────────────────────────────────
  { id:'exp_1', iconKey:'compass',
    title:'Первые шаги', desc:'Потыкал в три разных места.',
    condition: s => s.zonesVisited.size >= 3 },
  { id:'exp_2', iconKey:'compass',
    title:'Любопытный ум', desc:'Пять мест. Уже есть любимое.',
    condition: s => s.zonesVisited.size >= 5 },
  { id:'exp_3', iconKey:'compass',
    title:'Знаток пустоты', desc:'Десять мест. Почти всё обошёл.',
    condition: s => s.zonesVisited.size >= 10 },

  // ── Пустота ──────────────────────────────────────────────────────────
  { id:'void_1', iconKey:'void',
    title:'Зов пустоты', desc:'Три клика мимо всего. Бывает.',
    condition: s => s.emptyClickCount >= 3 },
  { id:'void_2', iconKey:'void',
    title:'Мастер ничто', desc:'Десять раз мимо. Упорно.',
    condition: s => s.emptyClickCount >= 10 },
  { id:'void_3', iconKey:'void',
    title:'Дзен пустого клика', desc:'Двадцать пять кликов в никуда.',
    condition: s => s.emptyClickCount >= 25 },

  // ── Медитация ────────────────────────────────────────────────────────
  { id:'sit_many', iconKey:'lotusBr',
    title:'Привычка сидеть', desc:'Садишься уже десятый раз. Привык.',
    condition: s => s.sitCount >= 10 },
  { id:'sit_long', iconKey:'moon',
    title:'Длинный вечер', desc:'Пять минут без движения.',
    condition: s => s.maxSitSeconds >= 300 },
  { id:'sit_impatient', iconKey:'hourglass',
    title:'Нетерпеливый', desc:'Сел помедитировать и встал через три секунды.',
    condition: s => s.impatientSit },

  // ── Символы (перебор) ────────────────────────────────────────────────
  { id:'sym_20', iconKey:'runeBr',
    title:'Голос тишины', desc:'Двадцать рун. Хотя хватило бы пяти.',
    condition: s => s.symbolsDelivered >= 20 },

  // ── Инвентарь / крафт ────────────────────────────────────────────────
  { id:'jar_found', iconKey:'jar',
    title:'Что-то в руках', desc:'Нашёл банку. Теперь куда её?',
    condition: s => s.itemsPickedUp.has('jar') },
  { id:'pick_all', iconKey:'pouch',
    title:'Всё на месте', desc:'В руках побывало всё.',
    condition: s => s.itemsPickedUp.size >= 7 },
  { id:'first_combo', iconKey:'jarGlow',
    title:'Впервые вместе', desc:'Соединил два предмета — получилось.',
    condition: s => s.combosMade >= 1 },

  // ── Off-script: неудачные комбы ──────────────────────────────────────
  { id:'combo_fail_5', iconKey:'alchemyFail',
    title:'Алхимик-любитель', desc:'Пять раз пробовал соединить несоединимое.',
    condition: s => s.comboFails >= 5 },
  { id:'combo_fail_20', iconKey:'alchemyFail',
    title:'Упрямый алхимик', desc:'Двадцать раз. Всё ещё не выходит.',
    condition: s => s.comboFails >= 20 },

  // ── Off-script: выбор слота ──────────────────────────────────────────
  { id:'slot_toggle', iconKey:'toggle',
    title:'Сомневающийся', desc:'Десять раз подряд выбрал и отменил предмет.',
    condition: s => s.maxSlotToggleStreak >= 10 },

  // ── Off-script: предмет × зона ──────────────────────────────────────
  { id:'monk_poke', iconKey:'speech',
    title:'Бестолковый разговор', desc:'Ткнул в монаха тремя разными предметами.',
    condition: s => s.monkPokeCount >= 3 },
  { id:'statue_poke', iconKey:'eye',
    title:'Кощунство', desc:'Пять раз применил предмет к статуе.',
    condition: s => s.statuePokeCount >= 5 },
  { id:'water_waste', iconKey:'splash',
    title:'Разбрызгиватель', desc:'Вылил воду куда попало.',
    condition: s => s.waterWasted },
  { id:'stick_drink', iconKey:'stickDrink',
    title:'Палка не пьёт', desc:'Попробовал напоить палку водой. Зачем.',
    condition: s => s.stickDrinkTried },
  { id:'fire_water', iconKey:'fizz',
    title:'Пшик', desc:'Полил огненный цветок водой. Пар и разочарование.',
    condition: s => s.fireWatered },
  { id:'durian_gift', iconKey:'durianGift',
    title:'Подарок, от которого не отказываются', desc:'Пытался всучить дуриан кому попало.',
    condition: s => s.durianGiftTried },

  // ── Off-script: кот и светлячки ──────────────────────────────────────
  { id:'cat_hiss', iconKey:'catSad',
    title:'Кота может обидеть каждый', desc:'Плеснул в кота водой. Он зашипел и ушёл.',
    condition: s => s.catHissed },
  { id:'sit_on_cat', iconKey:'catSit',
    title:'Йога с котом', desc:'Сел медитировать прямо на кота. Кот не согласился, но и не ушёл.',
    condition: s => s.satOnCat },
  { id:'durian_drop', iconKey:'durianDrop',
    title:'Каша сверху', desc:'Уронил дуриан монаху на макушку с высоты птичьего полёта.',
    condition: s => s.durianOnMonkHead },
  { id:'fly_scare_1', iconKey:'release',
    title:'Мечтатель-светлолов', desc:'Щёлкнул по светлячку без банки. Сбежал.',
    condition: s => s.fliesScared >= 1 },
  { id:'fly_scare_many', iconKey:'release',
    title:'Разгонщик света', desc:'Десять светлячков распугано без толку.',
    condition: s => s.fliesScared >= 10 },

  // ── Финал ────────────────────────────────────────────────────────────
  { id:'wheel', iconKey:'cycle',
    title:'Колесо повернулось', desc:'Надпись засветилась целиком.',
    condition: s => s.inscriptionReady },
];

// ── Runtime state ──────────────────────────────────────────────────────────
const ACH_KEY   = 'monk_ach';
const STATS_KEY = 'monk_ach_stats';
const TOAST_DUR = 3800;

let _unlocked = new Set();

// Начальное состояние stats; Set'ы/структуры не-JSON восстанавливаем при load
function _freshStats() {
  return {
    // зоны / пустота / стаб
    maxZoneClicks:       0,
    zoneClickCounts:     {},
    zonesVisited:        new Set(),
    emptyClickCount:     0,
    maxSpotClicks:       0,
    spotCounts:          {},

    // медитация
    sitCount:            0,
    maxSitSeconds:       0,
    _sitStartMs:         0,
    impatientSit:        false,

    // символы (перебор)
    symbolsDelivered:    0,

    // инвентарь / крафт
    itemsPickedUp:       new Set(),
    combosMade:          0,
    comboFails:          0,

    // слот (toggle)
    _slotToggleStreak:   0,
    maxSlotToggleStreak: 0,
    _lastSlotIdx:        -1,

    // off-script: предмет × зона
    monkPokeItems:       new Set(),
    monkPokeCount:       0,
    statuePokeCount:     0,
    waterWasted:         false,
    stickDrinkTried:     false,
    fireWatered:         false,
    durianGiftTried:     false,

    // кот / светлячки
    catHissed:           false,
    satOnCat:            false,
    fliesScared:         0,

    // scene4 (вид сверху)
    durianOnMonkHead:    false,

    // финал
    inscriptionReady:    false,
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
      for (const k of [
        'maxZoneClicks','emptyClickCount','maxSpotClicks',
        'sitCount','maxSitSeconds','symbolsDelivered',
        'combosMade','comboFails','maxSlotToggleStreak',
        'monkPokeCount','statuePokeCount','fliesScared',
      ]) if (typeof raw[k] === 'number') fresh[k] = raw[k];
      for (const k of [
        'impatientSit','waterWasted','stickDrinkTried',
        'fireWatered','durianGiftTried','catHissed',
        'satOnCat','durianOnMonkHead','inscriptionReady',
      ]) if (typeof raw[k] === 'boolean') fresh[k] = raw[k];
      if (raw.zoneClickCounts && typeof raw.zoneClickCounts === 'object') fresh.zoneClickCounts = raw.zoneClickCounts;
      if (raw.spotCounts      && typeof raw.spotCounts      === 'object') fresh.spotCounts      = raw.spotCounts;
      if (Array.isArray(raw.zonesVisited))   fresh.zonesVisited   = new Set(raw.zonesVisited);
      if (Array.isArray(raw.itemsPickedUp))  fresh.itemsPickedUp  = new Set(raw.itemsPickedUp);
      if (Array.isArray(raw.monkPokeItems))  fresh.monkPokeItems  = new Set(raw.monkPokeItems);
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
      maxZoneClicks:       _stats.maxZoneClicks,
      zoneClickCounts:     _stats.zoneClickCounts,
      zonesVisited:        [..._stats.zonesVisited],
      emptyClickCount:     _stats.emptyClickCount,
      maxSpotClicks:       _stats.maxSpotClicks,
      spotCounts:          _stats.spotCounts,
      sitCount:            _stats.sitCount,
      maxSitSeconds:       _stats.maxSitSeconds,
      impatientSit:        _stats.impatientSit,
      symbolsDelivered:    _stats.symbolsDelivered,
      itemsPickedUp:       [..._stats.itemsPickedUp],
      combosMade:          _stats.combosMade,
      comboFails:          _stats.comboFails,
      maxSlotToggleStreak: _stats.maxSlotToggleStreak,
      monkPokeItems:       [..._stats.monkPokeItems],
      monkPokeCount:       _stats.monkPokeCount,
      statuePokeCount:     _stats.statuePokeCount,
      waterWasted:         _stats.waterWasted,
      stickDrinkTried:     _stats.stickDrinkTried,
      fireWatered:         _stats.fireWatered,
      durianGiftTried:     _stats.durianGiftTried,
      catHissed:           _stats.catHissed,
      satOnCat:            _stats.satOnCat,
      fliesScared:         _stats.fliesScared,
      durianOnMonkHead:    _stats.durianOnMonkHead,
      inscriptionReady:    _stats.inscriptionReady,
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
    if (secs < 3) _stats.impatientSit = true;
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

// Крафт: успешное соединение двух предметов
export function trackComboSuccess() {
  _stats.combosMade++;
  _after();
}

// Крафт: попытка, которая не сработала (failMsg)
export function trackComboFail() {
  _stats.comboFails++;
  _after();
}

// Выбор/отмена слота в хотбаре. toggle = последовательность выбор→отмена.
export function trackSlotSelect(newIdx) {
  if (newIdx === -1 && _stats._lastSlotIdx >= 0) {
    _stats._slotToggleStreak++;
    _stats.maxSlotToggleStreak = Math.max(_stats.maxSlotToggleStreak, _stats._slotToggleStreak);
  } else if (newIdx >= 0 && _stats._lastSlotIdx === -1) {
    // продолжение серии — ничего
  } else if (newIdx >= 0 && _stats._lastSlotIdx >= 0 && newIdx !== _stats._lastSlotIdx) {
    // переключение между слотами — сброс серии
    _stats._slotToggleStreak = 0;
  }
  _stats._lastSlotIdx = newIdx;
  _after();
}

// Применение предмета к зоне — для off-script ачивок.
// itemId — id активного предмета, zoneId — имя зоны
export function trackItemOnZone(itemId, zoneId) {
  if (!itemId || !zoneId) return;
  if (zoneId === 'monk') {
    _stats.monkPokeItems.add(itemId);
    _stats.monkPokeCount = _stats.monkPokeItems.size;
  }
  if (zoneId === 'statue') _stats.statuePokeCount++;
  // вода (открытая банка с водой) на не-кота
  if (itemId === 'jar_open' && zoneId !== 'cat' && zoneId !== 'water') {
    _stats.waterWasted = true;
  }
  // напоить палку
  if (itemId === 'jar_open' && zoneId === 'stick') _stats.stickDrinkTried = true;
  // огненный цветок + вода
  if (itemId === 'jar_open' && zoneId === 'fireflower') _stats.fireWatered = true;
  // дуриан не коту и не в землю (это сюжет)
  if (itemId === 'durian' && zoneId !== 'cat' && zoneId !== 'dirt') {
    _stats.durianGiftTried = true;
  }
  _after();
}

export function trackCatHiss() {
  _stats.catHissed = true;
  _after();
}

export function trackSitOnCat() {
  _stats.satOnCat = true;
  _after();
}

export function trackFlyScared() {
  _stats.fliesScared++;
  _after();
}

export function trackDurianOnMonkHead() {
  _stats.durianOnMonkHead = true;
  _after();
}

export function trackInscriptionReady() {
  _stats.inscriptionReady = true;
  _after();
}

// ── Deprecated no-ops (оставлены для совместимости импортов) ──────────────
// Эти события больше не дают ачивок — это сюжетные действия.
export function trackRockActivated()  {}
export function trackMonkDialogDone() {}
export function trackFlyCaught()      {}
export function trackFliesReleased()  {}
export function trackGlowstickMade()  {}
export function trackWaterJar()       {}
export function trackCatBury()        {}
export function trackSceneVisit()     {}

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
