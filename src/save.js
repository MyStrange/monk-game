// src/save.js — SaveManager: localStorage, per-scene state, versioned migrations.
//
// ── Как работают миграции ────────────────────────────────────────────────
// При загрузке читаем save.version. Если оно меньше SCHEMA_VERSION, гоним
// save через все MIGRATIONS[n] по очереди: 1→2→3→… Каждая миграция
// мутирует объект и возвращает его (чаще всего тот же объект). Последним
// шагом пишется актуальная версия.
//
// ── Как добавить миграцию ────────────────────────────────────────────────
// Бамп SCHEMA_VERSION. Добавить новую запись в MIGRATIONS с ключом равным
// ЦЕЛЕВОЙ версии. Правило: миграция N принимает save версии (N-1) и делает
// из него save версии N. Не удалять старые миграции — игроки могут быть
// на любой из них.

const KEY = 'monk_save_v1';     // имя storage-ключа трогать ТОЛЬКО при полном breaking reset

// Текущая версия схемы сохранения.
const SCHEMA_VERSION = 2;

const DEFAULT = {
  version: SCHEMA_VERSION,
  global: {
    inventory:     Array(5).fill(null),
    achievements:  [],
    visitedScenes: [],
    lastScene:     'main',   // id сцены при последнем сохранении (для восстановления после F5)
    mutedMusic:    false,
    mutedSfx:      false,
  },
  scenes: {},  // { scene_id: { ...флаги сцены } }
};

// ── Миграции ───────────────────────────────────────────────────────────────
// Каждая функция: save-версии (N-1) → save-версии N. Мутируй и возвращай.
const MIGRATIONS = {
  // v1 → v2: убрать флаги «ветки слышать больше», которую полностью удалили.
  // Исторически были: S.wantMoreSounds, S.statueSymDrops (main scene).
  2(save) {
    if (save.scenes?.main) {
      delete save.scenes.main.wantMoreSounds;
      delete save.scenes.main.statueSymDrops;
    }
    return save;
  },
  // Пример будущей миграции:
  // 3(save) {
  //   // Переименование S.rockStates → S.rocks[]
  //   const s2 = save.scenes?.scene2;
  //   if (s2?.rockStates) {
  //     s2.rocks = Object.values(s2.rockStates);
  //     delete s2.rockStates;
  //   }
  //   return save;
  // },
};

function _migrate(save) {
  // Объект с неизвестной структурой — вернуть дефолт.
  if (!save || typeof save !== 'object') return structuredClone(DEFAULT);

  let v = Number.isInteger(save.version) ? save.version : 1;

  // Save из будущей версии (игрок даунгрейднул клиент). Оставляем как есть
  // и надеемся — лучше чем ронять.
  if (v > SCHEMA_VERSION) return save;

  while (v < SCHEMA_VERSION) {
    const next = v + 1;
    const fn   = MIGRATIONS[next];
    if (!fn) {
      console.warn(`SaveManager: нет миграции ${v}→${next}, reset save.`);
      return structuredClone(DEFAULT);
    }
    try {
      save = fn(save) ?? save;
    } catch (e) {
      console.warn(`SaveManager: миграция ${v}→${next} упала — reset.`, e);
      return structuredClone(DEFAULT);
    }
    v = next;
  }
  save.version = SCHEMA_VERSION;
  return save;
}

export const SaveManager = {
  _data: null,

  load() {
    let parsed = null;
    try {
      const raw = localStorage.getItem(KEY);
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      parsed = null;
    }
    this._data = parsed ? _migrate(parsed) : structuredClone(DEFAULT);
    // Гарантия наличия ключевых полей (defensive — если старая миграция
    // что-то не долила, не падаем при чтении из игры).
    if (!this._data.global) this._data.global = structuredClone(DEFAULT.global);
    if (!this._data.scenes) this._data.scenes = {};
    return this;
  },

  save() {
    // Safari Private mode / полный диск / политики = QuotaExceededError.
    // Молчим и не крашим игру — прогресс в памяти останется до перезагрузки.
    try {
      localStorage.setItem(KEY, JSON.stringify(this._data));
    } catch (e) {
      if (!this._warned) {
        console.warn('SaveManager: не удалось сохранить прогресс —', e?.message || e);
        this._warned = true;
      }
    }
  },

  getScene(id) {
    if (!this._data) this.load();
    return this._data.scenes[id] ?? {};
  },

  setScene(id, sceneState) {
    if (!this._data) this.load();
    this._data.scenes[id] = sceneState;
    this.save();
  },

  get global() {
    if (!this._data) this.load();
    return this._data.global;
  },

  reset() {
    this._data = structuredClone(DEFAULT);
    this.save();
  },
};
