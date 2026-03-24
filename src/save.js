// src/save.js — SaveManager: localStorage, per-scene state
// Ключи никогда не менять без миграции.

const KEY = 'monk_save_v1';

const DEFAULT = {
  version: 1,
  global: {
    inventory:     Array(5).fill(null),
    achievements:  [],
    visitedScenes: [],
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
    localStorage.setItem(KEY, JSON.stringify(this._data));
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
