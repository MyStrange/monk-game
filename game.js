// game.js — точка входа (~60 строк)
// import + window.* + init
// Версия: v1

import { SaveManager }                      from './src/save.js';
import { AudioSystem, toggleSound }         from './src/audio.js';
import { renderHotbar }                     from './src/hotbar.js';
import { toggleFullscreen }                 from './src/utils.js';
import { openAchievements, closeAchievements, loadAchievements } from './src/achievements.js';
import { initMain, leaveMain }              from './scenes/main.js';

// ── window.* для HTML onclick= ─────────────────────────────────────────────
// closeSceneXXX экспортируется и присваивается window.* в каждом файле сцены.
Object.assign(window, {
  toggleSound,
  toggleFullscreen,
  openAchievements,
  closeAchievements,
  leaveMain,
});

// ── Init ───────────────────────────────────────────────────────────────────
SaveManager.load();
loadAchievements();
AudioSystem.init();
renderHotbar();
initMain();
