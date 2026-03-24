// src/achievements.js — ACHIEVEMENT_DEFS, track, unlock, toast, screen
// Storage key: 'monk_ach' → JSON array of unlocked ids

import { renderEyeIcon, renderCompassIcon, renderVoidIcon } from './icons.js';

// ── Definitions ────────────────────────────────────────────────────────────
// condition(stats) → bool
// stats: { maxZoneClicks, zonesVisited (Set), emptyClickCount }
export const ACHIEVEMENT_DEFS = [
  // stub — повторные клики по одному месту
  {
    id:        'stub_1',
    category:  'stub',
    level:     1,
    title:     'Путь паломника',
    desc:      'Пять раз на одно место. Оно всё ещё там.',
    icon:      renderEyeIcon,
    condition: s => s.maxZoneClicks >= 5,
  },
  {
    id:        'stub_2',
    category:  'stub',
    level:     2,
    title:     'Колесо сансары',
    desc:      'Пятнадцать кликов по одному месту. Ты и есть колесо.',
    icon:      renderEyeIcon,
    condition: s => s.maxZoneClicks >= 15,
  },
  {
    id:        'stub_3',
    category:  'stub',
    level:     3,
    title:     'Просветление повторением',
    desc:      'Тридцать раз. Место устало. Ты — нет.',
    icon:      renderEyeIcon,
    condition: s => s.maxZoneClicks >= 30,
  },

  // exp — уникальные зоны
  {
    id:        'exp_1',
    category:  'exp',
    level:     1,
    title:     'Первые шаги',
    desc:      'Три разных места. Лес запомнил.',
    icon:      renderCompassIcon,
    condition: s => s.zonesVisited.size >= 3,
  },
  {
    id:        'exp_2',
    category:  'exp',
    level:     2,
    title:     'Любопытный ум',
    desc:      'Пять мест. Всё разное, но одно и то же.',
    icon:      renderCompassIcon,
    condition: s => s.zonesVisited.size >= 5,
  },
  {
    id:        'exp_3',
    category:  'exp',
    level:     3,
    title:     'Знаток пустоты',
    desc:      'Ты обошёл всё. Теперь можно начинать сначала.',
    icon:      renderCompassIcon,
    condition: s => s.zonesVisited.size >= 7,
  },

  // void — клики в пустоту
  {
    id:        'void_1',
    category:  'void',
    level:     1,
    title:     'Зов пустоты',
    desc:      'Ты нажал туда, где ничего нет. Три раза.',
    icon:      renderVoidIcon,
    condition: s => s.emptyClickCount >= 3,
  },
  {
    id:        'void_2',
    category:  'void',
    level:     2,
    title:     'Мастер ничто',
    desc:      'Десять кликов в пустоту. Пустота благодарна.',
    icon:      renderVoidIcon,
    condition: s => s.emptyClickCount >= 10,
  },
  {
    id:        'void_3',
    category:  'void',
    level:     3,
    title:     'Дзен пустого клика',
    desc:      'Двадцать пять раз. Это и есть путь без пути.',
    icon:      renderVoidIcon,
    condition: s => s.emptyClickCount >= 25,
  },
];

// ── Runtime state ──────────────────────────────────────────────────────────
const ACH_KEY = 'monk_ach';
const TOAST_DUR = 3800;

let _unlocked = new Set();
let _stats = {
  maxZoneClicks:  0,
  zoneClickCounts: {},  // zone → count
  zonesVisited:   new Set(),
  emptyClickCount: 0,
};

// ── Storage ────────────────────────────────────────────────────────────────
export function loadAchievements() {
  try {
    const saved = JSON.parse(localStorage.getItem(ACH_KEY) || '[]');
    _unlocked = new Set(saved);
  } catch {
    _unlocked = new Set();
  }
}

function _save() {
  localStorage.setItem(ACH_KEY, JSON.stringify([..._unlocked]));
}

// ── Tracking ───────────────────────────────────────────────────────────────
export function trackZoneClick(zone) {
  _stats.zonesVisited.add(zone);
  _stats.zoneClickCounts[zone] = (_stats.zoneClickCounts[zone] ?? 0) + 1;
  _stats.maxZoneClicks = Math.max(_stats.maxZoneClicks, _stats.zoneClickCounts[zone]);
  _checkAll();
}

export function trackEmptyClick() {
  _stats.emptyClickCount++;
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
    <span class="ach-toast-icon">${def.icon()}</span>
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
    return `<div class="ach-item ${done ? 'unlocked' : 'locked'}">
      <span class="ach-item-icon">${def.icon()}</span>
      <span class="ach-item-body">
        <strong>${done ? def.title : '???'}</strong>
        <span>${done ? def.desc : ''}</span>
      </span>
    </div>`;
  }).join('');
}
