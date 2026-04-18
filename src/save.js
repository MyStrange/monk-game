// src/save.js — SaveManager: localStorage, per-scene state
// Ключи никогда не менять без миграции.

const KEY = 'monk_save_v1';

const DEFAULT = {
  version: 1,
  global: {
    inventory:     Array(5).fill(null),
    achievements:  [],
    visitedScenes: [],
    lastScene:     'main',   // id сцены при последнем сохранении (для восстановления после F5)
    mutedMusic:    false,    // состояние музыки — сохраняется при переключении
    mutedSfx:      false,    // состояние звуковых эффектов — сохраняется при переключении
  },
  scenes: {},  // { scene_id: { ...флаги сцены } }
};

export const SaveManager = {
  _data: null,

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      this._data = raw ? JSON.parse(raw) : structuredClone(DEFAULT);
    } catch {
      this._data = structuredClone(DEFAULT);
    }
    return this;
  },

  save() {
    // Safari Private mode / полный диск / политики = QuotaExceededError.
    // Молчим и не крашим игру — прогресс в памяти останется до перезагрузки.
    try {
      localStorage.setItem(KEY, JSON.stringify(this._data));
    } catch (e) {
      // Один раз выведем предупреждение — дальше тишина.
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
